import opentype from 'opentype.js';
import rough from 'roughjs';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { AppState, AllographLibrary, CursiveMode } from '../types';
import { SeededNoise } from './noise';
import { GlyphMutator, GlyphDrawOptions } from './glyphMutator';
import { MathRenderer, measureFontStemWidth } from './mathRenderer';
import { InkAndScanPipeline, getPaperRuleOriginY } from './inkAndScan';
import { CursiveEngine } from './cursiveEngine';
import {
  parseRawAIOutput,
  parseLatexExpressionTokens,
  DocumentBlock,
  MathToken,
  MathFraction,
  MathScript,
  MathRoot,
  MathBoxed,
  MathBigOp,
  MathMatrix,
} from './formatter';

// High-DPI page dimensions: Standard A4 at 150-200 DPI for rendering
export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1754;
export const BASE_LINE_HEIGHT = 44; // Ruled line pitch
export const TOP_MARGIN = 160;
export const BOTTOM_MARGIN = 120;
export const LEFT_MARGIN = 190;
export const RIGHT_MARGIN = 1100;

export interface WristClusterState {
  clusterStartX: number;
  clusterWidth: number;
  drift: number;
}

export interface PageLayoutData {
  pageNumber: number;
  blocks: DocumentBlock[];
  questionNums?: number[];
}

/**
 * Derivation Phase Dynamics (Pacing & Scaling):
 * - Headings/margins/given: deliberate, upright, slightly larger (1.04x)
 * - Intermediate algebraic manipulation: hurried, compressed, smaller (0.94x)
 * - Final result / boxed answer: deliberate, prominent, heavy pen pressure (1.08x)
 */
export function getPhaseScaleFactor(blockType: string, isFinalStep: boolean): number {
  if (blockType === 'heading' || blockType === 'margin-item') return 1.04;
  if (isFinalStep || blockType === 'boxed-final') return 1.08;
  return 0.94; // Intermediate algebraic grind is naturally smaller and faster
}

export class PageEngine {
  private noise: SeededNoise;
  private mutator: GlyphMutator;
  private mathRenderer: MathRenderer;
  private inkAndScan: InkAndScanPipeline;
  private cursiveEngine: CursiveEngine;
  private currentPen?: AppState['pen'];
  private currentHandwriting?: AppState['handwriting'];
  private currentPaper?: AppState['paper'];
  private currentAllographs?: AllographLibrary;
  private mainPageCtx: CanvasRenderingContext2D | null = null;
  private currentRightMargin: number = RIGHT_MARGIN;
  private currentLineObstacles: Array<{ x1: number; x2: number }> = [];
  private prevLineObstacles: Array<{ x1: number; x2: number }> = [];

  constructor(seed: number) {
    this.noise = new SeededNoise(seed);
    this.mutator = new GlyphMutator(this.noise);
    this.mathRenderer = new MathRenderer(this.noise);
    this.inkAndScan = new InkAndScanPipeline(this.noise);
    this.cursiveEngine = new CursiveEngine(this.noise);
  }

  public setSeed(seed: number) {
    this.noise = new SeededNoise(seed);
    this.mutator = new GlyphMutator(this.noise);
    this.mathRenderer = new MathRenderer(this.noise);
    this.inkAndScan = new InkAndScanPipeline(this.noise);
    this.cursiveEngine = new CursiveEngine(this.noise);
  }

  /**
   * Initializes a new wrist-pivot cluster cycle (160px - 230px span).
   */
  private initWristCluster(startX: number): WristClusterState {
    return {
      clusterStartX: startX,
      clusterWidth: 160 + this.noise.random() * 70,
      drift: (this.noise.random() - 0.5) * 0.8,
    };
  }

  /**
   * Updates wrist cluster offset & progressive forward slant.
   * Arc: dy = -2.8 * sin(pi * u) + drift; slant = +2.5° * u.
   */
  private updateWristCluster(wrist: WristClusterState, currentX: number): { dy: number; slantDeg: number } {
    if (currentX - wrist.clusterStartX >= wrist.clusterWidth) {
      wrist.clusterStartX = currentX;
      wrist.clusterWidth = 160 + this.noise.random() * 70;
      wrist.drift = (this.noise.random() - 0.5) * 0.8;
    }
    const u = Math.min(1.0, Math.max(0.0, (currentX - wrist.clusterStartX) / wrist.clusterWidth));
    const dy = -2.8 * Math.sin(Math.PI * u) + wrist.drift;
    const slantDeg = 2.5 * u;
    return { dy, slantDeg };
  }

  private getPageSlantOffset(x: number, y: number, lineProgress: number, fatigue: number): number {
    const macroDrift = this.noise.get2D(x * 0.0022, y * 0.0018) * 2.0; // ±2° coherent paragraph wave
    const fatigueLean = fatigue * lineProgress * 2.2;
    return macroDrift + fatigueLean;
  }

  private getConsistentSpaceAdvance(
    fontSize: number,
    widthMultiplier: number,
    wordSpacingMult: number,
    y: number
  ): number {
    const lineRhythm = 1.0 + this.noise.noise1D(y * 0.0038) * 0.06;
    const microVariance = 0.92 + this.noise.random() * 0.16;
    return fontSize * 0.48 * widthMultiplier * wordSpacingMult * lineRhythm * microVariance;
  }

  /**
   * Generates authentic student typo slips (swapping adjacent internal letters or dropped terminal characters)
   * Guaranteed to produce a typo distinct from the original word.
   */
  private generatePlausibleTypo(word: string): string {
    const clean = word.replace(/[^a-zA-Z0-9+\-]/g, '');
    if (clean.length <= 1) return clean === '+' ? '-' : clean === '-' ? '+' : clean + 'a';
    if (clean.length === 2) return clean[1] + clean[0];

    const swapPairs: Record<string, string> = {
      the: 'teh',
      for: 'fro',
      from: 'form',
      with: 'wiht',
      this: 'tihs',
      that: 'taht',
      integral: 'integal',
      function: 'fucntion',
      equation: 'eqaution',
      limit: 'limt',
      value: 'valu',
      hence: 'hcne',
    };
    const lower = clean.toLowerCase();
    if (swapPairs[lower]) {
      return clean[0] === clean[0].toUpperCase()
        ? swapPairs[lower][0].toUpperCase() + swapPairs[lower].slice(1)
        : swapPairs[lower];
    }

    const idx = Math.max(1, Math.min(clean.length - 2, Math.floor(clean.length / 2)));
    if (clean[idx] !== clean[idx + 1]) {
      return clean.slice(0, idx) + clean[idx + 1] + clean[idx] + clean.slice(idx + 2);
    }
    return clean.slice(0, -1);
  }

  /**
   * Paginates document blocks across multi-page notebook sheets.
   */
  public paginate(
    blocks: DocumentBlock[],
    fontSize = 27,
    roughWorkColumn = false,
    letterSpacing = 0,
    wordSpacing = 1.0,
    font?: opentype.Font,
    paperTemplate?: string,
    snapToRuledLines?: boolean,
    cursiveMode?: CursiveMode,
    allographs?: AllographLibrary,
    cursiveStyle?: string
  ): PageLayoutData[] {
    const pages: PageLayoutData[] = [];
    const maxPageY = PAGE_HEIGHT - BOTTOM_MARGIN;
    const contentRightX = roughWorkColumn ? PAGE_WIDTH - 190 : RIGHT_MARGIN;
    const availableWidth = contentRightX - LEFT_MARGIN;

    const effectiveTemplate = paperTemplate || this.currentPaper?.template;
    const shouldSnapToRule =
      (snapToRuledLines ?? (this.currentHandwriting?.snapToRuledLines ?? true)) &&
      (effectiveTemplate === 'indian-ruled' || effectiveTemplate === 'exam-booklet');

    const ruleOriginY = getPaperRuleOriginY((effectiveTemplate || 'indian-ruled') as any, TOP_MARGIN);
    const snapToNextRuledLine = (y: number, minGap = 0): number => {
      if (!shouldSnapToRule) return y;
      const offsetFromTop = Math.max(0, y - ruleOriginY);
      const lineIdx = Math.ceil((offsetFromTop - 4) / BASE_LINE_HEIGHT);
      return ruleOriginY + lineIdx * BASE_LINE_HEIGHT + minGap;
    };

    const estimateWidth = (toks: MathToken[], size: number): number => {
      if (font) {
        const prevHw = this.currentHandwriting;
        const prevAllo = this.currentAllographs;
        if (allographs) this.currentAllographs = allographs;
        this.currentHandwriting = {
          ...this.currentHandwriting,
          letterSpacing,
          wordSpacing,
          fontSize: size,
          cursiveMode: cursiveMode ?? this.currentHandwriting?.cursiveMode ?? 'print',
          cursiveStyle: cursiveStyle ?? this.currentHandwriting?.cursiveStyle,
        } as any;
        const w = this.estimateTokensWidth(font, toks, size);
        this.currentHandwriting = prevHw;
        this.currentAllographs = prevAllo;
        return w;
      }
      let charCount = 0;
      for (const t of toks) {
        if (t.type === 'text') charCount += t.text.length;
        else if (t.type === 'space') charCount += t.widthMultiplier * wordSpacing;
        else if (t.type === 'fraction') charCount += 8;
        else if (t.type === 'matrix') charCount += 16;
        else if (t.type === 'root') charCount += 6;
        else charCount += 3;
      }
      return charCount * (size * 0.58 + letterSpacing);
    };

    let currentPageBlocks: DocumentBlock[] = [];
    let currentY = shouldSnapToRule ? ruleOriginY : TOP_MARGIN;
    let activeQuestionNum: number | undefined;

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const block = blocks[bIdx];
      const notFirstOnPage = currentPageBlocks.length > 0;
      const isFinalStep =
        block.type === 'boxed-final' ||
        (block.type === 'math-step' &&
          (bIdx === blocks.length - 1 ||
            blocks[bIdx + 1].type === 'separator' ||
            blocks[bIdx + 1].type === 'boxed-final' ||
            blocks[bIdx + 1].type === 'heading' ||
            blocks[bIdx + 1].type === 'margin-item'));

      const phaseScale = getPhaseScaleFactor(block.type, isFinalStep);
      const effectiveSize = fontSize * phaseScale;
      const span = this.getTokensVerticalSpan(block.tokens, effectiveSize);
      const hasBoxed = block.type === 'boxed-final' || block.tokens.some((t) => t.type === 'boxed');
      const minAscent = hasBoxed ? BASE_LINE_HEIGHT * 0.55 : BASE_LINE_HEIGHT * 0.70;
      const topClearance = notFirstOnPage && span.ascent > minAscent
        ? Math.round(span.ascent - minAscent + (hasBoxed ? 10 : 0))
        : 0;

      let blockHeight = BASE_LINE_HEIGHT;

      if (block.type === 'heading') {
        const hSize = (block.level === 1 ? fontSize * 1.3 : fontSize * 1.15) * phaseScale;
        const hSpan = this.getTokensVerticalSpan(block.tokens, hSize);
        const hWidth = estimateWidth(block.tokens, hSize);
        const hLines = Math.max(1, Math.ceil(hWidth / Math.max(200, availableWidth - 20)));
        const rawHLinePitch = Math.max(BASE_LINE_HEIGHT, hSpan.ascent + hSpan.descent + 10);
        const hLinePitch = shouldSnapToRule
          ? Math.ceil(rawHLinePitch / BASE_LINE_HEIGHT) * BASE_LINE_HEIGHT
          : rawHLinePitch;
        blockHeight = topClearance + BASE_LINE_HEIGHT * 0.25 +
          Math.max((hLines - 1) * Math.max(BASE_LINE_HEIGHT * 1.5, hLinePitch + 14) + hLinePitch + 14, BASE_LINE_HEIGHT * (block.level === 1 ? 1.5 : 1.2));
      } else if (block.type === 'math-step') {
        const mWidth = estimateWidth(block.tokens, effectiveSize);
        const mLines = Math.max(1, Math.ceil(mWidth / Math.max(200, availableWidth - 70)));
        const rawStepH = Math.max(BASE_LINE_HEIGHT, span.ascent + span.descent + (hasBoxed ? 16 : 10));
        const stepH = shouldSnapToRule
          ? Math.ceil(rawStepH / BASE_LINE_HEIGHT) * BASE_LINE_HEIGHT
          : rawStepH;
        const hasMatrix = block.tokens.some((t) => t.type === 'matrix' || (t.type === 'boxed' && t.content.some((it) => it.type === 'matrix')));
        const mult = hasMatrix ? 1.26 : hasBoxed ? 1.20 : 1.10;
        blockHeight = topClearance + (mLines - 1) * Math.max(BASE_LINE_HEIGHT * 1.5, stepH + 14) + stepH * mult;
      } else if (block.type === 'boxed-final') {
        blockHeight = topClearance + Math.max(BASE_LINE_HEIGHT * 1.8, span.ascent + span.descent + 24 + BASE_LINE_HEIGHT * 0.6);
      } else if (block.type === 'table') {
        if (block.tableData) {
          const { headers, rows, columnCount } = block.tableData;
          const colPad = columnCount >= 10 ? 12 : columnCount >= 7 ? 18 : 28;
          const minColW = columnCount >= 10 ? 36 : columnCount >= 7 ? 45 : 55;
          let totalW = columnCount * minColW;
          for (let c = 0; c < columnCount; c++) {
            let maxW = estimateWidth(headers[c] || [], effectiveSize * 0.84);
            for (let r = 0; r < rows.length; r++) {
              const cw = estimateWidth(rows[r][c] || [], effectiveSize * 0.80);
              if (cw > maxW) maxW = cw;
            }
            totalW += maxW + colPad - minColW;
          }
          const tScale = totalW > availableWidth ? availableWidth / totalW : 1.0;
          const cFontScale = Math.max(0.50, Math.min(1.0, tScale));
          const hFontSize = effectiveSize * 0.85 * cFontScale;
          const cFontSize = effectiveSize * 0.80 * cFontScale;

          let hAsc = hFontSize * 0.75;
          let hDesc = hFontSize * 0.25;
          for (let c = 0; c < columnCount; c++) {
            const sp = this.getTokensVerticalSpan(headers[c] || [], hFontSize);
            hAsc = Math.max(hAsc, sp.ascent);
            hDesc = Math.max(hDesc, sp.descent);
          }
          const hRowH = Math.max(30, hAsc + hDesc + 14);

          let dataRowsH = 0;
          for (const row of rows) {
            let rAsc = cFontSize * 0.75;
            let rDesc = cFontSize * 0.25;
            for (let c = 0; c < columnCount; c++) {
              const sp = this.getTokensVerticalSpan(row[c] || [], cFontSize);
              rAsc = Math.max(rAsc, sp.ascent);
              rDesc = Math.max(rDesc, sp.descent);
            }
            dataRowsH += Math.max(28, rAsc + rDesc + 12);
          }
          blockHeight = topClearance + hRowH + dataRowsH + BASE_LINE_HEIGHT * 0.7;
        } else {
          blockHeight = topClearance + BASE_LINE_HEIGHT * 4;
        }
      } else if (block.type === 'separator') {
        blockHeight = BASE_LINE_HEIGHT * 0.6;
      } else {
        // paragraph or margin-item
        const prefixW = block.prefix ? block.prefix.length * effectiveSize * 0.55 + 24 : 0;
        const pWidth = estimateWidth(block.tokens, effectiveSize);
        const pLines = Math.max(1, Math.ceil((pWidth + prefixW) / Math.max(200, availableWidth - 20)));
        const rawPitch = Math.max(BASE_LINE_HEIGHT, span.ascent + span.descent + 12);
        const trueLineH = shouldSnapToRule
          ? Math.ceil(rawPitch / BASE_LINE_HEIGHT) * BASE_LINE_HEIGHT
          : rawPitch;
        blockHeight = topClearance + pLines * trueLineH + 4;
      }

      // Orphan protection: If a heading or margin-item question label would sit alone on the last line
      const isHeaderOrQuestion = block.type === 'heading' || block.type === 'margin-item';
      const isOrphan = isHeaderOrQuestion && (currentY + blockHeight >= maxPageY - BASE_LINE_HEIGHT);

      // Widow protection: If a boxed-final answer is about to be split/squeezed across boundary
      const isWidowFinal = block.type === 'boxed-final' && (currentY + blockHeight > maxPageY - BASE_LINE_HEIGHT * 0.5);

      if ((currentY + blockHeight > maxPageY || isOrphan || isWidowFinal) && currentPageBlocks.length > 0) {
        const qNums = new Set<number>();
        if (activeQuestionNum !== undefined) qNums.add(activeQuestionNum);
        for (const b of currentPageBlocks) {
          const text = b.rawText || '';
          const matches = text.matchAll(/(?:[Qq]uestion|[Pp]roblem|Q)\s*(\d+)/gi);
          for (const m of matches) qNums.add(parseInt(m[1], 10));
          const pMatch = text.match(/^\(?(\d+)\)?[\.:\)]/);
          if (pMatch) qNums.add(parseInt(pMatch[1], 10));
        }

        pages.push({
          pageNumber: pages.length + 1,
          blocks: currentPageBlocks,
          questionNums: Array.from(qNums),
        });
        currentPageBlocks = [block];
        currentY = shouldSnapToRule
          ? snapToNextRuledLine(ruleOriginY + blockHeight)
          : ruleOriginY + blockHeight;
      } else {
        currentPageBlocks.push(block);
        currentY = shouldSnapToRule
          ? snapToNextRuledLine(currentY + blockHeight)
          : currentY + blockHeight;
      }

      // Check if block introduces or references a question number AFTER page-break check
      const qMatches = (block.rawText || '').matchAll(/(?:[Qq]uestion|[Pp]roblem|Q)\s*(\d+)/gi);
      for (const m of qMatches) {
        activeQuestionNum = parseInt(m[1], 10);
      }
      const numPrefixMatch = (block.rawText || '').match(/^\(?(\d+)\)?[\.:\)]/);
      if (numPrefixMatch) {
        activeQuestionNum = parseInt(numPrefixMatch[1], 10);
      }
    }

    if (currentPageBlocks.length > 0 || pages.length === 0) {
      const qNums = new Set<number>();
      if (activeQuestionNum !== undefined) qNums.add(activeQuestionNum);
      for (const b of currentPageBlocks) {
        const text = b.rawText || '';
        const matches = text.matchAll(/(?:[Qq]uestion|[Pp]roblem|Q)\s*(\d+)/gi);
        for (const m of matches) qNums.add(parseInt(m[1], 10));
        const pMatch = text.match(/^\(?(\d+)\)?[\.:\)]/);
        if (pMatch) qNums.add(parseInt(pMatch[1], 10));
      }

      pages.push({
        pageNumber: pages.length + 1,
        blocks: currentPageBlocks,
        questionNums: Array.from(qNums),
      });
    }

    return pages;
  }

  /**
   * Renders a single notebook page onto a Canvas.
   */
  public renderPage(
    canvas: HTMLCanvasElement,
    pageData: PageLayoutData,
    appState: AppState,
    font: opentype.Font,
    maxBlocks?: number,
    allographs?: AllographLibrary
  ) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const { handwriting, pen, paper } = appState;
    this.currentPen = pen;
    this.currentHandwriting = handwriting;
    this.currentPaper = paper;
    this.currentAllographs = allographs;
    this.mainPageCtx = ctx;

    // BUG-06 & BUG-13 FIX: Deterministically reset PRNG seed per page so Replay frames & exports never mutate prior lines
    this.setSeed((handwriting.randomSeed || 4242) + pageData.pageNumber * 7919);

    // BUG-15 FIX: Calibrate procedural math stroke weight from both font stem metrics AND user's pen.strokeWidth
    const stemW = measureFontStemWidth(font, handwriting.fontSize);
    const penScale = (pen.strokeWidth || 1.6) / 1.6;
    this.mathRenderer.setCalibratedLineWidth(stemW * penScale);

    // 2. Draw paper background (ruled lines, margin, header box) on the main page canvas
    this.inkAndScan.renderPaperBackground(
      ctx,
      PAGE_WIDTH,
      PAGE_HEIGHT,
      paper,
      pageData.pageNumber - 1,
      BASE_LINE_HEIGHT,
      TOP_MARGIN
    );

    // 2. Prepare transparent offscreen text canvas for crisp rendering and back-page bleed
    const textCanvas = document.createElement('canvas');
    textCanvas.width = PAGE_WIDTH;
    textCanvas.height = PAGE_HEIGHT;
    const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });
    if (!textCtx) return;
    const textRoughCanvas = rough.canvas(textCanvas);

    // 3. Render student content line by line onto textCanvas
    const shouldSnapToRule =
      (handwriting.snapToRuledLines ?? true) &&
      (paper.template === 'indian-ruled' || paper.template === 'exam-booklet');
    const ruleOriginY = getPaperRuleOriginY(paper.template, TOP_MARGIN);
    const snapToNextRuledLine = (y: number, minGap = 0): number => {
      if (!shouldSnapToRule) return y;
      const offsetFromTop = Math.max(0, y - ruleOriginY);
      const lineIdx = Math.ceil((offsetFromTop - 4) / BASE_LINE_HEIGHT);
      return ruleOriginY + lineIdx * BASE_LINE_HEIGHT + minGap;
    };

    let currentY = shouldSnapToRule ? ruleOriginY : TOP_MARGIN;
    const bodyInkColor = pen.bodyColorHex;
    const headingInkColor = pen.headingColorHex;

    this.currentRightMargin = paper.roughWorkColumn ? PAGE_WIDTH - 190 : RIGHT_MARGIN;
    this.currentLineObstacles = [];
    this.prevLineObstacles = [];

    // Sideways Margin Annotation / Gutter Scribble (Handwritten style)
    if (paper.marginAnnotation && pageData.pageNumber === 1) {
      textCtx.save();
      textCtx.translate(75, TOP_MARGIN + 280);
      textCtx.rotate(-Math.PI / 2);
      this.renderWordOrChars(
        textCtx,
        font,
        paper.marginAnnotation,
        0,
        0,
        14,
        pen.bodyColorHex,
        0.15,
        { ...handwriting, slantAngle: (handwriting.slantAngle ?? 0) - 4 },
        textRoughCanvas
      );
      textCtx.restore();
    }

    // Dynamic Right-Margin Rough Calculation Column
    if (paper.roughWorkColumn) {
      const isPencil = paper.roughWorkInstrument === 'pencil';
      const scratchColor = isPencil ? '#525864' : bodyInkColor;
      const rX = PAGE_WIDTH - 165;
      this.mathRenderer.drawHandLine(
        textCtx,
        rX,
        TOP_MARGIN - 20,
        rX + (this.noise.random() - 0.5) * 6,
        PAGE_HEIGHT - BOTTOM_MARGIN + 10,
        isPencil ? 0.95 : 1.1,
        scratchColor,
        2.2,
        8
      );

      // Extract question numbers present on this page (including carry-over from pageData.questionNums)
      const pageQuestionNums = new Set<number>(pageData.questionNums || []);
      for (const b of pageData.blocks) {
        const text = b.rawText || '';
        const matches = text.matchAll(/(?:[Qq]uestion|[Pp]roblem|Q)\s*(\d+)/gi);
        for (const m of matches) {
          pageQuestionNums.add(parseInt(m[1], 10));
        }
        const numPrefixMatch = text.match(/^\(?(\d+)\)?[\.:\)]/);
        if (numPrefixMatch) {
          pageQuestionNums.add(parseInt(numPrefixMatch[1], 10));
        }
      }

      // Check for subparts on this page: e.g. "(ii)", "(iii)", "(a)", "(b)"
      const pageSubparts = new Set<string>();
      for (const b of pageData.blocks) {
        const text = b.rawText || '';
        const subMatches = text.matchAll(/(?:^|\s|\#|\()([ivxlcdm]+|[a-e])(?:\)|\.|\:)/gi);
        for (const sm of subMatches) {
          pageSubparts.add(sm[1].toLowerCase());
        }
      }

      const allScratch = paper.customRoughWork && paper.customRoughWork.length > 0
        ? paper.customRoughWork
        : ['14 · 6 = 84', '84 - 23 = 61', '√61 ≈ 7.81'];

      // Parse structured scratch items and assign to questions
      const parsedItems = allScratch.map((raw, idx) => {
        const labelMatch = raw.match(/\[(.*?)\]/);
        const label = labelMatch ? labelMatch[1] : '';
        const qMatch = (label + ' ' + raw).match(/(?:[Qq]uestion|[Pp]roblem|Q)\s*(\d+)/i);
        const qNum = qMatch ? parseInt(qMatch[1], 10) : undefined;
        const subMatch = (label + ' ' + raw).match(/\(([ivxlcdm]+|[a-e])\)/i);
        const subpart = subMatch ? subMatch[1].toLowerCase() : undefined;
        let mathStr = raw.replace(/\[.*?\]/g, '').trim();

        // Normalize math expressions into clean student handwriting glyphs
        mathStr = mathStr
          .replace(/\^2/g, '²')
          .replace(/\^3/g, '³')
          .replace(/\^4/g, '⁴')
          .replace(/\*/g, ' · ')
          .replace(/sqrt\(/gi, '√(')
          .replace(/\bpi\b/gi, 'π')
          .replace(/\\omega/g, 'ω');

        return {
          raw,
          label,
          qNum,
          subpart,
          mathStr,
          origIdx: idx,
        };
      });

      // Filter items that belong on this page:
      // 1. If an item has both qNum and subpart (e.g. Q10(ii)):
      //    Must match qNum AND, if subparts exist on page, prioritize page containing subpart!
      // 2. If an item matches qNum: include it if subpart is not specified or page has subpart
      // 3. Otherwise distribute untagged items cyclically across pages
      const pageItems = parsedItems.filter((item) => {
        if (item.qNum !== undefined) {
          if (!pageQuestionNums.has(item.qNum)) return false;
          if (item.subpart && pageSubparts.size > 0) {
            return pageSubparts.has(item.subpart);
          }
          return true;
        }
        // Untagged fallback: group into chunks of 3 per page
        return Math.floor(item.origIdx / 3) === (pageData.pageNumber - 1);
      });

      // If no question matches and it's page 1, show first 2-3 items as default scratch
      const itemsToRender = pageItems.length > 0
        ? pageItems
        : (pageData.pageNumber === 1 && !parsedItems.some((it) => it.qNum !== undefined))
        ? parsedItems.slice(0, 3)
        : [];

      // Organic vertical distribution across the page height (eliminates bunched-at-top compression)
      const count = itemsToRender.length;
      const usableTop = TOP_MARGIN + 45;
      const usableBottom = PAGE_HEIGHT - BOTTOM_MARGIN - 90;
      const totalSpan = usableBottom - usableTop;
      const slotHeight = count > 1 ? totalSpan / count : totalSpan * 0.45;

      itemsToRender.forEach((item, itemIdx) => {
        // Place each calculation cluster naturally into its vertical section of the page
        const slotCenter = usableTop + slotHeight * (itemIdx + 0.32);
        const yJitter = (this.noise.random() - 0.5) * Math.min(80, slotHeight * 0.35);
        const clusterBaseY = Math.max(usableTop, Math.min(usableBottom - 50, slotCenter + yJitter));

        // Organic wrist rotation (-3.5° to +4.5°) and varied horizontal indent
        const tiltAngle = (this.noise.random() - 0.48) * 0.085;
        const clusterX = rX + 10 + this.noise.random() * 16;

        textCtx.save();
        if (isPencil) {
          textCtx.globalAlpha = 0.78;
          textCtx.shadowColor = 'rgba(80, 85, 95, 0.25)';
          textCtx.shadowBlur = 0.6;
        }
        textCtx.translate(clusterX, clusterBaseY);
        textCtx.rotate(tiltAngle);

        let localY = 0;

        // Optional minimal label (e.g. "Q2:" or simple label) — no formal headings
        if (item.label) {
          const shortLabel = item.label
            .replace(/^Check\s+/i, '')
            .replace(/factoring|denominator|scalar constant|transform|limits/gi, '')
            .trim();
          if (shortLabel || item.qNum) {
            const displayLabel = item.qNum ? `Q${item.qNum}:` : shortLabel;
            this.renderWordOrChars(
              textCtx,
              font,
              displayLabel,
              0,
              localY,
              9.5,
              '#94a3b8',
              0.1,
              { ...handwriting, handFatigue: 0.1 },
              textRoughCanvas
            );
            localY += 14;
          }
        }

        // Wrap long equations so they fit the rough column width by actual pixel width
        const maxRoughWidth = Math.max(90, PAGE_WIDTH - clusterX - 16);
        const wrappedLines: string[] = [];

        // 1. Split on logical equation/transition boundaries (=, ->, →, ≈)
        const rawSegments = item.mathStr.split(/(\s*(?:->|→|≈|=)\s*)/).filter(Boolean);
        let curEq = '';
        for (let sIdx = 0; sIdx < rawSegments.length; sIdx++) {
          const seg = rawSegments[sIdx];
          const candidate = curEq ? curEq + seg : seg.trim();
          if (this.measureWord(font, candidate, 12) <= maxRoughWidth) {
            curEq = candidate;
          } else {
            if (curEq.trim()) wrappedLines.push(curEq.trim());
            curEq = seg.trim();
          }
        }
        if (curEq.trim()) wrappedLines.push(curEq.trim());

        // 2. Secondary pass: break at arithmetic operators if still > maxRoughWidth
        // Use (?<![eE])[\+\-] to ensure scientific exponents like 5e-6 never split into 5e- and 6
        const finalWrappedLines: string[] = [];
        for (const seg of wrappedLines) {
          if (this.measureWord(font, seg, 12) <= maxRoughWidth) {
            finalWrappedLines.push(seg);
          } else {
            const parts = seg.split(/(\s*(?<![eE])[\+\-·*\/]\s*|\s+)/).filter(Boolean);
            let cur = '';
            for (const p of parts) {
              const cand = cur ? cur + p : p;
              if (this.measureWord(font, cand.trim(), 12) <= maxRoughWidth) {
                cur = cand;
              } else {
                if (cur.trim()) finalWrappedLines.push(cur.trim());
                cur = p;
              }
            }
            if (cur.trim()) finalWrappedLines.push(cur.trim());
          }
        }

        finalWrappedLines.forEach((lineText, lIdx) => {
          const lineFontSize = 11.5 + (this.noise.random() - 0.5) * 1.5;
          const lineX = (this.noise.random() - 0.5) * 4;

          const scratchW = this.renderWordOrChars(
            textCtx,
            font,
            lineText,
            lineX,
            localY,
            lineFontSize,
            scratchColor,
            0.2 + lIdx * 0.05,
            { ...handwriting, slantAngle: (handwriting.slantAngle ?? 0) + 3.5 },
            textRoughCanvas
          );

          // With ~35% probability, casual student strike-through line
          if (this.noise.random() < 0.35) {
            this.mathRenderer.drawHandLine(
              textCtx,
              lineX - 4,
              localY + 1,
              lineX + scratchW + 4,
              localY - 9,
              isPencil ? 0.95 : 1.1,
              scratchColor,
              1.3,
              2
            );
          } else if (lIdx === finalWrappedLines.length - 1 && this.noise.random() < 0.28) {
            // With ~28% probability on final line, casual double underline
            this.mathRenderer.drawHandLine(
              textCtx,
              lineX - 2,
              localY + 4,
              lineX + scratchW + 3,
              localY + 4 + (this.noise.random() - 0.5),
              isPencil ? 0.9 : 1.0,
              scratchColor,
              1.1,
              1
            );
          }

          localY += 18;
        });

        textCtx.restore();
      });
    }

    let consecutiveMathSteps = 0;
    let derivationDriftX = 0;

    const totalLinesEstimate = Math.floor((PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / BASE_LINE_HEIGHT);

    const limit = maxBlocks !== undefined ? Math.max(0, Math.min(maxBlocks, pageData.blocks.length)) : pageData.blocks.length;

    for (let bIdx = 0; bIdx < limit; bIdx++) {
      const block = pageData.blocks[bIdx];
      const blockStartY = currentY;
      const nextBlock = bIdx < pageData.blocks.length - 1 ? pageData.blocks[bIdx + 1] : null;
      const isFinalStep =
        block.type === 'boxed-final' ||
        (block.type === 'math-step' &&
          (!nextBlock || nextBlock.type === 'separator' || nextBlock.type === 'boxed-final' || nextBlock.type === 'heading' || nextBlock.type === 'margin-item'));

      // Section 3B: Derivation Phase Dynamics (Pacing & Scaling)
      const phaseScale = getPhaseScaleFactor(block.type, isFinalStep);
      const lineProgress = Math.min(1.0, (currentY - TOP_MARGIN) / (totalLinesEstimate * BASE_LINE_HEIGHT));
      const bopFactor = lineProgress > 0.84 ? Math.max(0.93, Math.min(1.0, 0.94 + (1 - lineProgress) * 0.35)) : 1.0;
      const effectiveFontSize = handwriting.fontSize * phaseScale * bopFactor;
      const blockHandwriting = lineProgress > 0.84
        ? { ...handwriting, letterSpacing: (handwriting.letterSpacing ?? 0) - 0.25 }
        : handwriting;

      // Final result / concluding answers receive prominent, deliberate pen pressure (+15% nib width)
      if (isFinalStep) {
        this.mathRenderer.setCalibratedLineWidth(stemW * penScale * 1.15);
      } else {
        this.mathRenderer.setCalibratedLineWidth(stemW * penScale);
      }

      // Equals-Sign Column Creep across consecutive math steps
      if (block.type === 'math-step') {
        consecutiveMathSteps++;
        if (consecutiveMathSteps === 1) {
          derivationDriftX = (this.noise.random() - 0.5) * 6;
        } else {
          derivationDriftX += (this.noise.random() - 0.5) * 4.0 + 3.0;
        }
        derivationDriftX = Math.max(-8, Math.min(26, derivationDriftX));
      } else {
        consecutiveMathSteps = 0;
        derivationDriftX = 0;
      }

      // Left margin wander envelope (Part 2 §4)
      const isUnruled = paper.template === 'unruled-bond';
      const wanderAmp = isUnruled ? 14 : 6;
      const smoothParagraphWander = this.noise.noise1D(currentY * 0.0045) * handwriting.marginWander * wanderAmp;
      const stepMicroJitter = (this.noise.random() - 0.5) * (isUnruled ? 5.0 : 2.5) * handwriting.marginWander;
      const wander = smoothParagraphWander + lineProgress * 9 * handwriting.marginWander + stepMicroJitter;

      // When transitioning from prose to an equation, add organic student equation indent (14-32px)
      const prevBlock = bIdx > 0 ? pageData.blocks[bIdx - 1] : null;
      const equationIndent =
        block.type === 'math-step' && (!prevBlock || prevBlock.type !== 'math-step')
          ? 14 + this.noise.random() * 18
          : 0;

      const rawMarginX =
        LEFT_MARGIN + wander + block.indent * 28 + (block.type === 'math-step' ? derivationDriftX + equationIndent : 0);
      const baseMarginX = Math.max(145, rawMarginX);

      // Top clearance: If the block contains tall elements (boxed answers, fractions, roots, cases),
      // push baseline down so the top of this block never collides with the line above.
      const blockSpan = this.getTokensVerticalSpan(block.tokens, effectiveFontSize);
      const hasBoxedToken = block.type === 'boxed-final' || block.tokens.some((t) => t.type === 'boxed');
      const minRequiredAscent = hasBoxedToken ? BASE_LINE_HEIGHT * 0.55 : BASE_LINE_HEIGHT * 0.70;
      if (bIdx > 0 && blockSpan.ascent > minRequiredAscent) {
        currentY += Math.round(blockSpan.ascent - minRequiredAscent + (hasBoxedToken ? 10 : 0));
      }

      if (block.type === 'heading') {
        // Headings in Red/Black gel pen with single or double hand-sketched underline
        const headingFontSize = (block.level === 1 ? handwriting.fontSize * 1.3 : handwriting.fontSize * 1.15) * phaseScale;
        if (!shouldSnapToRule) {
          currentY += BASE_LINE_HEIGHT * 0.25;
        }

        // Render heading tokens (supports inline math without raw $ signs)
        const seqResult = this.renderTokenSequence(
          textCtx,
          font,
          block.tokens,
          baseMarginX,
          currentY,
          headingFontSize,
          headingInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );
        const renderedWidth = seqResult.width;

        // Authentic student highlighter marker for headings (per wrapped line)
        if (
          this.mainPageCtx &&
          paper.highlighterMode &&
          paper.highlighterMode !== 'none' &&
          (paper.highlighterTarget === 'headings' || paper.highlighterTarget === 'both')
        ) {
          for (const lineEntry of seqResult.lines) {
            this.inkAndScan.drawHighlighterStroke(
              this.mainPageCtx,
              baseMarginX,
              lineEntry.y - headingFontSize * 0.72,
              lineEntry.width + 12,
              headingFontSize * 1.05,
              paper.highlighterMode
            );
          }
        }

        // Hand-drawn authentic student underlines (only for text section titles, never sliced across equations)
        const hasMath = block.tokens.some((t) => t.type === 'fraction' || t.type === 'matrix' || t.type === 'root' || t.type === 'big-op');
        const isSubproblem = /^\(?([0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)\)/.test(block.rawText || '');

        if (!hasMath && !isSubproblem && (pen.headingUnderline === 'single' || pen.headingUnderline === 'double')) {
          for (const lineEntry of seqResult.lines) {
            const uY = lineEntry.y + 6;
            this.mathRenderer.drawHandLine(
              textCtx,
              baseMarginX,
              uY,
              baseMarginX + lineEntry.width + 6,
              uY + (this.noise.random() - 0.5) * 1.5,
              1.8,
              headingInkColor,
              2.0,
              4
            );

            if (pen.headingUnderline === 'double') {
              this.mathRenderer.drawHandLine(
                textCtx,
                baseMarginX,
                uY + 4.5,
                baseMarginX + lineEntry.width + 8,
                uY + 4.5 + (this.noise.random() - 0.5) * 1.5,
                1.4,
                headingInkColor,
                2.0,
                4
              );
            }
          }
        }

        currentY += Math.max(seqResult.height + 14, BASE_LINE_HEIGHT * (block.level === 1 ? 1.5 : 1.2));
      } else if (block.type === 'margin-item') {
        // Question or Answer margin item: render authentic circled prefix or text label
        let startX = baseMarginX;

        if (block.prefix) {
          const isCirclable =
            handwriting.circledQuestionLabels === true &&
            (/^(?:Q\d+\.?|\(?\d+\)?\.?|\(?[a-zA-Z]\)?\.?)$/.test(block.prefix.trim()));

          const isAlphaSub = /^\(?[a-zA-Z]\)?\.?$/.test(block.prefix.trim());
          const isPrimaryQ = /^(?:Q\d+\.?|\(?\d+\)?\.?|\d+[\.:\)])$/.test(block.prefix.trim());

          const prefixColor =
            block.prefix.startsWith('Q') || isPrimaryQ || isAlphaSub || block.prefix.startsWith('Ans')
              ? headingInkColor
              : bodyInkColor;

          if (isCirclable) {
            if (isPrimaryQ) {
              // Primary Question (Q1, (1), 2., (16)): Drawn in left margin before ruled margin line
              const circleCenterX = baseMarginX - 44;
              const circleCenterY = currentY - effectiveFontSize * 0.30;
              this.mathRenderer.drawCircledLabel(
                textCtx,
                font,
                this.mutator,
                block.prefix,
                circleCenterX,
                circleCenterY,
                effectiveFontSize,
                prefixColor,
                handwriting
              );
              // Body tokens start cleanly at baseMarginX
              startX = baseMarginX;
            } else {
              // Alpha Sub-part ((a), (b)): Drawn indented at start of line
              const circleCenterX = baseMarginX + 16;
              const circleCenterY = currentY - effectiveFontSize * 0.30;
              const circleDia = this.mathRenderer.drawCircledLabel(
                textCtx,
                font,
                this.mutator,
                block.prefix,
                circleCenterX,
                circleCenterY,
                effectiveFontSize * 0.90,
                prefixColor,
                handwriting
              );
              startX = circleCenterX + circleDia * 0.5 + 10;
            }
          } else {
            // Standard uncircled text label (e.g. 1., 2., Q1., Ans:, •, -)
            const isBullet =
              block.prefix.trim() === '•' || block.prefix.trim() === '-' || block.prefix.trim() === '*';

            if (isBullet) {
              const prefX = baseMarginX;
              const bulletW = this.mathRenderer.drawHandBullet(
                textCtx,
                prefX,
                currentY,
                effectiveFontSize,
                prefixColor
              );
              startX = prefX + bulletW + 8;
            } else if (isPrimaryQ) {
              // Primary question number (1., 2., Q1., etc.):
              // Placed authentically in the margin gutter so that the question statement
              // and subsequent derivation steps align naturally along baseMarginX without overlap.
              const prefWidth = this.measureWord(font, block.prefix, effectiveFontSize);
              const prefX = baseMarginX - Math.max(prefWidth + 12, 38);
              this.renderTextLine(
                textCtx,
                font,
                block.prefix,
                prefX,
                currentY,
                effectiveFontSize,
                prefixColor,
                lineProgress,
                blockHandwriting,
                textRoughCanvas
              );
              // Body tokens start cleanly at baseMarginX
              startX = baseMarginX;
            } else {
              // Other prefixes (e.g. Ans:, (a), Note:)
              const prefX = baseMarginX;
              const prefWidth = this.renderTextLine(
                textCtx,
                font,
                block.prefix,
                prefX,
                currentY,
                effectiveFontSize,
                prefixColor,
                lineProgress,
                blockHandwriting,
                textRoughCanvas
              );
              startX = prefX + prefWidth + 12;
            }
          }
        }

        // Render tokens of the margin item (can be paragraph or math)
        const advanceY = this.renderTokensWithWrapping(
          textCtx,
          font,
          block.tokens,
          startX,
          currentY,
          effectiveFontSize,
          bodyInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );

        currentY += advanceY;
      } else if (block.type === 'math-step') {
        // STEM Derivation step
        let startX = baseMarginX;

        // Prefix symbol: ⇒ or ∴
        if (block.prefix) {
          const symWidth =
            block.prefix === '∴'
              ? this.mathRenderer.drawTherefore(textCtx, startX, currentY, effectiveFontSize, bodyInkColor)
              : this.mathRenderer.drawArrow(textCtx, startX, currentY, effectiveFontSize, bodyInkColor, true);
          startX += symWidth + 8;
        }

        // Rare Organic Math Mistake Scratch-Out:
        // Only triggers at genuine subtle human frequency
        if (handwriting.scratchOutRate > 0 && this.noise.random() < handwriting.scratchOutRate * 0.35 && block.tokens.length > 2) {
          const slipVariants = ['- ', '+ ', '2', '0', 'y'];
          const slipText = slipVariants[Math.floor(this.noise.random() * slipVariants.length)];
          const slipW = this.renderWordOrChars(
            textCtx,
            font,
            slipText,
            startX,
            currentY,
            effectiveFontSize,
            bodyInkColor,
            lineProgress,
            blockHandwriting,
            textRoughCanvas
          );
          this.mathRenderer.drawMistakeScratch(
            textCtx,
            startX,
            currentY,
            slipW,
            effectiveFontSize,
            bodyInkColor
          );
          startX += slipW + 8;
        }

        const seqResult = this.renderTokenSequence(
          textCtx,
          font,
          block.tokens,
          startX,
          currentY,
          effectiveFontSize,
          bodyInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );

        // Non-uniform vertical line spacing between algebra steps (with comfortable clearance for matrices/cases/boxed)
        const hasMatrix = block.tokens.some((t) => t.type === 'matrix' || (t.type === 'boxed' && t.content.some((it) => it.type === 'matrix')));
        const hasBoxed = block.tokens.some((t) => t.type === 'boxed');
        const minStepHeight = blockSpan.ascent + blockSpan.descent + (hasBoxed ? 16 : 8);
        const rawStepH = Math.max(seqResult.height, minStepHeight);
        const stepSpacingMult = shouldSnapToRule && rawStepH <= BASE_LINE_HEIGHT
          ? 1.0
          : hasMatrix ? (1.18 + this.noise.random() * 0.08) : hasBoxed ? (1.12 + this.noise.random() * 0.08) : (0.94 + this.noise.random() * 0.16);
        currentY += shouldSnapToRule && rawStepH <= BASE_LINE_HEIGHT ? BASE_LINE_HEIGHT : rawStepH * stepSpacingMult;
      } else if (block.type === 'boxed-final') {
        // Boxed final answer block
        const advanceY = this.renderBoxedAnswerBlock(
          textCtx,
          font,
          block.tokens,
          baseMarginX,
          currentY,
          effectiveFontSize,
          bodyInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );
        currentY += advanceY;
      } else if (block.type === 'table') {
        // Hand-drawn table block
        const advanceY = this.renderTableBlock(
          textCtx,
          font,
          block,
          baseMarginX,
          currentY,
          effectiveFontSize,
          bodyInkColor,
          headingInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );
        currentY += advanceY;
      } else if (block.type === 'separator') {
        // Hand-sketched horizontal dividing rule (---)
        // Uses authentic body pen ink (never hardcoded slate gray!), parabolic bow (4-9px), tilted slope, and organic endpoints
        currentY += BASE_LINE_HEIGHT * (0.35 + (this.noise.random() - 0.5) * 0.1);
        const sepStartX = baseMarginX + (this.noise.random() * 35);
        const sepEndX = RIGHT_MARGIN - 70 + (this.noise.random() - 0.5) * 55;
        const sepSlope = ((-0.8 + this.noise.random() * 1.8) * Math.PI) / 180;
        const sepEndDrift = Math.tan(sepSlope) * (sepEndX - sepStartX);

        this.mathRenderer.drawHandLine(
          textCtx,
          sepStartX,
          currentY,
          sepEndX,
          currentY + sepEndDrift,
          1.2,
          bodyInkColor,
          5.5,
          6
        );
        currentY += BASE_LINE_HEIGHT * (0.65 + (this.noise.random() - 0.5) * 0.15);
      } else {
        // Paragraph with inline math tokens and line-wrapping
        const advanceY = this.renderTokensWithWrapping(
          textCtx,
          font,
          block.tokens,
          baseMarginX,
          currentY,
          effectiveFontSize,
          bodyInkColor,
          lineProgress,
          blockHandwriting,
          textRoughCanvas
        );
        currentY += advanceY;
      }

      if (shouldSnapToRule) {
        currentY = snapToNextRuledLine(currentY);
      }

      // BUG-12 FIX: Clear obstacle ducking buffers on large vertical jumps or non-flowing blocks
      const verticalJump = currentY - blockStartY;
      if (
        block.type === 'heading' ||
        block.type === 'table' ||
        block.type === 'separator' ||
        block.type === 'boxed-final' ||
        verticalJump > BASE_LINE_HEIGHT * 1.45
      ) {
        this.prevLineObstacles = [];
        this.currentLineObstacles = [];
      } else {
        this.prevLineObstacles = this.currentLineObstacles;
        this.currentLineObstacles = [];
      }
    }

    // 4. Back-Page Bleed (Ghosting through sheet with per-page registration jitter)
    if (paper.inkBleed > 0) {
      this.inkAndScan.drawBackPageBleed(ctx, textCanvas, PAGE_WIDTH, PAGE_HEIGHT, paper.inkBleed, pageData.pageNumber - 1);
    }

    // 4.5 Subtle Cellulose Ink Feathering
    if (paper.showPaperTexture && maxBlocks === undefined) {
      this.inkAndScan.applyCelluloseInkFeathering(textCanvas);
    }

    // 5. Composite primary student handwriting layer onto paper
    ctx.drawImage(textCanvas, 0, 0);

    // 5.5 Optional Procedural Coffee Mug Ring Stain (on front sheet)
    if (paper.showCoffeeStain && pageData.pageNumber === 1) {
      this.inkAndScan.drawCoffeeStain(ctx, PAGE_WIDTH, PAGE_HEIGHT, handwriting.randomSeed, 1.0);
    }

    // BUG-14 FIX: Draw Sticky Note directly onto the canvas on Page 1 so PNG/SVG/PDF/ZIP exports include it
    if (paper.showStickyNote && pageData.pageNumber === 1) {
      this.drawStickyNoteOnCanvas(
        ctx,
        font,
        paper.stickyNoteText || "Don't forget to submit before 5 PM!",
        handwriting,
        textRoughCanvas
      );
    }

    // 6. Apply Camera / CamScanner Scan Post-Processing Filters (with per-page organic camera tilt, lighting & shadow jitter)
    this.inkAndScan.applyScanPostProcessing(ctx, PAGE_WIDTH, PAGE_HEIGHT, paper, pageData.pageNumber - 1);
  }

  private drawStickyNoteOnCanvas(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    noteText: string,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ) {
    const noteW = 280;
    const noteH = 190;
    const noteX = PAGE_WIDTH - noteW - 70;
    const noteY = PAGE_HEIGHT - noteH - 140;

    ctx.save();
    ctx.translate(noteX + noteW * 0.5, noteY + noteH * 0.5);
    ctx.rotate((-2.5 * Math.PI) / 180);
    ctx.translate(-noteW * 0.5, -noteH * 0.5);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;

    // Sticky note body
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, noteW, noteH);

    // Reset shadow for adhesive strip & border
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.fillRect(0, 0, noteW, 18);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, noteW, noteH);

    // "NOTE:" header
    ctx.fillStyle = 'rgba(133, 77, 14, 0.65)';
    ctx.font = '900 13px sans-serif';
    ctx.fillText('NOTE:', 18, 38);

    // Handwritten note text wrapped across lines
    const words = noteText.split(/\s+/);
    let line = '';
    let ly = 70;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 20) {
        this.renderWordOrChars(ctx, font, line.trim(), 18, ly, 21, '#451a03', 0.2, handwriting, roughCanvas);
        ly += 30;
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line.trim()) {
      this.renderWordOrChars(ctx, font, line.trim(), 18, ly, 21, '#451a03', 0.2, handwriting, roughCanvas);
    }

    ctx.restore();
  }

  private getTokenVerticalSpan(token: MathToken, fontSize: number): { ascent: number; descent: number } {
    if (token.type === 'fraction') {
      const fracFontSize = fontSize * 0.84;
      const numSpan = this.getTokensVerticalSpan(token.numerator, fracFontSize);
      const denSpan = this.getTokensVerticalSpan(token.denominator, fracFontSize);
      const barTopClearance = Math.max(7.5, fracFontSize * 0.30);
      const barBottomClearance = Math.max(7.5, fracFontSize * 0.30);
      const numDescent = Math.max(0, numSpan.descent);
      const denAscent = Math.max(fracFontSize * 0.70, denSpan.ascent);
      return {
        ascent: fontSize * 0.34 + numDescent + barTopClearance + numSpan.ascent + 2,
        descent: denAscent + barBottomClearance + denSpan.descent - fontSize * 0.34 + 4,
      };
    }
    if (token.type === 'matrix') {
      let totalH = 0;
      let firstRowAscent = fontSize * 0.85;
      for (let r = 0; r < token.cells.length; r++) {
        const row = token.cells[r];
        let maxRowAsc = fontSize * 0.68;
        let maxRowDesc = fontSize * 0.25;
        for (const cell of row) {
          const s = this.getTokensVerticalSpan(cell, fontSize * 0.84);
          maxRowAsc = Math.max(maxRowAsc, s.ascent);
          maxRowDesc = Math.max(maxRowDesc, s.descent);
        }
        if (r === 0) firstRowAscent = maxRowAsc + 4;
        totalH += Math.max(fontSize * 1.4, maxRowAsc + maxRowDesc + 14);
      }
      if (token.bracket === 'p' && token.cells.length === 2 && (token.cells[0]?.length || 0) <= 1) {
        return {
          ascent: totalH * 0.5 + fontSize * 0.35,
          descent: totalH * 0.5 - fontSize * 0.35 + 4,
        };
      }
      return {
        ascent: firstRowAscent,
        descent: Math.max(fontSize * 0.4, totalH - firstRowAscent + 4),
      };
    }
    if (token.type === 'big-op') {
      return { ascent: fontSize * 1.05, descent: fontSize * 0.55 };
    }
    if (token.type === 'script') {
      return {
        ascent: token.sup ? fontSize * 0.95 : fontSize * 0.75,
        descent: token.sub ? fontSize * 0.45 : fontSize * 0.20,
      };
    }
    if (token.type === 'root') {
      const radSpan = this.getTokensVerticalSpan(token.content, fontSize);
      const idxAscent = token.index ? fontSize * 0.52 : 0;
      return {
        ascent: Math.max(radSpan.ascent + 8, idxAscent + 4),
        descent: radSpan.descent + 4,
      };
    }
    if (token.type === 'boxed') {
      const innerSpan = this.getTokensVerticalSpan(token.content, fontSize);
      return {
        ascent: innerSpan.ascent + 12,
        descent: innerSpan.descent + 12,
      };
    }
    return { ascent: fontSize * 0.75, descent: fontSize * 0.22 };
  }

  private getTokensVerticalSpan(tokens: MathToken[], fontSize: number): { ascent: number; descent: number } {
    let maxAscent = fontSize * 0.75;
    let maxDescent = fontSize * 0.22;
    for (const t of tokens) {
      const span = this.getTokenVerticalSpan(t, fontSize);
      if (span.ascent > maxAscent) maxAscent = span.ascent;
      if (span.descent > maxDescent) maxDescent = span.descent;
    }
    return { ascent: maxAscent, descent: maxDescent };
  }

  /**
   * Renders tokens with line-wrapping along ruled notebook lines (for paragraphs and questions).
   */
  private renderTokensWithWrapping(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    tokens: MathToken[],
    startX: number,
    startY: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const span = this.getTokensVerticalSpan(tokens, fontSize);
    let currX = startX;
    // Push baseline down if numerators or ascenders are tall so they don't collide with the line above
    let currY = startY + (span.ascent > BASE_LINE_HEIGHT * 0.80 ? span.ascent - BASE_LINE_HEIGHT * 0.75 : 0);
    const shouldSnapToRule =
      (handwriting.snapToRuledLines ?? true) &&
      (this.currentPaper?.template === 'indian-ruled' || this.currentPaper?.template === 'exam-booklet');
    const rawPitch = Math.max(BASE_LINE_HEIGHT, span.ascent + span.descent + 12);
    const trueLineHeight = shouldSnapToRule
      ? Math.ceil(rawPitch / BASE_LINE_HEIGHT) * BASE_LINE_HEIGHT
      : rawPitch;
    let lineCount = 1;
    let wristState = this.initWristCluster(currX);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'space') {
        const wordSpacingMult = handwriting.wordSpacing ?? 1.0;
        currX += fontSize * 0.48 * token.widthMultiplier * wordSpacingMult;
        continue;
      }

      if (token.type === 'text') {
        // Split text token into words
        const words = token.text.split(/(\s+)/);
        for (const w of words) {
          if (!w) continue;
          if (/^\s+$/.test(w)) {
            const wordSpacingMult = handwriting.wordSpacing ?? 1.0;
            currX += fontSize * 0.48 * w.length * wordSpacingMult;
            continue;
          }

          const wWidth = this.measureWord(font, w, fontSize);

          // 2-Line Fraction Ducking: check if word ducks under hanging denominator from previous line
          const isUnderObstacle = this.prevLineObstacles.some(
            (obs) => Math.max(currX, obs.x1) < Math.min(currX + wWidth, obs.x2)
          );
          const isUnruled = this.currentPaper?.template === 'unruled-bond';
          const lineSlopeDeg = isUnruled
            ? (Math.abs(this.noise.noise1D(currY * 0.025)) * 1.1) + 0.25
            : (this.noise.noise1D(currY * 0.03) * 0.3);
          const lineSlopeRad = (lineSlopeDeg * Math.PI) / 180;
          const deltaX = currX - startX;
          const uphillY = isUnruled ? -Math.tan(lineSlopeRad) * deltaX : 0;
          const wordY = currY + uphillY + (isUnderObstacle ? 8.0 : 0);

          // Organic mistake cross-out (clean horizontal pen scratch with plausible typo)
          if (handwriting.scratchOutRate > 0 && this.noise.random() < handwriting.scratchOutRate * 0.25 && w.length >= 4) {
            const typo = this.generatePlausibleTypo(w);
            const typoW = this.renderWordOrChars(
              ctx,
              font,
              typo,
              currX,
              wordY,
              fontSize,
              inkColor,
              lineProgress,
              handwriting,
              roughCanvas,
              wristState
            );
            this.mathRenderer.drawMistakeScratch(
              ctx,
              currX,
              wordY,
              typoW,
              fontSize,
              inkColor
            );
            currX += typoW + 8;
          }

          // Caret ^ Supralinear insertion (BUG-06)
          const caretRate = handwriting.caretInsertionRate ?? 0;
          const insertedScale = 0.68;
          const estInsertedW = wWidth * insertedScale;
          if (
            caretRate > 0 &&
            w.length >= 2 &&
            w.length <= 5 &&
            !isUnderObstacle &&
            this.prevLineObstacles.length === 0 &&
            currX + estInsertedW + 18 <= this.currentRightMargin &&
            this.noise.random() < caretRate
          ) {
            const caretW = this.mathRenderer.drawCaretMark(ctx, currX, wordY, fontSize, inkColor);
            const insX = currX + Math.max(0, (caretW - estInsertedW) * 0.35);
            const actualInsW = this.renderWordOrChars(
              ctx,
              font,
              w,
              insX,
              wordY - fontSize * 0.68,
              fontSize * insertedScale,
              inkColor,
              lineProgress,
              handwriting,
              roughCanvas,
              wristState
            );
            currX += Math.max(caretW + 4, actualInsW * 0.85 + 6);
            continue;
          }

          // Margin squeeze or wrap
          const remainingSpace = this.currentRightMargin - currX;
          const shouldSqueeze =
            remainingSpace < wWidth + 35 &&
            remainingSpace > wWidth * 0.72 &&
            this.noise.random() < handwriting.marginSqueezeRate;

          if (shouldSqueeze) {
            // Fix canvas rotation origin: translate to (currX, wordY) before rotating
            ctx.save();
            ctx.translate(currX, wordY);
            ctx.rotate((-3.5 * Math.PI) / 180);
            const squeezedW = this.renderWordOrChars(
              ctx,
              font,
              w,
              0,
              4,
              fontSize * 0.88,
              inkColor,
              lineProgress,
              handwriting,
              roughCanvas,
              wristState
            );
            ctx.restore();
            currX += squeezedW * 0.85;
          } else if (currX + wWidth > this.currentRightMargin + (this.noise.random() - 0.5) * 16) {
            // Wrap to next line
            this.prevLineObstacles = this.currentLineObstacles;
            this.currentLineObstacles = [];
            currY += trueLineHeight;
            lineCount++;
            currX = startX + (this.noise.random() - 0.5) * 8 * handwriting.marginWander;
            wristState = this.initWristCluster(currX);
            const wrapUnder = this.prevLineObstacles.some(
              (obs) => Math.max(currX, obs.x1) < Math.min(currX + wWidth, obs.x2)
            );
            const drawnW = this.renderWordOrChars(ctx, font, w, currX, currY + (wrapUnder ? 8.0 : 0), fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
            currX += Math.max(wWidth, drawnW);
          } else {
            const drawnW = this.renderWordOrChars(ctx, font, w, currX, wordY, fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
            currX += Math.max(wWidth, drawnW);
          }
        }
        continue;
      }

      // Inline math tokens: delimiters, operators, fractions, scripts, roots
      const tokenWidth = this.estimateTokenWidth(font, token, fontSize);

      if (currX + tokenWidth > this.currentRightMargin && currX > startX + 100) {
        // Wrap to next line before rendering math token
        this.prevLineObstacles = this.currentLineObstacles;
        this.currentLineObstacles = [];
        currY += trueLineHeight;
        lineCount++;
        currX = startX + (this.noise.random() - 0.5) * 8 * handwriting.marginWander;
        wristState = this.initWristCluster(currX);
      }

      const isTokUnder = this.prevLineObstacles.some(
        (obs) => Math.max(currX, obs.x1) < Math.min(currX + tokenWidth, obs.x2)
      );

      // Scale oversized single token if it exceeds remaining available width
      const availWidth = (this.currentRightMargin - 16) - currX;
      let scaleRatio = 1.0;
      if (tokenWidth > availWidth && availWidth > 50) {
        scaleRatio = Math.max(0.65, availWidth / tokenWidth);
      }

      if (scaleRatio < 1.0) {
        ctx.save();
        ctx.translate(currX, currY + (isTokUnder ? 8.0 : 0));
        ctx.scale(scaleRatio, scaleRatio);
        ctx.translate(-currX, -(currY + (isTokUnder ? 8.0 : 0)));
      }

      currX += this.renderSingleToken(
        ctx,
        font,
        token,
        currX,
        currY + (isTokUnder ? 8.0 : 0),
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        wristState
      ) * scaleRatio;

      if (scaleRatio < 1.0) {
        ctx.restore();
      }
    }

    return lineCount * trueLineHeight + (this.noise.random() - 0.5) * 4;
  }

  /**
   * Renders a linear sequence of math derivation tokens (for math-step blocks).
   */
  private renderTokenSequence(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    tokens: MathToken[],
    startX: number,
    baseY: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): { width: number; height: number; lines: Array<{ y: number; width: number; height: number }> } {
    let currX = startX;
    let currY = baseY;
    let currentLineMaxHeight = BASE_LINE_HEIGHT;
    let maxWidth = 0;
    let lineCount = 1;
    let wristState = this.initWristCluster(startX);
    const lines: Array<{ y: number; width: number; height: number }> = [];

    // Section 3A: Full-Line Uphill Angle Drift on unruled paper (+0.3° to +1.6°)
    const isUnruled = this.currentPaper?.template === 'unruled-bond';
    const lineSlopeDeg = isUnruled
      ? (Math.abs(this.noise.noise1D(baseY * 0.025)) * 1.3) + 0.3
      : (this.noise.noise1D(baseY * 0.03) * 0.35);
    const lineSlopeRad = (lineSlopeDeg * Math.PI) / 180;

    let horizonRandomWalkY = 0;
    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const token = tokens[tIdx];
      const tokenWidth = this.estimateTokenWidth(font, token, fontSize);

      if (token.type === 'operator' && (token.symbol === '=' || token.symbol === '+' || token.symbol === '⇒' || token.symbol === '-')) {
        horizonRandomWalkY += (this.noise.random() - 0.48) * (isUnruled ? 2.5 : 1.0);
      }

      // Long-equation wrapping: auto-wrap onto continuation line indented by +45px
      if (currX + tokenWidth > this.currentRightMargin - 20 && currX > startX + 20) {
        this.prevLineObstacles = this.currentLineObstacles;
        this.currentLineObstacles = [];
        const lineWidth = currX - (lineCount > 1 ? startX + 45 : startX);
        maxWidth = Math.max(maxWidth, lineWidth);
        lines.push({ y: currY, width: lineWidth, height: currentLineMaxHeight });
        const shouldSnapToRule =
          (handwriting.snapToRuledLines ?? true) &&
          (this.currentPaper?.template === 'indian-ruled' || this.currentPaper?.template === 'exam-booklet');
        const rawStepAdvance = Math.max(BASE_LINE_HEIGHT * 1.5, currentLineMaxHeight + 14);
        currY += shouldSnapToRule
          ? Math.ceil(rawStepAdvance / BASE_LINE_HEIGHT) * BASE_LINE_HEIGHT
          : rawStepAdvance;
        lineCount++;
        currX = startX + 45 + (this.noise.random() - 0.5) * 6 * handwriting.marginWander;
        wristState = this.initWristCluster(currX);
        currentLineMaxHeight = BASE_LINE_HEIGHT;
      }

      const isTokUnder = this.prevLineObstacles.some(
        (obs) => Math.max(currX, obs.x1) < Math.min(currX + tokenWidth, obs.x2)
      );

      const dx = currX - startX;
      const elbowSagY = isUnruled ? Math.pow(dx / 650, 2) * 3.5 : 0;
      // In canvas coords, rising/uphill baseline subtracts Math.tan(lineSlopeRad) * dx
      const effectiveY = currY - Math.tan(lineSlopeRad) * dx + elbowSagY + horizonRandomWalkY + (isTokUnder ? 8.0 : 0);

      // Section 3C: Operator Whitespace Clustering
      // Tight clustering around internal arithmetic (+, -); relaxed breathing room around relational (=, ⇒)
      let origMultiplier = 1;
      if (token.type === 'space') {
        origMultiplier = token.widthMultiplier;
        let prevNonSpace: MathToken | null = null;
        for (let p = tIdx - 1; p >= 0; p--) {
          if (tokens[p].type !== 'space') { prevNonSpace = tokens[p]; break; }
        }
        let nextNonSpace: MathToken | null = null;
        for (let n = tIdx + 1; n < tokens.length; n++) {
          if (tokens[n].type !== 'space') { nextNonSpace = tokens[n]; break; }
        }

        const isNearArithmetic =
          (prevNonSpace?.type === 'operator' && (prevNonSpace.symbol === '+' || prevNonSpace.symbol === '-')) ||
          (nextNonSpace?.type === 'operator' && (nextNonSpace.symbol === '+' || nextNonSpace.symbol === '-'));

        const isNearRelational =
          (prevNonSpace?.type === 'operator' && (prevNonSpace.symbol === '=' || prevNonSpace.symbol === '⇒' || prevNonSpace.symbol === '→')) ||
          (nextNonSpace?.type === 'operator' && (nextNonSpace.symbol === '=' || nextNonSpace.symbol === '⇒' || nextNonSpace.symbol === '→'));

        if (isNearArithmetic) {
          token.widthMultiplier = origMultiplier * 0.30;
        } else if (isNearRelational) {
          token.widthMultiplier = Math.max(origMultiplier, 1.35);
        }
      }

      // Scale oversized single token if it exceeds remaining available width
      const availWidth = (this.currentRightMargin - 16) - currX;
      let scaleRatio = 1.0;
      if (token.type !== 'text' && token.type !== 'space' && tokenWidth > availWidth && availWidth > 50) {
        scaleRatio = Math.max(0.65, availWidth / tokenWidth);
      }

      if (scaleRatio < 1.0) {
        ctx.save();
        ctx.translate(currX, effectiveY);
        ctx.scale(scaleRatio, scaleRatio);
        ctx.translate(-currX, -effectiveY);
      }

      const advanceX = this.renderSingleToken(
        ctx,
        font,
        token,
        currX,
        effectiveY,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        wristState
      ) * scaleRatio;

      if (scaleRatio < 1.0) {
        ctx.restore();
      }

      if (token.type === 'space') {
        token.widthMultiplier = origMultiplier;
      }

      currX += advanceX;

      const tokSpan = this.getTokenVerticalSpan(token, fontSize);
      currentLineMaxHeight = Math.max(currentLineMaxHeight, tokSpan.ascent + tokSpan.descent + 10);
      if (token.type === 'fraction') {
        currentLineMaxHeight = Math.max(currentLineMaxHeight, BASE_LINE_HEIGHT * 1.55);
      } else if (token.type === 'matrix') {
        currentLineMaxHeight = Math.max(currentLineMaxHeight, token.cells.length * fontSize * 1.5);
      } else if (token.type === 'boxed') {
        currentLineMaxHeight = Math.max(currentLineMaxHeight, tokSpan.ascent + tokSpan.descent + 20);
      }
    }

    const finalLineWidth = currX - (lineCount > 1 ? startX + 45 : startX);
    maxWidth = Math.max(maxWidth, finalLineWidth);
    lines.push({ y: currY, width: finalLineWidth, height: currentLineMaxHeight });
    return {
      width: maxWidth,
      height: (currY - baseY) + currentLineMaxHeight,
      lines,
    };
  }

  /**
   * Renders an individual MathToken.
   */
  private renderSingleToken(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    token: MathToken,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>,
    wristState?: WristClusterState
  ): number {
    if (token.type === 'space') {
      const wordSpacingMult = handwriting.wordSpacing ?? 1.0;
      return this.getConsistentSpaceAdvance(fontSize, token.widthMultiplier, wordSpacingMult, y);
    }

    if (token.type === 'text') {
      const isIsolatedVar = token.text.length === 1 && /^[a-zA-Z]$/.test(token.text) && !token.isFunction;
      const varFontSize = isIsolatedVar ? fontSize * 1.10 : fontSize;
      const varSlant = isIsolatedVar ? 5.5 : undefined;
      const isMath = isIsolatedVar;

      const w = this.renderWordOrChars(
        ctx,
        font,
        token.text,
        x + (isIsolatedVar ? 1.5 : 0),
        y,
        varFontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        wristState,
        varSlant,
        isMath
      );
      return w + (isIsolatedVar ? 3.0 : 0);
    }

    if (token.type === 'delimiter') {
      return this.renderDelimiter(ctx, token.char, x, y, fontSize, inkColor, token.isBig);
    }

    if (token.type === 'operator') {
      return this.renderMathOperator(
        ctx,
        font,
        token.symbol,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
    }

    if (token.type === 'big-op') {
      return this.renderBigOp(
        ctx,
        font,
        token,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
    }

    if (token.type === 'matrix') {
      return this.renderMatrix(
        ctx,
        font,
        token,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
    }

    if (token.type === 'fraction') {
      return this.renderFraction(
        ctx,
        font,
        token.numerator,
        token.denominator,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        wristState
      );
    }

    if (token.type === 'script') {
      return this.renderScript(
        ctx,
        font,
        token.base,
        token.sup,
        token.sub,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        wristState,
        token.isBigDelimiter
      );
    }

    if (token.type === 'root') {
      return this.renderRoot(
        ctx,
        font,
        token.content,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas,
        token.index
      );
    }

    if (token.type === 'boxed') {
      return this.renderBoxedExpr(
        ctx,
        font,
        token.content,
        x,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
    }

    return 10;
  }

  /**
   * Renders delimiters: (), [], {}, ||
   */
  private renderDelimiter(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isBig = false
  ): number {
    const topY = isBig ? y - fontSize * 1.42 : y - fontSize * 0.72;
    const bottomY = isBig ? y + fontSize * 0.82 : y + fontSize * 0.24;

    if (char === '(' || char === ')') {
      return this.mathRenderer.drawParenthesis(ctx, x, topY, bottomY, char === '(', inkColor, fontSize);
    }
    if (char === '[' || char === ']') {
      return this.mathRenderer.drawBracket(ctx, x, topY, bottomY, char === '[', inkColor, fontSize);
    }
    if (char === '{' || char === '}') {
      return this.mathRenderer.drawBrace(ctx, x, topY, bottomY, char === '{', inkColor, fontSize);
    }
    if (char === '|') {
      if (isBig) {
        const evalTopY = y - fontSize * 1.15;
        const evalBottomY = y + fontSize * 0.65;
        return this.mathRenderer.drawEvaluationBar(ctx, x, evalTopY, evalBottomY, inkColor, fontSize);
      }
      return this.mathRenderer.drawAbsBar(ctx, x, topY, bottomY, inkColor, fontSize);
    }
    return 8;
  }

  /**
   * Renders math operators (=, +, -, etc.)
   */
  private renderMathOperator(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    symbol: string,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    if (symbol.startsWith("'")) {
      return this.mathRenderer.drawPrimeTicks(ctx, x, y, symbol.length, fontSize, inkColor);
    }
    if (symbol === '=') return this.mathRenderer.drawImperfectEquals(ctx, x, y, fontSize, inkColor);
    if (symbol === '+') return this.mathRenderer.drawPlus(ctx, x, y, fontSize, inkColor);
    if (symbol === '-') return this.mathRenderer.drawMinus(ctx, x, y, fontSize, inkColor);
    if (symbol === '·') return this.mathRenderer.drawDot(ctx, x, y, fontSize, inkColor);
    if (symbol === '×') return this.mathRenderer.drawTimes(ctx, x, y, fontSize, inkColor);
    if (symbol === '⇒') return this.mathRenderer.drawArrow(ctx, x, y, fontSize, inkColor, true);
    if (symbol === '→') return this.mathRenderer.drawArrow(ctx, x, y, fontSize, inkColor, false);
    if (symbol === '∴') return this.mathRenderer.drawTherefore(ctx, x, y, fontSize, inkColor);
    if (symbol === '∵') return this.mathRenderer.drawBecause(ctx, x, y, fontSize, inkColor);
    if (symbol === '\\int') return this.mathRenderer.drawIntegral(ctx, x, y, fontSize, inkColor);
    if (symbol === '\\sum') return this.mathRenderer.drawSummation(ctx, x, y, fontSize, inkColor);
    if (symbol === '\\prod') return this.mathRenderer.drawProduct(ctx, x, y, fontSize, inkColor);
    if (symbol === '≠') return this.mathRenderer.drawNotEqual(ctx, x, y, fontSize, inkColor);
    if (symbol === '≈') return this.mathRenderer.drawApprox(ctx, x, y, fontSize, inkColor);
    if (symbol === '±') return this.mathRenderer.drawPlusMinus(ctx, x, y, fontSize, inkColor, false);
    if (symbol === '∓') return this.mathRenderer.drawPlusMinus(ctx, x, y, fontSize, inkColor, true);
    if (symbol === '<') return this.mathRenderer.drawStrictInequality(ctx, x, y, fontSize, inkColor, true);
    if (symbol === '>') return this.mathRenderer.drawStrictInequality(ctx, x, y, fontSize, inkColor, false);
    if (symbol === '≤' || symbol === '\\le' || symbol === '\\leq') return this.mathRenderer.drawInequality(ctx, x, y, fontSize, inkColor, true);
    if (symbol === '≥' || symbol === '\\ge' || symbol === '\\geq') return this.mathRenderer.drawInequality(ctx, x, y, fontSize, inkColor, false);
    if (symbol === 'δ') return this.mathRenderer.drawDeltaLower(ctx, x, y, fontSize, inkColor);
    if (symbol === 'α') return this.mathRenderer.drawAlpha(ctx, x, y, fontSize, inkColor);
    if (symbol === 'τ') return this.mathRenderer.drawTau(ctx, x, y, fontSize, inkColor);
    if (symbol === '∈') return this.mathRenderer.drawElementOf(ctx, x, y, fontSize, inkColor);
    if (symbol === 'θ' || symbol === '\\theta') return this.mathRenderer.drawTheta(ctx, x, y, fontSize, inkColor);
    if (symbol === 'π' || symbol === '\\pi') return this.mathRenderer.drawPi(ctx, x, y, fontSize, inkColor);
    if (symbol === 'β' || symbol === '\\beta') return this.mathRenderer.drawBeta(ctx, x, y, fontSize, inkColor);
    if (symbol === 'λ' || symbol === '\\lambda') return this.mathRenderer.drawLambda(ctx, x, y, fontSize, inkColor);
    if (symbol === 'φ' || symbol === 'ϕ' || symbol === '\\phi') return this.mathRenderer.drawPhi(ctx, x, y, fontSize, inkColor);
    if (symbol === 'ω' || symbol === '\\omega') return this.mathRenderer.drawOmega(ctx, x, y, fontSize, inkColor);
    if (symbol === 'μ' || symbol === '\\mu') return this.mathRenderer.drawMu(ctx, x, y, fontSize, inkColor);
    if (symbol === 'σ' || symbol === '\\sigma') return this.mathRenderer.drawSigma(ctx, x, y, fontSize, inkColor);
    if (symbol === '\\cdots') return this.mathRenderer.drawEllipsis(ctx, x, y, fontSize, inkColor, true);
    if (symbol === '\\dots' || symbol === '\\ldots' || symbol === '...') return this.mathRenderer.drawEllipsis(ctx, x, y, fontSize, inkColor, false);
    if (symbol === '∂') return this.mathRenderer.drawPartial(ctx, x, y, fontSize, inkColor);
    if (symbol === '∞') return this.mathRenderer.drawInfinity(ctx, x, y, fontSize, inkColor);
    if (symbol === 'Δ') return this.mathRenderer.drawDelta(ctx, x, y, fontSize, inkColor);
    if (symbol === '∇') return this.mathRenderer.drawNabla(ctx, x, y, fontSize, inkColor);
    if (symbol === 'ℒ') return this.mathRenderer.drawLaplaceL(ctx, x, y, fontSize, inkColor);
    if (symbol === '∀' || symbol === '\\forall') return this.mathRenderer.drawForall(ctx, x, y, fontSize, inkColor);
    if (symbol === '∃' || symbol === '\\exists') return this.mathRenderer.drawExists(ctx, x, y, fontSize, inkColor);
    if (symbol === '∪' || symbol === '\\cup') return this.mathRenderer.drawCup(ctx, x, y, fontSize, inkColor);
    if (symbol === '∩' || symbol === '\\cap') return this.mathRenderer.drawCap(ctx, x, y, fontSize, inkColor);
    if (symbol === '∼' || symbol === '~' || symbol === '\\sim') return this.mathRenderer.drawSim(ctx, x, y, fontSize, inkColor);
    if (symbol === 'Γ' || symbol === '\\Gamma') return this.mathRenderer.drawGamma(ctx, x, y, fontSize, inkColor);
    if (symbol === '/') {
      const scale = fontSize / 28;
      const w = 10 * scale;
      this.mathRenderer.drawHandLine(ctx, x + 2, y + 2 * scale, x + w - 1, y - fontSize * 0.72, 1.4, inkColor, 1.2, 2);
      return w + 3 * scale;
    }

    // Default symbol draw as text safely
    return this.renderWordOrChars(ctx, font, symbol, x, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
  }

  /**
   * Stacked Fraction: centers numerator tokens above denominator tokens with roughjs bar.
   */
  private renderFraction(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    numerator: MathToken[],
    denominator: MathToken[],
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>,
    wristState?: WristClusterState
  ): number {
    const fracFontSize = fontSize * 0.84;

    // Measure actual widths using estimateTokensWidth
    const numWidth = this.estimateTokensWidth(font, numerator, fracFontSize);
    const denWidth = this.estimateTokensWidth(font, denominator, fracFontSize);
    const contentMaxW = Math.max(numWidth, denWidth);

    // Clean, authentic horizontal bar overhang on both left and right sides
    const barPadding = Math.max(7, fracFontSize * 0.28);
    const totalBarWidth = contentMaxW + barPadding * 2;

    this.currentLineObstacles.push({ x1: x - 2, x2: x + totalBarWidth + 6 });

    // Center numerator and denominator over/under the fraction content area
    // with subtle organic student tremor (+-1.2px)
    const numJitter = (this.noise.random() - 0.5) * 2.4;
    const denJitter = (this.noise.random() - 0.5) * 2.4;
    const numX = x + barPadding + Math.max(0, (contentMaxW - numWidth) * 0.5) + numJitter;
    const denX = x + barPadding + Math.max(0, (contentMaxW - denWidth) * 0.5) + denJitter;

    // Fraction bar placed at math axis (center of operators like =, +, -)
    const barY = y - fontSize * 0.34 + (this.noise.random() - 0.5) * 1.2;

    // Optical vertical clearances:
    // Guarantee clean daylight between fraction bar and numerator/denominator ink
    const numSpan = this.getTokensVerticalSpan(numerator, fracFontSize);
    const denSpan = this.getTokensVerticalSpan(denominator, fracFontSize);

    const numDescent = Math.max(0, numSpan.descent);
    const denAscent = Math.max(fracFontSize * 0.70, denSpan.ascent);

    // Minimum clear daylight gap from fraction bar edge to nearest glyph ink
    const barTopClearance = Math.max(7.5, fracFontSize * 0.30);
    const barBottomClearance = Math.max(7.5, fracFontSize * 0.30);

    const numY = barY - numDescent - barTopClearance;
    const denY = barY + denAscent + barBottomClearance;

    let cx = numX;
    for (const t of numerator) {
      cx += this.renderSingleToken(ctx, font, t, cx, numY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
    }
    const actualNumRight = cx - x;

    const actualBarWidth = Math.max(totalBarWidth, actualNumRight + barPadding * 0.5);
    this.mathRenderer.drawFractionBar(ctx, roughCanvas, x, barY, actualBarWidth, fontSize, inkColor);

    cx = denX;
    for (const t of denominator) {
      cx += this.renderSingleToken(ctx, font, t, cx, denY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
    }
    const actualDenRight = cx - x;

    // Always advance past the furthest drawn pixel so subsequent tokens NEVER collide!
    return Math.max(actualBarWidth, actualNumRight, actualDenRight) + 8;
  }

  /**
   * Superscript & Subscript renderer (scaled to ~70% placed organically above/below baseline).
   */
  private renderScript(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    base: string | MathToken[],
    sup: MathToken[] | undefined,
    sub: MathToken[] | undefined,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>,
    wristState?: WristClusterState,
    isBigDelimiter?: boolean
  ): number {
    let currX = x;
    const isLim = typeof base === 'string' && base === 'lim';
    let baseWidth = 0;

    // Draw base
    if (typeof base === 'string') {
      if (base === '') {
        // Empty base: attached directly to delimiter
        baseWidth = 0;
      } else if (base === 'lim') {
        baseWidth = this.renderWordOrChars(ctx, font, 'lim', currX, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
        currX += baseWidth;
      } else if (base === 'Δ') {
        baseWidth = this.mathRenderer.drawDelta(ctx, currX, y, fontSize, inkColor);
        currX += baseWidth;
      } else if (base === '∇') {
        baseWidth = this.mathRenderer.drawNabla(ctx, currX, y, fontSize, inkColor);
        currX += baseWidth;
      } else if (base === 'ℒ') {
        baseWidth = this.mathRenderer.drawLaplaceL(ctx, currX, y, fontSize, inkColor);
        currX += baseWidth;
      } else {
        const isIsolated = base.length === 1 && /^[a-zA-Z]$/.test(base);
        baseWidth = this.renderWordOrChars(ctx, font, base, currX, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState, undefined, isIsolated);
        currX += baseWidth;
      }
    } else {
      for (const t of base) {
        currX += this.renderSingleToken(ctx, font, t, currX, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
      }
      baseWidth = currX - x;
    }

    const scriptFontSize = fontSize * 0.70;
    const startScriptX = currX;
    let maxScriptAdvance = 0;

    // Special case for \hat accent: circumflex is centered horizontally right above the base glyph!
    const isHatAccent = sup && sup.length === 1 && sup[0].type === 'operator' && sup[0].symbol === '^';
    if (isHatAccent) {
      const centerX = x + baseWidth * 0.5;
      const topY = y - fontSize * 0.72;
      this.mathRenderer.drawHatAccent(ctx, centerX, topY, fontSize, inkColor);
      if (sub && sub.length > 0) {
        const subY = y + fontSize * 0.22 + (this.noise.random() - 0.5) * 1.5;
        let sx = currX;
        for (const t of sub) {
          sx += this.renderSingleToken(ctx, font, t, sx, subY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
        }
        return sx - x;
      }
      return baseWidth;
    }

    // Special case for \vec accent: right-arrow overhead
    const isVecAccent = sup && sup.length === 1 && sup[0].type === 'operator' && sup[0].symbol === '\\vec';
    if (isVecAccent) {
      const topY = y - fontSize * 0.74;
      this.mathRenderer.drawVectorArrow(ctx, x + 1, x + Math.max(baseWidth - 1, fontSize * 0.42), topY, fontSize, inkColor);
      if (sub && sub.length > 0) {
        const subY = y + fontSize * 0.22 + (this.noise.random() - 0.5) * 1.5;
        let sx = currX;
        for (const t of sub) {
          sx += this.renderSingleToken(ctx, font, t, sx, subY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
        }
        return sx - x;
      }
      return baseWidth;
    }

    const isDelimiterScript = typeof base === 'string' && base === '' && Boolean(isBigDelimiter);

    // Special case for \lim: subscript is centered directly underneath 'lim'
    if (isLim && sub && sub.length > 0) {
      const subWidth = this.estimateTokensWidth(font, sub, scriptFontSize);
      const subX = x + Math.max(0, (baseWidth - subWidth) * 0.5) + (this.noise.random() - 0.5) * 1.5;
      const subY = y + fontSize * 0.38;
      let sx = subX;
      for (const t of sub) {
        sx += this.renderSingleToken(ctx, font, t, sx, subY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
      }
      maxScriptAdvance = Math.max(0, subWidth - baseWidth);
    } else {
      // Standard subscript (or bottom evaluation limit for delimiters)
      if (sub && sub.length > 0) {
        const subOffset = isDelimiterScript ? fontSize * 0.70 : fontSize * 0.22;
        const subY = y + subOffset + (this.noise.random() - 0.5) * 1.5;
        let sx = startScriptX;
        for (const t of sub) {
          sx += this.renderSingleToken(ctx, font, t, sx, subY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
        }
        maxScriptAdvance = Math.max(maxScriptAdvance, sx - startScriptX);
      }
    }

    // Superscript (or top evaluation limit for delimiters)
    if (sup && sup.length > 0) {
      const supOffset = isDelimiterScript ? fontSize * 1.30 : fontSize * 0.44;
      const supY = y - supOffset + (this.noise.random() - 0.5) * 1.5;
      let sx = startScriptX;
      for (const t of sup) {
        sx += this.renderSingleToken(ctx, font, t, sx, supY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
      }
      maxScriptAdvance = Math.max(maxScriptAdvance, sx - startScriptX);
    }

    return (startScriptX - x) + maxScriptAdvance + 2;
  }

  /**
   * Big-Operators with Limits: \int_a^b, \sum_{i=1}^n, \prod_{k=1}^m
   */
  private renderBigOp(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    token: MathBigOp,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const isInt = token.symbol === '\\int';
    const limitFontSize = fontSize * 0.65;

    if (isInt) {
      const intWidth = this.mathRenderer.drawIntegral(ctx, x, y, fontSize, inkColor);

      // Lower limit placed comfortably at bottom-right of lower hook
      let lowerAdvance = 0;
      if (token.lower && token.lower.length > 0) {
        const lowerY = y + fontSize * 0.40 + (this.noise.random() - 0.5) * 1.5;
        let lx = x + intWidth * 0.48 + (this.noise.random() - 0.5) * 1.5;
        for (const t of token.lower) {
          lx += this.renderSingleToken(ctx, font, t, lx, lowerY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
        lowerAdvance = lx - x;
      }

      // Upper limit placed comfortably at top-right of upper hook
      let upperAdvance = 0;
      if (token.upper && token.upper.length > 0) {
        const upperY = y - fontSize * 0.98 + (this.noise.random() - 0.5) * 1.5;
        let ux = x + intWidth * 0.72 + (this.noise.random() - 0.5) * 1.5;
        for (const t of token.upper) {
          ux += this.renderSingleToken(ctx, font, t, ux, upperY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
        upperAdvance = ux - x;
      }

      return Math.max(intWidth + 6, lowerAdvance + 6, upperAdvance + 6);
    } else {
      // \sum or \prod
      const opWidth =
        token.symbol === '\\sum'
          ? this.mathRenderer.drawSummation(ctx, x, y, fontSize, inkColor, true)
          : this.mathRenderer.drawProduct(ctx, x, y, fontSize, inkColor, true);

      const lowerWidth = token.lower ? this.estimateTokensWidth(font, token.lower, limitFontSize) : 0;
      const upperWidth = token.upper ? this.estimateTokensWidth(font, token.upper, limitFontSize) : 0;
      const maxWidth = Math.max(opWidth, lowerWidth, upperWidth);

      // Lower limit centered directly below
      if (token.lower && token.lower.length > 0) {
        const lowerY = y + fontSize * 0.35;
        let lx = x + Math.max(0, (maxWidth - lowerWidth) * 0.5);
        for (const t of token.lower) {
          lx += this.renderSingleToken(ctx, font, t, lx, lowerY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
      }

      // Upper limit centered directly above
      if (token.upper && token.upper.length > 0) {
        const upperY = y - fontSize * 0.85;
        let ux = x + Math.max(0, (maxWidth - upperWidth) * 0.5);
        for (const t of token.upper) {
          ux += this.renderSingleToken(ctx, font, t, ux, upperY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
      }

      return maxWidth + 6;
    }
  }

  /**
   * Renders matrices (\begin{bmatrix}, \begin{pmatrix}, \begin{vmatrix}, \begin{cases})
   * with 2D grid alignment, subtle human drift (±3px), and tall hand-drawn brackets/parentheses/bars/braces.
   */
  private renderMatrix(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    token: MathMatrix,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const { bracket, cells } = token;
    const numRows = cells.length;
    if (numRows === 0) return 20;

    let numCols = 0;
    for (const row of cells) {
      if (row.length > numCols) numCols = row.length;
    }
    if (numCols === 0) return 20;

    const isBinomial = bracket === 'p' && numRows === 2 && numCols === 1;
    const cellFontSize = isBinomial ? fontSize * 0.82 : fontSize * 0.85;

    // 1. Compute dynamic height per row (so rows with fractions get 65-75px instead of 36px!)
    const rowSpans: Array<{ ascent: number; descent: number; height: number }> = [];
    let totalMatrixHeight = 0;
    for (let r = 0; r < numRows; r++) {
      let maxAsc = cellFontSize * 0.80;
      let maxDesc = cellFontSize * 0.30;
      for (let c = 0; c < numCols; c++) {
        const span = this.getTokensVerticalSpan(cells[r][c] || [], cellFontSize);
        if (span.ascent > maxAsc) maxAsc = span.ascent;
        if (span.descent > maxDesc) maxDesc = span.descent;
      }
      const minRowH = isBinomial ? fontSize * 1.05 : fontSize * 1.4;
      const extraPad = isBinomial ? 6 : 14;
      const rh = Math.max(minRowH, maxAsc + maxDesc + extraPad);
      rowSpans.push({ ascent: maxAsc, descent: maxDesc, height: rh });
      totalMatrixHeight += rh;
    }

    // Binomials center symmetrically around the math axis (y - fontSize * 0.35)
    // Multi-row general matrices or cases anchor near current line top
    const bracketTopY = isBinomial
      ? (y - fontSize * 0.35) - totalMatrixHeight * 0.5 - 2
      : y - rowSpans[0].ascent - 4;
    const bracketBottomY = isBinomial
      ? (y - fontSize * 0.35) + totalMatrixHeight * 0.5 + 2
      : bracketTopY + totalMatrixHeight + 4;

    // 2. Compute column widths
    const colWidths: number[] = new Array(numCols).fill(24);
    for (let c = 0; c < numCols; c++) {
      let maxW = 18;
      for (let r = 0; r < numRows; r++) {
        const cellTokens = cells[r][c] || [];
        const cw = this.estimateTokensWidth(font, cellTokens, cellFontSize);
        if (cw > maxW) maxW = cw;
      }
      colWidths[c] = maxW + (isBinomial ? 10 : 22);
    }

    const bracketPadding = isBinomial ? 9 : 14;
    const leftBracketX = x;
    const contentStartX = x + bracketPadding;

    const colXPositions: number[] = [contentStartX];
    for (let c = 0; c < numCols; c++) {
      colXPositions.push(colXPositions[c] + colWidths[c]);
    }

    const totalContentWidth = colXPositions[numCols] - contentStartX;
    const rightBracketX = contentStartX + totalContentWidth + (isBinomial ? 3 : 6);

    // 3. Draw Left Enclosure
    if (bracket === 'b') {
      this.mathRenderer.drawBracket(ctx, leftBracketX, bracketTopY, bracketBottomY, true, inkColor, fontSize);
    } else if (bracket === 'p') {
      this.mathRenderer.drawParenthesis(ctx, leftBracketX, bracketTopY, bracketBottomY, true, inkColor, fontSize);
    } else if (bracket === 'v') {
      this.mathRenderer.drawAbsBar(ctx, leftBracketX, bracketTopY, bracketBottomY, inkColor, fontSize);
    } else if (bracket === 'cases') {
      this.mathRenderer.drawBrace(ctx, leftBracketX, bracketTopY, bracketBottomY, true, inkColor, fontSize);
    }

    // 4. Render Each Row at Its Accumulated Baseline
    let cursorY = bracketTopY;
    for (let r = 0; r < numRows; r++) {
      const rowBaselineY = cursorY + rowSpans[r].ascent + 4;
      for (let c = 0; c < numCols; c++) {
        const cTokens = cells[r][c] || [];
        if (cTokens.length === 0) continue;

        const cw = this.estimateTokensWidth(font, cTokens, cellFontSize);
        const colW = colWidths[c];
        const driftX = (this.noise.random() - 0.5) * 2.5;
        const driftY = (this.noise.random() - 0.5) * 1.5;
        // Left-align cases branches; center regular matrix cells
        const cellX =
          bracket === 'cases'
            ? colXPositions[c] + 4 + driftX
            : colXPositions[c] + Math.max(4, (colW - cw) * 0.5) + driftX;

        let cx = cellX;
        for (const t of cTokens) {
          cx += this.renderSingleToken(
            ctx,
            font,
            t,
            cx,
            rowBaselineY + driftY,
            cellFontSize,
            inkColor,
            lineProgress,
            handwriting,
            roughCanvas
          );
        }
      }
      cursorY += rowSpans[r].height;
    }

    // 5. Draw Right Enclosure (if not cases)
    if (bracket !== 'cases') {
      if (bracket === 'b') {
        this.mathRenderer.drawBracket(ctx, rightBracketX, bracketTopY, bracketBottomY, false, inkColor, fontSize);
      } else if (bracket === 'p') {
        this.mathRenderer.drawParenthesis(ctx, rightBracketX, bracketTopY, bracketBottomY, false, inkColor, fontSize);
      } else if (bracket === 'v') {
        this.mathRenderer.drawAbsBar(ctx, rightBracketX, bracketTopY, bracketBottomY, inkColor, fontSize);
      }
    }

    return bracket === 'cases'
      ? totalContentWidth + bracketPadding + 12
      : isBinomial
      ? totalContentWidth + bracketPadding * 2 + 6
      : totalContentWidth + bracketPadding * 2 + 14;
  }

  /**
   * Square Root renderer.
   */
  private renderRoot(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    content: MathToken[],
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>,
    rootIndex?: string
  ): number {
    let startX = x;
    if (rootIndex) {
      const idxFontSize = fontSize * 0.58;
      const idxTokens = parseLatexExpressionTokens(rootIndex);
      const idxW = this.estimateTokensWidth(font, idxTokens, idxFontSize);
      const idxY = y - fontSize * 0.52;
      let ix = startX + 2;
      for (const t of idxTokens) {
        ix += this.renderSingleToken(ctx, font, t, ix, idxY, idxFontSize, inkColor, lineProgress, handwriting, roughCanvas);
      }
      startX += Math.max(0, idxW - 4);
    }

    const span = this.getTokensVerticalSpan(content, fontSize);
    const contentWidth = this.estimateTokensWidth(font, content, fontSize);
    const contentHeight = span.ascent + span.descent;
    const { innerX, totalWidth } = this.mathRenderer.drawSquareRoot(
      ctx,
      roughCanvas,
      startX,
      y,
      contentWidth,
      contentHeight,
      fontSize,
      inkColor,
      span.descent
    );

    let cx = innerX;
    for (const t of content) {
      cx += this.renderSingleToken(ctx, font, t, cx, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
    }

    return (startX - x) + totalWidth;
  }

  /**
   * Boxed Expression renderer.
   */
  private renderBoxedExpr(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    content: MathToken[],
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const span = this.getTokensVerticalSpan(content, fontSize);
    const padX = 14;
    const padTop = 10;
    const padBottom = 10;

    let cx = x + padX;
    for (const t of content) {
      cx += this.renderSingleToken(ctx, font, t, cx, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
    }

    const renderedWidth = cx - (x + padX);
    const estWidth = this.estimateTokensWidth(font, content, fontSize);
    const contentWidth = Math.max(renderedWidth, estWidth);
    const totalBoxWidth = contentWidth + padX * 2;
    const boxTopY = y - span.ascent - padTop;
    const boxHeight = span.ascent + span.descent + padTop + padBottom;

    if (
      this.mainPageCtx &&
      this.currentPaper?.highlighterMode &&
      this.currentPaper.highlighterMode !== 'none' &&
      (this.currentPaper.highlighterTarget === 'boxed' ||
        this.currentPaper.highlighterTarget === 'both' ||
        !this.currentPaper.highlighterTarget)
    ) {
      this.inkAndScan.drawHighlighterStroke(
        this.mainPageCtx,
        x - 2,
        boxTopY + 2,
        totalBoxWidth + 4,
        boxHeight - 4,
        this.currentPaper.highlighterMode
      );
    }

    this.mathRenderer.drawBoxedAnswer(
      ctx,
      roughCanvas,
      font,
      this.mutator,
      x,
      boxTopY,
      totalBoxWidth,
      boxHeight,
      fontSize,
      inkColor,
      handwriting
    );

    return totalBoxWidth + 14;
  }

  /**
   * Boxed Answer Block renderer.
   */
  private renderBoxedAnswerBlock(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    tokens: MathToken[],
    startX: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const isSingleBoxedToken = tokens.length === 1 && tokens[0].type === 'boxed';

    if (isSingleBoxedToken) {
      const boxedToken = tokens[0] as MathBoxed;
      const span = this.getTokensVerticalSpan(boxedToken.content, fontSize);
      this.renderBoxedExpr(
        ctx,
        font,
        boxedToken.content,
        startX + 12,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
      const totalHeight = span.ascent + span.descent + 20;
      return Math.max(BASE_LINE_HEIGHT * 1.8, totalHeight + BASE_LINE_HEIGHT * 0.6);
    }

    // Otherwise render sequence and wrap entire answer block in box/oval/underline
    const span = this.getTokensVerticalSpan(tokens, fontSize);
    const padX = 18;
    const padTop = 12;
    const padBottom = 12;

    const seqResult = this.renderTokenSequence(
      ctx,
      font,
      tokens,
      startX + padX,
      y,
      fontSize,
      inkColor,
      lineProgress,
      handwriting,
      roughCanvas
    );

    const estWidth = this.estimateTokensWidth(font, tokens, fontSize);
    const totalBoxWidth = Math.max(seqResult.width, estWidth) + padX * 2 + 10;
    const boxTopY = y - span.ascent - padTop;
    const boxHeight = Math.max(span.ascent + span.descent + padTop + padBottom, seqResult.height + 14);

    if (
      this.mainPageCtx &&
      this.currentPaper?.highlighterMode &&
      this.currentPaper.highlighterMode !== 'none' &&
      (this.currentPaper.highlighterTarget === 'boxed' ||
        this.currentPaper.highlighterTarget === 'both' ||
        !this.currentPaper.highlighterTarget)
    ) {
      this.inkAndScan.drawHighlighterStroke(
        this.mainPageCtx,
        startX - 2,
        boxTopY + 2,
        totalBoxWidth + 4,
        boxHeight - 4,
        this.currentPaper.highlighterMode
      );
    }

    this.mathRenderer.drawBoxedAnswer(
      ctx,
      roughCanvas,
      font,
      this.mutator,
      startX,
      boxTopY,
      totalBoxWidth,
      boxHeight,
      fontSize,
      inkColor,
      handwriting
    );

    return Math.max(BASE_LINE_HEIGHT * 1.8, boxHeight + BASE_LINE_HEIGHT * 0.6);
  }

  /**
   * Renders a single text line (for headings).
   */
  private renderTextLine(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    return this.renderWordOrChars(ctx, font, text, x, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
  }

  /**
   * Vector Glyph Decomposition & Rendering:
   * Uses opentype.js Bezier commands mutated topologically by GlyphMutator.
   * Sets result.path.fill = inkColor so characters are drawn in authentic pen color!
   */
  private renderWordOrChars(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    text: string,
    startX: number,
    y: number,
    fontSize: number,
    inkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>,
    wristState?: WristClusterState,
    extraSlant?: number,
    isMathContext = false,
    isColdStart = false
  ): number {
    const pageSlant = this.getPageSlantOffset(startX, y, lineProgress, handwriting.handFatigue ?? 0.2);
    const effectiveExtraSlant = (extraSlant ?? 0) + pageSlant;

    if (handwriting.cursiveMode === 'vector-cursive' && !isMathContext) {
      const effectiveSlantHw = {
        ...handwriting,
        slantAngle: (handwriting.slantAngle ?? 12) + pageSlant,
      };
      const segments = text.match(/[A-Za-z]+|[^A-Za-z]+/g) || [text];
      let segX = startX;
      const defaultPen = this.currentPen || {
        bodyColorPreset: 'blue',
        headingColorPreset: 'red',
        bodyColorHex: inkColor,
        headingColorHex: inkColor,
        penStyle: 'ballpoint',
        strokeWidth: 1.6,
        inkPooling: true,
        drySkips: false,
        headingUnderline: 'single',
      };
      for (const seg of segments) {
        if (/^[A-Za-z]+$/.test(seg) && this.cursiveEngine.canRenderWordSegment(seg, this.currentAllographs, handwriting.cursiveStyle)) {
          const runW = this.cursiveEngine.renderCursiveRun(
            ctx,
            seg,
            segX,
            y,
            fontSize,
            inkColor,
            effectiveSlantHw,
            defaultPen,
            this.mutator,
            this.mathRenderer,
            this.currentAllographs,
            isColdStart && segX === startX
          );
          segX += runW;
        } else if (/^[A-Za-z]+$/.test(seg)) {
          let subRun = '';
          for (const ch of seg) {
            if (this.cursiveEngine.canRenderWordSegment(ch, this.currentAllographs, handwriting.cursiveStyle)) {
              subRun += ch;
            } else {
              if (subRun.length > 0) {
                segX += this.cursiveEngine.renderCursiveRun(
                  ctx,
                  subRun,
                  segX,
                  y,
                  fontSize,
                  inkColor,
                  effectiveSlantHw,
                  defaultPen,
                  this.mutator,
                  this.mathRenderer,
                  this.currentAllographs,
                  isColdStart && segX === startX
                );
                subRun = '';
              }
              segX += this.renderWordOrChars(
                ctx,
                font,
                ch,
                segX,
                y,
                fontSize,
                inkColor,
                lineProgress,
                { ...handwriting, cursiveMode: 'print' },
                roughCanvas,
                wristState,
                effectiveExtraSlant,
                false,
                isColdStart && segX === startX
              );
            }
          }
          if (subRun.length > 0) {
            segX += this.cursiveEngine.renderCursiveRun(
              ctx,
              subRun,
              segX,
              y,
              fontSize,
              inkColor,
              effectiveSlantHw,
              defaultPen,
              this.mutator,
              this.mathRenderer,
              this.currentAllographs,
              isColdStart && segX === startX
            );
          }
        } else {
          segX += this.renderWordOrChars(
            ctx,
            font,
            seg,
            segX,
            y,
            fontSize,
            inkColor,
            lineProgress,
            { ...handwriting, cursiveMode: 'print' },
            roughCanvas,
            wristState,
            effectiveExtraSlant,
            false,
            isColdStart && segX === startX
          );
        }
      }
      return segX - startX;
    }

    let currX = startX;
    const wordLen = text.length;
    let prevChar: string | null = null;
    let prevExitPoint: { x: number; y: number } | null = null;
    let pendingCrossbarStart: { x: number; y: number } | null = null;

    const BIGRAMS = new Set(['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ou', 'ea']);
    const LIFT_OFF_CHARS = new Set(['e', 'y', 'g', 'd', 's', 't', 'n', 'r', 'a', 'o']);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Opposing-Crescent Math Variable 'x' ):(
      if (
        isMathContext &&
        (handwriting.cursiveMathX ?? true) &&
        char === 'x' &&
        !/^[a-zA-Z]{3,}$/.test(text)
      ) {
        const mathXW = this.mathRenderer.drawCursiveMathX(ctx, currX, y, fontSize, inkColor);
        currX += mathXW + (handwriting.letterSpacing ?? 0);
        prevChar = 'x';
        continue;
      }

      // Procedural Calculus Primes: ', '', ′ (rapid diagonal down-left ticks)
      if (char === '\'' || char === '′') {
        const isDoublePrime = i + 1 < text.length && (text[i + 1] === '\'' || text[i + 1] === '′');
        const primeW = this.mathRenderer.drawHandPrime(ctx, currX, y, fontSize, inkColor, isDoublePrime ? 2 : 1);
        currX += primeW;
        prevChar = '\'';
        if (isDoublePrime) i++;
        continue;
      }

      // Procedural Mathematical Ellipsis: ...
      if (char === '.' && i + 2 < text.length && text[i + 1] === '.' && text[i + 2] === '.') {
        const elW = this.mathRenderer.drawEllipsis(ctx, currX, y, fontSize, inkColor, false);
        currX += elW;
        i += 2;
        prevChar = '.';
        continue;
      }

      // Procedural Punctuation Jab: ., :, ;, ,
      // Intercept punctuation - never render periods as geometric font circles!
      if (char === '.' || char === ',' || char === ':' || char === ';') {
        const jabW = this.mathRenderer.drawPunctuationJab(ctx, char, currX, y, fontSize, inkColor);
        currX += jabW;
        prevChar = char;
        continue;
      }

      // Procedural fallback for symbols missing or rigid in handwriting fonts
      if (char === '<') {
        const ineqW = this.mathRenderer.drawStrictInequality(ctx, currX, y, fontSize, inkColor, true);
        currX += ineqW;
        prevChar = '<';
        continue;
      }
      if (char === '>') {
        const ineqW = this.mathRenderer.drawStrictInequality(ctx, currX, y, fontSize, inkColor, false);
        currX += ineqW;
        prevChar = '>';
        continue;
      }
      if (char === '≤') {
        const ineqW = this.mathRenderer.drawInequality(ctx, currX, y, fontSize, inkColor, true);
        currX += ineqW;
        prevChar = '≤';
        continue;
      }
      if (char === '≥') {
        const ineqW = this.mathRenderer.drawInequality(ctx, currX, y, fontSize, inkColor, false);
        currX += ineqW;
        prevChar = '≥';
        continue;
      }
      if (char === 'δ') {
        const deltaW = this.mathRenderer.drawDeltaLower(ctx, currX, y, fontSize, inkColor);
        currX += deltaW;
        prevChar = 'δ';
        continue;
      }
      if (char === 'α') {
        const alphaW = this.mathRenderer.drawAlpha(ctx, currX, y, fontSize, inkColor);
        currX += alphaW;
        prevChar = 'α';
        continue;
      }
      if (char === 'τ') {
        const tauW = this.mathRenderer.drawTau(ctx, currX, y, fontSize, inkColor);
        currX += tauW;
        prevChar = 'τ';
        continue;
      }
      if (char === '∈') {
        const inW = this.mathRenderer.drawElementOf(ctx, currX, y, fontSize, inkColor);
        currX += inW;
        prevChar = '∈';
        continue;
      }
      if (char === 'Δ') {
        const deltaW = this.mathRenderer.drawDelta(ctx, currX, y, fontSize, inkColor);
        currX += deltaW;
        prevChar = 'Δ';
        continue;
      }
      if (char === '∇') {
        const nablaW = this.mathRenderer.drawNabla(ctx, currX, y, fontSize, inkColor);
        currX += nablaW;
        prevChar = '∇';
        continue;
      }
      if (char === 'ℒ') {
        const lW = this.mathRenderer.drawLaplaceL(ctx, currX, y, fontSize, inkColor);
        currX += lW;
        prevChar = 'ℒ';
        continue;
      }
      if (char === 'θ') {
        const thetaW = this.mathRenderer.drawTheta(ctx, currX, y, fontSize, inkColor);
        currX += thetaW;
        prevChar = 'θ';
        continue;
      }
      if (char === 'π') {
        const piW = this.mathRenderer.drawPi(ctx, currX, y, fontSize, inkColor);
        currX += piW;
        prevChar = 'π';
        continue;
      }
      if (char === 'β') {
        const betaW = this.mathRenderer.drawBeta(ctx, currX, y, fontSize, inkColor);
        currX += betaW;
        prevChar = 'β';
        continue;
      }
      if (char === 'λ') {
        const lamW = this.mathRenderer.drawLambda(ctx, currX, y, fontSize, inkColor);
        currX += lamW;
        prevChar = 'λ';
        continue;
      }
      if (char === 'φ' || char === 'ϕ') {
        const phiW = this.mathRenderer.drawPhi(ctx, currX, y, fontSize, inkColor);
        currX += phiW;
        prevChar = 'φ';
        continue;
      }
      if (char === 'ω') {
        const omgW = this.mathRenderer.drawOmega(ctx, currX, y, fontSize, inkColor);
        currX += omgW;
        prevChar = 'ω';
        continue;
      }
      if (char === 'μ') {
        const muW = this.mathRenderer.drawMu(ctx, currX, y, fontSize, inkColor);
        currX += muW;
        prevChar = 'μ';
        continue;
      }
      if (char === 'σ') {
        const sigW = this.mathRenderer.drawSigma(ctx, currX, y, fontSize, inkColor);
        currX += sigW;
        prevChar = 'σ';
        continue;
      }
      if (char === '∞') {
        currX += this.mathRenderer.drawInfinity(ctx, currX, y, fontSize, inkColor);
        prevChar = '∞';
        continue;
      }
      if (char === 'Γ') {
        currX += this.mathRenderer.drawGamma(ctx, currX, y, fontSize, inkColor);
        prevChar = 'Γ';
        continue;
      }

      const nextChar = i < text.length - 1 ? text[i + 1] : null;

      const isFirstOfSharedCrossbar =
        !pendingCrossbarStart &&
        handwriting.sharedCrossbar &&
        ((char === 't' && nextChar === 't') ||
          (char === 'f' && nextChar === 'f') ||
          (char === 't' && nextChar === 'f') ||
          (char === 'f' && nextChar === 't'));
      const isSecondOfSharedCrossbar = pendingCrossbarStart !== null && (char === 't' || char === 'f');

      // Calculate wrist cluster parabolic arc offset and progressive slant
      const wristOffset = wristState ? this.updateWristCluster(wristState, currX) : { dy: 0, slantDeg: 0 };
      const charY = y + wristOffset.dy;

      // Bulletproof protection against OpenType missing-glyph square boxes (□):
      // If the font lacks a glyph (index 0), fallback to styled handwriting cursive/serif text rather than rigid sans-serif
      const rawGlyph = font.charToGlyph(char);
      if (rawGlyph.index === 0) {
        ctx.save();
        const slantRad = (((handwriting.slantAngle ?? 5) + effectiveExtraSlant + wristOffset.slantDeg) * Math.PI) / 180;
        ctx.translate(currX, charY);
        ctx.transform(1, 0, -Math.tan(slantRad), 1, 0, 0);
        ctx.font = `italic ${Math.round(fontSize * 0.92)}px "Caveat", "Kalam", cursive, serif`;
        ctx.fillStyle = inkColor;
        ctx.fillText(char, 0, 0);
        const m = ctx.measureText(char);
        ctx.restore();
        currX += m.width + (handwriting.letterSpacing ?? 0);
        prevChar = char;
        continue;
      }

      const options: GlyphDrawOptions = {
        fontSize,
        wordIndex: 0,
        charIndexInWord: i,
        wordLength: wordLen,
        isFirstChar: i === 0,
        isLastChar: i === wordLen - 1,
        prevChar,
        nextChar,
        lineProgress,
        handwriting,
        isSharedCrossbar: Boolean(isFirstOfSharedCrossbar || isSecondOfSharedCrossbar),
        allographs: this.currentAllographs,
        inkColor,
        extraSlant: effectiveExtraSlant + wristOffset.slantDeg,
      };

      const result = this.mutator.mutateGlyph(font, char, currX, charY, options);

      // Ensure path fill is set to user's ink color (unless it's an open stroked path from allographs)
      if (result.path.fill !== null) {
        result.path.fill = inkColor;
      }

      // Word-Initial Touch-Down Micro-Hook
      if (options.isFirstChar && this.noise.random() < 0.25 && result.entryPoint) {
        this.mutator.drawTouchDownHook(ctx, result.entryPoint, fontSize, inkColor);
      }

      // Modulate pen pressure along the line using smooth 2D noise & micro-striations
      const pressureWave = this.noise.get2D(currX * 0.012, charY * 0.02); // [-1, 1]
      let starvationMod = 0.82 + this.noise.get2D(currX * 0.04, charY * 0.04) * 0.16;
      if (isColdStart && i === 0 && (handwriting.coldStartStarvation ?? true)) {
        starvationMod *= 0.58;
      }
      const baseAlpha = Math.max(0.70, Math.min(0.96, starvationMod + pressureWave * 0.08));

      ctx.save();
      ctx.globalAlpha = baseAlpha;
      ctx.shadowColor = inkColor;
      ctx.shadowBlur = 0.40;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      result.path.draw(ctx);

      // Variable pen-pressure thickening / thinning via thin stroke along the glyph outline
      const penWidthScale = ((this.currentPen?.strokeWidth ?? 1.6) / 1.6);
      if (pressureWave > -0.22) {
        const p2d = new Path2D(result.path.toPathData(2));
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = (0.22 + (pressureWave + 0.22) * 0.38) * (fontSize / 28) * penWidthScale;
        ctx.globalAlpha = 0.32;
        ctx.stroke(p2d);
      }
      ctx.restore();

      // Section 1C: Microscopic Ballpoint Striations (Dual-Track Furrows)
      // Rolling ball socket leaves twin ridges with micro-furrow along stroke core
      if (
        (this.currentPen?.drySkips ?? true) &&
        (this.currentPen?.penStyle ?? 'ballpoint') === 'ballpoint' &&
        pressureWave > -0.10 &&
        this.noise.random() < 0.65
      ) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 0.55 * (fontSize / 28);
        const p2d = new Path2D(result.path.toPathData(2));
        ctx.stroke(p2d);
        ctx.restore();
      }

      // Microscopic ballpoint ink pooling at turnaround points
      if (this.currentPen?.inkPooling && result.inkPoolingPoints && result.inkPoolingPoints.length > 0) {
        ctx.save();
        ctx.fillStyle = inkColor;
        ctx.globalAlpha = 0.85;
        for (const pt of result.inkPoolingPoints) {
          if (this.noise.random() < 0.40) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // Word-Final Lift-Off Taper
      if (options.isLastChar && result.exitPoint && LIFT_OFF_CHARS.has(char.toLowerCase())) {
        this.mutator.drawLiftOffTaper(ctx, result.exitPoint, fontSize, inkColor);
      }

      // Flying 'i' / 'j' tittle procedural dot
      if ((char === 'i' || char === 'j') && result.tittleBase) {
        this.mutator.drawFlyingTittle(ctx, result.tittleBase, fontSize, inkColor, handwriting.flyingDotChaos);
      }

      // STEM Crossbarred 'z' / 'Z' (ƶ): draws hand-sketched horizontal waist stroke (from Chitesh's calculus notes)
      if ((char === 'z' || char === 'Z') && (handwriting.crossedZ ?? true)) {
        this.mutator.drawCrossedZ(ctx, currX, charY, result.advanceWidth, fontSize, inkColor, char === 'Z');
      }

      // Shared crossbar (tt, ff, tf)
      if (isFirstOfSharedCrossbar && result.crossbarCenter) {
        pendingCrossbarStart = result.crossbarCenter;
      } else if (isSecondOfSharedCrossbar) {
        if (pendingCrossbarStart && result.crossbarCenter) {
          this.mutator.drawSharedCrossbar(
            ctx,
            pendingCrossbarStart,
            result.crossbarCenter,
            fontSize,
            inkColor
          );
        }
        pendingCrossbarStart = null;
      }

      // Pseudo-cursive / Semi-cursive coarticulation bridge
      if (prevChar && prevExitPoint && result.entryPoint) {
        const isCursiveOrSemi = handwriting.cursiveMode === 'semi-cursive' || !handwriting.cursiveMode;
        const NO_JOIN_AFTER = new Set(['g', 'j', 'p', 'q', 'x', 'z', 's']);
        const isPrevLower = prevChar >= 'a' && prevChar <= 'z';
        const isCurrLower = char >= 'a' && char <= 'z';
        const canJoin = isCursiveOrSemi
          ? (isPrevLower && isCurrLower && !NO_JOIN_AFTER.has(prevChar))
          : BIGRAMS.has((prevChar + char).toLowerCase());

        if (canJoin) {
          this.mutator.drawCoarticulationLigature(
            ctx,
            prevExitPoint,
            result.entryPoint,
            inkColor,
            handwriting.ligatureRate
          );
        }
      }

      prevChar = char;
      prevExitPoint = result.exitPoint;
      const charTracking = handwriting.letterSpacing ?? 0;
      currX += Math.max(2, result.advanceWidth + charTracking);
    }

    return currX - startX;
  }

  private measureWord(
    font: opentype.Font,
    word: string,
    fontSize: number,
    letterSpacing = 0,
    isMathContext = false
  ): number {
    if (this.currentHandwriting?.cursiveMode === 'vector-cursive' && !isMathContext) {
      const segments = word.match(/[A-Za-z]+|[^A-Za-z]+/g) || [word];
      let totalW = 0;
      for (const seg of segments) {
        if (/^[A-Za-z]+$/.test(seg) && this.cursiveEngine.canRenderWordSegment(seg, this.currentAllographs, this.currentHandwriting?.cursiveStyle)) {
          totalW += this.cursiveEngine.measureCursiveWord(seg, fontSize, this.currentHandwriting, this.currentAllographs);
        } else if (/^[A-Za-z]+$/.test(seg)) {
          let subRun = '';
          for (const ch of seg) {
            if (this.cursiveEngine.canRenderWordSegment(ch, this.currentAllographs, this.currentHandwriting?.cursiveStyle)) {
              subRun += ch;
            } else {
              if (subRun.length > 0) {
                totalW += this.cursiveEngine.measureCursiveWord(subRun, fontSize, this.currentHandwriting, this.currentAllographs);
                subRun = '';
              }
              const glyph = font.charToGlyph(ch);
              const unitsPerEm = font.unitsPerEm > 0 ? font.unitsPerEm : 1000;
              const adv = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / unitsPerEm : fontSize * 0.55;
              totalW += Math.max(2, adv + letterSpacing);
            }
          }
          if (subRun.length > 0) {
            totalW += this.cursiveEngine.measureCursiveWord(subRun, fontSize, this.currentHandwriting, this.currentAllographs);
          }
        } else {
          for (const char of seg) {
            const glyph = font.charToGlyph(char);
            const unitsPerEm = font.unitsPerEm > 0 ? font.unitsPerEm : 1000;
            const adv = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / unitsPerEm : fontSize * 0.55;
            totalW += Math.max(2, adv + letterSpacing);
          }
        }
      }
      return totalW;
    }

    let width = 0;
    for (const char of word) {
      if (
        isMathContext &&
        (this.currentHandwriting?.cursiveMathX ?? true) &&
        char === 'x' &&
        !/^[a-zA-Z]{3,}$/.test(word)
      ) {
        width += 15.5 * (fontSize / 28) + letterSpacing;
        continue;
      }
      if (
        char === 'Δ' || char === '∇' || char === 'ℒ' || char === 'δ' || char === 'α' ||
        char === 'τ' || char === '∈' || char === '<' || char === '>' || char === '≤' ||
        char === '≥' || char === 'θ' || char === 'π' || char === 'β' || char === 'λ' ||
        char === 'φ' || char === 'ϕ' || char === 'ω' || char === 'μ' || char === 'σ' ||
        char === '∞' || char === 'Γ'
      ) {
        width += fontSize * 0.60 + letterSpacing;
        continue;
      }
      const glyph = font.charToGlyph(char);
      const unitsPerEm = font.unitsPerEm > 0 ? font.unitsPerEm : 1000;
      const adv = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / unitsPerEm : fontSize * 0.55;
      width += Math.max(2, adv + letterSpacing);
    }
    return width;
  }

  private estimateTokenWidth(font: opentype.Font, token: MathToken, fontSize: number): number {
    const wordSpacingMult = this.currentHandwriting?.wordSpacing ?? 1.0;
    const letterSpacing = this.currentHandwriting?.letterSpacing ?? 0;

    if (token.type === 'space') return fontSize * 0.48 * token.widthMultiplier * wordSpacingMult;
    if (token.type === 'text') {
      const isIsolatedVar = token.text.length === 1 && /^[a-zA-Z]$/.test(token.text) && !token.isFunction;
      return this.measureWord(font, token.text, fontSize, letterSpacing, isIsolatedVar);
    }
    if (token.type === 'delimiter') return 10;
    if (token.type === 'operator') {
      const scale = fontSize / 28;
      if (token.symbol.startsWith("'")) return (2 + token.symbol.length * 4.2) * scale;
      if (token.symbol === '-') return 15 * scale;
      if (token.symbol === '+') return 18 * scale;
      if (token.symbol === '=') return 20 * scale;
      if (token.symbol === '⇒') return 26 * scale;
      if (token.symbol === '\\sum' || token.symbol === '\\prod') return 24 * scale;
      if (token.symbol === '\\int') return 18 * scale;
      if (token.symbol === '≠' || token.symbol === '≈') return 18 * scale;
      if (token.symbol === '≤' || token.symbol === '≥' || token.symbol === '<' || token.symbol === '>') return 18 * scale;
      if (
        token.symbol === 'δ' || token.symbol === 'α' || token.symbol === 'τ' || token.symbol === '∈' ||
        token.symbol === 'θ' || token.symbol === 'π' || token.symbol === 'β' || token.symbol === 'λ' ||
        token.symbol === 'φ' || token.symbol === 'ϕ' || token.symbol === 'ω' || token.symbol === 'μ' ||
        token.symbol === 'σ'
      ) return 16 * scale;
      if (token.symbol === '\\dots' || token.symbol === '\\cdots' || token.symbol === '\\ldots' || token.symbol === '...') return 20 * scale;
      if (token.symbol === '∞') return 22 * scale;
      if (token.symbol === 'Δ' || token.symbol === '∇' || token.symbol === 'ℒ' || token.symbol === '∀' || token.symbol === '∃' || token.symbol === '∪' || token.symbol === '∩') return 18 * scale;
      return 18 * scale;
    }
    if (token.type === 'big-op') {
      const isInt = token.symbol === '\\int';
      const limitW = Math.max(
        token.lower ? this.estimateTokensWidth(font, token.lower, fontSize * 0.65) : 0,
        token.upper ? this.estimateTokensWidth(font, token.upper, fontSize * 0.65) : 0
      );
      return isInt ? 24 + limitW : Math.max(24, limitW) + 12;
    }
    if (token.type === 'matrix') {
      let numCols = 1;
      for (const row of token.cells) {
        if (row.length > numCols) numCols = row.length;
      }
      const isBinomial = token.bracket === 'p' && token.cells.length === 2 && numCols <= 1;
      let totalW = isBinomial ? 18 : 32;
      for (let c = 0; c < numCols; c++) {
        let maxW = 18;
        for (const row of token.cells) {
          const cw = this.estimateTokensWidth(font, row[c] || [], fontSize * 0.85);
          if (cw > maxW) maxW = cw;
        }
        totalW += maxW + (isBinomial ? 10 : 22);
      }
      return totalW;
    }
    if (token.type === 'fraction') {
      const nw = this.estimateTokensWidth(font, token.numerator, fontSize * 0.86);
      const dw = this.estimateTokensWidth(font, token.denominator, fontSize * 0.86);
      return Math.max(nw, dw) + 26;
    }
    if (token.type === 'script') {
      const bw = Array.isArray(token.base)
        ? this.estimateTokensWidth(font, token.base, fontSize)
        : typeof token.base === 'string'
        ? this.measureWord(font, token.base, fontSize, letterSpacing, token.base.length === 1 && /^[a-zA-Z]$/.test(token.base))
        : 16;
      const isAccentSup =
        token.sup &&
        token.sup.length === 1 &&
        token.sup[0].type === 'operator' &&
        (token.sup[0].symbol === '^' || token.sup[0].symbol === '\\vec');
      const sw = token.sup && !isAccentSup ? this.estimateTokensWidth(font, token.sup, fontSize * 0.70) : 0;
      const subw = token.sub ? this.estimateTokensWidth(font, token.sub, fontSize * 0.70) : 0;
      return bw + Math.max(sw, subw) + (isAccentSup && !token.sub ? 0 : 4);
    }
    if (token.type === 'root') {
      const idxW = token.index
        ? this.estimateTokensWidth(font, parseLatexExpressionTokens(token.index), fontSize * 0.58)
        : 0;
      return this.estimateTokensWidth(font, token.content, fontSize) + 24 + idxW;
    }
    if (token.type === 'boxed') {
      return this.estimateTokensWidth(font, token.content, fontSize) + 30;
    }
    return 14;
  }

  private estimateTokensWidth(font: opentype.Font, tokens: MathToken[], fontSize: number): number {
    let w = 0;
    for (const t of tokens) {
      w += this.estimateTokenWidth(font, t, fontSize);
    }
    return w;
  }

  /**
   * Renders a hand-drawn STEM table with roughjs borders, header divider, and centered cell math.
   */
  private renderTableBlock(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    block: DocumentBlock,
    startX: number,
    startY: number,
    fontSize: number,
    inkColor: string,
    headingInkColor: string,
    lineProgress: number,
    handwriting: AppState['handwriting'],
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    if (!block.tableData) return BASE_LINE_HEIGHT;
    const { headers, rows, columnCount } = block.tableData;

    const rowCount = 1 + rows.length;
    const availableWidth = (this.currentRightMargin || RIGHT_MARGIN) - startX;

    // 1. Dynamic column padding and min width based on column count
    const colPad = columnCount >= 10 ? 12 : columnCount >= 7 ? 18 : 28;
    const minColW = columnCount >= 10 ? 36 : columnCount >= 7 ? 45 : 55;

    // Compute column widths based on maximum content
    const colWidths: number[] = new Array(columnCount).fill(minColW);
    for (let c = 0; c < columnCount; c++) {
      let maxW = this.estimateTokensWidth(font, headers[c] || [], fontSize * 0.84);
      for (let r = 0; r < rows.length; r++) {
        const cellTokens = rows[r][c] || [];
        const cw = this.estimateTokensWidth(font, cellTokens, fontSize * 0.80);
        if (cw > maxW) maxW = cw;
      }
      colWidths[c] = Math.max(minColW, maxW + colPad);
    }

    // Scale columns proportionally if total exceeds availableWidth
    let totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
    let scale = 1.0;
    if (totalTableWidth > availableWidth) {
      scale = availableWidth / totalTableWidth;
      for (let c = 0; c < columnCount; c++) colWidths[c] *= scale;
      totalTableWidth = availableWidth;
    }

    // Dynamic cell font scale so dense numbers (e.g. 0.000771) never overlap
    const cellFontScale = Math.max(0.50, Math.min(1.0, scale));
    const headerFontSize = fontSize * 0.85 * cellFontScale;
    const cellFontSize = fontSize * 0.80 * cellFontScale;

    let headerAsc = headerFontSize * 0.75;
    let headerDesc = headerFontSize * 0.25;
    for (let c = 0; c < columnCount; c++) {
      const sp = this.getTokensVerticalSpan(headers[c] || [], headerFontSize);
      headerAsc = Math.max(headerAsc, sp.ascent);
      headerDesc = Math.max(headerDesc, sp.descent);
    }
    const headerRowHeight = Math.max(30, headerAsc + headerDesc + 14);

    const rowMeta = rows.map((row) => {
      let rAsc = cellFontSize * 0.75;
      let rDesc = cellFontSize * 0.25;
      for (let c = 0; c < columnCount; c++) {
        const sp = this.getTokensVerticalSpan(row[c] || [], cellFontSize);
        rAsc = Math.max(rAsc, sp.ascent);
        rDesc = Math.max(rDesc, sp.descent);
      }
      return { ascent: rAsc, descent: rDesc, height: Math.max(28, rAsc + rDesc + 12) };
    });
    const totalTableHeight = headerRowHeight + rowMeta.reduce((acc, m) => acc + m.height, 0);

    // Precalculate column X boundaries
    const colXPositions: number[] = [startX];
    for (let c = 0; c < columnCount; c++) {
      colXPositions.push(colXPositions[c] + colWidths[c]);
    }

    const headerBottomY = startY + headerRowHeight;

    const rowYPositions: number[] = [headerBottomY];
    for (let r = 0; r < rows.length; r++) {
      rowYPositions.push(rowYPositions[r] + rowMeta[r].height);
    }

    // 2. Table structure lines:
    // Organic horizontal line under header (swept stroke overshooting slightly) - drawn unconditionally
    this.mathRenderer.drawHandLine(
      ctx,
      startX,
      headerBottomY,
      startX + totalTableWidth,
      headerBottomY,
      1.8,
      inkColor,
      1.8,
      5
    );

    // Full table box & grid lines if tableLines is enabled
    if (handwriting.tableLines ?? true) {
      // Top horizontal boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY, startX + totalTableWidth, startY, 1.5, inkColor, 1.8, 5);
      // Bottom horizontal boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY + totalTableHeight, startX + totalTableWidth, startY + totalTableHeight, 1.5, inkColor, 1.8, 5);
      // Left vertical boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY, startX, startY + totalTableHeight, 1.5, inkColor, 1.8, 5);
      // Right vertical boundary
      this.mathRenderer.drawHandLine(ctx, startX + totalTableWidth, startY, startX + totalTableWidth, startY + totalTableHeight, 1.5, inkColor, 1.8, 5);

      // Subtle horizontal divider lines between data rows
      for (let r = 1; r < rows.length; r++) {
        const ry = rowYPositions[r];
        this.mathRenderer.drawHandLine(ctx, startX, ry, startX + totalTableWidth, ry, 0.85, inkColor, 1.1, 2);
      }

      // Vertical column divider lines with organic hand tremor and non-CAD overshoots
      for (let c = 1; c < columnCount; c++) {
        const cx = colXPositions[c];
        const startJitter = (this.noise.random() - 0.5) * 1.8;
        const endJitter = (this.noise.random() - 0.5) * 1.8;
        this.mathRenderer.drawHandLine(
          ctx,
          cx + startJitter,
          startY - 2,
          cx + endJitter,
          startY + totalTableHeight + 2,
          1.1,
          inkColor,
          1.4,
          3
        );
      }
    }

    // 3. Render Header Cells
    const headerBaselineY = startY + headerAsc + 7;
    for (let c = 0; c < columnCount; c++) {
      const hTokens = headers[c] || [];
      const cellW = colWidths[c];
      const tokenW = this.estimateTokensWidth(font, hTokens, headerFontSize);
      const cellStartX = colXPositions[c] + Math.max(3, (cellW - tokenW) * 0.5);

      const jitterX = (this.noise.random() - 0.5) * 2.0;
      const jitterY = (this.noise.random() - 0.5) * 1.2;
      let cx = cellStartX + jitterX;
      for (const t of hTokens) {
        cx += this.renderSingleToken(
          ctx,
          font,
          t,
          cx,
          headerBaselineY + jitterY,
          headerFontSize,
          headingInkColor,
          lineProgress,
          handwriting,
          roughCanvas
        );
      }
    }

    // 4. Render Data Rows Cells
    for (let r = 0; r < rows.length; r++) {
      const rowTokens = rows[r];
      const cellBaselineY = rowYPositions[r] + rowMeta[r].ascent + 6;

      for (let c = 0; c < columnCount; c++) {
        const cTokens = rowTokens[c] || [];
        if (cTokens.length === 0) continue;

        const cellW = colWidths[c];
        const tokenW = this.estimateTokensWidth(font, cTokens, cellFontSize);
        const cellStartX = colXPositions[c] + Math.max(3, (cellW - tokenW) * 0.5);

        const jitterX = (this.noise.random() - 0.5) * 2.0;
        const jitterY = (this.noise.random() - 0.5) * 1.2;
        let cx = cellStartX + jitterX;
        for (const t of cTokens) {
          cx += this.renderSingleToken(
            ctx,
            font,
            t,
            cx,
            cellBaselineY + jitterY,
            cellFontSize,
            inkColor,
            lineProgress,
            handwriting,
            roughCanvas
          );
        }
      }
    }

    return totalTableHeight + BASE_LINE_HEIGHT * 0.7;
  }

  /**
   * Exports multi-page canvas document as a high-resolution PDF via jspdf.
   */
  public async exportToPDF(
    canvases: HTMLCanvasElement[],
    title = 'ScriptaMath_Assignment'
  ): Promise<Blob> {
    if (canvases.length === 0) return new Blob();

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < canvases.length; i++) {
      if (i > 0) pdf.addPage('a4', 'portrait');

      const canvas = canvases[i];
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      canvas.width = 0;
      canvas.height = 0;
    }

    const blob = pdf.output('blob');
    pdf.save(`${title}.pdf`);
    return blob;
  }

  /**
   * Exports multi-page canvas document as a ZIP archive of high-res PNG images via JSZip.
   */
  public async exportToZIP(
    canvases: HTMLCanvasElement[],
    title = 'ScriptaMath_Assignment'
  ): Promise<Blob> {
    const zip = new JSZip();

    canvases.forEach((canvas, idx) => {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      zip.file(`page-${idx + 1}.png`, base64Data, { base64: true });
      canvas.width = 0;
      canvas.height = 0;
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${title}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 15000);
    return content;
  }
}
