import {
  CURSIVE_LOWERCASE,
  CURSIVE_UPPERCASE,
  CursiveGlyphDef,
  CursiveStrokePoint,
  convertCustomVariantToCursive,
  getCursiveProfile,
} from '../data/cursiveAlphabet';
import { AllographLibrary, HandwritingStyleSettings, PenSettings } from '../types';
import { SeededNoise } from './noise';
import { GlyphMutator } from './glyphMutator';
import { MathRenderer } from './mathRenderer';

interface DelayedGlyphTask {
  char: string;
  strokes: CursiveStrokePoint[][];
  stemX: number;
  crossbarY: number;
  tittlePos?: { x: number; y: number };
}

/**
 * Centripetal Catmull-Rom Spline Sampler (alpha = 0.5 avoids cusps/loops).
 */
export function sampleCatmullRom(
  pts: CursiveStrokePoint[],
  samplesPerSegment = 6
): CursiveStrokePoint[] {
  if (pts.length < 2) return pts;
  const padded = [
    { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y, p: pts[0].p },
    ...pts,
    {
      x: 2 * pts[pts.length - 1].x - pts[pts.length - 2].x,
      y: 2 * pts[pts.length - 1].y - pts[pts.length - 2].y,
      p: pts[pts.length - 1].p,
    },
  ];

  const out: CursiveStrokePoint[] = [];
  const alpha = 0.5;

  const tj = (ti: number, p0: CursiveStrokePoint, p1: CursiveStrokePoint) => {
    const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    return ti + Math.pow(Math.max(0.001, d), alpha);
  };

  for (let i = 0; i < padded.length - 3; i++) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    const t0 = 0;
    const t1 = tj(t0, p0, p1);
    const t2 = tj(t1, p1, p2);
    const t3 = tj(t2, p2, p3);

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = t1 + ((t2 - t1) * s) / samplesPerSegment;
      const lerpPt = (a: CursiveStrokePoint, b: CursiveStrokePoint, ta: number, tb: number) => {
        const w = tb === ta ? 0 : (t - ta) / (tb - ta);
        return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, p: a.p };
      };
      const A1 = lerpPt(p0, p1, t0, t1);
      const A2 = lerpPt(p1, p2, t1, t2);
      const A3 = lerpPt(p2, p3, t2, t3);
      const B1 = lerpPt(A1, A2, t0, t2);
      const B2 = lerpPt(A2, A3, t1, t3);
      out.push(lerpPt(B1, B2, t1, t2));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Closed variable-width polygon ribbon rendering to prevent alpha-stacking beads.
 */
function drawSmoothInkRibbon(
  ctx: CanvasRenderingContext2D,
  pts: CursiveStrokePoint[],
  baseWidth: number,
  contrast: number,
  inkColor: string,
  penStyle: string,
  drySkips: boolean,
  noise: SeededNoise,
  isColdStart: boolean,
  coldStartEnabled: boolean,
  inkPooling: boolean
) {
  if (pts.length < 2) return;
  const leftRail: Array<{ x: number; y: number }> = [];
  const rightRail: Array<{ x: number; y: number }> = [];
  let arcLen = 0;

  for (let k = 0; k < pts.length; k++) {
    const pPrev = pts[Math.max(0, k - 1)];
    const pNext = pts[Math.min(pts.length - 1, k + 1)];
    const tx = pNext.x - pPrev.x;
    const ty = pNext.y - pPrev.y;
    const tLen = Math.max(0.001, Math.hypot(tx, ty));
    const nx = -ty / tLen;
    const ny = tx / tLen;
    if (k > 0) arcLen += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);

    const dirY = ty / tLen; // +1 = downstroke, -1 = upstroke
    const widthMod = 1.0 + dirY * 0.42 * contrast;
    const coldTaper = isColdStart && coldStartEnabled && arcLen < 7
      ? 0.45 + (arcLen / 7) * 0.55
      : 1.0;
    const endTaper = k === 0 || k === pts.length - 1 ? 0.65 : 1.0;
    const halfW = Math.max(0.32, (baseWidth * widthMod * coldTaper * endTaper) * 0.5);

    leftRail.push({ x: pts[k].x + nx * halfW, y: pts[k].y + ny * halfW });
    rightRail.push({ x: pts[k].x - nx * halfW, y: pts[k].y - ny * halfW });
  }

  ctx.save();
  ctx.fillStyle = inkColor;
  ctx.globalAlpha = penStyle === 'fountain' ? 0.92 : penStyle === 'gel' ? 0.94 : 0.88;
  ctx.beginPath();
  ctx.moveTo(leftRail[0].x, leftRail[0].y);
  for (let k = 1; k < leftRail.length; k++) ctx.lineTo(leftRail[k].x, leftRail[k].y);
  for (let k = rightRail.length - 1; k >= 0; k--) ctx.lineTo(rightRail[k].x, rightRail[k].y);
  ctx.closePath();
  ctx.fill();

  // Subtle ballpoint central track furrow (optional dry skips on fast upstrokes)
  if (drySkips && penStyle === 'ballpoint') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.lineWidth = Math.max(0.4, baseWidth * 0.25);
    ctx.beginPath();
    let drawing = false;
    for (let k = 1; k < pts.length; k++) {
      if (noise.random() < 0.18) {
        if (!drawing) { ctx.moveTo(pts[k - 1].x, pts[k - 1].y); drawing = true; }
        ctx.lineTo(pts[k].x, pts[k].y);
      } else {
        drawing = false;
      }
    }
    ctx.stroke();
  }

  // Turnaround ink pooling
  if (inkPooling) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.72;
    for (let k = 2; k < pts.length; k++) {
      const v1x = pts[k - 1].x - pts[k - 2].x, v1y = pts[k - 1].y - pts[k - 2].y;
      const v2x = pts[k].x - pts[k - 1].x, v2y = pts[k].y - pts[k - 1].y;
      const d1 = Math.hypot(v1x, v1y), d2 = Math.hypot(v2x, v2y);
      if (d1 > 0.2 && d2 > 0.2 && ((v1x * v2x + v1y * v2y) / (d1 * d2)) < -0.32 && noise.random() < 0.35) {
        ctx.beginPath();
        ctx.arc(pts[k - 1].x, pts[k - 1].y, baseWidth * 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

export class CursiveEngine {
  private noise: SeededNoise;
  private allographToggle: Map<string, number> = new Map();

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  public canRenderWordSegment(word: string, allographs?: AllographLibrary, style?: string): boolean {
    if (!word) return false;
    const profile = getCursiveProfile(style);
    for (const ch of word) {
      if (!profile.alphabet[ch] && !CURSIVE_LOWERCASE[ch] && !CURSIVE_UPPERCASE[ch] && !allographs?.[ch]?.length) {
        return false;
      }
    }
    return true;
  }

  public measureCursiveWord(
    word: string,
    fontSize: number,
    handwriting: HandwritingStyleSettings,
    allographs?: AllographLibrary
  ): number {
    const profile = getCursiveProfile(handwriting.cursiveStyle);
    const xHeight = fontSize * profile.xHeightRatio;
    const spacingAdj = (handwriting.letterSpacing ?? 0) * 0.65;
    let total = 0;
    for (const ch of word) {
      const custom = allographs?.[ch]?.[0] ? convertCustomVariantToCursive(allographs[ch][0]) : null;
      const def = custom || profile.alphabet[ch] || CURSIVE_UPPERCASE[ch] || CURSIVE_LOWERCASE[ch];
      total += def ? def.advance * xHeight + spacingAdj : fontSize * 0.55;
    }
    return Math.max(4, total);
  }

  public renderCursiveRun(
    ctx: CanvasRenderingContext2D,
    word: string,
    startX: number,
    baselineY: number,
    fontSize: number,
    inkColor: string,
    handwriting: HandwritingStyleSettings,
    pen: PenSettings,
    mutator: GlyphMutator,
    mathRenderer: MathRenderer,
    allographs?: AllographLibrary,
    isColdStart = false
  ): number {
    if (!word) return 0;
    const profile = getCursiveProfile(handwriting.cursiveStyle);
    const xHeight = fontSize * profile.xHeightRatio;
    const baseSlantDeg = handwriting.slantAngle ?? profile.defaultSlantDeg;
    const slantRad = (baseSlantDeg * Math.PI) / 180;
    const spacingAdj = (handwriting.letterSpacing ?? 0) * 0.65;
    const warp = handwriting.loopWarp ?? 0.5;
    const baseWidth = Math.max(1.1, (pen.strokeWidth || 1.6) * (fontSize / 27) * 1.18);

    const penRuns: CursiveStrokePoint[][] = [];
    let currentRun: CursiveStrokePoint[] = [];

    const flushRun = () => {
      if (currentRun.length > 0) {
        penRuns.push(currentRun);
        currentRun = [];
      }
    };

    const delayedTasks: DelayedGlyphTask[] = [];
    const immediateStrokes: CursiveStrokePoint[][] = [];

    let cursorX = startX;
    let prevDef: CursiveGlyphDef | null = null;
    let prevChar = '';
    let prevExitAbs: { x: number; y: number } | null = null;

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const customIdx = allographs?.[ch]?.length ? mutator.sampleAllographVariant(ch, allographs) : null;
      const customDef = customIdx !== null && allographs?.[ch]?.[customIdx]
        ? convertCustomVariantToCursive(allographs[ch][customIdx])
        : null;
      const def = customDef || profile.alphabet[ch] || CURSIVE_UPPERCASE[ch] || CURSIVE_LOWERCASE[ch];
      if (!def) {
        flushRun();
        cursorX += fontSize * 0.55;
        prevExitAbs = null;
        prevDef = null;
        continue;
      }

      // Anti-duplication allograph switching
      let rawStroke = def.primaryStrokes[0];
      if (def.altPrimaryStrokes && def.altPrimaryStrokes.length > 0) {
        const lastIdx = this.allographToggle.get(ch) ?? 0;
        const useAlt = (prevChar === ch && handwriting.antiDuplication) || (lastIdx === 0 && this.noise.random() < 0.45);
        if (useAlt) {
          rawStroke = def.altPrimaryStrokes[0];
          this.allographToggle.set(ch, 1);
        } else {
          this.allographToggle.set(ch, 0);
        }
      }

      // Per-letter biometric variance
      const charScaleX = (1.0 + (this.noise.random() - 0.5) * 0.08 * warp + (i > 1 && i < word.length - 1 ? 0.04 : 0)) * profile.loopWidthScale;
      let charScaleY = 1.0 + (this.noise.random() - 0.5) * 0.10 * warp - (i > 1 && i < word.length - 1 ? 0.05 : 0);
      if (profile.medialSquash > 0 && /^[mnuire]$/.test(ch) && i > 0 && i < word.length - 1) {
        charScaleY *= 1.0 - profile.medialSquash * 0.4;
      }

      const charBaselineY = baselineY + this.noise.noise1D(cursorX * 0.014 + baselineY * 0.008) * (handwriting.baselineWave ?? 0.4) * 4.2;

      const toAbs = (pt: CursiveStrokePoint, idxInChar: number): CursiveStrokePoint => {
        let nx = pt.x * charScaleX;
        let ny = pt.y * charScaleY;

        // High-join adaptation after o, v, w, b
        if (prevDef?.exitJoin === 'high' && idxInChar < 2) {
          const blend = idxInChar === 0 ? 0.72 : 0.35;
          ny = ny * (1 - blend) + (-0.80) * blend;
        }

        // Loop warp noise
        const jx = this.noise.get2D(cursorX * 0.04 + idxInChar * 0.7, baselineY * 0.03) * 0.06 * warp;
        const jy = this.noise.get2D(cursorX * 0.04 + 19.3, baselineY * 0.03 + idxInChar * 0.7) * 0.07 * warp;
        nx += jx;
        ny += jy;

        const absY = charBaselineY + ny * xHeight;
        const absX = cursorX + nx * xHeight + (-ny * xHeight) * Math.tan(slantRad);
        return { x: absX, y: absY, p: pt.p };
      };

      const charAbsPts = rawStroke.map((pt, idx) => toAbs(pt, idx));

      // Concave ligature bridge or pen break
      const canBridge =
        prevExitAbs &&
        charAbsPts.length > 0 &&
        prevDef?.exitJoin !== 'break' &&
        def.entryJoin !== 'break';

      if (prevExitAbs && !canBridge) {
        flushRun();
      } else if (canBridge && charAbsPts.length > 0) {
        const minStepX = 0.04 * xHeight;
        if (charAbsPts[0].x < prevExitAbs!.x + minStepX) {
          const shiftX = prevExitAbs!.x + minStepX - charAbsPts[0].x;
          cursorX += shiftX;
          for (const p of charAbsPts) p.x += shiftX;
        }
        const entryAbs = charAbsPts[0];
        const midX = (prevExitAbs!.x + entryAbs.x) * 0.5;
        const dip = prevDef?.exitJoin === 'high' ? 0.06 * xHeight : 0.08 * xHeight;
        const midY = Math.max(prevExitAbs!.y, entryAbs.y) + dip;
        currentRun.push({ x: midX, y: midY, p: 0.75 });
      }

      currentRun.push(...charAbsPts);
      prevExitAbs = charAbsPts[charAbsPts.length - 1];

      // Lift pen after descender if profile specifies it
      if (profile.breakAfterDescenders && /^[gjqyz]$/.test(ch)) {
        flushRun();
        prevExitAbs = null;
      }

      // Queue delayed crossbars & tittles (or execute immediately if disabled)
      if (def.delayedStrokes) {
        const mappedDelayed = def.delayedStrokes.map((s) => s.map((pt, idx) => toAbs(pt, idx)));
        if (handwriting.delayedCrossAndDot ?? true) {
          const crossbarNormY = -1.10;
          delayedTasks.push({
            char: ch,
            strokes: mappedDelayed,
            stemX: cursorX + def.advance * 0.45 * xHeight + (-crossbarNormY * xHeight) * Math.tan(slantRad),
            crossbarY: charBaselineY - xHeight * 1.10,
            tittlePos: ch === 'i' || ch === 'j' ? mappedDelayed[0][0] : undefined,
          });
        } else {
          immediateStrokes.push(...mappedDelayed);
        }
      }

      cursorX += def.advance * xHeight * charScaleX + spacingAdj;
      prevDef = def;
      prevChar = ch;
    }

    flushRun();

    // Render continuous variable-width ink ribbons per pen run
    const contrast = (handwriting.cursivePressureContrast ?? profile.pressureContrast) *
      (pen.penStyle === 'fountain' ? 1.35 : pen.penStyle === 'gel' ? 0.95 : 0.68);

    for (let rIdx = 0; rIdx < penRuns.length; rIdx++) {
      const runPts = penRuns[rIdx];
      if (runPts.length < 2) continue;
      const sampled = sampleCatmullRom(runPts, 6);
      drawSmoothInkRibbon(
        ctx,
        sampled,
        baseWidth,
        contrast,
        inkColor,
        pen.penStyle,
        pen.drySkips ?? false,
        this.noise,
        isColdStart && rIdx === 0,
        handwriting.coldStartStarvation ?? true,
        pen.inkPooling ?? false
      );
    }

    // Execute immediate secondary strokes when delayedCrossAndDot is false
    if (immediateStrokes.length > 0) {
      ctx.save();
      ctx.strokeStyle = inkColor;
      ctx.fillStyle = inkColor;
      ctx.lineWidth = Math.max(1.0, baseWidth * 0.85);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.88;
      for (const stroke of immediateStrokes) {
        if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke[0].x, stroke[0].y, Math.max(1.0, baseWidth * 0.55), 0, Math.PI * 2);
          ctx.fill();
        } else if (stroke.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let s = 1; s < stroke.length; s++) ctx.lineTo(stroke[s].x, stroke[s].y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Execute delayed crossbars ('t', 'x') and flying tittles ('i', 'j')
    for (let dIdx = 0; dIdx < delayedTasks.length; dIdx++) {
      const task = delayedTasks[dIdx];
      if ((task.char === 'i' || task.char === 'j') && task.tittlePos) {
        mutator.drawFlyingTittle(ctx, task.tittlePos, fontSize, inkColor, handwriting.flyingDotChaos);
      } else if (
        task.char === 't' &&
        handwriting.sharedCrossbar &&
        dIdx + 1 < delayedTasks.length &&
        delayedTasks[dIdx + 1].char === 't' &&
        delayedTasks[dIdx + 1].stemX - task.stemX < fontSize * 1.4
      ) {
        const nextTask = delayedTasks[dIdx + 1];
        mutator.drawSharedCrossbar(
          ctx,
          { x: task.stemX, y: task.crossbarY },
          { x: nextTask.stemX, y: nextTask.crossbarY },
          fontSize,
          inkColor
        );
        dIdx++; // consume paired 't'
      } else {
        ctx.save();
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = Math.max(1.0, baseWidth * 0.85);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.88;
        for (const stroke of task.strokes) {
          if (stroke.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let s = 1; s < stroke.length; s++) ctx.lineTo(stroke[s].x, stroke[s].y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    return cursorX - startX;
  }
}

