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
  const advance = glyph.advanceWidth ? (glyph.advanceWidth * fontSize) / font.unitsPerEm : fontSize * 0.25;
  // Authentic ballpoint stroke width ranges between 2.1px and 2.8px at fontSize 27
  return Math.max(2.1, Math.min(2.8, advance * 0.35));
}

export class MathRenderer {
  private noise: SeededNoise;
  private calibratedLineWidth = 2.4;

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
   * Procedural Imperfect Equals (=)
   * Top and bottom bars differ in length by ±15%, vertical gap by ±1.5px, and relative tilt by ±2.5°.
   */
  public drawImperfectEquals(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const baseWidth = 14 * scale;
    const barGap = (5.5 + (this.noise.random() - 0.5) * 2.5) * scale;
    const lineWidth = this.getBaseLineWidth(scale, 0.95);

    // Varied lengths
    const len1 = baseWidth * (0.85 + this.noise.random() * 0.30);
    const len2 = baseWidth * (0.85 + this.noise.random() * 0.30);

    // Tilt variance
    const tilt1 = ((this.noise.random() - 0.5) * 4.5 * Math.PI) / 180;
    const tilt2 = ((this.noise.random() - 0.5) * 4.5 * Math.PI) / 180;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    const yTop = y - fontSize * 0.35 - barGap * 0.5;
    const yBottom = y - fontSize * 0.35 + barGap * 0.5;

    // Top stroke with organic parabolic bow
    const midBow1 = (this.noise.random() - 0.5) * 1.6 * scale;
    const midBow2 = (this.noise.random() - 0.5) * 1.6 * scale;

    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.quadraticCurveTo(x + len1 * 0.5, yTop + midBow1, x + Math.cos(tilt1) * len1, yTop + Math.sin(tilt1) * len1);
    ctx.stroke();

    // Bottom stroke with organic bow and independent start jitter
    const startOffset = (this.noise.random() - 0.5) * 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + startOffset, yBottom);
    ctx.quadraticCurveTo(
      x + startOffset + len2 * 0.5,
      yBottom + midBow2,
      x + startOffset + Math.cos(tilt2) * len2,
      yBottom + Math.sin(tilt2) * len2
    );
    ctx.stroke();

    ctx.restore();

    return Math.max(len1, len2) + 6 * scale;
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
   * Fluid organic loop with crossed right tail.
   */
  public drawAlpha(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12.0 * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // Starts top-right tail, sweeps down-left into oval loop, crosses self, and terminates bottom-right
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
    const w = 10.5 * scale;
    const barY = y - fontSize * 0.40;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Horizontal crossbar with subtle student slant
    ctx.beginPath();
    ctx.moveTo(x + 0.5 * scale, barY);
    ctx.quadraticCurveTo(x + w * 0.5, barY - 1.0 * scale, x + w, barY + 0.5 * scale);
    ctx.stroke();

    // 2. Downward stem with subtle rightward foot hook
    ctx.beginPath();
    ctx.moveTo(x + w * 0.45, barY);
    ctx.lineTo(x + w * 0.45, bottomY - 3.5 * scale);
    ctx.quadraticCurveTo(x + w * 0.48, bottomY, x + w * 0.82, bottomY - 0.5 * scale);
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
    const w = 11.0 * scale;
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
    ctx.lineTo(x + w * 0.78, midY + (this.noise.random() - 0.5) * 0.6 * scale);
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
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.68;
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
    ctx.moveTo(x + w * 0.55, topY);
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
      x + w * 0.55, topY
    );
    ctx.stroke();

    // Horizontal crossbar through center with natural pen wiggle
    ctx.beginPath();
    const barY = centerY + (this.noise.random() - 0.5) * 1.0 * scale;
    ctx.moveTo(leftX + 0.8 * scale, barY);
    ctx.quadraticCurveTo(
      x + w * 0.5, barY - 1.2 * scale,
      rightX - 0.5 * scale, barY + 0.6 * scale
    );
    ctx.stroke();

    ctx.restore();
    return w + 4.5 * scale;
  }

  /**
   * Procedural Lowercase Greek Pi (π):
   * Top undulating crossbar with dual downward legs and right foot curl.
   */
  public drawPi(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12.0 * scale;
    const barY = y - fontSize * 0.42;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Horizontal top bar with left hook/wave
    ctx.beginPath();
    ctx.moveTo(x + 0.5 * scale, barY + 1.2 * scale);
    ctx.quadraticCurveTo(x + 2.5 * scale, barY - 1.0 * scale, x + w * 0.5, barY);
    ctx.lineTo(x + w + 1.0 * scale, barY + 0.5 * scale);
    ctx.stroke();

    // 2. Left downward leg (slight outward curve)
    ctx.beginPath();
    ctx.moveTo(x + w * 0.28, barY + 0.5 * scale);
    ctx.quadraticCurveTo(x + w * 0.24, y - fontSize * 0.20, x + w * 0.20, bottomY);
    ctx.stroke();

    // 3. Right downward leg with rightward foot hook
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, barY + 0.5 * scale);
    ctx.lineTo(x + w * 0.72, bottomY - 2.5 * scale);
    ctx.quadraticCurveTo(x + w * 0.75, bottomY, x + w * 0.96, bottomY - 0.5 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 4.5 * scale;
  }

  /**
   * Procedural Lowercase Greek Beta (β):
   * Long descending left stem with double curved loops.
   */
  public drawBeta(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.68;
    const midY = y - fontSize * 0.32;
    const bottomY = y;
    const descY = y + fontSize * 0.22;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Descending stem up to top loop
    ctx.beginPath();
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
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Lambda (λ):
   * Diagonal spine with secondary forward leg.
   */
  public drawLambda(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.68;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main diagonal spine with slight top hook
    ctx.beginPath();
    ctx.moveTo(x + w * 0.55, topY);
    ctx.quadraticCurveTo(x + w * 0.50, topY + 3 * scale, x + w * 0.40, y - fontSize * 0.35);
    ctx.lineTo(x + 1.0 * scale, bottomY);
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
   * Central oval with continuous vertical dividing stem.
   */
  public drawPhi(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const stemTopY = y - fontSize * 0.65;
    const stemBotY = y + fontSize * 0.22;
    const loopTopY = y - fontSize * 0.44;
    const loopBotY = y - fontSize * 0.02;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Oval body
    ctx.beginPath();
    ctx.ellipse(
      x + w * 0.50,
      (loopTopY + loopBotY) / 2,
      w * 0.42,
      (loopBotY - loopTopY) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Vertical stem
    ctx.beginPath();
    ctx.moveTo(x + w * 0.52, stemTopY);
    ctx.lineTo(x + w * 0.48, stemBotY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Omega (ω):
   * Curved double bowl with outward shoulder wings.
   */
  public drawOmega(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12.5 * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x + 0.5 * scale, topY + 4 * scale);
    ctx.quadraticCurveTo(x + w * 0.15, topY - 1 * scale, x + w * 0.28, bottomY - 1 * scale);
    ctx.quadraticCurveTo(x + w * 0.40, bottomY + 1 * scale, x + w * 0.50, topY + 3 * scale);
    ctx.quadraticCurveTo(x + w * 0.60, bottomY + 1 * scale, x + w * 0.72, bottomY - 1 * scale);
    ctx.quadraticCurveTo(x + w * 0.85, topY - 1 * scale, x + w, topY + 4 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Mu (μ):
   * Descending left tail with rounded u-body.
   */
  public drawMu(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;
    const descY = y + fontSize * 0.22;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x + w * 0.18, descY);
    ctx.lineTo(x + w * 0.18, topY);
    ctx.quadraticCurveTo(x + w * 0.20, bottomY, x + w * 0.55, bottomY);
    ctx.lineTo(x + w * 0.80, topY);
    ctx.lineTo(x + w * 0.80, bottomY);
    ctx.stroke();

    ctx.restore();
    return w + 4 * scale;
  }

  /**
   * Procedural Lowercase Greek Sigma (σ):
   * Circular body with horizontal top flag.
   */
  public drawSigma(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 11.5 * scale;
    const topY = y - fontSize * 0.40;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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

  public drawPartial(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 12 * scale;
    const topY = y - fontSize * 0.65;
    const bottomY = y;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Top curl
    ctx.moveTo(x + w * 0.85, topY + 2 * scale);
    ctx.bezierCurveTo(x + w * 0.6, topY - 2 * scale, x + w * 0.1, topY + 4 * scale, x + w * 0.15, topY + (bottomY - topY) * 0.5);
    // Lower bowl
    ctx.bezierCurveTo(x + w * 0.05, bottomY + 2 * scale, x + w * 0.85, bottomY + 2 * scale, x + w * 0.85, topY + (bottomY - topY) * 0.45);
    ctx.bezierCurveTo(x + w * 0.85, topY, x + w * 0.25, topY + (bottomY - topY) * 0.5, x + w * 0.15, bottomY - 3 * scale);
    ctx.stroke();

    ctx.restore();
    return w + 6 * scale;
  }

  public drawInfinity(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fontSize: number,
    inkColor: string
  ): number {
    const scale = fontSize / 28;
    const w = 18 * scale;
    const centerY = y - fontSize * 0.35;
    const h = 7 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
    ctx.lineCap = 'round';

    const cx = x + w * 0.5;
    ctx.beginPath();
    // Left loop (slightly smaller)
    ctx.moveTo(cx, centerY);
    ctx.bezierCurveTo(cx - w * 0.25, centerY - h, x - 1 * scale, centerY - h * 0.7, x, centerY);
    ctx.bezierCurveTo(x - 1 * scale, centerY + h * 0.7, cx - w * 0.25, centerY + h, cx, centerY);
    // Right loop (slightly larger + asymmetric hand slant)
    ctx.bezierCurveTo(cx + w * 0.25, centerY - h * 1.08, x + w + 1 * scale, centerY - h * 0.9, x + w, centerY);
    ctx.bezierCurveTo(x + w + 1 * scale, centerY + h * 0.9, cx + w * 0.25, centerY + h * 1.08, cx, centerY);
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
    wobbleAmount = 1.8,
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
    const segments = Math.max(3, Math.min(10, Math.floor(totalLen / 45)));

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

      // Perpendicular wobble
      const wobble = (this.noise.random() - 0.5) * wobbleAmount;
      const px = baseX - sin * wobble;
      const py = baseY + cos * wobble;

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
   * Replaces CAD rectilinear 90° corners with authentic continuous hand gesture:
   * Curved entry cap, gently bowed stem (±1.2px), and rounded bottom corner with human overshoot.
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
    const height = bottomY - topY;
    const capW = (7.5 + (this.noise.random() - 0.5) * 1.5) * scale;
    const dir = isOpen ? 1 : -1;
    const startX = isOpen ? x + capW : x;
    const stemX = isOpen ? x + 1.2 * scale : x + capW - 1.2 * scale;
    const endX = isOpen ? x + capW : x;
    const lineWidth = this.getBaseLineWidth(scale, 0.95);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.90;

    ctx.beginPath();
    // 1. Top cap with organic entry dip
    ctx.moveTo(startX, topY + (this.noise.random() - 0.5) * 1.5 * scale);
    ctx.quadraticCurveTo(
      stemX + dir * 1.5 * scale, topY - 0.5 * scale,
      stemX, topY + 4 * scale
    );
    // 2. Continuous bowed stem down (subtle inward/outward curve)
    ctx.bezierCurveTo(
      stemX - dir * 1.2 * scale, topY + height * 0.35,
      stemX - dir * 0.8 * scale, bottomY - height * 0.35,
      stemX, bottomY - 4 * scale
    );
    // 3. Continuous rounded corner into bottom cap with human overshoot
    const overshoot = (1.8 + this.noise.random() * 2.5) * scale;
    ctx.quadraticCurveTo(
      stemX + dir * 1.5 * scale, bottomY + 0.5 * scale,
      endX + dir * overshoot, bottomY + (this.noise.random() - 0.5) * 1.5 * scale
    );
    ctx.stroke();
    ctx.restore();

    return capW + 6 * scale;
  }

  /**
   * Procedural Curly Braces { }
   * Replaces symmetric mirror halves with authentic human lobe asymmetry:
   * Shorter top lobe (45% height), downward-angled center beak (-10°), longer bottom lobe (55%).
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
    const braceW = (7.5 + (this.noise.random() - 0.5) * 1.5) * scale;
    const totalH = bottomY - topY;
    // Asymmetric lobes: Top lobe is 45% of height, bottom lobe is 55%
    const cuspY = topY + totalH * 0.45;
    const cuspX = isOpen ? x : x + braceW;
    const outerX = isOpen ? x + braceW : x;
    const lineWidth = this.getBaseLineWidth(scale, 0.95);

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.90;

    ctx.beginPath();
    if (isOpen) {
      // { Starts top right, tighter top lobe, downward beak at cusp, longer bottom lobe
      ctx.moveTo(outerX, topY + (this.noise.random() - 0.5) * 1.5 * scale);
      ctx.quadraticCurveTo(x + braceW * 0.25, topY + 1 * scale, x + braceW * 0.28, topY + totalH * 0.22);
      ctx.bezierCurveTo(x + braceW * 0.28, cuspY - 3 * scale, x + braceW * 0.10, cuspY - 1 * scale, cuspX, cuspY);
      ctx.bezierCurveTo(x + braceW * 0.10, cuspY + 2 * scale, x + braceW * 0.25, cuspY + 5 * scale, x + braceW * 0.25, topY + totalH * 0.75);
      ctx.quadraticCurveTo(x + braceW * 0.22, bottomY - 1 * scale, outerX + 1.5 * scale, bottomY + (this.noise.random() - 0.5) * 1.5 * scale);
    } else {
      // } Starts top left, tighter top lobe, outward beak at cusp, longer bottom lobe terminating in flick
      ctx.moveTo(outerX, topY + (this.noise.random() - 0.5) * 1.5 * scale);
      ctx.quadraticCurveTo(x + braceW * 0.75, topY + 1 * scale, x + braceW * 0.72, topY + totalH * 0.22);
      ctx.bezierCurveTo(x + braceW * 0.72, cuspY - 3 * scale, x + braceW * 0.90, cuspY - 1 * scale, cuspX, cuspY);
      ctx.bezierCurveTo(x + braceW * 0.90, cuspY + 2 * scale, x + braceW * 0.75, cuspY + 5 * scale, x + braceW * 0.75, topY + totalH * 0.75);
      ctx.quadraticCurveTo(x + braceW * 0.78, bottomY - 1 * scale, outerX - 1.5 * scale, bottomY + (this.noise.random() - 0.5) * 1.5 * scale);
    }
    ctx.stroke();
    ctx.restore();

    return braceW + 6 * scale;
  }

  /**
   * Procedural Absolute Value Bar |
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
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 2 * scale, topY);
    ctx.lineTo(x + 2 * scale, bottomY);
    ctx.stroke();
    ctx.restore();
    return 6 * scale;
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
    ctx.lineWidth = Math.max(1.3, 1.7 * scale);
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
   * Procedural Hand Bullet (-) or scrawled tiny hollow loop (instead of typographical •)
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
    ctx.lineWidth = Math.max(1.2, 1.6 * scale);
    ctx.lineCap = 'round';

    const centerY = y - fontSize * 0.32;

    if (roll < 0.70) {
      // 70% Hand-sketched horizontal bullet dash (-)
      const dashLen = (9.0 + this.noise.random() * 4.0) * scale;
      const wobble = (this.noise.random() - 0.5) * 1.2 * scale;
      ctx.beginPath();
      ctx.moveTo(x + 2 * scale, centerY + wobble);
      ctx.lineTo(x + 2 * scale + dashLen, centerY - wobble);
      ctx.stroke();
      ctx.restore();
      return dashLen + 8 * scale;
    } else {
      // 30% Solid organic student pen tap/dot (not a hollow typographical circle)
      const r = (1.8 + this.noise.random() * 0.8) * scale;
      ctx.beginPath();
      ctx.arc(x + 4 * scale, centerY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return r * 2 + 8 * scale;
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
   * Top hook with ink pooling, fast thin sweep, teardrop bottom.
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
    const height = fontSize * (spanLines > 1 ? 1.7 * spanLines : 1.35);
    const topY = baselineY - height * 0.78;
    const bottomY = baselineY + height * 0.28;
    const hookRadius = 5.5 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineCap = 'round';

    // Hook top with heavier pooling
    ctx.lineWidth = Math.max(1.8, 2.4 * scale);
    ctx.beginPath();
    ctx.arc(x + hookRadius, topY + hookRadius, hookRadius, Math.PI, Math.PI * 1.8, false);
    ctx.stroke();

    // Fast thin vertical diagonal sweep
    ctx.lineWidth = Math.max(1.2, 1.5 * scale);
    ctx.beginPath();
    ctx.moveTo(x + hookRadius + Math.cos(Math.PI * 1.8) * hookRadius, topY + hookRadius + Math.sin(Math.PI * 1.8) * hookRadius);
    ctx.bezierCurveTo(
      x + hookRadius * 0.5,
      topY + height * 0.3,
      x - hookRadius * 0.2,
      bottomY - height * 0.3,
      x - hookRadius * 0.3,
      bottomY - hookRadius
    );
    ctx.stroke();

    // Bottom hook
    ctx.lineWidth = Math.max(1.8, 2.4 * scale);
    ctx.beginPath();
    ctx.arc(x - hookRadius * 0.3 - hookRadius, bottomY - hookRadius, hookRadius, 0, Math.PI * 0.8, false);
    ctx.stroke();

    ctx.restore();
    return hookRadius * 2.5 + 4 * scale;
  }

  /**
   * Procedural Square Root (\sqrt{...})
   * Checkmark entry, upward slant, vertical drop, hand-drawn vinculum top bar with slight upward bow or overshoot.
   */
  public drawSquareRoot(
    ctx: CanvasRenderingContext2D,
    roughCanvas: ReturnType<typeof rough.canvas>,
    x: number,
    baselineY: number,
    contentWidth: number,
    contentHeight: number,
    fontSize: number,
    inkColor: string
  ): { innerX: number; totalWidth: number } {
    const scale = fontSize / 28;
    const rootCheckWidth = 14 * scale;
    const totalHeight = Math.max(fontSize * 1.1, contentHeight + 8 * scale);
    const topY = baselineY - totalHeight + 4 * scale;
    const bottomY = baselineY + 2 * scale;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = this.getBaseLineWidth(scale, 0.95);
    ctx.lineCap = 'round';

    // 1. Entry flick
    ctx.beginPath();
    ctx.moveTo(x, baselineY - totalHeight * 0.4);
    ctx.lineTo(x + 4 * scale, baselineY - totalHeight * 0.2);
    // 2. Downward dip
    ctx.lineTo(x + 7 * scale, bottomY);
    // 3. Upward vertical/slant stem
    ctx.lineTo(x + rootCheckWidth, topY);
    ctx.stroke();

    // 4. Horizontal vinculum top bar with slight bow and overshoot
    const overshoot = (4 + this.noise.random() * 5) * scale;
    const vinculumEnd = x + rootCheckWidth + contentWidth + overshoot;
    const bowY = (this.noise.random() - 0.5) * 2.5 * scale;

    ctx.beginPath();
    ctx.moveTo(x + rootCheckWidth, topY);
    ctx.quadraticCurveTo(
      x + rootCheckWidth + (contentWidth + overshoot) * 0.5,
      topY - bowY,
      vinculumEnd,
      topY + (this.noise.random() - 0.5) * 2 * scale
    );
    ctx.stroke();

    // Tiny downward terminal tick at the end of vinculum (typical human math habit)
    ctx.beginPath();
    ctx.moveTo(vinculumEnd, topY);
    ctx.lineTo(vinculumEnd, topY + 3.5 * scale);
    ctx.stroke();

    ctx.restore();

    return {
      innerX: x + rootCheckWidth + 3 * scale,
      totalWidth: rootCheckWidth + contentWidth + overshoot + 4 * scale,
    };
  }

  /**
   * Procedural Authentic Handwritten Fraction Bar:
   * Replaces CAD/RoughJS straight lines with a multi-point biomechanical pen stroke:
   * - Natural wrist sag / bow in mid-span: y_mid += 0.8px - 1.8px
   * - Organic tilt: -1.2° to +1.5°
   * - Natural neuromuscular micro-tremor (5-point Bezier curve)
   * - Dual-pass ballpoint ink feathering (soft fiber edge + downward pressure wall)
   * - Asymmetric overshoot at entry and exit
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
    // Asymmetric human overshoots: entry is 3-6px, exit is 4-8px
    const overshootLeft = (3.5 + this.noise.random() * 3.0) * scale;
    const overshootRight = (4.0 + this.noise.random() * 4.5) * scale;
    const startX = x - overshootLeft;
    const endX = x + width + overshootRight;
    const totalLen = endX - startX;

    // Length-proportional slope (-1.6° to +2.2°) with human hand pivot
    const slopeDeg = -1.5 + this.noise.random() * 3.4;
    const slopeRad = (slopeDeg * Math.PI) / 180;
    const tiltOffset = Math.tan(slopeRad) * totalLen;
    const startY = y - tiltOffset * 0.35;
    const endY = y + tiltOffset * 0.65;

    // Optical stroke weight calibrated directly to custom font stem thickness
    const baseLineWidth = this.getBaseLineWidth(scale, 1.05);

    // 16-step velocity-tapered curve with ink paste starvation
    const steps = 16;
    let prevX = startX;
    let prevY = startY;

    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = inkColor;
    ctx.shadowBlur = 0.40;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const curX = startX + totalLen * t;
      // Parabolic wrist sag: dips 1.3px in center + neuromuscular micro-tremor
      const sagY = Math.sin(Math.PI * t) * 1.35 * scale;
      const tremor = (this.noise.random() - 0.5) * 0.8 * scale;
      const curY = startY + (endY - startY) * t + sagY + tremor;

      // Fast sweep thins out by 25% in the middle 60% of the stroke
      const speedFactor = 1.0 - Math.sin(Math.PI * t) * 0.25;
      ctx.lineWidth = baseLineWidth * speedFactor;
      ctx.globalAlpha = 0.90 - Math.sin(Math.PI * t) * 0.16; // lighter in middle

      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(curX, curY);
      ctx.stroke();

      prevX = curX;
      prevY = curY;
    }
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

    // Default 'box': Hand-drawn rectangle with roughjs and overshooting corners
    const pad = 8;
    const rx = x - pad;
    const ry = y - pad;
    const rw = width + pad * 2;
    const rh = height + pad * 2;

    roughCanvas.rectangle(rx, ry, rw, rh, {
      stroke: inkColor,
      strokeWidth: 1.8,
      roughness: 0.85,
      bowing: 0.7,
    });

    if (showCheckmark) {
      this.drawCheckmark(ctx, rx + rw + 10, ry + rh * 0.65, fontSize * 0.85, inkColor);
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
}
