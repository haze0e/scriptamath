import rough from 'roughjs';
import opentype from 'opentype.js';
import { SeededNoise } from './noise';
import { GlyphMutator } from './glyphMutator';
import { HandwritingStyleSettings } from '../types';

export interface MathRenderContext {
  ctx: CanvasRenderingContext2D;
  font: opentype.Font;
  mutator: GlyphMutator;
  noise: SeededNoise;
  handwriting: HandwritingStyleSettings;
  inkColor: string;
  fontSize: number;
  roughCanvas: ReturnType<typeof rough.canvas>;
}

export interface MathBox {
  width: number;
  height: number;
  ascent: number;
  descent: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

/**
 * Calibrates procedural math stroke width directly from font stem metrics
 * so mathematical operators and font glyphs share the exact same optical nib thickness.
 */
export function measureFontStemWidth(font: opentype.Font, fontSize: number): number {
  // Sample glyphs with vertical stems: 'l', '1', 't', 'H'
  const glyph = font.charToGlyph('l');
  const unitsPerEm = font.unitsPerEm > 0 ? font.unitsPerEm : 1000;
  const advance = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / unitsPerEm : fontSize * 0.25;
  // Authentic ballpoint stroke width ranges between 2.1px and 2.8px at fontSize 27
  return Math.max(2.1, Math.min(2.8, advance * 0.35));
}

export class MathRenderer {
  private noise: SeededNoise;
  private calibratedLineWidth = 2.4;
  private allographHistory: Map<string, number> = new Map();

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  public setCalibratedLineWidth(width: number) {
    this.calibratedLineWidth = Math.max(1.8, Math.min(3.2, width));
  }

  public getBaseLineWidth(scale: number, multiplier = 1.0): number {
    return Math.max(1.7, this.calibratedLineWidth * scale * multiplier);
  }

  /**
   * Biometric anti-duplication selector: ensures consecutive occurrences of the same math symbol
   * always cycle through different human allographs rather than looking cloned.
   */
  public getNextAllograph(symbolKey: string, totalStyles: number): number {
    const last = this.allographHistory.get(symbolKey) ?? -1;
    let roll = Math.floor(this.noise.random() * totalStyles);
    if (totalStyles > 1 && roll === last) {
      roll = (roll + 1 + Math.floor(this.noise.random() * (totalStyles - 1))) % totalStyles;
    }
    this.allographHistory.set(symbolKey, roll);
    return roll;
  }

  /**
   * Procedural Imperfect Equals (=)
   * 3 distinct human allographs with dynamic biometric variations:
   * - Allograph 0: Upper bar slightly longer with gentle upward bow, lower bar shorter with downward sag.
   * - Allograph 1: Lower bar longer with subtle forward hand slant (+1.5° to +3.5°).
   * - Allograph 2: Rapid parallel speed slashes with subtle angular divergence and independent start jitter.
   */
  public drawImperfectEquals(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('equals', 3);
    const baseWidth = (13 + this.noise.random() * 3.5) * scale;
    const barGap = (5.2 + (this.noise.random() - 0.5) * 2.2) * scale;
    const lineWidth = this.getBaseLineWidth(scale, 0.95 + (this.noise.random() - 0.5) * 0.12);

    let len1 = baseWidth;
    let len2 = baseWidth;
    let tilt1 = ((this.noise.random() - 0.5) * 3.5 * Math.PI) / 180;
    let tilt2 = ((this.noise.random() - 0.5) * 3.5 * Math.PI) / 180;
    let startOffset1 = 0;
    let startOffset2 = 0;

    if (style === 0) {
      // Top bar longer
      len1 = baseWidth * (1.05 + this.noise.random() * 0.15);
      len2 = baseWidth * (0.85 + this.noise.random() * 0.12);
      startOffset2 = (0.5 + this.noise.random() * 1.5) * scale;
    } else if (style === 1) {
      // Bottom bar longer with forward tilt
      len1 = baseWidth * (0.88 + this.noise.random() * 0.12);
      len2 = baseWidth * (1.06 + this.noise.random() * 0.16);
      tilt2 += (1.8 * Math.PI) / 180;
      startOffset1 = (0.5 + this.noise.random() * 1.2) * scale;
    } else {
      // Divergent speed strokes
      len1 = baseWidth * (0.92 + this.noise.random() * 0.20);
      len2 = baseWidth * (0.90 + this.noise.random() * 0.22);
      tilt1 -= (1.2 * Math.PI) / 180;
      tilt2 += (1.5 * Math.PI) / 180;
      startOffset2 = (this.noise.random() - 0.5) * 2.0 * scale;
    }

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    const yTop = y - fontSize * 0.35 - barGap * 0.5;
    const yBottom = y - fontSize * 0.35 + barGap * 0.5;

    const midBow1 = (this.noise.random() - 0.5) * 1.6 * scale;
    const midBow2 = (this.noise.random() - 0.5) * 1.6 * scale;

    ctx.beginPath();
    ctx.moveTo(x + startOffset1, yTop);
    ctx.quadraticCurveTo(
      x + startOffset1 + len1 * 0.5,
      yTop + midBow1,
      x + startOffset1 + Math.cos(tilt1) * len1,
      yTop + Math.sin(tilt1) * len1
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + startOffset2, yBottom);
    ctx.quadraticCurveTo(
      x + startOffset2 + len2 * 0.5,
      yBottom + midBow2,
      x + startOffset2 + Math.cos(tilt2) * len2,
      yBottom + Math.sin(tilt2) * len2
    );
    ctx.stroke();

    ctx.restore();

    return Math.max(len1 + startOffset1, len2 + startOffset2) + 6 * scale;
  }

  /**
   * Procedural Plus (+) or Minus (-)
   */
  public drawPlus(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const size = 13 * scale;
    const centerY = y - fontSize * 0.35;
    const centerX = x + size * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    // Horizontal bar intersects at 40% - 60% height rather than mechanical dead center
    const hIntersectY = centerY + (this.noise.random() - 0.5) * size * 0.18;
    const hWobble = (this.noise.random() - 0.5) * 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x, hIntersectY + hWobble);
    ctx.lineTo(x + size, hIntersectY - hWobble);
    ctx.stroke();

    // Vertical stroke is slightly slanted forward (3° to 8°) and curves right at bottom tip
    const vSlantRad = ((3 + this.noise.random() * 5) * Math.PI) / 180;
    const vOffset = Math.sin(vSlantRad) * size * 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - vOffset, centerY - size * 0.5);
    ctx.quadraticCurveTo(
      centerX,
      centerY,
      centerX + vOffset + 1.2 * scale,
      centerY + size * 0.5
    );
    ctx.stroke();

    ctx.restore();
    return size + 6 * scale;
  }

  public drawMinus(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const size = 12 * scale * (0.9 + this.noise.random() * 0.2);
    const centerY = y - fontSize * 0.35;
    const wobble = (this.noise.random() - 0.5) * 1.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x, centerY + wobble);
    ctx.lineTo(x + size, centerY - wobble);
    ctx.stroke();

    ctx.restore();
    return size + 6 * scale;
  }

  /**
   * Procedural Implies / Therefore / Because symbols
   */
  public drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isDouble = false
  ): number {
    const scale = fontSize / 28;
    const len = (isDouble ? 20 : 16) * scale;
    const centerY = y - fontSize * 0.35;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isDouble) {
      // => double arrow: top and bottom bars differ in length by 15%-30%, diverge/converge by 1.5°-4°
      const gap = (3.2 + this.noise.random() * 1.2) * scale;
      const lenTop = len * (0.85 + this.noise.random() * 0.20);
      const lenBot = len * (0.90 + this.noise.random() * 0.25);
      const tiltTop = ((this.noise.random() - 0.5) * 3.0 * Math.PI) / 180;
      const tiltBot = ((this.noise.random() - 0.5) * 3.0 * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(x, centerY - gap * 0.5);
      ctx.lineTo(x + Math.cos(tiltTop) * lenTop, centerY - gap * 0.5 + Math.sin(tiltTop) * lenTop);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + (this.noise.random() - 0.5) * 2 * scale, centerY + gap * 0.5);
      ctx.lineTo(x + Math.cos(tiltBot) * lenBot, centerY + gap * 0.5 + Math.sin(tiltBot) * lenBot);
      ctx.stroke();

      // Asymmetric arrowhead (top wing steeper, bottom wing flatter & shorter)
      const maxLen = Math.max(lenTop, lenBot);
      const headTipX = x + maxLen + 2.5 * scale;
      const headTipY = centerY + (this.noise.random() - 0.5) * 2.0 * scale;
      const topWingLen = (6.5 + this.noise.random() * 1.8) * scale;
      const botWingLen = (5.0 + this.noise.random() * 1.5) * scale;

      ctx.beginPath();
      ctx.moveTo(headTipX - topWingLen, headTipY - 6.0 * scale);
      ctx.lineTo(headTipX, headTipY);
      ctx.lineTo(headTipX - botWingLen, headTipY + 4.8 * scale);
      ctx.stroke();
    } else {
      // -> single arrow
      ctx.beginPath();
      ctx.moveTo(x, centerY);
      ctx.lineTo(x + len, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + len - 5 * scale, centerY - 4.5 * scale);
      ctx.lineTo(x + len, centerY);
      ctx.lineTo(x + len - 5 * scale, centerY + 4.5 * scale);
      ctx.stroke();
    }

    ctx.restore();
    return len + 8 * scale;
  }

  public drawVectorArrow(
    ctx: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    topY: number,
    fontSize: number,
    inkColor: string
  ) {
    const scale = fontSize / 28;
    const minW = Math.max(endX - startX, 11 * scale);
    const sx = startX;
    const ex = startX + minW;
    const y = topY - 3.5 * scale + (this.noise.random() - 0.5) * 1.0;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.1, this.getBaseLineWidth(scale, 0.78));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Horizontal shaft with subtle hand bow
    ctx.beginPath();
    ctx.moveTo(sx, y + 0.4 * scale);
    ctx.quadraticCurveTo((sx + ex) * 0.5, y - 0.8 * scale, ex, y);
    ctx.stroke();

    // Arrowhead
    const headLen = 4.2 * scale;
    const headSpread = 2.6 * scale;
    ctx.beginPath();
    ctx.moveTo(ex - headLen, y - headSpread);
    ctx.lineTo(ex, y);
    ctx.lineTo(ex - headLen * 0.9, y + headSpread * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  public drawTherefore(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const dotR = 1.5 * scale;
    const spacing = 7 * scale;
    const centerY = y - fontSize * 0.35;

    ctx.save();
    ctx.fillStyle = inkColor;

    // Top dot
    ctx.beginPath();
    ctx.arc(x + spacing * 0.5 + (this.noise.random() - 0.5) * 1.5, centerY - spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Bottom-left dot
    ctx.beginPath();
    ctx.arc(x, centerY + spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Bottom-right dot
    ctx.beginPath();
    ctx.arc(x + spacing, centerY + spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return spacing + 8 * scale;
  }

  public drawBecause(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const dotR = 1.5 * scale;
    const spacing = 7 * scale;
    const centerY = y - fontSize * 0.35;

    ctx.save();
    ctx.fillStyle = inkColor;

    // Top-left dot
    ctx.beginPath();
    ctx.arc(x, centerY - spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Top-right dot
    ctx.beginPath();
    ctx.arc(x + spacing, centerY - spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Bottom dot
    ctx.beginPath();
    ctx.arc(x + spacing * 0.5 + (this.noise.random() - 0.5) * 1.5, centerY + spacing * 0.5, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return spacing + 8 * scale;
  }

  public drawNotEqual(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = this.drawImperfectEquals(ctx, x, y, fontSize, inkColor);
    const centerY = y - fontSize * 0.35;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    const slashOvershoot = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 2 * scale, centerY + slashOvershoot);
    ctx.lineTo(x + w - 4 * scale, centerY - slashOvershoot);
    ctx.stroke();
    ctx.restore();

    return w;
  }

  public drawApprox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 14 * scale;
    const centerY = y - fontSize * 0.35;
    const gap = 3.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';

    // Top wave
    const y1 = centerY - gap;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.bezierCurveTo(x + w * 0.25, y1 - 2.5 * scale, x + w * 0.75, y1 + 2.5 * scale, x + w, y1);
    ctx.stroke();

    // Bottom wave
    const y2 = centerY + gap;
    ctx.beginPath();
    ctx.moveTo(x + (this.noise.random() - 0.5) * 1.5, y2);
    ctx.bezierCurveTo(x + w * 0.25, y2 - 2.5 * scale, x + w * 0.75, y2 + 2.5 * scale, x + w, y2);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  public drawPlusMinus(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isMinusPlus = false
  ): number {
    const scale = fontSize / 28;
    const size = 11 * scale;
    const centerY = y - fontSize * 0.35;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';

    const plusY = isMinusPlus ? centerY + 4.5 * scale : centerY - 4.5 * scale;
    const minusY = isMinusPlus ? centerY - 4.5 * scale : centerY + 4.5 * scale;

    // Plus horizontal
    ctx.beginPath();
    ctx.moveTo(x, plusY);
    ctx.lineTo(x + size, plusY);
    ctx.stroke();

    // Plus vertical
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, plusY - size * 0.45);
    ctx.lineTo(x + size * 0.5, plusY + size * 0.45);
    ctx.stroke();

    // Minus bar
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * scale, minusY);
    ctx.lineTo(x + size + 0.5 * scale, minusY);
    ctx.stroke();

    ctx.restore();
    return size + 6 * scale;
  }

  /**
   * Hand-drawn strict inequality wedge (< or >).
   * Features organic hand slant, micro-curvature, and softened turnaround apex.
   */
  public drawStrictInequality(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isLess: boolean
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const centerY = y - fontSize * 0.30;
    const halfH = 7.0 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const jitterY = (this.noise.random() - 0.5) * 1.0 * scale;
    const apexX = isLess ? x + 0.5 * scale : x + w;
    const apexY = centerY + jitterY;
    const openX = isLess ? x + w : x + 0.5 * scale;

    ctx.beginPath();
    // Top arm with gentle organic bow
    ctx.moveTo(openX, centerY - halfH);
    ctx.quadraticCurveTo(
      (openX + apexX) / 2 + (isLess ? 0.6 : -0.6) * scale,
      (centerY - halfH + apexY) / 2,
      apexX,
      apexY
    );
    // Bottom arm with natural student flick
    ctx.quadraticCurveTo(
      (apexX + openX) / 2 + (isLess ? 0.8 : -0.8) * scale,
      (apexY + centerY + halfH) / 2,
      openX + (this.noise.random() - 0.5) * 1.2 * scale,
      centerY + halfH + (this.noise.random() - 0.5) * 0.8 * scale
    );
    ctx.stroke();
    ctx.restore();

    return w + 6 * scale;
  }

  /**
   * Hand-drawn less-than-or-equal / greater-than-or-equal (≤ or ≥).
   */
  public drawInequality(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isLess: boolean
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const centerY = y - fontSize * 0.35;
    const halfH = 6.0 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const jitterY = (this.noise.random() - 0.5) * 0.8 * scale;
    const apexX = isLess ? x + 0.5 * scale : x + w;
    const apexY = centerY + jitterY;
    const openX = isLess ? x + w : x + 0.5 * scale;

    // 1. Organic Upper Wedge
    ctx.beginPath();
    ctx.moveTo(openX, centerY - halfH);
    ctx.quadraticCurveTo((openX + apexX) / 2, (centerY - halfH + apexY) / 2, apexX, apexY);
    ctx.quadraticCurveTo((apexX + openX) / 2, (apexY + centerY + halfH) / 2, openX, centerY + halfH);
    ctx.stroke();

    // 2. Organic Underline Bar with student tilt
    const barY = centerY + halfH + 4.2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 0.5 * scale, barY);
    ctx.quadraticCurveTo(x + w * 0.5, barY + (this.noise.random() - 0.5) * 0.8 * scale, x + w + 0.5 * scale, barY + 0.5 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  /**
   * Procedural Lowercase Dirac Delta (δ):
   * Features characteristic top-right curl loop and round lower bowl.
   */
  public drawDeltaLower(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.70;
    const bowlTopY = y - fontSize * 0.36;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Start at top-right flag, sweep LEFT to top-left crest, then diagonal DOWN-RIGHT into the right wall of the bowl
    ctx.moveTo(x + w * 0.92, topY + 1.5 * scale);
    ctx.bezierCurveTo(
      x + w * 0.45, topY - 2.5 * scale,
      x + w * 0.05, topY + 1.0 * scale,
      x + w * 0.48, bowlTopY
    );
    // Continue down-right to form the closed lower belly
    ctx.bezierCurveTo(
      x + w * 0.95, bowlTopY + (bottomY - bowlTopY) * 0.35,
      x + w * 0.85, bottomY + 1.2 * scale,
      x + w * 0.42, bottomY
    );
    // Sweep up-left and close cleanly into the neck intersection (so it CANNOT look like an open 6!)
    ctx.bezierCurveTo(
      x + w * 0.04, bottomY - 1.0 * scale,
      x + w * 0.06, bowlTopY + 1.0 * scale,
      x + w * 0.48, bowlTopY
    );
    ctx.stroke();
    ctx.restore();

    return w + 4.5 * scale;
  }

  /**
   * Procedural hand-flick prime ticks for derivatives (y', y'', y''')
   */
  public drawPrimeTicks(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    count: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.lineCap = 'round';

    let currX = x + 1.5 * scale;
    for (let k = 0; k < count; k++) {
      const topY = y - fontSize * (0.74 + k * 0.02) + (this.noise.random() - 0.5) * 1.5 * scale;
      const botY = topY + (7.5 + (this.noise.random() - 0.5) * 1.8) * scale;
      const slantX = (2.8 + (this.noise.random() - 0.5) * 0.8) * scale;

      ctx.beginPath();
      ctx.moveTo(currX + slantX, topY);
      ctx.lineTo(currX, botY);
      ctx.stroke();

      currX += 4.2 * scale;
    }

    ctx.restore();
    return currX - x + 2 * scale;
  }

  /**
   * Procedural Lowercase Greek Alpha (α):
   * 3 human allographs with dynamic biometric variations:
   * - Allograph 0: Classic fish-tail loop with crossed right tail.
   * - Allograph 1: Rapid cursive loop with forward slant and decisive exit flick.
   * - Allograph 2: Compact rounded alpha with high turnaround apex.
   */
  public drawAlpha(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('alpha', 3);
    const w = (11.0 + this.noise.random() * 3.2) * scale;
    const topY = y - fontSize * (0.38 + this.noise.random() * 0.06);
    const bottomY = y + (this.noise.random() - 0.5) * 1.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid cursive loop
      ctx.moveTo(x + w * 0.92, topY - 1 * scale);
      ctx.bezierCurveTo(
        x + w * 0.45, topY - 1.5 * scale,
        x + w * 0.08, topY + (bottomY - topY) * 0.35,
        x + w * 0.15, bottomY - 1 * scale
      );
      ctx.bezierCurveTo(
        x + w * 0.20, bottomY + 1 * scale,
        x + w * 0.65, bottomY,
        x + w * 0.72, topY + (bottomY - topY) * 0.45
      );
      ctx.lineTo(x + w, bottomY + 0.5 * scale);
    } else if (style === 2) {
      // Compact rounded alpha
      ctx.moveTo(x + w * 0.82, topY + 1 * scale);
      ctx.bezierCurveTo(
        x + w * 0.40, topY,
        x + w * 0.10, topY + (bottomY - topY) * 0.4,
        x + w * 0.10, bottomY - 2 * scale
      );
      ctx.bezierCurveTo(
        x + w * 0.10, bottomY + 1 * scale,
        x + w * 0.55, bottomY,
        x + w * 0.68, topY + (bottomY - topY) * 0.5
      );
      ctx.bezierCurveTo(
        x + w * 0.75, topY + (bottomY - topY) * 0.75,
        x + w * 0.88, bottomY - 0.5 * scale,
        x + w * 0.95, bottomY
      );
    } else {
      // Classic fish-tail loop
      ctx.moveTo(x + w * 0.88, topY);
      ctx.bezierCurveTo(
        x + w * 0.55, topY + 1 * scale,
        x + w * 0.12, topY + (bottomY - topY) * 0.4,
        x + w * 0.12, bottomY - 3 * scale
      );
      ctx.bezierCurveTo(
        x + w * 0.12, bottomY + 1 * scale,
        x + w * 0.60, bottomY,
        x + w * 0.70, topY + (bottomY - topY) * 0.5
      );
      ctx.bezierCurveTo(
        x + w * 0.76, topY + (bottomY - topY) * 0.8,
        x + w * 0.85, bottomY - 1 * scale,
        x + w * 0.98, bottomY
      );
    }
    ctx.stroke();
    ctx.restore();

    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Tau (τ):
   * Crossbar with downward vertical stem and foot hook.
   */
  public drawTau(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('tau', 2);
    const w = (10.0 + this.noise.random() * 2.8) * scale;
    const barY = y - fontSize * (0.38 + this.noise.random() * 0.06);
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Horizontal crossbar with student slant
    const barTilt = (this.noise.random() - 0.4) * 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 0.5 * scale, barY - barTilt);
    ctx.quadraticCurveTo(x + w * 0.5, barY - 1.0 * scale, x + w, barY + barTilt);
    ctx.stroke();

    // 2. Downward stem
    ctx.beginPath();
    if (style === 1) {
      // Rapid slanted stem with kick
      ctx.moveTo(x + w * 0.48, barY);
      ctx.lineTo(x + w * 0.42, bottomY - 2 * scale);
      ctx.quadraticCurveTo(x + w * 0.46, bottomY, x + w * 0.86, bottomY - 1.0 * scale);
    } else {
      ctx.moveTo(x + w * 0.45, barY);
      ctx.lineTo(x + w * 0.45, bottomY - 3.5 * scale);
      ctx.quadraticCurveTo(x + w * 0.48, bottomY, x + w * 0.82, bottomY - 0.5 * scale);
    }
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Element Of (∈):
   * Open curved crescent with central crossbar.
   */
  public drawElementOf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = (10.5 + this.noise.random() * 2.5) * scale;
    const topY = y - fontSize * 0.42;
    const bottomY = y - fontSize * 0.04;
    const midY = (topY + bottomY) / 2;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. C-shaped rounded curve
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, topY);
    ctx.bezierCurveTo(
      x + w * 0.25, topY - 1.0 * scale,
      x + w * 0.08, midY - 2.0 * scale,
      x + w * 0.08, midY
    );
    ctx.bezierCurveTo(
      x + w * 0.08, midY + 2.0 * scale,
      x + w * 0.25, bottomY + 1.0 * scale,
      x + w * 0.85, bottomY
    );
    ctx.stroke();

    // 2. Central crossbar
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, midY);
    ctx.lineTo(x + w * 0.78, midY + (this.noise.random() - 0.5) * 0.8 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Theta (θ):
   * Authentic organic student oval with undulating central crossbar.
   */
  public drawTheta(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('theta', 2);
    const w = (10.8 + this.noise.random() * 3.0) * scale;
    const topY = y - fontSize * (0.66 + this.noise.random() * 0.06);
    const bottomY = y;
    const centerY = (topY + bottomY) / 2;
    const leftX = x + 1.2 * scale;
    const rightX = x + w - 1.2 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Upright organic oval with subtle tilt
    ctx.beginPath();
    const tiltSag = (style === 1 ? 0.8 : -0.5) * scale;
    ctx.moveTo(x + w * 0.55 + tiltSag, topY);
    // Left half
    ctx.bezierCurveTo(
      leftX - 1.0 * scale, topY + (centerY - topY) * 0.3,
      leftX - 1.2 * scale, bottomY - (bottomY - centerY) * 0.3,
      x + w * 0.48, bottomY
    );
    // Right half
    ctx.bezierCurveTo(
      rightX + 1.2 * scale, bottomY - (bottomY - centerY) * 0.3,
      rightX + 1.0 * scale, topY + (centerY - topY) * 0.3,
      x + w * 0.55 + tiltSag, topY
    );
    ctx.stroke();

    // Horizontal crossbar through center with natural pen wiggle
    ctx.beginPath();
    const barY = centerY + (this.noise.random() - 0.5) * 1.2 * scale;
    ctx.moveTo(leftX + 0.8 * scale, barY);
    ctx.quadraticCurveTo(
      x + w * 0.5, barY - (style === 1 ? 0.4 : 1.4) * scale,
      rightX - 0.5 * scale, barY + (this.noise.random() - 0.5) * 0.8 * scale
    );
    ctx.stroke();

    ctx.restore();
    return w + 4.5 * scale;
  }

  /**
   * Procedural Lowercase Greek Pi (π):
   * Top undulating crossbar with dual downward legs and right foot curl.
   */
  /**
   * Procedural Lowercase Greek Pi (π):
   * Features dynamic biomechanical variation and genuine human allographs:
   * - Allograph 0: Fluid cursive with wavy crossbar and sweeping exit foot curl.
   * - Allograph 1: Rapid speed print with tilted crossbar and decisive slanted legs.
   * - Allograph 2: Continuous connected cursive loop where the left leg flows directly into the crossbar.
   * Modulates width, height, leg spacing, tilt angle, and baseline landing depths for zero cloned appearance.
   */
  public drawPi(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;

    // Biometric seeds for this specific glyph instance
    const r1 = this.noise.random();
    const r2 = this.noise.random();
    const r3 = this.noise.random();
    const r4 = this.noise.random();
    const r5 = this.noise.random();

    // Natural width variation (13.5 to 17.8 * scale)
    const w = (13.5 + r1 * 4.3) * scale;

    // Natural height variation (0.46 to 0.53 * fontSize)
    const heightRatio = 0.46 + r2 * 0.07;
    const barY = y - fontSize * heightRatio;
    const bottomY = y;

    // Crossbar tilt angle (-2.5° to +3.3°)
    const tiltAngle = (-2.5 + r3 * 5.8) * (Math.PI / 180);
    const barTiltDy = Math.tan(tiltAngle) * w;

    // Left and right overhangs
    const leftOverhang = (0.6 + r4 * 2.2) * scale;
    const rightOverhang = (0.8 + r5 * 2.5) * scale;
    const barStartX = x - leftOverhang;
    const barEndX = x + w + rightOverhang;
    const barEndY = barY + barTiltDy;

    // Leg position variation
    const leftLegXRatio = 0.23 + (r2 - 0.5) * 0.08;
    const rightLegXRatio = 0.67 + (r3 - 0.5) * 0.08;
    const leftLegTopX = x + w * leftLegXRatio;
    const rightLegTopX = x + w * rightLegXRatio;

    // Independent baseline landing variations (students rarely land both legs on exact same pixel)
    const leftBottomY = bottomY + (r4 - 0.4) * 1.8 * scale;
    const rightBottomY = bottomY + (r5 - 0.5) * 1.8 * scale;

    // Allograph selection via anti-duplication engine:
    // 0: Classic Cursive, 1: Rapid Speed Print, 2: Continuous Loop Cursive
    const style = this.getNextAllograph('pi', 3);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (style === 2) {
      // --- Allograph 2: Continuous Connected Cursive Loop π ---
      // Student enters from bottom/left, loops up the left leg, loops into crossbar, then drops right leg
      const entryX = leftLegTopX - (2.5 + r3 * 2.0) * scale;
      const entryY = bottomY - fontSize * 0.15;

      ctx.beginPath();
      // Upward stroke of left stem into loop
      ctx.moveTo(entryX, entryY);
      ctx.lineTo(leftLegTopX, barY + 1.5 * scale);
      // Small loop at top left apex
      ctx.bezierCurveTo(
        leftLegTopX - 1.5 * scale,
        barY - 1.8 * scale,
        leftLegTopX + 2.0 * scale,
        barY - 1.0 * scale,
        leftLegTopX + 3.0 * scale,
        barY + 0.2 * scale
      );
      // Flow across to right end of crossbar
      ctx.quadraticCurveTo(x + w * 0.55, barY + 0.4 * scale, barEndX, barEndY);
      ctx.stroke();

      // Downward left leg (main stem)
      ctx.beginPath();
      ctx.moveTo(leftLegTopX, barY + 1.0 * scale);
      ctx.quadraticCurveTo(
        leftLegTopX - (0.8 + r2 * 0.8) * scale,
        y - fontSize * 0.22,
        leftLegTopX - (1.2 + r4 * 0.8) * scale,
        leftBottomY
      );
      ctx.stroke();

      // Downward right leg with exit curl
      ctx.beginPath();
      ctx.moveTo(rightLegTopX, barY + barTiltDy * rightLegXRatio + 0.8 * scale);
      const rightMidX = rightLegTopX + (0.5 + r1 * 1.2) * scale;
      ctx.lineTo(rightMidX, rightBottomY - (2.5 + r3 * 1.5) * scale);
      ctx.quadraticCurveTo(
        rightMidX + (1.2 + r2 * 1.2) * scale,
        rightBottomY + (0.4 + r4 * 0.5) * scale,
        x + w * (0.88 + r5 * 0.16),
        rightBottomY - (0.8 + r1 * 1.2) * scale
      );
      ctx.stroke();

    } else if (style === 1) {
      // --- Allograph 1: Rapid Speed Print π ---
      // Swift horizontal crossbar + two energetic, slightly tilted downward strokes
      ctx.beginPath();
      ctx.moveTo(barStartX, barY + (r4 - 0.5) * 0.8 * scale);
      ctx.lineTo(barEndX, barEndY + (r5 - 0.5) * 0.8 * scale);
      ctx.stroke();

      // Decisive left leg (straight downward with slight natural forward slant)
      const leftSlantX = leftLegTopX - (0.8 + r3 * 1.4) * scale;
      ctx.beginPath();
      ctx.moveTo(leftLegTopX, barY + barTiltDy * leftLegXRatio + 0.5 * scale);
      ctx.lineTo(leftSlantX, leftBottomY);
      ctx.stroke();

      // Right leg with short, crisp flick at base
      const rightBarAtY = barY + barTiltDy * rightLegXRatio + 0.5 * scale;
      const rightSlantX = rightLegTopX + (0.2 + r1 * 1.2) * scale;
      const rightFlickX = rightSlantX + (2.2 + r2 * 2.0) * scale;
      ctx.beginPath();
      ctx.moveTo(rightLegTopX, rightBarAtY);
      ctx.lineTo(rightSlantX, rightBottomY - 1.5 * scale);
      ctx.lineTo(rightFlickX, rightBottomY);
      ctx.stroke();

    } else {
      // --- Allograph 0: Classic Flowing Cursive π ---
      // Undulating wavy crossbar with entry lift, inward-curving left leg, graceful right exit curl
      const waveLift = (1.0 + r1 * 1.2) * scale;
      const waveDip = (0.4 + r2 * 0.6) * scale;

      ctx.beginPath();
      ctx.moveTo(barStartX, barY + waveLift);
      ctx.bezierCurveTo(
        x + 2.5 * scale,
        barY - waveLift * 0.8,
        x + w * 0.50,
        barY + waveDip,
        barEndX,
        barEndY + (r3 - 0.5) * 0.9 * scale
      );
      ctx.stroke();

      // Left leg with gentle inward bowing
      ctx.beginPath();
      ctx.moveTo(leftLegTopX, barY + barTiltDy * leftLegXRatio + 0.8 * scale);
      ctx.quadraticCurveTo(
        leftLegTopX - (1.2 + r4 * 1.2) * scale,
        y - fontSize * 0.22,
        leftLegTopX - (0.8 + r2 * 0.8) * scale,
        leftBottomY
      );
      ctx.stroke();

      // Right leg with sweeping outward curl
      const rightBarAtY = barY + barTiltDy * rightLegXRatio + 0.8 * scale;
      const rightMidX = rightLegTopX + (0.4 + r1 * 1.4) * scale;
      const curlEndX = x + w * (0.92 + r3 * 0.16);
      ctx.beginPath();
      ctx.moveTo(rightLegTopX, rightBarAtY);
      ctx.lineTo(rightMidX, rightBottomY - (3.0 + r4 * 1.2) * scale);
      ctx.quadraticCurveTo(
        rightMidX + 1.2 * scale,
        rightBottomY + 0.6 * scale,
        curlEndX,
        rightBottomY - (1.0 + r5 * 1.2) * scale
      );
      ctx.stroke();
    }

    ctx.restore();
    return w + (4.0 + r1 * 2.5) * scale;
  }

  /**
   * Procedural Lowercase Greek Beta (β):
   * 2 distinct allographs:
   * - Allograph 0: Long descending stem with dual rounded loops.
   * - Allograph 1: Rapid cursive beta with flowing continuous turnaround.
   */
  public drawBeta(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('beta', 2);
    const w = (11.0 + this.noise.random() * 2.8) * scale;
    const topY = y - fontSize * (0.66 + this.noise.random() * 0.06);
    const midY = y - fontSize * (0.30 + (this.noise.random() - 0.5) * 0.04);
    const bottomY = y;
    const descY = y + fontSize * (0.20 + this.noise.random() * 0.08);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid cursive beta
      ctx.moveTo(x + w * 0.25, descY);
      ctx.lineTo(x + w * 0.20, topY + 1.5 * scale);
      ctx.bezierCurveTo(
        x + w * 0.78, topY - 1.5 * scale,
        x + w * 0.82, midY,
        x + w * 0.28, midY
      );
      ctx.bezierCurveTo(
        x + w * 0.88, midY,
        x + w * 0.90, bottomY,
        x + w * 0.12, bottomY
      );
    } else {
      // Descending stem up to top loop
      ctx.moveTo(x + w * 0.22, descY);
      ctx.lineTo(x + w * 0.22, topY + 2 * scale);
      ctx.quadraticCurveTo(x + w * 0.22, topY, x + w * 0.35, topY);
      // Upper loop
      ctx.bezierCurveTo(
        x + w * 0.85, topY,
        x + w * 0.85, midY,
        x + w * 0.25, midY
      );
      // Lower loop
      ctx.bezierCurveTo(
        x + w * 0.92, midY,
        x + w * 0.92, bottomY,
        x + w * 0.15, bottomY
      );
    }
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Lambda (λ):
   * 2 distinct allographs:
   * - Allograph 0: Curved diagonal spine with top hook + branching leg.
   * - Allograph 1: Decisive straight forward slash with branching right leg.
   */
  public drawLambda(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('lambda', 2);
    const w = (11.0 + this.noise.random() * 2.8) * scale;
    const topY = y - fontSize * (0.66 + this.noise.random() * 0.06);
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Straight diagonal stroke
      ctx.moveTo(x + w * 0.52, topY);
      ctx.lineTo(x + 1.0 * scale, bottomY);
    } else {
      // Curved spine with slight top hook
      ctx.moveTo(x + w * 0.55, topY);
      ctx.quadraticCurveTo(x + w * 0.50, topY + 3 * scale, x + w * 0.40, y - fontSize * 0.35);
      ctx.lineTo(x + 1.0 * scale, bottomY);
    }
    ctx.stroke();

    // Branching front leg
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y - fontSize * 0.33);
    ctx.quadraticCurveTo(x + w * 0.60, y - fontSize * 0.15, x + w, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Phi (φ):
   * 2 distinct allographs:
   * - Allograph 0: Oval body with dividing vertical stem.
   * - Allograph 1: Continuous cursive loop entered from stem.
   */
  public drawPhi(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('phi', 2);
    const w = (11.2 + this.noise.random() * 2.6) * scale;
    const stemTopY = y - fontSize * (0.64 + this.noise.random() * 0.05);
    const stemBotY = y + fontSize * (0.20 + this.noise.random() * 0.05);
    const loopTopY = y - fontSize * 0.44;
    const loopBotY = y - fontSize * 0.02;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const stemSlant = (style === 1 ? -0.8 : 0.4) * scale;

    // Oval body
    ctx.beginPath();
    ctx.ellipse(
      x + w * 0.50,
      (loopTopY + loopBotY) / 2,
      w * 0.42,
      (loopBotY - loopTopY) / 2,
      (style === 1 ? -0.08 : 0.05),
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Vertical stem
    ctx.beginPath();
    ctx.moveTo(x + w * 0.50 + stemSlant, stemTopY);
    ctx.lineTo(x + w * 0.50 - stemSlant, stemBotY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Omega (ω):
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Classic Greek double-bowl with outward shoulder wings.
   * - Allograph 1: Rapid student cursive sharp-cusp w-style with forward slant.
   * - Allograph 2: Continuous flowing cursive omega with entry loop and flared exit trail.
   */
  public drawOmega(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('omega', 3);
    const w = (12.0 + this.noise.random() * 3.6) * scale;
    const topY = y - fontSize * (0.38 + this.noise.random() * 0.06);
    const bottomY = y + (this.noise.random() - 0.5) * 1.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid student cursive sharp-cusp omega
      ctx.moveTo(x + 0.8 * scale, topY + 2.8 * scale);
      ctx.quadraticCurveTo(x + w * 0.18, topY + 0.5 * scale, x + w * 0.30, bottomY);
      ctx.lineTo(x + w * 0.50, topY + 2.2 * scale);
      ctx.lineTo(x + w * 0.70, bottomY);
      ctx.quadraticCurveTo(x + w * 0.82, bottomY - 0.8 * scale, x + w, topY + 2.0 * scale);
    } else if (style === 2) {
      // Continuous flowing cursive omega with entry loop
      ctx.moveTo(x + 0.3 * scale, topY + 1.2 * scale);
      ctx.bezierCurveTo(
        x + w * 0.12, topY - 1.5 * scale,
        x + w * 0.16, bottomY - 2.5 * scale,
        x + w * 0.32, bottomY
      );
      ctx.bezierCurveTo(
        x + w * 0.42, bottomY + 0.8 * scale,
        x + w * 0.45, topY + 2.8 * scale,
        x + w * 0.50, topY + 3.8 * scale
      );
      ctx.bezierCurveTo(
        x + w * 0.55, topY + 2.8 * scale,
        x + w * 0.58, bottomY + 0.8 * scale,
        x + w * 0.68, bottomY
      );
      ctx.bezierCurveTo(
        x + w * 0.82, bottomY - 2.5 * scale,
        x + w * 0.88, topY - 1.2 * scale,
        x + w, topY + 2.2 * scale
      );
    } else {
      // Classic Greek double-bowl with outward shoulder wings
      ctx.moveTo(x + 0.5 * scale, topY + 4 * scale);
      ctx.quadraticCurveTo(x + w * 0.15, topY - 1 * scale, x + w * 0.28, bottomY - 0.8 * scale);
      ctx.quadraticCurveTo(x + w * 0.40, bottomY + 1 * scale, x + w * 0.50, topY + 3.2 * scale);
      ctx.quadraticCurveTo(x + w * 0.60, bottomY + 1 * scale, x + w * 0.72, bottomY - 0.8 * scale);
      ctx.quadraticCurveTo(x + w * 0.85, topY - 1 * scale, x + w, topY + 3.8 * scale);
    }
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Mu (μ):
   * 2 distinct allographs:
   * - Allograph 0: Descending left tail with rounded u-body.
   * - Allograph 1: Rapid cursive mu with forward slant.
   */
  public drawMu(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('mu', 2);
    const w = (11.0 + this.noise.random() * 2.8) * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;
    const descY = y + fontSize * (0.20 + this.noise.random() * 0.06);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid cursive mu
      ctx.moveTo(x + w * 0.16, descY);
      ctx.lineTo(x + w * 0.22, topY);
      ctx.quadraticCurveTo(x + w * 0.26, bottomY + 0.5 * scale, x + w * 0.58, bottomY);
      ctx.lineTo(x + w * 0.82, topY);
      ctx.lineTo(x + w * 0.84, bottomY + 1 * scale);
    } else {
      ctx.moveTo(x + w * 0.18, descY);
      ctx.lineTo(x + w * 0.18, topY);
      ctx.quadraticCurveTo(x + w * 0.20, bottomY, x + w * 0.55, bottomY);
      ctx.lineTo(x + w * 0.80, topY);
      ctx.lineTo(x + w * 0.80, bottomY);
    }
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Sigma (σ):
   * 2 distinct allographs:
   * - Allograph 0: Circular body with horizontal top flag.
   * - Allograph 1: Fluid continuous top flag into round belly.
   */
  public drawSigma(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('sigma', 2);
    const w = (11.0 + this.noise.random() * 2.6) * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (style === 1) {
      // Continuous stroke
      ctx.beginPath();
      ctx.moveTo(x + w, topY);
      ctx.lineTo(x + w * 0.45, topY);
      ctx.bezierCurveTo(
        x + w * 0.05, topY,
        x + w * 0.05, bottomY,
        x + w * 0.45, bottomY
      );
      ctx.bezierCurveTo(
        x + w * 0.85, bottomY,
        x + w * 0.85, topY + (bottomY - topY) * 0.3,
        x + w * 0.45, topY + (bottomY - topY) * 0.3
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.35, topY);
      ctx.lineTo(x + w, topY);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        x + w * 0.45,
        (topY + bottomY) / 2,
        w * 0.40,
        (bottomY - topY) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Mathematical Ellipsis (..., \dots, \cdots):
   * Three organically spaced, hand-jabbed ink dots.
   */
  public drawEllipsis(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isCentered = false
  ): number {
    const scale = fontSize / 28;
    const dotY = isCentered ? y - fontSize * 0.34 : y - 1.2 * scale;
    const spacing = 5.2 * scale;
    const radius = Math.max(1.0, 1.35 * scale);

    ctx.save();
    ctx.fillStyle = inkColor;
    for (let i = 0; i < 3; i++) {
      const jx = x + 2 * scale + i * spacing + (this.noise.random() - 0.5) * 0.8 * scale;
      const jy = dotY + (this.noise.random() - 0.5) * 1.0 * scale;
      ctx.beginPath();
      ctx.arc(jx, jy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    return 3 * spacing + 4 * scale;
  }

  /**
   * Hand-drawn asymptotic equivalence tilde (∼ or \sim)
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Classic balanced sine wave.
   * - Allograph 1: Rapid tilted S-curve with upward flick.
   * - Allograph 2: Gentle shallow ripple wave.
   */
  public drawSim(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('sim', 3);
    const w = (13.5 + this.noise.random() * 4.0) * scale;
    const h = (3.5 + this.noise.random() * 1.8) * scale;
    const cy = y - fontSize * 0.35 + (this.noise.random() - 0.5) * 1.5;
    const startX = x + 2;
    const endX = startX + w;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, this.getBaseLineWidth(scale, 0.95));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.35;
    ctx.globalAlpha = 0.90;

    ctx.beginPath();
    if (style === 1) {
      // Rapid tilted wave with upward flick
      ctx.moveTo(startX, cy + 0.6 * scale);
      ctx.quadraticCurveTo(startX + w * 0.22, cy - h * 1.15, startX + w * 0.48, cy - 0.2 * scale);
      ctx.quadraticCurveTo(startX + w * 0.74, cy + h * 1.15, endX, cy - 1.2 * scale);
    } else if (style === 2) {
      // Gentle shallow ripple
      ctx.moveTo(startX, cy - 0.4 * scale);
      ctx.bezierCurveTo(
        startX + w * 0.28, cy - h * 0.75,
        startX + w * 0.35, cy - h * 0.75,
        startX + w * 0.52, cy
      );
      ctx.bezierCurveTo(
        startX + w * 0.65, cy + h * 0.75,
        startX + w * 0.78, cy + h * 0.75,
        endX, cy + 0.2 * scale
      );
    } else {
      // Classic balanced sine wave
      ctx.moveTo(startX, cy);
      ctx.bezierCurveTo(
        startX + w * 0.25, cy - h * 0.9,
        startX + w * 0.35, cy - h * 0.9,
        startX + w * 0.5, cy
      );
      ctx.bezierCurveTo(
        startX + w * 0.65, cy + h * 0.9,
        startX + w * 0.75, cy + h * 0.9,
        endX, cy
      );
    }
    ctx.stroke();
    ctx.restore();

    return w + 7 * scale;
  }

  /**
   * Hand-drawn Greek Capital Gamma (Γ)
   * Rapid top horizontal bar followed by left vertical stem with natural student overshoot.
   */
  public drawGamma(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12 * scale;
    const h = 20 * scale;
    const topY = y - fontSize * 0.74;
    const botY = y + 1;
    const startX = x + 2;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.4, this.getBaseLineWidth(scale, 1.05));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.35;
    ctx.globalAlpha = 0.92;

    // Top horizontal bar
    const bowTop = (this.noise.random() - 0.45) * 1.2;
    ctx.beginPath();
    ctx.moveTo(startX - 1, topY + (this.noise.random() - 0.5));
    ctx.quadraticCurveTo(startX + w * 0.5, topY + bowTop, startX + w, topY + (this.noise.random() - 0.5) * 1.2);
    ctx.stroke();

    // Vertical downward stem
    const bowStem = (this.noise.random() - 0.5) * 1.2;
    ctx.beginPath();
    ctx.moveTo(startX, topY - 1);
    ctx.quadraticCurveTo(startX + bowStem, topY + h * 0.5, startX - 0.5, botY);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  /**
   * Draws a small handwritten circumflex accent (^) over a symbol (e.g. \hat{f}, \hat{y}, \hat{\omega})
   */
  public drawHatAccent(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    topY: number,
    fontSize: number,
    inkColor: string
  ) {
    const hw = fontSize * 0.16;
    const hh = fontSize * 0.14;
    const apexY = topY - 3 + (this.noise.random() - 0.5) * 1.0;
    const apexX = centerX + (this.noise.random() - 0.5) * 1.0;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.2, this.getBaseLineWidth(fontSize / 28, 0.85));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.3;
    ctx.globalAlpha = 0.90;

    ctx.beginPath();
    ctx.moveTo(apexX - hw, apexY + hh);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(apexX + hw, apexY + hh);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Procedural Partial Derivative (∂):
   * 2 distinct allographs:
   * - Allograph 0: Classic curved top hook with rounded lower belly.
   * - Allograph 1: Rapid cursive loop partial.
   */
  public drawPartial(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('partial', 2);
    const w = (11.5 + this.noise.random() * 2.5) * scale;
    const topY = y - fontSize * (0.64 + this.noise.random() * 0.05);
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, this.getBaseLineWidth(scale, 0.95));
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid cursive partial
      ctx.moveTo(x + w * 0.82, topY + 1 * scale);
      ctx.bezierCurveTo(x + w * 0.4, topY - 2 * scale, x + w * 0.1, topY + 3 * scale, x + w * 0.12, topY + (bottomY - topY) * 0.45);
      ctx.bezierCurveTo(x + w * 0.08, bottomY + 1.5 * scale, x + w * 0.88, bottomY + 1.5 * scale, x + w * 0.82, topY + (bottomY - topY) * 0.40);
      ctx.bezierCurveTo(x + w * 0.82, topY + 4 * scale, x + w * 0.35, topY + (bottomY - topY) * 0.45, x + w * 0.15, bottomY - 1 * scale);
    } else {
      // Classic curved partial
      ctx.moveTo(x + w * 0.85, topY + 2 * scale);
      ctx.bezierCurveTo(x + w * 0.6, topY - 2 * scale, x + w * 0.1, topY + 4 * scale, x + w * 0.15, topY + (bottomY - topY) * 0.5);
      ctx.bezierCurveTo(x + w * 0.05, bottomY + 2 * scale, x + w * 0.85, bottomY + 2 * scale, x + w * 0.85, topY + (bottomY - topY) * 0.45);
      ctx.bezierCurveTo(x + w * 0.85, topY, x + w * 0.25, topY + (bottomY - topY) * 0.5, x + w * 0.15, bottomY - 3 * scale);
    }
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  /**
   * Procedural Infinity Symbol (∞):
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Continuous center-crossover figure-8 with organic loop proportions.
   * - Allograph 1: Fluid asymmetric oval-cross (left/right lobe size variance & forward slant).
   * - Allograph 2: Rapid cursive loop infinity entering from lower left.
   */
  public drawInfinity(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('infinity', 3);
    const w = (16.0 + this.noise.random() * 4.5) * scale;
    const centerY = y - fontSize * 0.35 + (this.noise.random() - 0.5) * 1.5;
    const h = (6.0 + this.noise.random() * 2.2) * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, this.getBaseLineWidth(scale, 0.95));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = x + w * 0.5;

    ctx.beginPath();
    if (style === 1) {
      // Fluid asymmetric oval-cross
      const cx1 = x + w * (0.44 + (this.noise.random() - 0.5) * 0.08);
      ctx.moveTo(cx1, centerY);
      ctx.bezierCurveTo(cx1 - w * 0.22, centerY - h * 0.88, x, centerY - h * 0.65, x, centerY);
      ctx.bezierCurveTo(x, centerY + h * 0.65, cx1 - w * 0.22, centerY + h * 0.88, cx1, centerY);
      ctx.bezierCurveTo(cx1 + w * 0.28, centerY - h * 1.10, x + w, centerY - h * 0.80, x + w, centerY);
      ctx.bezierCurveTo(x + w, centerY + h * 0.80, cx1 + w * 0.28, centerY + h * 1.10, cx1, centerY);
    } else if (style === 2) {
      // Rapid cursive loop infinity (entry from lower left)
      ctx.moveTo(x + 1 * scale, centerY + h * 0.45);
      ctx.bezierCurveTo(x - 0.5 * scale, centerY - h * 0.85, cx - w * 0.2, centerY - h * 1.05, cx, centerY);
      ctx.bezierCurveTo(cx + w * 0.22, centerY + h * 1.05, x + w + 1 * scale, centerY + h * 0.70, x + w, centerY);
      ctx.bezierCurveTo(x + w, centerY - h * 0.90, cx + w * 0.20, centerY - h * 0.90, cx - 1 * scale, centerY + 0.5 * scale);
      ctx.quadraticCurveTo(cx - w * 0.20, centerY + h * 0.90, x + 1 * scale, centerY + h * 0.45);
    } else {
      // Classic continuous figure-8 crossover
      ctx.moveTo(cx, centerY);
      ctx.bezierCurveTo(cx - w * 0.25, centerY - h, x - 0.5 * scale, centerY - h * 0.7, x, centerY);
      ctx.bezierCurveTo(x - 0.5 * scale, centerY + h * 0.7, cx - w * 0.25, centerY + h, cx, centerY);
      ctx.bezierCurveTo(cx + w * 0.25, centerY - h * 1.06, x + w + 0.5 * scale, centerY - h * 0.9, x + w, centerY);
      ctx.bezierCurveTo(x + w + 0.5 * scale, centerY + h * 0.9, cx + w * 0.25, centerY + h * 1.06, cx, centerY);
    }
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  public drawSummation(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isBig = false
  ): number {
    const sizeMultiplier = isBig ? 1.35 : 1.0;
    const scale = (fontSize * sizeMultiplier) / 28;
    const w = 14 * scale;
    const topY = y - fontSize * (isBig ? 0.75 : 0.65);
    const bottomY = y + fontSize * (isBig ? 0.15 : 0.05);
    const centerY = (topY + bottomY) * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.4, 2.0 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Top bar with overshoot
    ctx.moveTo(x + w + 2 * scale, topY - 0.5 * scale);
    ctx.lineTo(x, topY);
    // Upper diagonal to wedge
    ctx.lineTo(x + w * 0.55, centerY);
    // Lower diagonal from wedge
    ctx.lineTo(x, bottomY);
    // Bottom bar with overshoot
    ctx.lineTo(x + w + 2 * scale, bottomY + 0.5 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  public drawProduct(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isBig = false
  ): number {
    const sizeMultiplier = isBig ? 1.35 : 1.0;
    const scale = (fontSize * sizeMultiplier) / 28;
    const w = 15 * scale;
    const topY = y - fontSize * (isBig ? 0.75 : 0.65);
    const bottomY = y + fontSize * (isBig ? 0.15 : 0.05);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.4, 2.0 * scale);
    ctx.lineCap = 'round';

    // Top horizontal beam overhanging
    ctx.beginPath();
    ctx.moveTo(x - 2 * scale, topY);
    ctx.lineTo(x + w + 2 * scale, topY);
    ctx.stroke();

    // Left pillar (slight tilt)
    ctx.beginPath();
    ctx.moveTo(x + 3 * scale, topY);
    ctx.lineTo(x + 2 * scale, bottomY);
    ctx.stroke();

    // Right pillar (slight tilt)
    ctx.beginPath();
    ctx.moveTo(x + w - 3 * scale, topY);
    ctx.lineTo(x + w - 2 * scale, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  /**
   * Procedural Greek Delta (Δ)
   * Hand-drawn 3-stroke triangle with organic student pen tremor, slight slant, and corner overshoot.
   * Completely eliminates missing font glyph "tofu / card symbol" boxes!
   */
  public drawDelta(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const width = 12 * scale;
    const height = 15 * scale;
    const baselineY = y - fontSize * 0.05;
    const topY = baselineY - height;

    const leftX = x + 1 * scale;
    const rightX = x + width;
    const peakX = x + width * 0.5 + (this.noise.random() - 0.5) * 1.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // 1. Upstroke: left corner to peak
    ctx.moveTo(leftX, baselineY);
    ctx.lineTo(peakX, topY);

    // 2. Downstroke: peak to right corner
    ctx.lineTo(rightX, baselineY);

    // 3. Base stroke: left corner across to right corner with tiny hand overshoot
    const overshoot = (1.5 + this.noise.random() * 2) * scale;
    ctx.moveTo(leftX - 1 * scale, baselineY);
    ctx.lineTo(rightX + overshoot, baselineY + (this.noise.random() - 0.5) * 1.2 * scale);

    ctx.stroke();
    ctx.restore();

    return width + 6 * scale;
  }

  /**
   * Procedural Nabla (∇)
   */
  public drawNabla(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const width = 12 * scale;
    const height = 14 * scale;
    const topY = y - fontSize * 0.65;
    const bottomY = topY + height;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x + width, topY);
    ctx.lineTo(x + width * 0.5, bottomY);
    ctx.lineTo(x, topY);
    ctx.stroke();
    ctx.restore();

    return width + 6 * scale;
  }

  /**
   * Procedural Laplace Transform Script L (ℒ)
   */
  public drawLaplaceL(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const width = 14 * scale;
    const topY = y - fontSize * 0.72;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Top loop
    ctx.moveTo(x + width * 0.8, topY + 3 * scale);
    ctx.bezierCurveTo(x + width * 0.5, topY - 2 * scale, x + width * 0.2, topY, x + width * 0.35, topY + 7 * scale);
    // Stem down to bottom loop
    ctx.bezierCurveTo(x + width * 0.5, topY + 12 * scale, x + width * 0.1, bottomY - 3 * scale, x + width * 0.15, bottomY);
    // Base swoop
    ctx.bezierCurveTo(x + width * 0.3, bottomY + 2 * scale, x + width * 0.8, bottomY - 1 * scale, x + width + 2 * scale, bottomY - 3 * scale);
    ctx.stroke();
    ctx.restore();

    return width + 8 * scale;
  }

  /**
   * Draws a genuine hand-drawn stroke with organic curvature, tremor, and corner overshoots.
   * Eliminates the rigid "CAD / computer" look from tables and boxes!
   */
  public drawHandLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth: number,
    inkColor: string,
    wobbleAmount = 2.0,
    overshoot = 3
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Apply overshoot at ends (student pen extending slightly past corners)
    const sx = x1 - cos * overshoot;
    const sy = y1 - sin * overshoot;
    const ex = x2 + cos * overshoot;
    const ey = y2 + sin * overshoot;

    const totalLen = len + overshoot * 2;
    // Higher segment density ensures smooth curvature without jagged polygonal turns
    const segments = Math.max(5, Math.min(24, Math.floor(totalLen / 25)));

    // Biomechanical wrist arc: forearm/wrist pivot naturally arcs horizontal strokes slightly downward in the center
    const wristBowMax = len > 70 ? (1.2 + this.noise.random() * 2.2) : 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(sx, sy);

    let prevPx = sx;
    let prevPy = sy;

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const baseX = sx + (ex - sx) * t;
      const baseY = sy + (ey - sy) * t;

      // Parabolic bow (wrist pivot) + low-frequency organic wave + high-frequency tremor
      const wristBow = Math.sin(Math.PI * t) * wristBowMax;
      const organicWave = Math.sin(t * Math.PI * 2.8 + angle) * (wobbleAmount * 0.45);
      const highFreqTremor = (this.noise.random() - 0.5) * (wobbleAmount * 0.7);
      const totalDeviation = wristBow + organicWave + highFreqTremor;

      // Perpendicular displacement: for horizontal strokes (cos > 0, sin = 0), this adds downward sag
      const px = baseX - sin * totalDeviation;
      const py = baseY + cos * totalDeviation;

      const midX = (prevPx + px) * 0.5;
      const midY = (prevPy + py) * 0.5;
      ctx.quadraticCurveTo(prevPx, prevPy, midX, midY);

      prevPx = px;
      prevPy = py;
    }

    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Procedural Asymmetric Parentheses ( )
   * Human biomechanics: opening ( pulled inward toward palm (sharper lower curve),
   * closing ) pushed outward (flatter arc, taller, dipping lower than opening).
   */
  public drawParenthesis(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    bottomY: number,
    isOpen: boolean,
    inkColor: string,
    fontSize: number
  ): number {
    const scale = fontSize / 28;
    const height = bottomY - topY;
    const curveWidth = (5.5 + this.noise.random() * 3.5) * scale;

    // Opening and closing parentheses have independent vertical jitter and height!
    const topShift = (this.noise.random() - 0.5) * 4.5 * scale;
    const botShift = (this.noise.random() - 0.35) * 5.5 * scale; // Bias slightly downward
    const actualTopY = topY + topShift;
    const actualBottomY = bottomY + botShift;

    // Forward hand slant (+2° to +7° top-to-bottom offset)
    const slantOffset = (1.0 + this.noise.random() * 2.5) * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95 + (this.noise.random() - 0.5) * 0.15);
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (isOpen) {
      const startX = x + curveWidth + slantOffset * 0.5;
      const endX = x + curveWidth - slantOffset * 0.5 + (this.noise.random() - 0.5) * 2 * scale;
      const ctrl1X = x - curveWidth * (0.15 + this.noise.random() * 0.35);
      const ctrl2X = x - curveWidth * (0.25 + this.noise.random() * 0.35);
      ctx.moveTo(startX, actualTopY);
      ctx.bezierCurveTo(
        ctrl1X,
        actualTopY + height * (0.25 + this.noise.random() * 0.1),
        ctrl2X,
        actualBottomY - height * (0.20 + this.noise.random() * 0.1),
        endX,
        actualBottomY
      );
    } else {
      const startX = x + slantOffset * 0.5;
      const endX = x - slantOffset * 0.5 + (this.noise.random() - 0.5) * 2.5 * scale;
      const ctrl1X = x + curveWidth * (1.15 + this.noise.random() * 0.40);
      const ctrl2X = x + curveWidth * (1.05 + this.noise.random() * 0.35);
      ctx.moveTo(startX, actualTopY);
      ctx.bezierCurveTo(
        ctrl1X,
        actualTopY + height * (0.20 + this.noise.random() * 0.15),
        ctrl2X,
        actualBottomY - height * (0.25 + this.noise.random() * 0.15),
        endX,
        actualBottomY
      );
    }
    ctx.stroke();
    ctx.restore();

    return curveWidth + (3 + this.noise.random() * 2.5) * scale;
  }

  /**
   * Procedural Square Brackets [ ]
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Organic hand bracket with curved entry dip, gently bowed stem, and bottom overshoot.
   * - Allograph 1: Rapid slanted bracket with crisp corners and decisive exit cap.
   * - Allograph 2: Soft student bracket with generous rounded transitions.
   */
  public drawBracket(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    bottomY: number,
    isOpen: boolean,
    inkColor: string,
    fontSize: number
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('bracket_' + (isOpen ? 'open' : 'close'), 3);
    const height = Math.max(16, bottomY - topY);
    const capW = (7.0 + (this.noise.random() - 0.5) * 1.8) * scale;
    const dir = isOpen ? 1 : -1;
    const startX = isOpen ? x + capW : x;
    const stemX = isOpen ? x + 1.2 * scale : x + capW - 1.2 * scale;
    const endX = isOpen ? x + capW : x;
    const lineWidth = this.getBaseLineWidth(scale, 0.95 + (this.noise.random() - 0.5) * 0.10);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;

    const cornerRadius = Math.min(4.5 * scale, height * 0.12);
    const stemBow = (dir * (0.8 + this.noise.random() * 1.4)) * scale;
    const tiltOffset = (this.noise.random() - 0.5) * 1.6 * scale;

    ctx.beginPath();
    if (style === 1) {
      // Style 1: Rapid student bracket with slanted dynamic stem and decisive flick
      ctx.moveTo(startX, topY + (this.noise.random() - 0.5) * 1.2 * scale);
      ctx.quadraticCurveTo(
        stemX + dir * 1.5 * scale,
        topY,
        stemX + tiltOffset,
        topY + cornerRadius
      );
      ctx.bezierCurveTo(
        stemX + tiltOffset + stemBow,
        topY + height * 0.35,
        stemX + stemBow * 0.8,
        bottomY - height * 0.35,
        stemX,
        bottomY - cornerRadius
      );
      ctx.quadraticCurveTo(
        stemX + dir * 1.2 * scale,
        bottomY,
        endX + dir * (1.2 + this.noise.random() * 1.8) * scale,
        bottomY + (this.noise.random() - 0.45) * 1.5 * scale
      );
    } else if (style === 2) {
      // Style 2: Soft rounded student bracket with generous continuous turnaround
      ctx.moveTo(startX, topY + 0.8 * scale);
      ctx.quadraticCurveTo(
        stemX + dir * cornerRadius * 1.2,
        topY - 0.5 * scale,
        stemX,
        topY + cornerRadius * 1.4
      );
      ctx.bezierCurveTo(
        stemX - dir * 0.6 * scale,
        topY + height * 0.4,
        stemX - dir * 0.4 * scale,
        bottomY - height * 0.4,
        stemX,
        bottomY - cornerRadius * 1.4
      );
      ctx.quadraticCurveTo(
        stemX + dir * cornerRadius * 1.2,
        bottomY + 0.6 * scale,
        endX,
        bottomY
      );
    } else {
      // Style 0: Organic hand bracket with entry touch-down hook and natural terminal overshoot
      const topDip = (this.noise.random() - 0.5) * 1.2 * scale;
      ctx.moveTo(startX, topY + topDip);
      ctx.quadraticCurveTo(
        stemX + dir * 2.0 * scale,
        topY - 0.4 * scale,
        stemX,
        topY + cornerRadius
      );
      ctx.bezierCurveTo(
        stemX + stemBow,
        topY + height * 0.32,
        stemX + stemBow * 0.7,
        bottomY - height * 0.32,
        stemX,
        bottomY - cornerRadius
      );
      const overshoot = (1.5 + this.noise.random() * 2.4) * scale;
      ctx.quadraticCurveTo(
        stemX + dir * 1.8 * scale,
        bottomY + 0.4 * scale,
        endX + dir * overshoot,
        bottomY + (this.noise.random() - 0.5) * 1.4 * scale
      );
    }
    ctx.stroke();
    ctx.restore();

    return capW + 6 * scale;
  }

  /**
   * Procedural Curly Braces { }
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Classic human asymmetric lobes (45% top, 55% bottom) with downward beak.
   * - Allograph 1: Rapid crisp-cusp brace with pointed center beak and outward flared horns.
   * - Allograph 2: Fluid cursive rounded brace with softened turnaround.
   */
  public drawBrace(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    bottomY: number,
    isOpen: boolean,
    inkColor: string,
    fontSize: number
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('brace_' + (isOpen ? 'open' : 'close'), 3);
    const braceW = (7.5 + (this.noise.random() - 0.5) * 2.0) * scale;
    const totalH = bottomY - topY;
    const cuspRatio = style === 1 ? 0.48 : (0.43 + (this.noise.random() - 0.5) * 0.04);
    const cuspY = topY + totalH * cuspRatio;
    const cuspX = isOpen ? x : x + braceW;
    const outerX = isOpen ? x + braceW : x;
    const lineWidth = this.getBaseLineWidth(scale, 0.95);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;

    ctx.beginPath();
    if (isOpen) {
      if (style === 1) {
        // Rapid crisp-cusp {
        ctx.moveTo(outerX + 1 * scale, topY);
        ctx.quadraticCurveTo(x + braceW * 0.20, topY, x + braceW * 0.20, cuspY - 3 * scale);
        ctx.lineTo(cuspX - 0.5 * scale, cuspY);
        ctx.lineTo(x + braceW * 0.20, cuspY + 3 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.20, bottomY, outerX + 1.5 * scale, bottomY);
      } else if (style === 2) {
        // Fluid cursive rounded { with crisp outward cusp
        ctx.moveTo(outerX, topY + 1 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.35, topY, x + braceW * 0.25, cuspY - 2.5 * scale);
        ctx.lineTo(cuspX - 1.5 * scale, cuspY);
        ctx.lineTo(x + braceW * 0.25, cuspY + 2.5 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.35, bottomY, outerX + 1 * scale, bottomY - 1 * scale);
      } else {
        // Classic asymmetric lobe {
        ctx.moveTo(outerX, topY + (this.noise.random() - 0.5) * 1.5 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.25, topY + 1 * scale, x + braceW * 0.28, topY + totalH * 0.22);
        ctx.bezierCurveTo(x + braceW * 0.28, cuspY - 3 * scale, x + braceW * 0.10, cuspY - 1 * scale, cuspX - 1.2 * scale, cuspY);
        ctx.bezierCurveTo(x + braceW * 0.10, cuspY + 2 * scale, x + braceW * 0.25, cuspY + 5 * scale, x + braceW * 0.25, topY + totalH * 0.75);
        ctx.quadraticCurveTo(x + braceW * 0.22, bottomY - 1 * scale, outerX + 1.5 * scale, bottomY + (this.noise.random() - 0.5) * 1.5 * scale);
      }
    } else {
      if (style === 1) {
        // Rapid crisp-cusp }
        ctx.moveTo(outerX - 1 * scale, topY);
        ctx.quadraticCurveTo(x + braceW * 0.80, topY, x + braceW * 0.80, cuspY - 3 * scale);
        ctx.lineTo(cuspX + 1.5 * scale, cuspY);
        ctx.lineTo(x + braceW * 0.80, cuspY + 3 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.80, bottomY, outerX - 1.5 * scale, bottomY);
      } else if (style === 2) {
        // Fluid cursive rounded } with crisp outward cusp
        ctx.moveTo(outerX, topY + 1 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.65, topY, x + braceW * 0.75, cuspY - 2.5 * scale);
        ctx.lineTo(cuspX + 1.5 * scale, cuspY);
        ctx.lineTo(x + braceW * 0.75, cuspY + 2.5 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.65, bottomY, outerX - 1 * scale, bottomY - 1 * scale);
      } else {
        // Classic asymmetric lobe }
        ctx.moveTo(outerX, topY + (this.noise.random() - 0.5) * 1.5 * scale);
        ctx.quadraticCurveTo(x + braceW * 0.75, topY + 1 * scale, x + braceW * 0.72, topY + totalH * 0.22);
        ctx.bezierCurveTo(x + braceW * 0.72, cuspY - 3 * scale, x + braceW * 0.90, cuspY - 1 * scale, cuspX + 1.2 * scale, cuspY);
        ctx.bezierCurveTo(x + braceW * 0.90, cuspY + 2 * scale, x + braceW * 0.75, cuspY + 5 * scale, x + braceW * 0.75, topY + totalH * 0.75);
        ctx.quadraticCurveTo(x + braceW * 0.78, bottomY - 1 * scale, outerX - 1.5 * scale, bottomY + (this.noise.random() - 0.5) * 1.5 * scale);
      }
    }
    ctx.stroke();
    ctx.restore();

    return braceW + 6 * scale;
  }

  /**
   * Procedural Absolute Value Bar |
   * Authentic human student stroke: subtle forward slant (1° to 3.5°), organic bow (±0.8px),
   * and natural pen tap endpoints — never a rigid CAD ruler line!
   */
  public drawAbsBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    bottomY: number,
    inkColor: string,
    fontSize: number
  ): number {
    const scale = fontSize / 28;
    const height = bottomY - topY;
    const slantX = (0.6 + this.noise.random() * 1.6) * scale;
    const bowX = (this.noise.random() - 0.45) * 1.2 * scale;
    const topJitter = (this.noise.random() - 0.5) * 1.5 * scale;
    const botJitter = (this.noise.random() - 0.5) * 1.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95 + (this.noise.random() - 0.5) * 0.12);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 2 * scale + slantX * 0.5, topY + topJitter);
    ctx.quadraticCurveTo(
      x + 2 * scale + bowX,
      topY + height * 0.5,
      x + 2 * scale - slantX * 0.5,
      bottomY + botJitter
    );
    ctx.stroke();
    ctx.restore();

    return 7 * scale;
  }

  /**
   * Procedural Vertical Evaluation Bar (| with limits like |_s=-2)
   * Matches full tall fraction height, slanted forward 2° - 5° with natural hand curvature.
   */
  public drawEvaluationBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    topY: number,
    bottomY: number,
    inkColor: string,
    fontSize: number
  ): number {
    const scale = fontSize / 28;
    const height = bottomY - topY;
    const slantOffset = (1.5 + this.noise.random() * 2.5) * scale;
    const midSag = (this.noise.random() - 0.5) * 2.0 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, this.getBaseLineWidth(scale, 0.95));
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + slantOffset * 0.5, topY);
    ctx.quadraticCurveTo(
      x + midSag,
      topY + height * 0.5,
      x - slantOffset * 0.5,
      bottomY
    );
    ctx.stroke();
    ctx.restore();

    return 8 * scale;
  }

  /**
   * Procedural Prime Ticks (y', y'')
   * Rapid diagonal down-left ticks at 65°-75° with non-uniform heights and spacing.
   */
  public drawHandPrime(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    count = 1
  ): number {
    const scale = fontSize / 28;
    const baseLen = 8.5 * scale;
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.lineCap = 'round';

    const startY = y - fontSize * 0.72;
    for (let p = 0; p < count; p++) {
      const pX = x + p * (4.2 * scale);
      const pY = startY - p * (1.2 * scale) + (this.noise.random() - 0.5) * 1.5;
      const angleDeg = 68 + (this.noise.random() - 0.5) * 8 + p * 3.5;
      const angleRad = (angleDeg * Math.PI) / 180;
      const len = baseLen * (0.88 + this.noise.random() * 0.24) * (p === 1 ? 0.92 : 1.0);

      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.lineTo(pX - Math.cos(angleRad) * len, pY + Math.sin(angleRad) * len);
      ctx.stroke();
    }
    ctx.restore();
    return (count === 1 ? 7 : 13) * scale;
  }

  /**
   * Procedural Authentic Student Hand Bullet (organic ink jab, hollow ring, or checkmark tick - never a raw markdown hyphen)
   */
  public drawHandBullet(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const roll = this.noise.random();
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineWidth = Math.max(1.2, 1.5 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const centerY = y - fontSize * 0.30 + (this.noise.random() - 0.5) * 1.0 * scale;

    if (roll < 0.65) {
      // 65% Solid organic student pen jab / dot (authentic ink pool)
      const r = (2.2 + this.noise.random() * 0.9) * scale;
      const dotX = x + 4 * scale;
      ctx.beginPath();
      ctx.arc(dotX, centerY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return r * 2 + 10 * scale;
    } else if (roll < 0.85) {
      // 20% Small hand-sketched hollow ring / circle (o)
      const r = (2.4 + this.noise.random() * 0.7) * scale;
      const ringX = x + 4 * scale;
      ctx.beginPath();
      ctx.arc(ringX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return r * 2 + 10 * scale;
    } else {
      // 15% Quick student checkmark / bullet tick
      const tickStartX = x + 2 * scale;
      ctx.beginPath();
      ctx.moveTo(tickStartX, centerY - 1 * scale);
      ctx.lineTo(tickStartX + 2.5 * scale, centerY + 2.5 * scale);
      ctx.lineTo(tickStartX + 7.0 * scale, centerY - 3.5 * scale);
      ctx.stroke();
      ctx.restore();
      return 12 * scale;
    }
  }

  /**
   * Procedural Multiplication Dot (·)
   */
  public drawDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const dotR = 1.8 * scale;
    const centerY = y - fontSize * 0.35;
    ctx.save();
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.arc(x + 4 * scale, centerY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return 8 * scale;
  }

  /**
   * Procedural Times (×)
   */
  public drawTimes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const size = 10 * scale;
    const centerY = y - fontSize * 0.35;
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, centerY - size * 0.5);
    ctx.lineTo(x + size, centerY + size * 0.5);
    ctx.moveTo(x + size, centerY - size * 0.5);
    ctx.lineTo(x, centerY + size * 0.5);
    ctx.stroke();
    ctx.restore();
    return size + 6 * scale;
  }

  /**
   * Procedural Integral Symbol (\int)
   * 3 authentic human allographs with dynamic anti-duplication:
   * - Allograph 0: Leibniz Classic Sweeping S-Curve (flowing top hook, italic stem, upward sweeping tail).
   * - Allograph 1: Rapid Slanted Student Integral (crisp top turnaround, 10°-14° diagonal spine, compact tail).
   * - Allograph 2: Flared Broad Student Integral (generous top lobe, wider italic curve, extended bottom sweep).
   */
  public drawIntegral(
    ctx: CanvasRenderingContext2D,
    x: number,
    baselineY: number,
    fontSize: number,
    inkColor: string,
    spanLines = 1
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('integral', 3);
    const heightRatio = spanLines > 1 ? 1.8 * spanLines : (1.52 + this.noise.random() * 0.16);
    const height = fontSize * heightRatio;
    const topY = baselineY - height * (0.70 + this.noise.random() * 0.05);
    const bottomY = baselineY + height * (0.34 + this.noise.random() * 0.05);
    const totalH = bottomY - topY;
    const w = (14.0 + this.noise.random() * 3.5) * scale;
    const cx = x + w * 0.45;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.7, this.getBaseLineWidth(scale, 1.05 + (this.noise.random() - 0.5) * 0.15));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid slanted student integral (crisp turnaround, diagonal spine)
      const topHookW = (4.5 + this.noise.random() * 2.0) * scale;
      ctx.moveTo(cx + topHookW, topY + (3.0 + this.noise.random() * 1.5) * scale);
      ctx.quadraticCurveTo(cx + 1.2 * scale, topY - 1.2 * scale, cx - 0.5 * scale, topY + totalH * 0.20);
      ctx.lineTo(cx + (this.noise.random() - 0.5) * 0.8 * scale, bottomY - totalH * 0.20);
      ctx.quadraticCurveTo(cx - 1.2 * scale, bottomY + 1.2 * scale, cx - (5.5 + this.noise.random() * 2.0) * scale, bottomY - 2.0 * scale);
    } else if (style === 2) {
      // Flared broad student integral (generous top lobe, wider italic curve)
      const topHookW = (7.5 + this.noise.random() * 2.5) * scale;
      const botHookW = (8.0 + this.noise.random() * 2.5) * scale;
      ctx.moveTo(cx + topHookW, topY + (5.5 + this.noise.random() * 1.5) * scale);
      ctx.bezierCurveTo(
        cx + 5.0 * scale, topY - 2.0 * scale,
        cx - 2.5 * scale, topY + 0.8 * scale,
        cx - 1.5 * scale, topY + totalH * 0.25
      );
      ctx.bezierCurveTo(
        cx + 1.2 * scale, topY + totalH * 0.46,
        cx + 1.8 * scale, topY + totalH * 0.68,
        cx - 0.6 * scale, bottomY - totalH * 0.16
      );
      ctx.bezierCurveTo(
        cx - 2.0 * scale, bottomY + 1.8 * scale,
        cx - botHookW * 0.85, bottomY + 0.8 * scale,
        cx - botHookW, bottomY - (4.0 + this.noise.random() * 1.5) * scale
      );
    } else {
      // Classic Leibniz sweeping S-curve
      const topTipX = (6.0 + this.noise.random() * 2.2) * scale;
      const topTipY = (4.0 + this.noise.random() * 1.5) * scale;
      const botTipX = (7.0 + this.noise.random() * 2.0) * scale;
      const botTipY = (3.2 + this.noise.random() * 1.5) * scale;

      ctx.moveTo(cx + topTipX, topY + topTipY);
      ctx.bezierCurveTo(
        cx + 4.2 * scale, topY - 1.2 * scale,
        cx - 1.6 * scale, topY + 0.5 * scale,
        cx - 1.0 * scale, topY + totalH * 0.22
      );
      ctx.bezierCurveTo(
        cx + 0.8 * scale, topY + totalH * 0.44,
        cx + 1.4 * scale, topY + totalH * 0.66,
        cx - 0.5 * scale, bottomY - totalH * 0.18
      );
      ctx.bezierCurveTo(
        cx - 1.6 * scale, bottomY + 1.2 * scale,
        cx - botTipX * 0.8, bottomY + 0.4 * scale,
        cx - botTipX, bottomY - botTipY
      );
    }
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  /**
   * Procedural Square Root (\sqrt{...})
   * 3 radical checkmark allographs + organic vinculum bow and overshoot.
   */
  public drawSquareRoot(
    ctx: CanvasRenderingContext2D,
    roughCanvas: ReturnType<typeof rough.canvas>,
    x: number,
    baselineY: number,
    contentWidth: number,
    contentHeight: number,
    fontSize: number,
    inkColor: string,
    contentDescent?: number
  ): { innerX: number; totalWidth: number } {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('sqrt', 3);
    const rootCheckWidth = (13.5 + this.noise.random() * 3.0) * scale;
    const descent = Math.max(0, contentDescent ?? 0);
    const contentAscent = Math.max(fontSize * 0.75, contentHeight - descent);
    const topY = baselineY - Math.max(fontSize * 0.95, contentAscent + 8 * scale);
    const bottomY = baselineY + Math.max(2 * scale, descent + 2 * scale);
    const totalHeight = bottomY - topY;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (style === 1) {
      // Rapid flick checkmark
      ctx.moveTo(x + 1 * scale, baselineY - totalHeight * 0.35);
      ctx.lineTo(x + 5 * scale, bottomY);
      ctx.lineTo(x + rootCheckWidth, topY);
    } else if (style === 2) {
      // Curved dip checkmark
      ctx.moveTo(x, baselineY - totalHeight * 0.42);
      ctx.quadraticCurveTo(x + 3 * scale, baselineY - totalHeight * 0.20, x + 6 * scale, bottomY);
      ctx.lineTo(x + rootCheckWidth, topY);
    } else {
      // Classic checkmark
      ctx.moveTo(x, baselineY - totalHeight * 0.40);
      ctx.lineTo(x + 4 * scale, baselineY - totalHeight * 0.18);
      ctx.lineTo(x + 7 * scale, bottomY);
      ctx.lineTo(x + rootCheckWidth, topY);
    }
    ctx.stroke();

    // Horizontal vinculum top bar with slight bow and overshoot
    const overshoot = (4 + this.noise.random() * 5) * scale;
    const vinculumEnd = x + rootCheckWidth + contentWidth + overshoot;
    const bowY = (this.noise.random() - 0.5) * 2.0 * scale;

    ctx.beginPath();
    ctx.moveTo(x + rootCheckWidth, topY);
    ctx.quadraticCurveTo(
      x + rootCheckWidth + (contentWidth + overshoot) * 0.5,
      topY - bowY,
      vinculumEnd,
      topY + (this.noise.random() - 0.5) * 1.8 * scale
    );
    ctx.stroke();

    // Terminal downward tick
    ctx.beginPath();
    ctx.moveTo(vinculumEnd, topY);
    ctx.lineTo(vinculumEnd, topY + (3.0 + this.noise.random() * 1.5) * scale);
    ctx.stroke();

    ctx.restore();

    return {
      innerX: x + rootCheckWidth + 3 * scale,
      totalWidth: rootCheckWidth + contentWidth + overshoot + 4 * scale,
    };
  }

  /**
   * Procedural Authentic Handwritten Fraction Bar:
   * Controlled biomechanical pen stroke:
   * - Natural wrist sag: maximum 0.85px in mid-span
   * - Subtle organic tilt: controlled within ±1.0px across entire fraction
   * - Multi-allograph velocity-tapered ballpoint stroke
   * - Guaranteed optical clearance for surrounding text
   */
  public drawFractionBar(
    ctx: CanvasRenderingContext2D,
    _roughCanvas: ReturnType<typeof rough.canvas>,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    inkColor: string
  ) {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('frac_bar', 3);

    // Controlled organic student tilt: maximum +-1.0px across entire fraction
    const tiltDy = (this.noise.random() - 0.48) * 1.8 * scale;
    const startY = y - tiltDy * 0.5;
    const endY = y + tiltDy * 0.5;
    const startX = x;
    const endX = x + width;
    const totalLen = width;

    const baseLineWidth = this.getBaseLineWidth(scale, 1.05);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = baseLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.94;

    const midX = startX + totalLen * 0.5;
    const sagY = (style === 1 ? 0.45 : 0.85) * scale;
    const midY = (startY + endY) * 0.5 + sagY + (this.noise.random() - 0.5) * 0.4 * scale;
    const flickX = endX + (style === 2 ? 1.5 : 0.5) * scale;
    const flickY = endY + (style === 2 ? -0.5 : 0.3) * scale;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, flickX, flickY);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Procedural Mistake Scratch-Out / Cutting:
   * Generates organic, non-repetitive human error corrections:
   * - style 'single-strike': Single quick horizontal line through the typo with natural hand slant
   * - style 'dense-scribble': Dense continuous ballpoint zigzag/loop back-and-forth obscuring the text
   * - style 'slash': Quick diagonal pen stroke (/)
   * - style 'double-slash': Hurried parallel slashes (//)
   * - style 'wavy-strike': Rapid wavy pencil/pen stroke through the typo
   */
  public drawMistakeScratch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    inkColor: string,
    forcedStyle?: 'single-strike' | 'dense-scribble' | 'slash' | 'double-slash' | 'wavy-strike'
  ) {
    const styles: Array<'single-strike' | 'dense-scribble' | 'slash' | 'double-slash' | 'wavy-strike'> = [
      'single-strike',
      'dense-scribble',
      'slash',
      'double-slash',
      'wavy-strike',
    ];
    const style = forcedStyle || styles[Math.floor(this.noise.random() * styles.length)];

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strikeY = y - height * (0.32 + this.noise.random() * 0.12);
    const overshootLeft = 2 + this.noise.random() * 4;
    const overshootRight = 3 + this.noise.random() * 6;

    if (style === 'single-strike') {
      const tiltY = (this.noise.random() - 0.5) * 3;
      this.drawHandLine(
        ctx,
        x - overshootLeft,
        strikeY,
        x + width + overshootRight,
        strikeY + tiltY,
        1.7 + this.noise.random() * 0.4,
        inkColor,
        1.6,
        3
      );
    } else if (style === 'dense-scribble') {
      ctx.lineWidth = 1.6 + this.noise.random() * 0.4;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const numPeaks = Math.max(3, Math.min(8, Math.round(width / 7)));
      const startX = x - 2;
      const stepX = (width + 4) / numPeaks;
      ctx.moveTo(startX, strikeY + (this.noise.random() - 0.5) * 3);

      for (let p = 0; p <= numPeaks; p++) {
        const px = startX + p * stepX;
        const py = strikeY + (p % 2 === 0 ? -1 : 1) * (height * 0.22 + (this.noise.random() - 0.5) * 2);
        ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + width + 2, strikeY);
      for (let p = numPeaks; p >= 0; p--) {
        const px = startX + p * stepX + (this.noise.random() - 0.5) * 2;
        const py = strikeY + (p % 2 === 0 ? 1 : -1) * (height * 0.18 + (this.noise.random() - 0.5) * 2);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (style === 'slash') {
      this.drawHandLine(
        ctx,
        x - 1,
        y + 3,
        x + width + 3,
        y - height * 0.78,
        1.7,
        inkColor,
        1.5,
        2
      );
    } else if (style === 'double-slash') {
      const gap = Math.min(8, Math.max(4, width * 0.25));
      this.drawHandLine(
        ctx,
        x - 1,
        y + 3,
        x + width * 0.5 + 2,
        y - height * 0.78,
        1.6,
        inkColor,
        1.4,
        2
      );
      this.drawHandLine(
        ctx,
        x + gap,
        y + 3,
        x + width * 0.5 + gap + 3,
        y - height * 0.78,
        1.6,
        inkColor,
        1.4,
        2
      );
    } else if (style === 'wavy-strike') {
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      const waveStartX = x - overshootLeft;
      const waveEndX = x + width + overshootRight;
      const totalLen = waveEndX - waveStartX;
      ctx.moveTo(waveStartX, strikeY);
      for (let lx = 0; lx <= totalLen; lx += 3) {
        const curX = waveStartX + lx;
        const curY = strikeY + Math.sin(lx * 0.35) * (height * 0.18);
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Procedural Boxed Final Answer (\boxed{...})
   * Respects user's handwriting answer style: 'box' | 'oval' | 'pill' | 'underline'
   */
  public drawBoxedAnswer(
    ctx: CanvasRenderingContext2D,
    roughCanvas: ReturnType<typeof rough.canvas>,
    font: opentype.Font,
    mutator: GlyphMutator,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    inkColor: string,
    handwriting: HandwritingStyleSettings
  ) {
    const style = handwriting.answerBubbleStyle || 'box';
    const showCheckmark = handwriting.showAnswerCheckmarks ?? (handwriting.persona === 'girl-neat-cursive');

    if (style === 'oval' || style === 'pill') {
      this.drawOvalBubble(ctx, x, y, width, height, fontSize, inkColor, showCheckmark);
      return;
    }

    if (style === 'underline') {
      const uY = y + height + 4;
      this.drawHandLine(ctx, x - 4, uY, x + width + 8, uY, 1.8, inkColor, 1.8, 4);
      this.drawHandLine(ctx, x - 2, uY + 4, x + width + 10, uY + 4, 1.3, inkColor, 1.8, 4);
      if (showCheckmark) {
        this.drawCheckmark(ctx, x + width + 14, uY, fontSize * 0.85, inkColor);
      }
      return;
    }

    // Default 'box': Authentic student hand-drawn box with overshooting corners,
    // natural tilt, parabolic bowing, capillary ink crossings, and organic double-pass sketch.
    const pad = 6;
    const rx = x - pad;
    const ry = y - pad;
    const rw = width + pad * 2;
    const rh = height + pad * 2;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Subtle human angular tilt (-0.7° to +0.8°)
    const tiltAngle = (this.noise.random() - 0.45) * 0.016;
    const centerX = rx + rw * 0.5;
    const centerY = ry + rh * 0.5;

    ctx.translate(centerX, centerY);
    ctx.rotate(tiltAngle);
    ctx.translate(-centerX, -centerY);

    // 2. Corner Overshoots (students don't stop abruptly at corners)
    const oTopL = 5 + this.noise.random() * 4;
    const oTopR = 5 + this.noise.random() * 4;
    const oBotR = 5 + this.noise.random() * 4;
    const oBotL = 5 + this.noise.random() * 4;

    const oRightT = 5 + this.noise.random() * 4;
    const oRightB = 5 + this.noise.random() * 4;
    const oLeftT = 5 + this.noise.random() * 4;
    const oLeftB = 5 + this.noise.random() * 4;

    const baseLineWidth = Math.max(1.5, this.getBaseLineWidth(fontSize / 28, 0.95));

    // Subtle bow / midpoint wobble for each of the 4 sides
    const bowTop = (this.noise.random() - 0.45) * 2.2;
    const bowRight = (this.noise.random() - 0.45) * 2.2;
    const bowBottom = (this.noise.random() - 0.45) * 2.2;
    const bowLeft = (this.noise.random() - 0.45) * 2.2;

    const x1 = rx;
    const y1 = ry;
    const x2 = rx + rw;
    const y2 = ry + rh;

    const drawSideStroke = (
      sx: number, sy: number,
      ex: number, ey: number,
      bowX: number, bowY: number,
      extraWidth = 0
    ) => {
      ctx.lineWidth = baseLineWidth + extraWidth;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const midX = (sx + ex) * 0.5 + bowX;
      const midY = (sy + ey) * 0.5 + bowY;
      ctx.quadraticCurveTo(midX, midY, ex, ey);
      ctx.stroke();
    };

    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.35;
    ctx.globalAlpha = 0.88;

    // Stroke 1: Top horizontal stroke (left to right)
    drawSideStroke(
      x1 - oTopL, y1 + (this.noise.random() - 0.5) * 1.5,
      x2 + oTopR, y1 + (this.noise.random() - 0.5) * 1.5,
      0, bowTop
    );

    // Stroke 2: Right vertical stroke (top to bottom)
    drawSideStroke(
      x2 + (this.noise.random() - 0.5) * 1.5, y1 - oRightT,
      x2 + (this.noise.random() - 0.5) * 1.5, y2 + oRightB,
      bowRight, 0
    );

    // Stroke 3: Bottom horizontal stroke (right to left)
    drawSideStroke(
      x1 - oBotL, y2 + (this.noise.random() - 0.5) * 1.5,
      x2 + oBotR, y2 + (this.noise.random() - 0.5) * 1.5,
      0, bowBottom
    );

    // Stroke 4: Left vertical stroke (bottom to top)
    drawSideStroke(
      x1 + (this.noise.random() - 0.5) * 1.5, y1 - oLeftT,
      x1 + (this.noise.random() - 0.5) * 1.5, y2 + oLeftB,
      bowLeft, 0
    );

    // 3. Quick partial second sketch pass on bottom or right (deliberate student reinforcement)
    if (this.noise.random() < 0.65) {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = baseLineWidth * 0.72;
      const passOffset = 1.2 + this.noise.random() * 1.3;
      drawSideStroke(
        x1 + 6, y2 + passOffset,
        x2 - 4, y2 + passOffset * 0.8,
        0, bowBottom * 0.8
      );
    }

    // 4. Capillary ink junctions at the 4 intersection corners (darker dot where pen crossed)
    ctx.globalAlpha = 0.45;
    const drawCornerKnot = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, baseLineWidth * 0.8, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCornerKnot(x1, y1);
    drawCornerKnot(x2, y1);
    drawCornerKnot(x2, y2);
    drawCornerKnot(x1, y2);

    ctx.restore();

    if (showCheckmark) {
      this.drawCheckmark(ctx, rx + rw + 16, ry + rh * 0.55, fontSize * 0.85, inkColor);
    } else {
      // Handwritten "Ans" label on the bottom-right corner
      const ansFontSize = Math.max(13, fontSize * 0.55);
      const labelText = "Ans.";
      const labelX = rx + rw - 34;
      const labelY = ry + rh + 14;

      ctx.save();
      let cx = labelX;
      for (let i = 0; i < labelText.length; i++) {
        const ch = labelText[i];
        const res = mutator.mutateGlyph(font, ch, cx, labelY, {
          fontSize: ansFontSize,
          wordIndex: 0,
          charIndexInWord: i,
          wordLength: labelText.length,
          isFirstChar: i === 0,
          isLastChar: i === labelText.length - 1,
          prevChar: i > 0 ? labelText[i - 1] : null,
          nextChar: i < labelText.length - 1 ? labelText[i + 1] : null,
          lineProgress: 0.5,
          handwriting,
        });

        ctx.fillStyle = inkColor;
        res.path.draw(ctx);
        cx += res.advanceWidth + 1;
      }
      ctx.restore();
    }
  }

  /**
   * Draws an authentic hand-sketched elongated oval/stadium bubble around answers
   * e.g. Root ≈ 2.138, y(0.72) = 0.7838405, Yes ✓
   * Features continuous curving loop with tail overlap and optional checkmark.
   */
  public drawOvalBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    inkColor: string,
    showCheckmark = false
  ) {
    const padX = 14;
    const padY = 8;
    const rx = x - padX;
    const ry = y - padY;
    const rw = width + padX * 2;
    const rh = height + padY * 2;
    const r = rh * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const startX = rx + rw * 0.4;
    const startY = ry;
    const overlap = 10;
    const jitter = () => (this.noise.random() - 0.5) * 1.5;

    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.45;
    ctx.lineWidth = 1.7;
    ctx.globalAlpha = 0.88;

    ctx.beginPath();
    ctx.moveTo(startX, startY + jitter());
    // Top line toward right
    ctx.lineTo(rx + rw - r, ry + jitter());
    // Right semicircular cap
    ctx.bezierCurveTo(
      rx + rw + jitter(),
      ry + rh * 0.2,
      rx + rw + jitter(),
      ry + rh * 0.8,
      rx + rw - r,
      ry + rh + jitter()
    );
    // Bottom line toward left
    ctx.lineTo(rx + r, ry + rh + jitter());
    // Left semicircular cap
    ctx.bezierCurveTo(
      rx - jitter(),
      ry + rh * 0.8,
      rx - jitter(),
      ry + rh * 0.2,
      rx + r,
      ry + jitter()
    );
    // Top line back toward start with overshoot
    ctx.lineTo(startX + overlap, ry + jitter() - 0.5);
    ctx.stroke();

    // Downstroke pressure accent
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.moveTo(rx + rw - r, ry + rh * 0.1);
    ctx.bezierCurveTo(
      rx + rw + 0.4,
      ry + rh * 0.25,
      rx + rw + 0.4,
      ry + rh * 0.75,
      rx + rw - r,
      ry + rh + 0.4
    );
    ctx.stroke();

    // Optional Checkmark
    if (showCheckmark) {
      this.drawCheckmark(ctx, rx + rw + 12, ry + rh * 0.65, fontSize * 0.85, inkColor);
    }

    ctx.restore();
  }

  /**
   * Draws an authentic handwritten checkmark (✓)
   * Rapid downward tick followed by long upward-right flick with ballpoint taper.
   */
  public drawCheckmark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    inkColor: string
  ) {
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = size / 20;
    const jX = (this.noise.random() - 0.5) * 1.5;
    const jY = (this.noise.random() - 0.5) * 1.5;

    // Stroke 1: Downward short tick
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s + jX, y - 5 * s + jY);
    ctx.lineTo(x + jX, y + jY);
    ctx.stroke();

    // Stroke 2: Long upward right flick with slight curve
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(x + jX, y + jY);
    ctx.quadraticCurveTo(x + 5 * s, y - 4 * s, x + 11 * s + jX, y - 13 * s + jY);
    ctx.stroke();

    // Tapering tip at end of flick
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 11 * s + jX, y - 13 * s + jY);
    ctx.lineTo(x + 13 * s + jX, y - 16 * s + jY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws authentic hand-sketched circled question / list indices in margin:
   * e.g. (1), (2), (a), (b), Q1, (16)
   * Sweeps an organic circle around the centered label with start/end tail overlap (25°-45°).
   */
  public drawCircledLabel(
    ctx: CanvasRenderingContext2D,
    font: opentype.Font,
    mutator: GlyphMutator,
    rawText: string,
    centerX: number,
    centerY: number,
    fontSize: number,
    inkColor: string,
    handwriting: HandwritingStyleSettings
  ): number {
    // 1. Clean label: e.g. "(1)" -> "1", "Q1." -> "Q1", "(a)" -> "a", "16." -> "16"
    let cleanText = rawText.trim();
    if (cleanText.startsWith('(') && cleanText.endsWith(')')) {
      cleanText = cleanText.slice(1, -1).trim();
    }
    if (cleanText.endsWith('.')) {
      cleanText = cleanText.slice(0, -1).trim();
    }
    if (!cleanText) cleanText = rawText;

    // 2. Measure label text
    const labelFontSize = fontSize * 0.88;
    let textWidth = 0;
    for (let i = 0; i < cleanText.length; i++) {
      const g = font.charToGlyph(cleanText[i]);
      textWidth += g.advanceWidth ? (g.advanceWidth * labelFontSize) / font.unitsPerEm : labelFontSize * 0.55;
    }

    // 3. Dynamic radius enclosing the text
    const minRadius = Math.max(13, labelFontSize * 0.58);
    const radius = Math.max(minRadius, textWidth * 0.60 + 5);

    // 4. Draw hand-sketched circle with ballpoint organic variation and tail overlap
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const startAngle = (105 + (this.noise.random() - 0.5) * 20) * (Math.PI / 180);
    const overlapAngle = (32 + this.noise.random() * 22) * (Math.PI / 180);
    const totalSweep = Math.PI * 2 + overlapAngle;
    const steps = 32;

    const rx = radius * (1.0 + (this.noise.random() - 0.5) * 0.12);
    const ry = radius * (0.95 + (this.noise.random() - 0.5) * 0.12);
    const tilt = (this.noise.random() - 0.5) * 0.15;

    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0; s <= steps; s++) {
      const progress = s / steps;
      const angle = startAngle + progress * totalSweep;
      const rJitter = this.noise.noise1D(progress * 10 + centerX * 0.1) * 1.4;
      const curRx = rx + rJitter;
      const curRy = ry + rJitter * 0.8;

      const lx = Math.cos(angle) * curRx;
      const ly = Math.sin(angle) * curRy;

      const tx = centerX + lx * Math.cos(tilt) - ly * Math.sin(tilt);
      const ty = centerY + lx * Math.sin(tilt) + ly * Math.cos(tilt);
      points.push({ x: tx, y: ty });
    }

    // Base pass
    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.45;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.85;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Downstroke thickening pass
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i > 3 && i < 22) {
        if (i === 4) ctx.moveTo(points[i].x + 0.35, points[i].y + 0.45);
        else ctx.lineTo(points[i].x + 0.35, points[i].y + 0.45);
      }
    }
    ctx.stroke();
    ctx.restore();

    // 5. Render label text centered inside the circle
    let textStartX = centerX - textWidth / 2;
    const textBaselineY = centerY + labelFontSize * 0.33;

    for (let i = 0; i < cleanText.length; i++) {
      const ch = cleanText[i];
      const res = mutator.mutateGlyph(font, ch, textStartX, textBaselineY, {
        fontSize: labelFontSize,
        wordIndex: 0,
        charIndexInWord: i,
        wordLength: cleanText.length,
        isFirstChar: i === 0,
        isLastChar: i === cleanText.length - 1,
        prevChar: i > 0 ? cleanText[i - 1] : null,
        nextChar: i < cleanText.length - 1 ? cleanText[i + 1] : null,
        lineProgress: 0.5,
        handwriting,
      });

      ctx.save();
      ctx.fillStyle = inkColor;
      res.path.draw(ctx);
      ctx.restore();
      textStartX += res.advanceWidth;
    }

    return radius * 2 + 10;
  }

  /**
   * Procedurally renders authentic handwriting punctuation: ., :, ;, ,
   * Never renders periods as mechanical geometric font circles!
   * Angled teardrop/tick jabs at 20°-45° that vary organically every time.
   */
  public drawPunctuationJab(
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    ctx.save();
    ctx.fillStyle = inkColor;
    ctx.strokeStyle = inkColor;
    ctx.lineCap = 'round';

    const drawTeardrop = (jx: number, jy: number, isComma = false) => {
      const angleDeg = 20 + this.noise.random() * 25; // 20° - 45°
      const angleRad = (angleDeg * Math.PI) / 180;
      const jabLen = (1.6 + this.noise.random() * 1.0) * scale;
      const headR = (0.9 + this.noise.random() * 0.45) * scale;

      ctx.beginPath();
      ctx.arc(jx, jy, headR, 0, Math.PI * 2);
      ctx.fill();

      // Angled teardrop down-right jab stroke
      ctx.lineWidth = headR * 1.6;
      ctx.beginPath();
      ctx.moveTo(jx, jy);
      const endX = jx + Math.cos(angleRad) * jabLen;
      const endY = jy + Math.sin(angleRad) * jabLen;
      ctx.lineTo(endX, endY);
      ctx.stroke();

      if (isComma) {
        // Curved tail hooking downward-left
        ctx.lineWidth = headR * 1.1;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.quadraticCurveTo(endX + 0.5 * scale, endY + 2.5 * scale, endX - 1.8 * scale, endY + 4.5 * scale);
        ctx.stroke();
      }
    };

    if (char === '.') {
      drawTeardrop(x + 2 * scale, y - 1 * scale, false);
      ctx.restore();
      return 7 * scale;
    } else if (char === ',') {
      drawTeardrop(x + 2 * scale, y - 1 * scale, true);
      ctx.restore();
      return 7.5 * scale;
    } else if (char === ':') {
      const upperY = y - fontSize * 0.38 + (this.noise.random() - 0.5) * 1.5 * scale;
      const lowerY = y - 1 * scale;
      drawTeardrop(x + 2 * scale, upperY, false);
      drawTeardrop(x + (2 + (this.noise.random() - 0.5) * 1.2) * scale, lowerY, false);
      ctx.restore();
      return 8 * scale;
    } else if (char === ';') {
      const upperY = y - fontSize * 0.38 + (this.noise.random() - 0.5) * 1.5 * scale;
      const lowerY = y - 1 * scale;
      drawTeardrop(x + 2 * scale, upperY, false);
      drawTeardrop(x + (2 + (this.noise.random() - 0.5) * 1.2) * scale, lowerY, true);
      ctx.restore();
      return 8.5 * scale;
    }

    ctx.restore();
    return 6 * scale;
  }

  /**
   * Procedural Universal Quantifier (∀):
   * Inverted capital A with a horizontal crossbar.
   */
  public drawForall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 13 * scale;
    const topY = y - fontSize * 0.65;
    const apexY = y + 0.5 * scale;
    const crossY = y - fontSize * 0.32;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left arm down to vertex
    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, topY);
    ctx.lineTo(x + w * 0.5, apexY);
    // Right arm up from vertex
    ctx.lineTo(x + w - 1 * scale, topY);
    ctx.stroke();

    // Horizontal crossbar
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, crossY);
    ctx.lineTo(x + w * 0.78, crossY + (this.noise.random() - 0.5) * 0.8 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Existential Quantifier (∃):
   * Inverted capital E.
   */
  public drawExists(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11 * scale;
    const topY = y - fontSize * 0.65;
    const bottomY = y;
    const midY = (topY + bottomY) * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vertical right stem
    ctx.beginPath();
    ctx.moveTo(x + w, topY);
    ctx.lineTo(x + w, bottomY);
    ctx.stroke();

    // Top horizontal bar (pointing left)
    ctx.beginPath();
    ctx.moveTo(x + w, topY);
    ctx.lineTo(x + 1 * scale, topY);
    ctx.stroke();

    // Middle horizontal bar (pointing left)
    ctx.beginPath();
    ctx.moveTo(x + w, midY);
    ctx.lineTo(x + 2 * scale, midY);
    ctx.stroke();

    // Bottom horizontal bar (pointing left)
    ctx.beginPath();
    ctx.moveTo(x + w, bottomY);
    ctx.lineTo(x + 1 * scale, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Set Union (∪ or \bigcup)
   */
  public drawCup(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isBig = false
  ): number {
    const sizeMultiplier = isBig ? 1.35 : 1.0;
    const scale = (fontSize * sizeMultiplier) / 28;
    const w = 14 * scale;
    const topY = y - fontSize * (isBig ? 0.72 : 0.45);
    const bottomY = y + fontSize * (isBig ? 0.12 : -0.04);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, topY);
    ctx.lineTo(x + 1 * scale, bottomY - 3 * scale);
    ctx.quadraticCurveTo(x + w * 0.5, bottomY + 1 * scale, x + w - 1 * scale, bottomY - 3 * scale);
    ctx.lineTo(x + w - 1 * scale, topY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Set Intersection (∩ or \bigcap)
   */
  public drawCap(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isBig = false
  ): number {
    const sizeMultiplier = isBig ? 1.35 : 1.0;
    const scale = (fontSize * sizeMultiplier) / 28;
    const w = 14 * scale;
    const topY = y - fontSize * (isBig ? 0.72 : 0.45);
    const bottomY = y + fontSize * (isBig ? 0.12 : -0.04);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, bottomY);
    ctx.lineTo(x + 1 * scale, topY + 3 * scale);
    ctx.quadraticCurveTo(x + w * 0.5, topY - 1 * scale, x + w - 1 * scale, topY + 3 * scale);
    ctx.lineTo(x + w - 1 * scale, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Maps-to Arrow (↦)
   */
  public drawMapsTo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const len = 18 * scale;
    const centerY = y - fontSize * 0.35;
    const barH = 8 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left vertical stop tick
    ctx.beginPath();
    ctx.moveTo(x + 1.5 * scale, centerY - barH * 0.5);
    ctx.lineTo(x + 1.5 * scale, centerY + barH * 0.5);
    ctx.stroke();

    // Horizontal shaft
    ctx.beginPath();
    ctx.moveTo(x + 1.5 * scale, centerY);
    ctx.lineTo(x + len, centerY);
    ctx.stroke();

    // Arrowhead >
    const headLen = 5.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x + len - headLen, centerY - 4 * scale);
    ctx.lineTo(x + len, centerY);
    ctx.lineTo(x + len - headLen, centerY + 4 * scale);
    ctx.stroke();

    ctx.restore();
    return len + 5 * scale;
  }

  /**
   * Procedural Vertical Arrow (↑ or ↓)
   */
  public drawVerticalArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    isUp: boolean
  ): number {
    const scale = fontSize / 28;
    const topY = y - fontSize * 0.70;
    const bottomY = y - fontSize * 0.05;
    const midX = x + 6 * scale;
    const headLen = 4.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vertical shaft
    ctx.beginPath();
    ctx.moveTo(midX, topY);
    ctx.lineTo(midX, bottomY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    if (isUp) {
      ctx.moveTo(midX - headLen, topY + headLen);
      ctx.lineTo(midX, topY);
      ctx.lineTo(midX + headLen, topY + headLen);
    } else {
      ctx.moveTo(midX - headLen, bottomY - headLen);
      ctx.lineTo(midX, bottomY);
      ctx.lineTo(midX + headLen, bottomY - headLen);
    }
    ctx.stroke();

    ctx.restore();
    return 12 * scale;
  }

  /**
   * Procedural Empty Set Symbol (∅)
   */
  public drawEmptySet(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12 * scale;
    const centerY = y - fontSize * 0.32;
    const rx = 5.2 * scale;
    const ry = 7.0 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    // Oval zero/circle
    ctx.beginPath();
    ctx.ellipse(x + rx + 1 * scale, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Diagonal forward slash passing completely through
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * scale, centerY + ry * 1.3);
    ctx.lineTo(x + rx * 2 + 2.5 * scale, centerY - ry * 1.3);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Wedge / Logical AND / Minimum (∧)
   */
  public drawWedge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11 * scale;
    const topY = y - fontSize * 0.50;
    const bottomY = y - fontSize * 0.05;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, bottomY);
    ctx.lineTo(x + w * 0.5, topY);
    ctx.lineTo(x + w - 1 * scale, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Vee / Logical OR / Maximum (∨)
   */
  public drawVee(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11 * scale;
    const topY = y - fontSize * 0.50;
    const bottomY = y - fontSize * 0.05;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, topY);
    ctx.lineTo(x + w * 0.5, bottomY);
    ctx.lineTo(x + w - 1 * scale, topY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Subset / Superset (⊂, ⊆, ⊃, ⊇)
   */
  public drawSubset(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string,
    hasEqual = false,
    isSuperset = false
  ): number {
    const scale = fontSize / 28;
    const w = 12 * scale;
    const topY = y - fontSize * (hasEqual ? 0.48 : 0.42);
    const bottomY = y - fontSize * (hasEqual ? 0.16 : 0.06);
    const midY = (topY + bottomY) * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (!isSuperset) {
      // ⊂ opening to the right
      ctx.moveTo(x + w - 1 * scale, topY);
      ctx.bezierCurveTo(x + w * 0.35, topY, x + 1 * scale, midY - 2 * scale, x + 1 * scale, midY);
      ctx.bezierCurveTo(x + 1 * scale, midY + 2 * scale, x + w * 0.35, bottomY, x + w - 1 * scale, bottomY);
    } else {
      // ⊃ opening to the left
      ctx.moveTo(x + 1 * scale, topY);
      ctx.bezierCurveTo(x + w * 0.65, topY, x + w - 1 * scale, midY - 2 * scale, x + w - 1 * scale, midY);
      ctx.bezierCurveTo(x + w - 1 * scale, midY + 2 * scale, x + w * 0.65, bottomY, x + 1 * scale, bottomY);
    }
    ctx.stroke();

    if (hasEqual) {
      const eqY = y - fontSize * 0.02;
      ctx.beginPath();
      ctx.moveTo(x + 1 * scale, eqY);
      ctx.lineTo(x + w - 1 * scale, eqY);
      ctx.stroke();
    }

    ctx.restore();
    return w + 5 * scale;
  }

  /**
   * Procedural Equivalence Operator (≡)
   */
  public drawEquiv(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 13 * scale;
    const gap = 3.5 * scale;
    const midY = y - fontSize * 0.32;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    for (const off of [-gap, 0, gap]) {
      ctx.beginPath();
      ctx.moveTo(x + 1 * scale, midY + off);
      ctx.lineTo(x + w - 1 * scale, midY + off);
      ctx.stroke();
    }

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Perpendicular Symbol (⊥)
   */
  public drawPerp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12 * scale;
    const topY = y - fontSize * 0.55;
    const bottomY = y - fontSize * 0.05;
    const midX = x + w * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';

    // Horizontal baseline
    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, bottomY);
    ctx.lineTo(x + w - 1 * scale, bottomY);
    ctx.stroke();

    // Vertical upright
    ctx.beginPath();
    ctx.moveTo(midX, bottomY);
    ctx.lineTo(midX, topY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Parallel Symbol (∥)
   */
  public drawParallel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 10 * scale;
    const topY = y - fontSize * 0.55;
    const bottomY = y - fontSize * 0.05;
    const gap = 3.5 * scale;
    const midX = x + w * 0.5;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(midX - gap * 0.5, topY);
    ctx.lineTo(midX - gap * 0.5, bottomY);
    ctx.moveTo(midX + gap * 0.5, topY);
    ctx.lineTo(midX + gap * 0.5, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Proportionality Symbol (∝)
   */
  public drawPropto(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 14 * scale;
    const centerY = y - fontSize * 0.32;
    const rx = 3.6 * scale;
    const ry = 4.2 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    // Left loop
    ctx.beginPath();
    ctx.ellipse(x + rx + 1 * scale, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Right open arms (infinity with open right end)
    ctx.beginPath();
    ctx.moveTo(x + rx * 2 + 1 * scale, centerY);
    ctx.quadraticCurveTo(x + w * 0.8, centerY - ry, x + w, centerY - ry * 0.8);
    ctx.moveTo(x + rx * 2 + 1 * scale, centerY);
    ctx.quadraticCurveTo(x + w * 0.8, centerY + ry, x + w, centerY + ry * 0.8);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Composition Circle (∘)
   */
  public drawCirc(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const r = 3.0 * scale;
    const centerY = y - fontSize * 0.32;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);

    ctx.beginPath();
    ctx.arc(x + r + 2 * scale, centerY, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    return r * 2 + 6 * scale;
  }

  /**
   * Procedural Negation Symbol (¬)
   */
  public drawNeg(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 10 * scale;
    const centerY = y - fontSize * 0.32;
    const drop = 4.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 1.0);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 1 * scale, centerY);
    ctx.lineTo(x + w, centerY);
    ctx.lineTo(x + w, centerY + drop);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Opposing-Crescent Math Variable 'x' ):(
   * Distinct from multiplication '×' and printed text 'x'.
   */
  public drawCursiveMathX(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const style = this.getNextAllograph('math_x', 2);
    const w = (12.0 + this.noise.random() * 2.5) * scale;
    const topY = y - fontSize * 0.44;
    const botY = y;
    const touchX = x + w * (0.48 + (this.noise.random() - 0.5) * 0.06);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.92);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left backward crescent ')'
    ctx.beginPath();
    ctx.moveTo(x + 1.2 * scale, topY + (style === 1 ? 1.5 : 0.5) * scale);
    ctx.bezierCurveTo(
      touchX + 1.4 * scale, topY - 0.5 * scale,
      touchX + 1.2 * scale, botY + 0.5 * scale,
      x + 0.5 * scale, botY - 0.5 * scale
    );
    ctx.stroke();

    // Right forward crescent '(' kissing at waist with subtle exit flick
    ctx.beginPath();
    ctx.moveTo(x + w - 0.5 * scale, topY + 0.5 * scale);
    ctx.bezierCurveTo(
      touchX - 1.5 * scale, topY - 0.5 * scale,
      touchX - 1.2 * scale, botY + 0.5 * scale,
      x + w, botY - 1.2 * scale
    );
    ctx.stroke();

    ctx.restore();
    return w + 3.5 * scale;
  }

  /**
   * Hand-sketched supralinear insertion caret '^' at baseline.
   */
  public drawCaretMark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11 * scale;
    const h = 8 * scale;
    const baseY = y + 3 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.1, 1.45 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w * 0.5 + (this.noise.random() - 0.5) * 1.2, baseY - h);
    ctx.lineTo(x + w, baseY + (this.noise.random() - 0.5) * 1.2);
    ctx.stroke();
    ctx.restore();

    return w + 3 * scale;
  }
}
