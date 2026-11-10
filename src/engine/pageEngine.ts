import opentype from 'opentype.js';
import rough from 'roughjs';
import jsPDF from 'jspdf';
import { AppState } from '../types';
import { SeededNoise } from './noise';
import { GlyphMutator, GlyphDrawOptions } from './glyphMutator';
import { MathRenderer, measureFontStemWidth } from './mathRenderer';
import { InkAndScanPipeline } from './inkAndScan';
import {
  parseRawAIOutput,
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
  private currentPen?: AppState['pen'];
  private currentHandwriting?: AppState['handwriting'];
  private currentPaper?: AppState['paper'];
  private currentRightMargin: number = RIGHT_MARGIN;
  private currentLineObstacles: Array<{ x1: number; x2: number }> = [];
  private prevLineObstacles: Array<{ x1: number; x2: number }> = [];

  constructor(seed: number) {
    this.noise = new SeededNoise(seed);
    this.mutator = new GlyphMutator(this.noise);
    this.mathRenderer = new MathRenderer(this.noise);
    this.inkAndScan = new InkAndScanPipeline(this.noise);
  }

  public setSeed(seed: number) {
    this.noise = new SeededNoise(seed);
    this.mutator = new GlyphMutator(this.noise);
    this.mathRenderer = new MathRenderer(this.noise);
    this.inkAndScan = new InkAndScanPipeline(this.noise);
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

  /**
   * Paginates document blocks across multi-page notebook sheets.
   */
  public paginate(blocks: DocumentBlock[]): PageLayoutData[] {
    const pages: PageLayoutData[] = [];
    const maxLinesPerPage = Math.floor((PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / BASE_LINE_HEIGHT) - 1;

    let currentPageBlocks: DocumentBlock[] = [];
    let currentLineCount = 0;

    for (const block of blocks) {
      let neededLines = 1;
      if (block.type === 'heading') {
        neededLines = block.level === 1 ? 2 : 1;
      } else if (block.type === 'math-step') {
        const hasFraction = block.tokens.some((t) => t.type === 'fraction');
        const matrixToken = block.tokens.find((t) => t.type === 'matrix') as MathMatrix | undefined;
        if (matrixToken) {
          neededLines = Math.ceil((matrixToken.cells.length * 36) / BASE_LINE_HEIGHT) + 1;
        } else {
          neededLines = hasFraction ? 2 : 1;
        }
      } else if (block.type === 'table') {
        const rowCount = block.tableData ? 1 + block.tableData.rows.length : 5;
        neededLines = Math.ceil((rowCount * 38) / BASE_LINE_HEIGHT) + 1;
      } else if (block.type === 'paragraph') {
        let textLen = 0;
        for (const t of block.tokens) {
          if (t.type === 'text') textLen += t.text.length;
          else textLen += 6;
        }
        neededLines = Math.max(1, Math.ceil(textLen / 70));
      }

      if (currentLineCount + neededLines > maxLinesPerPage && currentPageBlocks.length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          blocks: currentPageBlocks,
        });
        currentPageBlocks = [block];
        currentLineCount = neededLines;
      } else {
        currentPageBlocks.push(block);
        currentLineCount += neededLines;
      }
    }

    if (currentPageBlocks.length > 0 || pages.length === 0) {
      pages.push({
        pageNumber: pages.length + 1,
        blocks: currentPageBlocks,
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
    font: opentype.Font
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

    // 1. Calibrate procedural math stroke weight directly from font stem metrics
    const stemW = measureFontStemWidth(font, handwriting.fontSize);
    this.mathRenderer.setCalibratedLineWidth(stemW);

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
    let currentY = TOP_MARGIN;
    const bodyInkColor = pen.bodyColorHex;
    const headingInkColor = pen.headingColorHex;

    this.currentRightMargin = paper.roughWorkColumn ? PAGE_WIDTH - 190 : RIGHT_MARGIN;
    this.currentLineObstacles = [];
    this.prevLineObstacles = [];

    // Optional Right-Margin Rough Calculation Column
    if (paper.roughWorkColumn) {
      const rX = PAGE_WIDTH - 165;
      this.mathRenderer.drawHandLine(
        textCtx,
        rX,
        TOP_MARGIN - 20,
        rX + (this.noise.random() - 0.5) * 3,
        PAGE_HEIGHT - BOTTOM_MARGIN + 10,
        1.2,
        '#94a3b8',
        1.8,
        8
      );

      // "Rough" label at top
      const rHeaderW = this.renderWordOrChars(
        textCtx,
        font,
        'Rough',
        rX + 16,
        TOP_MARGIN - 8,
        15,
        '#64748b',
        0.1,
        { ...handwriting, handFatigue: 0.1 },
        textRoughCanvas
      );
      this.mathRenderer.drawHandLine(
        textCtx,
        rX + 14,
        TOP_MARGIN - 4,
        rX + 16 + rHeaderW + 4,
        TOP_MARGIN - 4 + (this.noise.random() - 0.5) * 1.5,
        1.0,
        '#64748b',
        1.2,
        3
      );

      // Intermediate arithmetic scratch step 1
      const s1Y = TOP_MARGIN + BASE_LINE_HEIGHT * 3;
      const rw1 = this.renderWordOrChars(
        textCtx,
        font,
        '16 - 12 = 4',
        rX + 14,
        s1Y,
        13,
        bodyInkColor,
        0.25,
        handwriting,
        textRoughCanvas
      );
      this.mathRenderer.drawHandLine(
        textCtx,
        rX + 10,
        s1Y + 2,
        rX + 14 + rw1 + 4,
        s1Y - 12,
        1.4,
        bodyInkColor,
        1.5,
        2
      );

      // Intermediate arithmetic scratch step 2
      const s2Y = TOP_MARGIN + BASE_LINE_HEIGHT * 7;
      const rw2 = this.renderWordOrChars(
        textCtx,
        font,
        '√4 = 2',
        rX + 16,
        s2Y,
        13,
        bodyInkColor,
        0.5,
        handwriting,
        textRoughCanvas
      );
      this.mathRenderer.drawHandLine(
        textCtx,
        rX + 12,
        s2Y + 2,
        rX + 16 + rw2 + 4,
        s2Y - 12,
        1.4,
        bodyInkColor,
        1.5,
        2
      );
    }

    let consecutiveMathSteps = 0;
    let derivationDriftX = 0;

    const totalLinesEstimate = Math.floor((PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN) / BASE_LINE_HEIGHT);

    for (let bIdx = 0; bIdx < pageData.blocks.length; bIdx++) {
      const block = pageData.blocks[bIdx];
      const nextBlock = bIdx < pageData.blocks.length - 1 ? pageData.blocks[bIdx + 1] : null;
      const isFinalStep =
        block.type === 'boxed-final' ||
        (block.type === 'math-step' &&
          (!nextBlock || nextBlock.type === 'separator' || nextBlock.type === 'boxed-final' || nextBlock.type === 'heading' || nextBlock.type === 'margin-item'));

      // Section 3B: Derivation Phase Dynamics (Pacing & Scaling)
      const phaseScale = getPhaseScaleFactor(block.type, isFinalStep);
      const effectiveFontSize = handwriting.fontSize * phaseScale;

      // Final result / concluding answers receive prominent, deliberate pen pressure (+15% nib width)
      if (isFinalStep) {
        this.mathRenderer.setCalibratedLineWidth(stemW * 1.15);
      } else {
        this.mathRenderer.setCalibratedLineWidth(stemW);
      }

      const lineProgress = Math.min(1.0, (currentY - TOP_MARGIN) / (totalLinesEstimate * BASE_LINE_HEIGHT));

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

      // Left margin wander: on unruled paper, amplitude is 28px + per-line step jitter (breaks the vertical wall)
      const isUnruled = paper.template === 'unruled-bond';
      const wanderAmp = isUnruled ? 28 : 9;
      const stepJitter = (this.noise.random() - 0.5) * (isUnruled ? 14 : 5) * handwriting.marginWander;
      const wander =
        this.noise.noise1D(currentY * 0.03 + bIdx * 0.7) * handwriting.marginWander * wanderAmp +
        lineProgress * 12 * handwriting.marginWander +
        stepJitter;

      // When transitioning from prose to an equation, add organic student equation indent (14-32px)
      const prevBlock = bIdx > 0 ? pageData.blocks[bIdx - 1] : null;
      const equationIndent =
        block.type === 'math-step' && (!prevBlock || prevBlock.type !== 'math-step')
          ? 14 + this.noise.random() * 18
          : 0;

      const rawMarginX =
        LEFT_MARGIN + wander + block.indent * 28 + (block.type === 'math-step' ? derivationDriftX + equationIndent : 0);
      const baseMarginX = Math.max(145, rawMarginX);

      if (block.type === 'heading') {
        // Headings in Red/Black gel pen with single or double hand-sketched underline
        const headingFontSize = (block.level === 1 ? handwriting.fontSize * 1.3 : handwriting.fontSize * 1.15) * phaseScale;
        currentY += BASE_LINE_HEIGHT * 0.25;

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
          handwriting,
          textRoughCanvas
        );
        const renderedWidth = seqResult.width;

        // Hand-drawn authentic student underlines with tremor and overshoot
        if (pen.headingUnderline === 'single' || pen.headingUnderline === 'double') {
          const uY = currentY + 6;
          this.mathRenderer.drawHandLine(
            textCtx,
            baseMarginX,
            uY,
            baseMarginX + renderedWidth + 6,
            uY + (this.noise.random() - 0.5) * 1.5,
            1.8,
            headingInkColor,
            1.8,
            4
          );

          if (pen.headingUnderline === 'double') {
            this.mathRenderer.drawHandLine(
              textCtx,
              baseMarginX,
              uY + 4.5,
              baseMarginX + renderedWidth + 8,
              uY + 4.5 + (this.noise.random() - 0.5) * 1.5,
              1.4,
              headingInkColor,
              1.8,
              4
            );
          }
        }

        currentY += BASE_LINE_HEIGHT * (block.level === 1 ? 1.5 : 1.2);
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
                handwriting,
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
                handwriting,
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
          handwriting,
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
            handwriting,
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
          handwriting,
          textRoughCanvas
        );

        // Non-uniform vertical line spacing between algebra steps
        const stepSpacingMult = 0.88 + this.noise.random() * 0.22;
        currentY += seqResult.height * stepSpacingMult;
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
          handwriting,
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
          handwriting,
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
          handwriting,
          textRoughCanvas
        );
        currentY += advanceY;
      }
    }

    // 4. Back-Page Bleed (Ghosting through sheet)
    if (paper.inkBleed > 0) {
      this.inkAndScan.drawBackPageBleed(ctx, textCanvas, PAGE_WIDTH, PAGE_HEIGHT, paper.inkBleed);
    }

    // 5. Composite primary student handwriting layer onto paper
    ctx.drawImage(textCanvas, 0, 0);

    // 6. Apply Camera / CamScanner Scan Post-Processing Filters
    this.inkAndScan.applyScanPostProcessing(ctx, PAGE_WIDTH, PAGE_HEIGHT, paper);
  }

  private getTokenVerticalSpan(token: MathToken, fontSize: number): { ascent: number; descent: number } {
    if (token.type === 'fraction') {
      const numSpan = this.getTokensVerticalSpan(token.numerator, fontSize * 0.86);
      const denSpan = this.getTokensVerticalSpan(token.denominator, fontSize * 0.86);
      return {
        ascent: fontSize * 0.35 + 8 + numSpan.ascent + numSpan.descent,
        descent: denSpan.ascent + denSpan.descent + 10,
      };
    }
    if (token.type === 'matrix') {
      let totalH = 0;
      for (const row of token.cells) {
        let maxRowH = fontSize * 1.35;
        for (const cell of row) {
          const s = this.getTokensVerticalSpan(cell, fontSize * 0.84);
          maxRowH = Math.max(maxRowH, s.ascent + s.descent + 14);
        }
        totalH += maxRowH;
      }
      if (token.bracket === 'p' && token.cells.length === 2 && (token.cells[0]?.length || 0) <= 1) {
        return {
          ascent: totalH * 0.5 + fontSize * 0.35,
          descent: totalH * 0.5 - fontSize * 0.35 + 4,
        };
      }
      return {
        ascent: fontSize * 0.85,
        descent: Math.max(fontSize * 0.4, totalH - fontSize * 0.55),
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
    const trueLineHeight = Math.max(BASE_LINE_HEIGHT, span.ascent + span.descent + 12);
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

          // Organic mistake cross-out (clean horizontal pen scratch without fake word corruption or high caret collision)
          if (handwriting.scratchOutRate > 0 && this.noise.random() < handwriting.scratchOutRate * 0.25 && w.length >= 4) {
            const typoW = this.renderWordOrChars(
              ctx,
              font,
              w,
              currX,
              currY,
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
              currY,
              typoW,
              fontSize,
              inkColor
            );
            currX += typoW + 8;
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
      );
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
  ): { width: number; height: number } {
    let currX = startX;
    let currY = baseY;
    let maxLineHeight = BASE_LINE_HEIGHT;
    let maxWidth = 0;
    let lineCount = 1;
    let wristState = this.initWristCluster(startX);

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
      if (currX + tokenWidth > this.currentRightMargin - 20 && currX > startX + 100) {
        this.prevLineObstacles = this.currentLineObstacles;
        this.currentLineObstacles = [];
        maxWidth = Math.max(maxWidth, currX - startX);
        currY += BASE_LINE_HEIGHT;
        lineCount++;
        currX = startX + 45 + (this.noise.random() - 0.5) * 6 * handwriting.marginWander;
        wristState = this.initWristCluster(currX);
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
      );

      if (token.type === 'space') {
        token.widthMultiplier = origMultiplier;
      }

      currX += advanceX;

      if (token.type === 'fraction') {
        maxLineHeight = Math.max(maxLineHeight, BASE_LINE_HEIGHT * 1.5);
      } else if (token.type === 'matrix') {
        maxLineHeight = Math.max(maxLineHeight, token.cells.length * fontSize * 1.35);
      }
    }

    maxWidth = Math.max(maxWidth, currX - startX);
    return {
      width: maxWidth,
      height: lineCount * maxLineHeight,
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
      const humanKerning = 0.55 + this.noise.random() * 0.90;
      return fontSize * 0.48 * token.widthMultiplier * wordSpacingMult * humanKerning;
    }

    if (token.type === 'text') {
      const isIsolatedVar = token.text.length === 1 && /^[a-zA-Z]$/.test(token.text) && !token.isFunction;
      const varFontSize = isIsolatedVar ? fontSize * 1.10 : fontSize;
      const varSlant = isIsolatedVar ? 5.5 : undefined;

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
        varSlant
      );
      return w + (isIsolatedVar ? 3.0 : 0);
    }

    if (token.type === 'delimiter') {
      return this.renderDelimiter(ctx, token.char, x, y, fontSize, inkColor);
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
        wristState
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
        roughCanvas
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
    inkColor: string
  ): number {
    const topY = y - fontSize * 0.72;
    const bottomY = y + fontSize * 0.24;

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
      const evalTopY = y - fontSize * 1.15;
      const evalBottomY = y + fontSize * 0.65;
      return this.mathRenderer.drawEvaluationBar(ctx, x, evalTopY, evalBottomY, inkColor, fontSize);
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
    // Section 2C: Contextual Diagonal Slash Fraction ($^1/_2$)
    // In human student derivations, simple scalar coefficients like 1/2 or 1/3 are frequently
    // written as compact diagonal slashes rather than formal two-story stacked fraction bars.
    const isSingleNumeric = (toks: MathToken[]): string | null => {
      if (toks.length === 1 && toks[0].type === 'text' && /^[0-9]$/.test(toks[0].text.trim())) {
        return toks[0].text.trim();
      }
      return null;
    };

    const numDigit = isSingleNumeric(numerator);
    const denDigit = isSingleNumeric(denominator);

    if (numDigit && denDigit && this.noise.random() < 0.40) {
      const slashScale = fontSize / 28;
      const fracFontSize = fontSize * 0.78;
      const numW = this.measureWord(font, numDigit, fracFontSize);

      // 1. Numerator placed slightly raised above the baseline
      const numY = y - fontSize * 0.36 + (this.noise.random() - 0.5) * 1.5;
      this.renderWordOrChars(ctx, font, numDigit, x, numY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);

      // 2. Dynamic diagonal slash downstroke (top-right to bottom-left with organic tremor)
      const slashX = x + numW + 2 * slashScale;
      const slashTopY = y - fontSize * 0.65;
      const slashBottomY = y + fontSize * 0.15;
      const slashSpanW = 7 * slashScale;
      const stemW = this.mathRenderer.getBaseLineWidth(slashScale, 0.95);

      ctx.save();
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = stemW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(slashX + slashSpanW + (this.noise.random() - 0.5) * 1.2, slashTopY + (this.noise.random() - 0.5) * 1.5);
      ctx.lineTo(slashX + (this.noise.random() - 0.5) * 1.2, slashBottomY + (this.noise.random() - 0.5) * 1.5);
      ctx.stroke();
      ctx.restore();

      // 3. Denominator placed slightly lowered below the baseline
      const denX = slashX + slashSpanW + 2 * slashScale;
      const denY = y + fontSize * 0.12 + (this.noise.random() - 0.5) * 1.5;
      const denW = this.renderWordOrChars(ctx, font, denDigit, denX, denY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);

      return (denX + denW - x) + 6 * slashScale;
    }

    const fracFontSize = fontSize * 0.86;

    // Measure actual widths using estimateTokensWidth
    const numWidth = this.estimateTokensWidth(font, numerator, fracFontSize);
    const denWidth = this.estimateTokensWidth(font, denominator, fracFontSize);
    const contentMaxW = Math.max(numWidth, denWidth);
    const barWidth = contentMaxW + 16;

    this.currentLineObstacles.push({ x1: x - 4, x2: x + barWidth + 8 });

    // Subtle human left-of-center bias without ever overflowing barWidth
    const numFree = Math.max(0, barWidth - numWidth);
    const denFree = Math.max(0, barWidth - denWidth);
    const numX = x + numFree * (0.35 + this.noise.random() * 0.25);
    const denX = x + denFree * (0.32 + this.noise.random() * 0.28);

    const barY = y - fontSize * 0.34 + (this.noise.random() - 0.5) * 1.5;

    // Account for deep descendants in numerator or tall ascenders in denominator
    const numSpan = this.getTokensVerticalSpan(numerator, fracFontSize);
    const denSpan = this.getTokensVerticalSpan(denominator, fracFontSize);

    const numY = barY - Math.max(6, numSpan.descent + 3);
    const denY = barY + Math.max(fracFontSize * 0.88, denSpan.ascent + 4);

    let cx = numX;
    for (const t of numerator) {
      cx += this.renderSingleToken(ctx, font, t, cx, numY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
    }
    const actualNumRight = cx - x;

    this.mathRenderer.drawFractionBar(ctx, roughCanvas, x, barY, Math.max(barWidth, actualNumRight), fontSize, inkColor);

    cx = denX;
    for (const t of denominator) {
      cx += this.renderSingleToken(ctx, font, t, cx, denY, fracFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
    }
    const actualDenRight = cx - x;

    // Always advance past the furthest drawn pixel so the next token NEVER overlaps!
    return Math.max(barWidth, actualNumRight, actualDenRight) + 10;
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
    wristState?: WristClusterState
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
        baseWidth = this.renderWordOrChars(ctx, font, base, currX, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
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
      // Standard subscript
      if (sub && sub.length > 0) {
        const subY = y + fontSize * 0.22 + (this.noise.random() - 0.5) * 1.5;
        let sx = startScriptX;
        for (const t of sub) {
          sx += this.renderSingleToken(ctx, font, t, sx, subY, scriptFontSize, inkColor, lineProgress, handwriting, roughCanvas, wristState);
        }
        maxScriptAdvance = Math.max(maxScriptAdvance, sx - startScriptX);
      }
    }

    // Superscript
    if (sup && sup.length > 0) {
      const supY = y - fontSize * 0.44 + (this.noise.random() - 0.5) * 1.5;
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

      // Lower limit at bottom-right of lower hook
      if (token.lower && token.lower.length > 0) {
        const lowerY = y + fontSize * 0.28;
        let lx = x + intWidth - 4;
        for (const t of token.lower) {
          lx += this.renderSingleToken(ctx, font, t, lx, lowerY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
      }

      // Upper limit at top-right of upper hook
      let upperAdvance = 0;
      if (token.upper && token.upper.length > 0) {
        const upperY = y - fontSize * 0.82;
        let ux = x + intWidth;
        for (const t of token.upper) {
          ux += this.renderSingleToken(ctx, font, t, ux, upperY, limitFontSize, inkColor, lineProgress, handwriting, roughCanvas);
        }
        upperAdvance = ux - (x + intWidth);
      }

      return intWidth + upperAdvance + 4;
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
    roughCanvas: ReturnType<typeof rough.canvas>
  ): number {
    const contentWidth = this.estimateTokensWidth(font, content, fontSize);
    const { innerX, totalWidth } = this.mathRenderer.drawSquareRoot(
      ctx,
      roughCanvas,
      x,
      y,
      contentWidth,
      fontSize * 1.1,
      fontSize,
      inkColor
    );

    let cx = innerX;
    for (const t of content) {
      cx += this.renderSingleToken(ctx, font, t, cx, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
    }

    return totalWidth;
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
    const contentWidth = this.estimateTokensWidth(font, content, fontSize);

    let cx = x + 10;
    for (const t of content) {
      cx += this.renderSingleToken(ctx, font, t, cx, y, fontSize, inkColor, lineProgress, handwriting, roughCanvas);
    }

    this.mathRenderer.drawBoxedAnswer(
      ctx,
      roughCanvas,
      font,
      this.mutator,
      x,
      y - fontSize * 0.75,
      contentWidth + 18,
      fontSize * 1.15,
      fontSize,
      inkColor,
      handwriting
    );

    return contentWidth + 28;
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
      // renderBoxedExpr handles both tokens and surrounding box/bubble
      this.renderTokenSequence(
        ctx,
        font,
        tokens,
        startX + 12,
        y,
        fontSize,
        inkColor,
        lineProgress,
        handwriting,
        roughCanvas
      );
      return BASE_LINE_HEIGHT * 1.6;
    }

    // Otherwise render sequence and wrap entire answer block in box/oval/underline
    const seqResult = this.renderTokenSequence(
      ctx,
      font,
      tokens,
      startX + 14,
      y,
      fontSize,
      inkColor,
      lineProgress,
      handwriting,
      roughCanvas
    );

    this.mathRenderer.drawBoxedAnswer(
      ctx,
      roughCanvas,
      font,
      this.mutator,
      startX + 4,
      y - fontSize * 0.75,
      seqResult.width + 16,
      fontSize * 1.15,
      fontSize,
      inkColor,
      handwriting
    );

    return Math.max(BASE_LINE_HEIGHT * 1.6, seqResult.height + 14);
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
    extraSlant?: number
  ): number {
    let currX = startX;
    const wordLen = text.length;
    let prevChar: string | null = null;
    let prevExitPoint: { x: number; y: number } | null = null;

    const BIGRAMS = new Set(['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ou', 'ea']);
    const LIFT_OFF_CHARS = new Set(['e', 'y', 'g', 'd', 's', 't', 'n', 'r', 'a', 'o']);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

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

      const nextChar = i < text.length - 1 ? text[i + 1] : null;

      const isSharedCrossbarPair =
        handwriting.sharedCrossbar &&
        ((char === 't' && nextChar === 't') ||
          (char === 'f' && nextChar === 'f') ||
          (char === 't' && nextChar === 'f'));

      // Calculate wrist cluster parabolic arc offset and progressive slant
      const wristOffset = wristState ? this.updateWristCluster(wristState, currX) : { dy: 0, slantDeg: 0 };
      const charY = y + wristOffset.dy;

      // Bulletproof protection against OpenType missing-glyph square boxes (□):
      // If the font lacks a glyph (index 0), fallback to canvas text rather than rendering a box!
      const rawGlyph = font.charToGlyph(char);
      if (rawGlyph.index === 0) {
        ctx.save();
        ctx.font = `${fontSize * 0.9}px sans-serif`;
        ctx.fillStyle = inkColor;
        ctx.fillText(char, currX, charY);
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
        isSharedCrossbar: isSharedCrossbarPair,
        inkColor,
        extraSlant: (extraSlant || 0) + wristOffset.slantDeg,
      };

      const result = this.mutator.mutateGlyph(font, char, currX, charY, options);

      // Ensure path fill is set to user's ink color
      result.path.fill = inkColor;

      // Word-Initial Touch-Down Micro-Hook
      if (options.isFirstChar && this.noise.random() < 0.25 && result.entryPoint) {
        this.mutator.drawTouchDownHook(ctx, result.entryPoint, fontSize, inkColor);
      }

      // Modulate pen pressure along the line using smooth 2D noise & micro-striations
      const pressureWave = this.noise.get2D(currX * 0.012, charY * 0.02); // [-1, 1]
      const starvationMod = 0.82 + this.noise.get2D(currX * 0.04, charY * 0.04) * 0.16;
      const baseAlpha = Math.max(0.70, Math.min(0.96, starvationMod + pressureWave * 0.08));

      ctx.save();
      ctx.globalAlpha = baseAlpha;
      ctx.shadowColor = inkColor;
      ctx.shadowBlur = 0.40;
      result.path.draw(ctx);

      // Variable pen-pressure thickening / thinning via thin stroke along the glyph outline
      if (pressureWave > -0.22) {
        const p2d = new Path2D(result.path.toPathData(2));
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = (0.22 + (pressureWave + 0.22) * 0.38) * (fontSize / 28);
        ctx.globalAlpha = 0.32;
        ctx.stroke(p2d);
      }
      ctx.restore();

      // Section 1C: Microscopic Ballpoint Striations (Dual-Track Furrows)
      // Rolling ball socket leaves twin ridges with micro-furrow along stroke core
      if (pressureWave > -0.10 && this.noise.random() < 0.65) {
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

      // Shared double-tt crossbar
      if (isSharedCrossbarPair && result.crossbarCenter) {
        const nextResult = this.mutator.mutateGlyph(font, nextChar!, currX + result.advanceWidth, charY, {
          ...options,
          charIndexInWord: i + 1,
          prevChar: char,
          nextChar: i + 2 < text.length ? text[i + 2] : null,
          isSharedCrossbar: true,
        });

        if (nextResult.crossbarCenter) {
          this.mutator.drawSharedCrossbar(
            ctx,
            result.crossbarCenter,
            nextResult.crossbarCenter,
            fontSize,
            inkColor
          );
        }
      }

      // Pseudo-cursive coarticulation bridge
      if (prevChar && prevExitPoint && result.entryPoint) {
        const bigram = (prevChar + char).toLowerCase();
        if (BIGRAMS.has(bigram)) {
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

  private measureWord(font: opentype.Font, word: string, fontSize: number, letterSpacing = 0): number {
    let width = 0;
    for (const char of word) {
      if (
        char === 'Δ' || char === '∇' || char === 'ℒ' || char === 'δ' || char === 'α' ||
        char === 'τ' || char === '∈' || char === '<' || char === '>' || char === '≤' ||
        char === '≥' || char === 'θ' || char === 'π' || char === 'β' || char === 'λ' ||
        char === 'φ' || char === 'ϕ' || char === 'ω' || char === 'μ' || char === 'σ'
      ) {
        width += fontSize * 0.60 + letterSpacing;
        continue;
      }
      const glyph = font.charToGlyph(char);
      const adv = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / font.unitsPerEm : fontSize * 0.55;
      width += Math.max(2, adv + letterSpacing);
    }
    return width;
  }

  private estimateTokenWidth(font: opentype.Font, token: MathToken, fontSize: number): number {
    const wordSpacingMult = this.currentHandwriting?.wordSpacing ?? 1.0;
    const letterSpacing = this.currentHandwriting?.letterSpacing ?? 0;

    if (token.type === 'space') return fontSize * 0.48 * token.widthMultiplier * wordSpacingMult;
    if (token.type === 'text') return this.measureWord(font, token.text, fontSize, letterSpacing);
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
      if (token.symbol === 'Δ' || token.symbol === '∇' || token.symbol === 'ℒ') return 18 * scale;
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
      const isBinomial = token.bracket === 'p' && token.cells.length === 2 && (token.cells[0]?.length || 0) <= 1;
      const numCols = token.cells[0]?.length || 1;
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
        ? this.measureWord(font, token.base, fontSize, letterSpacing)
        : 16;
      const sw = token.sup ? this.estimateTokensWidth(font, token.sup, fontSize * 0.70) : 0;
      const subw = token.sub ? this.estimateTokensWidth(font, token.sub, fontSize * 0.70) : 0;
      return bw + Math.max(sw, subw) + 4;
    }
    if (token.type === 'root') {
      return this.estimateTokensWidth(font, token.content, fontSize) + 24;
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
    const rowHeight = 38;
    const totalTableHeight = rowCount * rowHeight;
    const availableWidth = RIGHT_MARGIN - startX;

    // 1. Compute column widths based on maximum content with comfortable column breathing room
    const colWidths: number[] = new Array(columnCount).fill(50);
    for (let c = 0; c < columnCount; c++) {
      let maxW = this.estimateTokensWidth(font, headers[c] || [], fontSize * 0.84);
      for (let r = 0; r < rows.length; r++) {
        const cellTokens = rows[r][c] || [];
        const cw = this.estimateTokensWidth(font, cellTokens, fontSize * 0.80);
        if (cw > maxW) maxW = cw;
      }
      colWidths[c] = Math.max(55, maxW + 36);
    }

    // Scale columns proportionally if total exceeds availableWidth
    let totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
    if (totalTableWidth > availableWidth) {
      const scale = availableWidth / totalTableWidth;
      for (let c = 0; c < columnCount; c++) colWidths[c] *= scale;
      totalTableWidth = availableWidth;
    }

    // Precalculate column X boundaries
    const colXPositions: number[] = [startX];
    for (let c = 0; c < columnCount; c++) {
      colXPositions.push(colXPositions[c] + colWidths[c]);
    }

    const headerBottomY = startY + rowHeight;

    // 2. Table structure lines of separation:
    // When handwriting.tableLines is false (default), no separation lines are drawn.
    // The table renders as clean, naturally aligned columns and rows without grid boundaries.
    if (handwriting.tableLines) {
      // Top horizontal boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY, startX + totalTableWidth, startY, 1.6, inkColor, 1.8, 5);
      // Bottom horizontal boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY + totalTableHeight, startX + totalTableWidth, startY + totalTableHeight, 1.6, inkColor, 1.8, 5);
      // Left vertical boundary
      this.mathRenderer.drawHandLine(ctx, startX, startY, startX, startY + totalTableHeight, 1.6, inkColor, 1.8, 5);
      // Right vertical boundary
      this.mathRenderer.drawHandLine(ctx, startX + totalTableWidth, startY, startX + totalTableWidth, startY + totalTableHeight, 1.6, inkColor, 1.8, 5);

      // Horizontal line under header (swept stroke overshooting slightly)
      this.mathRenderer.drawHandLine(ctx, startX, headerBottomY, startX + totalTableWidth, headerBottomY, 1.9, inkColor, 2.0, 6);

      // Subtle horizontal divider lines between data rows
      for (let r = 1; r < rows.length; r++) {
        const ry = headerBottomY + r * rowHeight;
        this.mathRenderer.drawHandLine(ctx, startX, ry, startX + totalTableWidth, ry, 0.9, inkColor, 1.2, 2);
      }

      // Vertical column divider lines with organic hand tremor and non-CAD overshoots
      for (let c = 1; c < columnCount; c++) {
        const cx = colXPositions[c];
        const startJitter = (this.noise.random() - 0.5) * 2;
        const endJitter = (this.noise.random() - 0.5) * 2;
        this.mathRenderer.drawHandLine(
          ctx,
          cx + startJitter,
          startY,
          cx + endJitter,
          startY + totalTableHeight,
          1.2,
          inkColor,
          1.5,
          3
        );
      }
    }

    // 3. Render Header Cells
    const headerFontSize = fontSize * 0.85;
    const headerBaselineY = startY + rowHeight * 0.70;
    for (let c = 0; c < columnCount; c++) {
      const hTokens = headers[c] || [];
      const cellW = colWidths[c];
      const tokenW = this.estimateTokensWidth(font, hTokens, headerFontSize);
      const cellStartX = colXPositions[c] + Math.max(6, (cellW - tokenW) * 0.5);

      const jitterX = (this.noise.random() - 0.5) * 2.5;
      const jitterY = (this.noise.random() - 0.5) * 1.5;
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
    const cellFontSize = fontSize * 0.80;
    for (let r = 0; r < rows.length; r++) {
      const rowTokens = rows[r];
      const cellBaselineY = headerBottomY + r * rowHeight + rowHeight * 0.70;

      for (let c = 0; c < columnCount; c++) {
        const cTokens = rowTokens[c] || [];
        if (cTokens.length === 0) continue;

        const cellW = colWidths[c];
        const tokenW = this.estimateTokensWidth(font, cTokens, cellFontSize);
        const cellStartX = colXPositions[c] + Math.max(6, (cellW - tokenW) * 0.5);

        const jitterX = (this.noise.random() - 0.5) * 2.5;
        const jitterY = (this.noise.random() - 0.5) * 1.5;
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
  ): Promise<void> {
    if (canvases.length === 0) return;

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
    }

    pdf.save(`${title}.pdf`);
  }
}
