import {
  CURSIVE_LOWERCASE,
  CURSIVE_UPPERCASE,
  CursiveGlyphDef,
  CursiveStrokePoint,
  convertCustomVariantToCursive,
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

export class CursiveEngine {
  private noise: SeededNoise;
  private allographToggle: Map<string, number> = new Map();

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  public canRenderWordSegment(word: string, allographs?: AllographLibrary): boolean {
    if (!word) return false;
    for (const ch of word) {
      if (!CURSIVE_LOWERCASE[ch] && !CURSIVE_UPPERCASE[ch] && !allographs?.[ch]?.length) {
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
    const xHeight = fontSize * 0.48;
    const spacingAdj = (handwriting.letterSpacing ?? 0) * 0.65;
    let total = 0;
    for (const ch of word) {
      const custom = allographs?.[ch]?.[0] ? convertCustomVariantToCursive(allographs[ch][0]) : null;
      const def = custom || CURSIVE_LOWERCASE[ch] || CURSIVE_UPPERCASE[ch];
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
    const xHeight = fontSize * 0.48;
    const baseSlantDeg = handwriting.slantAngle ?? 12;
    const slantRad = (baseSlantDeg * Math.PI) / 180;
    const spacingAdj = (handwriting.letterSpacing ?? 0) * 0.65;
    const warp = handwriting.loopWarp ?? 0.5;
    const baseWidth = Math.max(1.1, (pen.strokeWidth || 1.6) * (fontSize / 27) * 1.18);

    const joinedPoints: CursiveStrokePoint[] = [];
    const delayedTasks: DelayedGlyphTask[] = [];

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
      const def = customDef || CURSIVE_LOWERCASE[ch] || CURSIVE_UPPERCASE[ch];
      if (!def) {
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
      const charScaleX = 1.0 + (this.noise.random() - 0.5) * 0.08 * warp + (i > 1 && i < word.length - 1 ? 0.04 : 0);
      const charScaleY = 1.0 + (this.noise.random() - 0.5) * 0.10 * warp - (i > 1 && i < word.length - 1 ? 0.05 : 0);
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

      // Concave ligature bridge from previous char's exit point
      if (prevExitAbs && charAbsPts.length > 0 && prevDef?.exitJoin !== 'break' && def.entryJoin !== 'break') {
        const entryAbs = charAbsPts[0];
        const midX = (prevExitAbs.x + entryAbs.x) * 0.5;
        const dip = prevDef?.exitJoin === 'high' ? 0.06 * xHeight : 0.08 * xHeight;
        const midY = Math.max(prevExitAbs.y, entryAbs.y) + dip;
        joinedPoints.push({ x: midX, y: midY, p: 0.75 });
      }

      joinedPoints.push(...charAbsPts);
      prevExitAbs = charAbsPts[charAbsPts.length - 1];

      // Queue delayed crossbars & tittles (or 'x' second stroke)
      if (def.delayedStrokes && (handwriting.delayedCrossAndDot ?? true)) {
        const mappedDelayed = def.delayedStrokes.map((s) => s.map((pt, idx) => toAbs(pt, idx)));
        delayedTasks.push({
          char: ch,
          strokes: mappedDelayed,
          stemX: cursorX + def.advance * 0.45 * xHeight,
          crossbarY: charBaselineY - xHeight * 1.10,
          tittlePos: ch === 'i' || ch === 'j' ? mappedDelayed[0][0] : undefined,
        });
      }

      cursorX += def.advance * xHeight * charScaleX + spacingAdj;
      prevDef = def;
      prevChar = ch;
    }

    // Draw continuous centripetal Catmull-Rom variable-width ink ribbon
    const sampled = sampleCatmullRom(joinedPoints, 6);
    if (sampled.length >= 2) {
      ctx.save();
      ctx.strokeStyle = inkColor;
      ctx.fillStyle = inkColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let arcLen = 0;
      const contrast = (handwriting.cursivePressureContrast ?? 0.60) *
        (pen.penStyle === 'fountain' ? 1.35 : pen.penStyle === 'gel' ? 0.95 : 0.68);

      for (let k = 1; k < sampled.length; k++) {
        const p1 = sampled[k - 1];
        const p2 = sampled[k];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const ds = Math.hypot(dx, dy);
        if (ds < 0.05) continue;
        arcLen += ds;

        const dirY = dy / ds; // +1 downstroke, -1 upstroke
        const widthFactor = 1.0 + dirY * 0.40 * contrast;
        const coldRamp = isColdStart && (handwriting.coldStartStarvation ?? true) && arcLen < 7
          ? 0.44 + (arcLen / 7) * 0.48
          : 0.90;
        const drySkipMod = pen.drySkips && pen.penStyle === 'ballpoint' && dirY < -0.5 && this.noise.random() < 0.14
          ? 0.58
          : 1.0;

        ctx.lineWidth = Math.max(0.55, baseWidth * widthFactor);
        ctx.globalAlpha = Math.max(0.35, Math.min(0.95, coldRamp * drySkipMod));

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Turnaround ink pooling
        if (pen.inkPooling && k > 1) {
          const p0 = sampled[k - 2];
          const v1x = p1.x - p0.x, v1y = p1.y - p0.y;
          const d0 = Math.hypot(v1x, v1y);
          if (d0 > 0.2 && ((v1x * dx + v1y * dy) / (d0 * ds)) < -0.30 && this.noise.random() < 0.35) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, baseWidth * 0.65, 0, Math.PI * 2);
            ctx.fill();
          }
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
