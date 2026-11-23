import { PaperScanSettings, PaperTemplateId, ScanFilter } from '../types';
import { SeededNoise } from './noise';

export function getPaperRuleOriginY(template: PaperTemplateId, topMargin: number): number {
  return template === 'exam-booklet' ? topMargin + 44 : topMargin;
}

export class InkAndScanPipeline {
  private noise: SeededNoise;
  private scratchCanvas: HTMLCanvasElement | null = null;
  private cornerSrcCanvas: HTMLCanvasElement | null = null;
  private cornerBlurCanvas: HTMLCanvasElement | null = null;

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  private getScratchCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas');
    }
    if (this.scratchCanvas.width !== width || this.scratchCanvas.height !== height) {
      this.scratchCanvas.width = width;
      this.scratchCanvas.height = height;
    }
    return this.scratchCanvas;
  }

  private getCornerSrcCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.cornerSrcCanvas) {
      this.cornerSrcCanvas = document.createElement('canvas');
    }
    if (this.cornerSrcCanvas.width !== width || this.cornerSrcCanvas.height !== height) {
      this.cornerSrcCanvas.width = width;
      this.cornerSrcCanvas.height = height;
    }
    return this.cornerSrcCanvas;
  }

  private getCornerBlurCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.cornerBlurCanvas) {
      this.cornerBlurCanvas = document.createElement('canvas');
    }
    if (this.cornerBlurCanvas.width !== width || this.cornerBlurCanvas.height !== height) {
      this.cornerBlurCanvas.width = width;
      this.cornerBlurCanvas.height = height;
    }
    return this.cornerBlurCanvas;
  }

  /**
   * Draws realistic college notebook paper backgrounds.
   */
  public renderPaperBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    paper: PaperScanSettings,
    pageIndex: number,
    lineHeight: number,
    topMargin: number,
    penColor?: string,
    fontFamily?: string
  ) {
    ctx.save();

    // Base paper colors with organic per-page camera auto-exposure and white-balance shifts
    const pageHueMod = Math.sin(pageIndex * 2.3) * 1.5;
    const pageExpMod = Math.cos(pageIndex * 1.7) * 1.5;

    let baseColor = '#fcfbf8'; // soft warm ivory
    if (paper.template === 'unruled-bond') baseColor = '#fbfbf9';
    if (paper.template === 'engineering-graph') baseColor = '#fafcfe';
    if (paper.template === 'exam-booklet') baseColor = '#fdfcf7';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle per-page sensor exposure and lighting micro-shift across the sheet
    const pageTintAlpha = 0.012 + Math.abs(Math.sin(pageIndex * 3.1)) * 0.015;
    const isSlightlyCooler = Math.sin(pageIndex * 4.7) > 0.3;
    ctx.fillStyle = isSlightlyCooler
      ? `rgba(235, 240, 248, ${pageTintAlpha})`
      : `rgba(250, 242, 230, ${pageTintAlpha})`;
    ctx.fillRect(0, 0, width, height);

    // Warmth / vintage aging tint
    if (paper.paperWarmth && paper.paperWarmth > 0) {
      const pageWarmthJitter = (Math.sin(pageIndex * 2.8) * 0.04);
      const effectiveWarmth = Math.max(0, paper.paperWarmth + pageWarmthJitter);
      ctx.fillStyle = `rgba(235, 205, 145, ${Math.min(0.42, effectiveWarmth * 0.32)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle paper grain fibers
    if (paper.showPaperTexture) {
      this.drawPaperTextureFibers(ctx, width, height, pageIndex);
    }

    // Template specific ruling lines & margins
    if (paper.template === 'indian-ruled') {
      this.drawIndianCollegeRuled(ctx, width, height, lineHeight, topMargin, pageIndex, paper, penColor, fontFamily);
    } else if (paper.template === 'engineering-graph') {
      this.drawEngineeringGraph(ctx, width, height);
    } else if (paper.template === 'exam-booklet') {
      this.drawExamBooklet(ctx, width, height, lineHeight, topMargin, pageIndex, paper);
    }

    // Spiral notebook punch holes on left margin (default true for unruled-bond, or if explicitly enabled)
    const shouldDrawSpiral = paper.spiralHoles ?? (paper.template === 'unruled-bond');
    if (shouldDrawSpiral) {
      this.drawSpiralNotebookHoles(ctx, width, height, pageIndex);
    }

    if (paper.template === 'unruled-bond' && paper.showMarginGuides) {
      ctx.strokeStyle = 'rgba(180, 180, 190, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(140, 0);
      ctx.lineTo(140, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Procedural coffee mug rings, inner wash, and liquid drip droplets.
   */
  public drawCoffeeStain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    seed: number,
    intensity: number = 1.0
  ) {
    if (intensity <= 0) return;
    ctx.save();

    // Deterministic placement on top-right or bottom-right corner
    const rand = (s: string) => {
      let h = 0;
      const str = `${seed}-${s}`;
      for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
      return Math.abs(Math.sin(h) * 10000) % 1;
    };

    const posX = width - 180 + (rand('x') - 0.5) * 80;
    const posY = 180 + (rand('y') - 0.5) * 80;
    const radius = 65 + rand('r') * 20;

    ctx.translate(posX, posY);
    ctx.rotate(rand('rot') * Math.PI * 2);

    // Composite multiply for realistic ink/paper absorption
    ctx.globalCompositeOperation = 'multiply';

    // 1. Outer coffee ring (darker perimeter where liquid pooled)
    ctx.strokeStyle = `rgba(110, 68, 30, ${0.14 * intensity})`;
    ctx.lineWidth = 4 + rand('w') * 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * (0.92 + rand('e') * 0.1), 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Faint inner liquid wash
    ctx.fillStyle = `rgba(130, 85, 45, ${0.03 * intensity})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius - 2, radius * 0.92 - 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. One or two accidental drip droplets
    for (let i = 0; i < 2; i++) {
      const dropAngle = rand(`drop-a-${i}`) * Math.PI * 2;
      const dropDist = radius + 15 + rand(`drop-d-${i}`) * 25;
      const dx = Math.cos(dropAngle) * dropDist;
      const dy = Math.sin(dropAngle) * dropDist;
      const dropR = 2 + rand(`drop-r-${i}`) * 2.5;

      ctx.fillStyle = `rgba(105, 65, 28, ${0.12 * intensity})`;
      ctx.beginPath();
      ctx.arc(dx, dy, dropR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Authentic chisel-tip fluorescent/pastel highlighter stroke with realistic
   * angle bevel, pooling lift marks, and semi-transparent paper absorption.
   */
  public drawHighlighterStroke(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    colorMode: 'yellow' | 'green' | 'cyan' | 'pink' = 'yellow'
  ) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    let colorRgba = 'rgba(255, 230, 40, 0.55)'; // vibrant fluorescent study yellow
    if (colorMode === 'green') colorRgba = 'rgba(80, 230, 120, 0.50)';
    if (colorMode === 'cyan') colorRgba = 'rgba(60, 210, 255, 0.50)';
    if (colorMode === 'pink') colorRgba = 'rgba(255, 100, 180, 0.48)';

    ctx.fillStyle = colorRgba;

    // Organic chisel marker path with slightly angled start and end edges
    const slant = 4;
    const startX = x - 6;
    const endX = x + w + 8;
    const topY = y - 2;
    const bottomY = y + h + 2;

    ctx.beginPath();
    ctx.moveTo(startX + slant, topY);
    ctx.lineTo(endX + slant, topY + 0.8);
    ctx.quadraticCurveTo(endX + slant + 2, (topY + bottomY) / 2, endX, bottomY);
    ctx.lineTo(startX, bottomY - 0.8);
    ctx.quadraticCurveTo(startX - 2, (topY + bottomY) / 2, startX + slant, topY);
    ctx.closePath();
    ctx.fill();

    // Subtle end lift pooling (darker ink where the chisel tip rested or lifted)
    ctx.fillStyle = colorRgba.replace(/[\d\.]+\)$/, '0.35)');
    ctx.beginPath();
    ctx.ellipse(endX - 2, (topY + bottomY) / 2, 4, Math.max(3, h * 0.35), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Indian College Ruled A4 Sheet:
   * - Light blue horizontal ruling lines (~32px line height)
   * - Double red vertical margin line at left (e.g. at x=150 and x=156)
   * - Preprinted Header Box at top right: "Date: _____" and "Page No: _____"
   */
  private drawIndianCollegeRuled(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lineHeight: number,
    topMargin: number,
    pageIndex: number,
    paper: PaperScanSettings,
    penColor?: string,
    fontFamily?: string
  ) {
    const pageMarginDrift = (Math.sin((pageIndex + 1) * 7.13 + 1.2) * 4.2) + (Math.cos((pageIndex + 1) * 4.31) * 2.8);
    const leftMarginX1 = 150 + pageMarginDrift;
    const leftMarginX2 = 156 + pageMarginDrift;

    // 1. Horizontal ruling lines (College Blue)
    ctx.strokeStyle = '#adc9e8'; // Clean notebook blue
    ctx.lineWidth = 1.1;

    let currY = topMargin;
    while (currY < height - 60) {
      ctx.beginPath();
      ctx.moveTo(0, currY);
      ctx.lineTo(width, currY);
      ctx.stroke();
      currY += lineHeight;
    }

    // 2. Double Red vertical margin lines
    ctx.strokeStyle = '#f28b82'; // Notebook margin red
    ctx.lineWidth = 1.2;

    // Line 1
    ctx.beginPath();
    ctx.moveTo(leftMarginX1, 0);
    ctx.lineTo(leftMarginX1, height);
    ctx.stroke();

    // Line 2
    ctx.beginPath();
    ctx.moveTo(leftMarginX2, 0);
    ctx.lineTo(leftMarginX2, height);
    ctx.stroke();

    // 3. Top Header Box (Date & Page No)
    const headerBoxX = width - 260;
    const headerBoxY = 28;
    const headerBoxW = 220;
    const headerBoxH = 68;

    ctx.strokeStyle = '#f28b82';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(headerBoxX, headerBoxY, headerBoxW, headerBoxH);

    // Dividing line inside header box
    ctx.beginPath();
    ctx.moveTo(headerBoxX, headerBoxY + headerBoxH * 0.5);
    ctx.lineTo(headerBoxX + headerBoxW, headerBoxY + headerBoxH * 0.5);
    ctx.stroke();

    // Preprinted Labels
    ctx.fillStyle = '#a33a3a';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText('Page No:', headerBoxX + 12, headerBoxY + 22);
    ctx.fillText('Date:', headerBoxX + 12, headerBoxY + 56);

    // Handwritten-style page number and date inside header box
    ctx.fillStyle = penColor || '#1b3b8c';
    const activeFamily = fontFamily ? `${fontFamily}, Caveat, cursive` : 'Caveat, cursive';
    ctx.font = `bold 16px ${activeFamily}`;
    ctx.fillText(`${pageIndex + 1}`, headerBoxX + 90, headerBoxY + 23);
    const dateDisplay = paper.dateStr || new Date().toISOString().slice(0, 10);
    ctx.fillText(dateDisplay, headerBoxX + 70, headerBoxY + 57);

    // Hole punches or spiral perforations on far left
    ctx.fillStyle = '#e8e5dc';
    for (let py = 120; py < height; py += 300) {
      ctx.beginPath();
      ctx.arc(28, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d5d0c2';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * Engineering 5mm Graph Paper
   */
  private drawEngineeringGraph(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gridMajor = 60;
    const gridMinor = 12;

    // Minor grid lines
    ctx.strokeStyle = 'rgba(74, 182, 206, 0.20)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 0; x < width; x += gridMinor) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridMinor) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Major grid lines
    ctx.strokeStyle = 'rgba(34, 140, 166, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = 0; x < width; x += gridMajor) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridMajor) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Engineering header border
    ctx.strokeStyle = '#1e6b80';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(30, 30, width - 60, height - 60);
  }

  /**
   * University Exam Booklet Sheet
   */
  private drawExamBooklet(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    lineHeight: number,
    topMargin: number,
    pageIndex: number,
    paper: PaperScanSettings
  ) {
    // Exam header banner
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 30, width - 120, 80);

    ctx.fillStyle = '#2d3748';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillText('UNIVERSITY EXAMINATION / CONTINUOUS EVALUATION', 80, 55);

    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillText(`Student: ${paper.studentName || 'STEM Scholar'}`, 80, 80);
    ctx.fillText(`Course/Subject: ${paper.assignmentTitle || 'Advanced STEM Derivation'}`, 80, 98);
    ctx.fillText(`Page: ${pageIndex + 1}`, width - 180, 80);

    // Ruling lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    const ruleOriginY = topMargin + 44;
    let currY = ruleOriginY;
    while (currY < height - 60) {
      ctx.beginPath();
      ctx.moveTo(60, currY);
      ctx.lineTo(width - 60, currY);
      ctx.stroke();
      currY += lineHeight;
    }

    // Left margin line
    ctx.strokeStyle = '#e53e3e';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(130, ruleOriginY);
    ctx.lineTo(130, height - 60);
    ctx.stroke();
  }

  /**
   * Realistic Spiral Notebook Margin:
   * - Punched holes along left margin with per-page vertical offset and mechanical punch jitter
   * - Helical metal binder coil rings with natural pitch angle, wire gauge reflection, and loop curve variation
   * - Visible layered under-sheets and dark binder backing showing through holes
   * - Paper cut thickness rim highlights and soft inner shadow
   * - Subtle micro-perforation tear guide line with organic dash phase
   */
  private drawSpiralNotebookHoles(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number,
    _pageIndex: number = 0
  ) {
    ctx.save();

    // 1. Organic per-page margin and vertical registration drift
    // In real spiral notebooks, individual sheets have ±2-4px horizontal alignment drift
    // and ±4-10px vertical registration offset along the coil axis.
    const baseHoleX = 46 + (this.noise.random() - 0.48) * 5;
    const baseRadius = 8.4 + (this.noise.random() - 0.5) * 0.7;
    const startY = 66 + (this.noise.random() - 0.45) * 12;
    const endY = height - 60;
    const pitch = 45 + (this.noise.random() - 0.5) * 0.8;

    // 2. Subtle micro-perforation line down the margin (tear guide)
    const perfX = baseHoleX + 36 + (this.noise.random() - 0.5) * 2.5;
    const dashPhase = (this.noise.random() * 8);
    ctx.save();
    ctx.strokeStyle = 'rgba(170, 175, 190, 0.32)';
    ctx.lineWidth = 0.85;
    ctx.lineCap = 'butt';
    ctx.setLineDash([2.2, 5.0]);
    ctx.lineDashOffset = dashPhase;
    ctx.beginPath();
    ctx.moveTo(perfX, 25);
    ctx.lineTo(perfX, height - 25);
    ctx.stroke();
    ctx.restore();

    // 3. Punched holes & metal spiral helical coils
    let holeIndex = 0;
    for (let y = startY; y <= endY; y += pitch) {
      holeIndex++;
      // Mechanical punch jitter per hole
      const jx = (this.noise.random() - 0.5) * 1.1;
      const jy = (this.noise.random() - 0.5) * 1.2;
      const hx = baseHoleX + jx;
      const hy = y + jy;
      const hr = baseRadius + (this.noise.random() - 0.5) * 0.4;

      // 3.1. Layered under-page edge showing through punched hole
      // Sheets beneath are slightly misaligned by ~1-3px, showing white/ivory crescent of under-sheets
      ctx.fillStyle = '#1c1f24'; // deep dark desk/binder backing
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();

      // Subtle under-page crescent highlight inside hole
      const underPageOffset = 1.2 + (this.noise.random() - 0.5) * 0.8;
      ctx.fillStyle = 'rgba(238, 235, 226, 0.45)';
      ctx.beginPath();
      ctx.arc(hx - underPageOffset, hy + 0.8, hr * 0.92, 0.6 * Math.PI, 1.4 * Math.PI);
      ctx.arc(hx, hy, hr * 0.84, 1.4 * Math.PI, 0.6 * Math.PI, true);
      ctx.fill();

      // 3.2. Soft inner drop-shadow at top-left inside hole
      const innerShadow = ctx.createRadialGradient(
        hx - 2.5,
        hy - 2.5,
        hr * 0.15,
        hx,
        hy,
        hr
      );
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      innerShadow.addColorStop(0.65, 'rgba(15, 18, 22, 0.42)');
      innerShadow.addColorStop(1, 'rgba(28, 31, 36, 0)');
      ctx.fillStyle = innerShadow;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fill();

      // 3.3. Paper cut thickness highlight on bottom-right rim of the punched hole
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.78 + this.noise.random() * 0.15})`;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.stroke();

      // 3.4. Dark paper cut shadow on top-left rim
      ctx.strokeStyle = 'rgba(50, 50, 56, 0.45)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 1.02 * Math.PI, 1.88 * Math.PI);
      ctx.stroke();

      // 3.5. Helical metal coil wire loop curving through hole to outer notebook edge
      // Loop arc, entry and exit coordinates vary with helical angle and holeIndex
      const loopOuterX = 4 + (this.noise.random() - 0.5) * 3;
      const wireDrop = pitch * 0.18 + (this.noise.random() - 0.5) * 1.5;
      const wireThickness = 2.1 + (this.noise.random() - 0.5) * 0.25;

      ctx.save();
      // Main metal wire core (dark metallic pewter / graphite)
      ctx.strokeStyle = '#32363e';
      ctx.lineWidth = wireThickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx + 1.2, hy - 1.2);
      ctx.bezierCurveTo(
        hx - 18,
        hy - 4 + wireDrop * 0.2,
        loopOuterX + 8,
        hy - 3 + wireDrop * 0.7,
        loopOuterX,
        hy + wireDrop
      );
      ctx.stroke();

      // Wire metallic specular highlight reflection along the outer loop crown
      ctx.strokeStyle = '#8b93a2';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - 2.5);
      ctx.bezierCurveTo(
        hx - 16,
        hy - 5.2 + wireDrop * 0.2,
        loopOuterX + 10,
        hy - 4.2 + wireDrop * 0.7,
        loopOuterX + 2,
        hy + wireDrop - 1.0
      );
      ctx.stroke();

      // Subtle warm desk reflection on underside of coil loop
      ctx.strokeStyle = 'rgba(215, 195, 170, 0.22)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 0.5);
      ctx.bezierCurveTo(
        hx - 17,
        hy - 1.5 + wireDrop * 0.3,
        loopOuterX + 8,
        hy - 0.5 + wireDrop * 0.8,
        loopOuterX + 1,
        hy + wireDrop + 1.2
      );
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws microscopic paper texture fibers and subtle organic page creases.
   */
  private drawPaperTextureFibers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pageIndex: number = 0
  ) {
    ctx.save();

    // 1. Scattering of organic cellulose pulp micro-fibers (~415 fibers)
    const fiberCount = Math.floor((width * height) / 5200);
    for (let i = 0; i < fiberCount; i++) {
      const fx = this.noise.random() * width;
      const fy = this.noise.random() * height;
      const flen = 3 + this.noise.random() * 9;
      const fangle = this.noise.random() * Math.PI * 2;
      const fiberType = this.noise.random();

      if (fiberType > 0.85) {
        ctx.strokeStyle = 'rgba(70, 95, 130, 0.04)'; // faint blue lint
      } else if (fiberType > 0.65) {
        ctx.strokeStyle = 'rgba(120, 95, 70, 0.045)'; // wood pulp brown
      } else {
        ctx.strokeStyle = 'rgba(80, 75, 70, 0.035)'; // natural gray fiber
      }
      ctx.lineWidth = 0.6 + this.noise.random() * 0.4;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(
        fx + Math.cos(fangle) * flen * 0.5 + (this.noise.random() - 0.5) * 2.5,
        fy + Math.sin(fangle) * flen * 0.5 + (this.noise.random() - 0.5) * 2.5,
        fx + Math.cos(fangle) * flen,
        fy + Math.sin(fangle) * flen
      );
      ctx.stroke();
    }

    // 2. Subtle organic paper micro-creases/handling folds varying per page
    // Diagonal gentle fold across upper quadrant (alternates corners or shifts angle)
    const isTopRight = (pageIndex % 2 === 1) || (this.noise.random() < 0.35);
    const c1StartX = isTopRight ? width : 0;
    const c1StartY = height * (0.08 + this.noise.random() * 0.12);
    const c1EndX = isTopRight
      ? width - width * (0.28 + this.noise.random() * 0.22)
      : width * (0.28 + this.noise.random() * 0.22);
    const c1EndY = 0;

    const creaseGrad1 = ctx.createLinearGradient(c1StartX, c1StartY, c1EndX, c1EndY);
    creaseGrad1.addColorStop(0, 'rgba(0, 0, 0, 0)');
    creaseGrad1.addColorStop(0.48, `rgba(0, 0, 0, ${0.010 + this.noise.random() * 0.008})`);
    creaseGrad1.addColorStop(0.52, `rgba(255, 255, 255, ${0.016 + this.noise.random() * 0.010})`);
    creaseGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = creaseGrad1;
    if (isTopRight) {
      ctx.fillRect(width * 0.45, 0, width * 0.55, height * 0.26);
    } else {
      ctx.fillRect(0, 0, width * 0.55, height * 0.26);
    }

    // Diagonal gentle handling curve across lower page
    const c2StartX = width * (0.35 + this.noise.random() * 0.25);
    const c2StartY = height;
    const c2EndX = width;
    const c2EndY = height * (0.60 + this.noise.random() * 0.20);

    const creaseGrad2 = ctx.createLinearGradient(c2StartX, c2StartY, c2EndX, c2EndY);
    creaseGrad2.addColorStop(0, 'rgba(0, 0, 0, 0)');
    creaseGrad2.addColorStop(0.48, `rgba(0, 0, 0, ${0.008 + this.noise.random() * 0.008})`);
    creaseGrad2.addColorStop(0.52, `rgba(255, 255, 255, ${0.014 + this.noise.random() * 0.010})`);
    creaseGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = creaseGrad2;
    ctx.fillRect(width * 0.35, height * 0.55, width * 0.65, height * 0.45);

    ctx.restore();
  }

  /**
   * Applies realistic Scan Post-Processing:
   * - Back-page ink bleed-through ghosting
   * - 3D Perspective tilt & spine page curl
   * - Smartphone shadow gradient across corner + uneven warm desk lighting
   * - Scanner filters (CamScanner Magic Color, Natural Photo, B&W Xerox)
   */
  public applyScanPostProcessing(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    paper: PaperScanSettings,
    pageIndex: number = 0,
    skipScannerFilter = false
  ) {
    // 1. Apply Scanner Contrast Filter FIRST (so it doesn't bleach out shadows & grain)
    if (!skipScannerFilter && paper.scanFilter !== 'original') {
      const awbJitter = (Math.sin(pageIndex * 2.7) * 0.04) + (this.noise.random() - 0.5) * 0.03;
      const effectiveWarmth = Math.max(0, Math.min(1.0, (paper.paperWarmth ?? 0) + awbJitter));
      this.applyScannerFilter(ctx, width, height, paper.scanFilter, effectiveWarmth, pageIndex, paper.template);
    }

    // 2. Re-apply subtle physical paper fiber grain OVER the whitened scan
    if (paper.showPaperTexture) {
      this.drawPaperTextureFibers(ctx, width, height, pageIndex);
    }

    // 3. Ambient mobile phone desk lighting gradient with natural per-page angle/position drift
    this.applyAmbientDeskLighting(ctx, width, height, pageIndex);

    // 4. Smartphone corner shadow gradient & camera vignette (organically distributed across pages)
    if (paper.shadowIntensity > 0) {
      this.drawSmartphoneCornerShadow(ctx, width, height, paper.shadowIntensity, pageIndex);
    } else {
      // Still apply subtle camera lens optical vignette around outer perimeter even without phone shadow
      this.applyCameraVignette(ctx, width, height, 0.45, pageIndex);
    }

    // 5. Spine page curl & 2D keystone camera perspective tilt
    if (paper.perspectiveTilt > 0) {
      this.drawSpinePageCurl(ctx, width, height, paper.perspectiveTilt, pageIndex);
      this.applyKeystonePerspective(ctx, width, height, paper.perspectiveTilt, paper, pageIndex);
    }

    // 6. Corner lens optical softness
    if (paper.scanFilter === 'camscanner' || paper.scanFilter === 'natural-photo') {
      this.applyCornerLensSoftness(ctx, width, height, pageIndex);
    }

    // 7. High-frequency CMOS sensor grain (LAST - covers all pixels so paper is never sterile pure #FFFFFF)
    if (paper.scanFilter === 'original') {
      this.applySensorISOGrain(ctx, width, height, 3.2);
    }
  }

  /**
   * Ambient Mobile Phone Lighting Gradient:
   * Recreates natural desk lamp / room light falloff where the illumination source
   * drifts organically in angle, position, and warmth between pages as the notebook is turned.
   */
  public applyAmbientDeskLighting(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    pageIndex: number = 0
  ) {
    ctx.save();
    // In authentic multi-page homework photography, lighting rotates and drifts between shots
    const pageAngleOffset = Math.sin(pageIndex * 1.618) * 0.42;
    const lightAngle = (Math.PI * 0.25) + pageAngleOffset + (this.noise.random() - 0.5) * 0.18;

    // Shift the lamp hotspot center per page
    const shiftX = Math.cos(pageIndex * 2.1) * width * 0.08;
    const shiftY = Math.sin(pageIndex * 2.1) * height * 0.08;

    const lx1 = width * 0.5 + shiftX - Math.cos(lightAngle) * width * 0.55;
    const ly1 = height * 0.5 + shiftY - Math.sin(lightAngle) * height * 0.55;
    const lx2 = width * 0.5 + shiftX + Math.cos(lightAngle) * width * 0.55;
    const ly2 = height * 0.5 + shiftY + Math.sin(lightAngle) * height * 0.55;

    const warmAlpha = 0.024 + Math.abs(Math.sin(pageIndex * 0.85)) * 0.028 + this.noise.random() * 0.012;
    const coolAlpha = 0.032 + Math.abs(Math.cos(pageIndex * 0.85)) * 0.028 + this.noise.random() * 0.012;

    const grad = ctx.createLinearGradient(lx1, ly1, lx2, ly2);
    grad.addColorStop(0, `rgba(255, 248, 235, ${warmAlpha})`); // subtle warm highlight
    grad.addColorStop(0.55 + (this.noise.random() - 0.5) * 0.10, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(20, 25, 42, ${coolAlpha})`);     // subtle cool shadow falloff

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * High-Frequency ISO Sensor Noise (CMOS Grain):
   * Injects pixel-level camera sensor noise across the entire canvas so paper is never
   * sterile digital #FFFFFF (255, 255, 255), but realistic analog mobile scan (250-254).
   */
  public applySensorISOGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    noiseIntensity = 3.2
  ) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const seedInt = Math.floor(this.noise.seed) | 0;
    const scale = (noiseIntensity * 2) / 255.0;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        let h = (x * 374761393 + y * 668265263 + seedInt) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        const grain = (((h ^ (h >>> 16)) & 0xff) - 128) * scale;

        data[i] = Math.max(0, Math.min(255, data[i] + grain));         // R
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain)); // G
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain)); // B
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Subtle Cellulose Ink Feathering:
   * Perturbs high-contrast ink boundaries in textCanvas with high-frequency cellulose noise
   * when paper.showPaperTexture === true, eliminating crisp digital vector edges at high zoom.
   */
  public applyCelluloseInkFeathering(textCanvas: HTMLCanvasElement) {
    const ctx = textCanvas.getContext('2d');
    if (!ctx) return;
    const w = textCanvas.width;
    const h = textCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let y = 0; y < h; y += 1) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += 1) {
        const i = rowOffset + x * 4;
        const a = d[i + 3];
        if (a > 30 && a < 235) {
          const mod = this.noise.get2D(x * 0.45, y * 0.45) * 0.08;
          d[i + 3] = Math.max(0, Math.min(255, Math.round(a * (1.0 + mod))));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Non-Linear Cylindrical Spine Warp + Projective Trapezoidal Camera Keystone
   * with realistic desk contact shadow and organic per-page handheld tilt.
   */
  private applyKeystonePerspective(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
    paper?: PaperScanSettings,
    _pageIndex: number = 0
  ) {
    if (intensity <= 0) return;
    const tempCanvas = this.getScratchCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.clearRect(0, 0, width, height);
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    // 1. Subtle desk matte + contact drop shadow behind lifted sheet
    const isBwXerox = paper?.scanFilter === 'bw-xerox';
    if (paper?.deskEdgeShadow ?? true) {
      const deskAngle = (Math.PI * 0.25) + (this.noise.random() - 0.5) * 0.30;
      const dx1 = width * 0.5 - Math.cos(deskAngle) * width * 0.6;
      const dy1 = height * 0.5 - Math.sin(deskAngle) * height * 0.6;
      const dx2 = width * 0.5 + Math.cos(deskAngle) * width * 0.6;
      const dy2 = height * 0.5 + Math.sin(deskAngle) * height * 0.6;

      const deskGrad = ctx.createLinearGradient(dx1, dy1, dx2, dy2);
      if (isBwXerox) {
        deskGrad.addColorStop(0, '#e5e5e5');
        deskGrad.addColorStop(1, '#d0d0d0');
      } else {
        deskGrad.addColorStop(0, '#cfc9be');
        deskGrad.addColorStop(1, '#b8b1a4');
      }
      ctx.fillStyle = deskGrad;
    } else {
      ctx.fillStyle = isBwXerox ? '#f0f0f0' : '#ebe9e2';
    }
    ctx.fillRect(0, 0, width, height);

    // Natural handheld rotation angle per page (typically ~0.5° - 1.6° when tilted)
    const rotAngle = (this.noise.random() - 0.48) * 0.038 * intensity;
    const baseScale = 1.0 - (0.022 + this.noise.random() * 0.008) * intensity;
    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);
    ctx.scale(baseScale, baseScale);
    ctx.translate(-cx, -cy);

    // 2. Strip-wise Cylindrical Spine Curl + Projective Trapezoidal Taper parameters
    const stripW = 8;
    const spineSpan = Math.min(280, width * (0.12 + 0.10 * intensity + (this.noise.random() - 0.5) * 0.05));
    const maxSpineLift = (9 + this.noise.random() * 8) * intensity;
    const topTrapInset = width * (0.007 + this.noise.random() * 0.015) * intensity;
    const yawTilt = (this.noise.random() - 0.5) * 0.006 * intensity;

    // Contact shadow underneath sheet (matches actual trapezoidal + spine-curved path)
    if (paper?.deskEdgeShadow ?? true) {
      ctx.save();
      const shadowAlpha = (0.28 + this.noise.random() * 0.10) * intensity;
      ctx.shadowColor = `rgba(15, 20, 30, ${shadowAlpha})`;
      ctx.shadowBlur = (15 + this.noise.random() * 9) * intensity + 4;
      ctx.shadowOffsetX = (4 + this.noise.random() * 5) * intensity;
      ctx.shadowOffsetY = (6 + this.noise.random() * 5) * intensity;
      ctx.fillStyle = '#fcfbf8';

      ctx.beginPath();
      for (let sx = 0; sx <= width; sx += 20) {
        const uSpine = Math.max(0, 1 - sx / spineSpan);
        const spineLiftY = -maxSpineLift * Math.pow(uSpine, 2.2);
        const xNorm = sx / width - 0.5;
        const topShiftX = -xNorm * topTrapInset;
        const px = sx + topShiftX;
        const py = spineLiftY;
        if (sx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(width - 0.5 * topTrapInset, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (let sx = 0; sx < width; sx += stripW) {
      const sw = Math.min(stripW + 1, width - sx);
      const uSpine = Math.max(0, 1 - sx / spineSpan);
      const spineLiftY = -maxSpineLift * Math.pow(uSpine, 2.2);
      const spineScaleY = 1 - 0.008 * intensity * uSpine * uSpine;

      const xNorm = sx / width - 0.5;
      const topShiftX = -xNorm * topTrapInset;
      const shearX = (xNorm * topTrapInset) / height;

      ctx.save();
      ctx.translate(sx + topShiftX, spineLiftY);
      ctx.transform(1, yawTilt * 0.0003, shearX, spineScaleY, 0, 0);
      ctx.drawImage(tempCanvas, sx, 0, sw, height, 0, 0, sw, height);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Back-page bleed through ghosting (faint flipped ink impression) with per-page jitter
   */
  public drawBackPageBleed(
    ctx: CanvasRenderingContext2D,
    bleedCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    bleedAmount: number,
    _pageIndex: number = 0
  ) {
    if (bleedAmount <= 0) return;

    ctx.save();
    // Organic sheet-to-sheet bleed opacity fluctuation
    const effectiveAlpha = bleedAmount * (0.08 + this.noise.random() * 0.04);
    ctx.globalAlpha = effectiveAlpha;
    // Ink bleeding through cellulose pulp is naturally diffused/blurred
    ctx.filter = 'blur(1.8px)';

    // Horizontally flipped ghosting with per-page registration shifts:
    // Vertical shift of 42px to 78px so reverse-page text doesn't align with front lines
    // Horizontal drift: ±12px
    // Slight scale transform & rotational drift so reverse page doesn't clone exact bounding boxes
    const dy = 42 + this.noise.random() * 36;
    const dx = (this.noise.random() - 0.5) * 24;
    const rotAngle = (this.noise.random() - 0.5) * 0.008;
    const scaleFactor = 1.008;

    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.translate(cx + dx, cy + dy);
    ctx.rotate(rotAngle);
    ctx.scale(-scaleFactor, scaleFactor);
    ctx.translate(-cx, -cy);

    ctx.drawImage(bleedCanvas, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * Spine page curl near left margin (simulates book binding curvature)
   */
  private drawSpinePageCurl(
    ctx: CanvasRenderingContext2D,
    _width: number,
    height: number,
    intensity: number,
    _pageIndex: number = 0
  ) {
    ctx.save();
    const curlWidth = (55 + this.noise.random() * 32) * intensity;
    const curlAlpha1 = (0.15 + this.noise.random() * 0.07) * intensity;
    const curlAlpha2 = (0.06 + this.noise.random() * 0.04) * intensity;

    const gradient = ctx.createLinearGradient(0, 0, curlWidth, 0);
    gradient.addColorStop(0, `rgba(10, 15, 25, ${curlAlpha1})`);
    gradient.addColorStop(0.35, `rgba(20, 25, 35, ${curlAlpha2})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, curlWidth, height);
    ctx.restore();
  }

  /**
   * Camera lens optical vignette around outer perimeter with organic per-page lens axis drift
   */
  private applyCameraVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number = 0.45,
    pageIndex: number = 0
  ) {
    ctx.save();
    const pageHashX = (Math.abs(Math.sin((pageIndex + 1) * 31.4159)) * 10000) % 1.0;
    const pageHashY = (Math.abs(Math.cos((pageIndex + 1) * 27.1828)) * 10000) % 1.0;

    // Per-page camera optical center jitter (±4% from page center)
    const vigX = width * (0.47 + (pageHashX - 0.5) * 0.08);
    const vigY = height * (0.47 + (pageHashY - 0.5) * 0.08);
    const vigR1 = width * (0.42 + pageHashX * 0.05);
    const vigR2 = width * (0.80 + pageHashY * 0.08);

    const vignette = ctx.createRadialGradient(
      vigX,
      vigY,
      vigR1,
      vigX,
      vigY,
      vigR2
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.68, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(15, 20, 30, ${0.11 * intensity})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Smartphone corner shadow & warm desk lighting with per-page natural placement.
   * Real student camera scans do NOT exhibit the exact same phone shadow on every single page;
   * shadow only casts on ~35% of pages with varied corner position.
   */
  private drawSmartphoneCornerShadow(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
    pageIndex: number = 0
  ) {
    const pageHash = (Math.abs(Math.sin(pageIndex * 12.9898 + 78.233)) * 43758.5453) % 1.0;

    // Only cast a prominent phone/hand corner shadow on ~38% of pages
    if (pageHash >= 0.38) {
      this.applyCameraVignette(ctx, width, height, 0.45, pageIndex);
      return;
    }

    ctx.save();
    const pageIntensity = intensity * (0.78 + (pageHash % 0.35) * 0.5);

    // Diagonal phone cast shadow: varies corner organically across pages
    const cornerVariant = Math.floor(pageHash * 10) % 3; // 0 = bottom-right, 1 = bottom-left, 2 = top-right
    let startX: number;
    let startY: number;
    let focusX: number;
    let focusY: number;
    let outerR: number;

    if (cornerVariant === 1) { // bottom-left
      startX = width * (0.04 + (pageHash * 0.05));
      startY = height * (0.91 + (pageHash * 0.06));
      focusX = width * (0.22 + (pageHash * 0.06));
      focusY = height * (0.72 + (pageHash * 0.06));
      outerR = width * (0.65 + (pageHash * 0.12));
    } else if (cornerVariant === 2) { // top-right
      startX = width * (0.92 + (pageHash * 0.05));
      startY = height * (0.07 + (pageHash * 0.06));
      focusX = width * (0.74 + (pageHash * 0.06));
      focusY = height * (0.24 + (pageHash * 0.06));
      outerR = width * (0.62 + (pageHash * 0.12));
    } else { // bottom-right
      startX = width * (0.92 + (pageHash * 0.05));
      startY = height * (0.91 + (pageHash * 0.06));
      focusX = width * (0.72 + (pageHash * 0.06));
      focusY = height * (0.72 + (pageHash * 0.06));
      outerR = width * (0.65 + (pageHash * 0.12));
    }

    const shadowGrad = ctx.createRadialGradient(
      startX,
      startY,
      8 + this.noise.random() * 10,
      focusX,
      focusY,
      outerR
    );
    shadowGrad.addColorStop(0, `rgba(20, 25, 40, ${0.30 * pageIntensity})`);
    shadowGrad.addColorStop(0.5, `rgba(40, 45, 60, ${0.11 * pageIntensity})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, width, height);

    // 1.5 Subtle secondary hand / knuckle shadow lobe
    const isLeftLobe = cornerVariant === 1;
    const thumbX = startX + (isLeftLobe ? 1 : -1) * width * (0.04 + this.noise.random() * 0.08);
    const thumbY = startY + (cornerVariant === 2 ? 1 : -1) * height * (0.06 + this.noise.random() * 0.08);
    const thumbR = width * (0.24 + this.noise.random() * 0.10);
    const thumbGrad = ctx.createRadialGradient(
      thumbX,
      thumbY,
      6,
      thumbX,
      thumbY,
      thumbR
    );
    thumbGrad.addColorStop(0, `rgba(25, 30, 45, ${0.13 * pageIntensity})`);
    thumbGrad.addColorStop(0.6, `rgba(35, 40, 55, ${0.04 * pageIntensity})`);
    thumbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = thumbGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();

    // 2. Camera lens optical vignette around outer perimeter (organic center shift)
    this.applyCameraVignette(ctx, width, height, 0.45, pageIndex);
  }

  /**
   * Scanner filters:
   * - Natural Photo: warm photo contrast
   * - CamScanner Magic Color: whitened paper + boosted saturated blue ink
   * - B&W Xerox: high-contrast monochrome
   */
  public applyScannerFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filter: ScanFilter,
    paperWarmth: number = 0,
    pageIndex: number = 0,
    paperTemplate?: PaperTemplateId
  ) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    const litLimitX = width * 0.45;
    const litLimitY = height * 0.45;

    const pageJitterR = Math.sin(pageIndex * 3.7 + 1.2) * 2.2;
    const pageJitterG = Math.sin(pageIndex * 2.9 + 2.5) * 2.0;
    const pageJitterB = Math.cos(pageIndex * 4.1 + 0.8) * 2.6;

    const targetR = Math.min(255, Math.max(0, Math.round(252 - paperWarmth * 6 + pageJitterR)));
    const targetG = Math.min(255, Math.max(0, Math.round(252 - paperWarmth * 16 + pageJitterG)));
    const targetB = Math.min(255, Math.max(0, Math.round(253 - paperWarmth * 42 + pageJitterB)));

    if (filter === 'camscanner') {
      for (let y = 0; y < height; y++) {
        const isUpperZoneY = y < litLimitY;
        const yFactor = isUpperZoneY ? 1.0 - y / litLimitY : 0;
        const rowOffset = y * width * 4;
        const lightWaveY = Math.sin(y * 0.0025) * 2.5;

        for (let x = 0; x < width; x++) {
          const i = rowOffset + x * 4;
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const h = ((x * 12345 + y * 67891) ^ (x << 4)) & 0xff;
          const grain = (h - 128) * (3.5 / 128.0);
          const lum = 0.299 * r + 0.587 * g + 0.114 * b + lightWaveY;

          // Preserve authentic fluorescent/pastel study highlighters (CamScanner Magic Color logic)
          // and require high green+blue for cyan (so dark navy ink edges and #adc9e8 ruling lines aren't misclassified):
          const isHighlighter =
            (r > 210 && g > 190 && b < 165 && (r - b) > 55) || // fluorescent yellow
            (g > 205 && r < 180 && b > 140 && (g - r) > 35) || // fluorescent green
            (b > 210 && g > 195 && r < 165 && (b - r) > 50) || // fluorescent cyan (requires high G & B)
            (r > 215 && b > 165 && g < 195 && (r - g) > 45);   // fluorescent pink

          if (isHighlighter) {
            // Retain warm saturated fluorescent dye
            continue;
          }

          // Preserve light ruling blue lines strictly on ruled templates (without tinting pen strokes)
          const isRuledSheet = paperTemplate === 'indian-ruled' || paperTemplate === 'exam-booklet';
          if (isRuledSheet && r >= 160 && r <= 195 && g >= 190 && g <= 220 && b >= 220 && (b - r) >= 42 && (g - r) >= 18 && lum >= 180 && lum <= 220) {
            d[i] = 175;
            d[i + 1] = 202;
            d[i + 2] = 232;
            continue;
          }

          if (lum > 218) {
            d[i] = Math.min(255, Math.max(200, Math.round(targetR + grain)));
            d[i + 1] = Math.min(255, Math.max(200, Math.round(targetG + grain)));
            d[i + 2] = Math.min(255, Math.max(200, Math.round(targetB + grain)));
          } else {
            const t = Math.max(0, Math.min(1, (lum - 115) / 103));
            const smoothT = t * t * (3 - 2 * t);

            const isRedInk = r > b + 20 && r > g + 20;
            const isGenuinelyBlue = b > r + 15 && b > g + 10;
            const isNeutralInk = Math.abs(r - g) < 12 && Math.abs(g - b) < 12;

            let inkR = isNeutralInk ? Math.max(18, r * 0.78) : Math.max(10, r * 0.68);
            let inkG = isNeutralInk ? Math.max(20, g * 0.79) : Math.max(16, g * 0.76);
            let inkB = isGenuinelyBlue
              ? Math.min(245, b * 1.20 + 16)
              : isNeutralInk
              ? Math.max(22, b * 0.81)
              : Math.max(10, b * (isRedInk ? 0.65 : 0.72));

            if (isGenuinelyBlue && isUpperZoneY && x < litLimitX) {
              const litZone = (1.0 - x / litLimitX) * yFactor;
              inkR = Math.min(255, inkR + Math.round(10 * litZone));
              inkG = Math.max(0, inkG - Math.round(4 * litZone));
              inkB = Math.min(255, inkB + Math.round(7 * litZone));
            }

            const paperBaseR = targetR + grain * 0.5;
            const paperBaseG = targetG + grain * 0.5;
            const paperBaseB = targetB + grain * 0.5;
            d[i] = Math.round(inkR * (1 - smoothT) + paperBaseR * smoothT);
            d[i + 1] = Math.round(inkG * (1 - smoothT) + paperBaseG * smoothT);
            d[i + 2] = Math.round(inkB * (1 - smoothT) + paperBaseB * smoothT);
          }
        }
      }
    } else if (filter === 'natural-photo') {
      // Natural Phone Photo: slight warm color cast and softened contrast + upper lit ballpoint sheen + sensor noise
      for (let y = 0; y < height; y++) {
        const isUpperZoneY = y < litLimitY;
        const yFactor = isUpperZoneY ? 1.0 - y / litLimitY : 0;
        const rowOffset = y * width * 4;

        for (let x = 0; x < width; x++) {
          const i = rowOffset + x * 4;
          const h = ((x * 12345 + y * 67891) ^ (x << 4)) & 0xff;
          const grain = (h - 128) * (3.2 / 128.0);

          let r = Math.min(255, Math.max(0, d[i] * 1.02 + grain));
          let g = Math.min(255, Math.max(0, d[i + 1] + grain));
          let b = Math.min(255, Math.max(0, d[i + 2] * 0.97 + grain));

          if (b > r + 8 && isUpperZoneY && x < litLimitX) {
            const litZone = (1.0 - x / litLimitX) * yFactor;
            r = Math.min(255, r + Math.round(12 * litZone));
            g = Math.max(0, g - Math.round(5 * litZone));
            b = Math.min(255, b + Math.round(8 * litZone));
          }

          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
        }
      }
    } else if (filter === 'bw-xerox') {
      // Clean B&W Document Scan: Pure white background + deep black ink with smooth anti-aliased stroke walls
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let val: number;
        if (lum >= 195) {
          val = 255; // Pure white paper
        } else if (lum <= 115) {
          val = Math.max(14, Math.round(lum * 0.22)); // Deep solid black ink
        } else {
          // Smooth anti-aliased gradient transition between 115 and 195
          const t = (lum - 115) / 80;
          val = Math.round(25 + t * 230);
        }
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Corner Lens Softness (Smartphone Depth-of-Field):
   * Applies subtle optical softness at extreme corners
   * of the canvas so page center remains tack-sharp while corners exhibit authentic camera optics.
   */
  private applyCornerLensSoftness(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _pageIndex: number = 0
  ) {
    const cornerR = Math.ceil(Math.min(width, height) * (0.13 + this.noise.random() * 0.05));
    const pad = 8;
    const blurPx = (0.9 + this.noise.random() * 0.4).toFixed(1);

    const srcCanvas = this.getCornerSrcCanvas(cornerR + pad * 2, cornerR + pad * 2);
    const srcCtx = srcCanvas.getContext('2d');
    const blurCanvas = this.getCornerBlurCanvas(cornerR, cornerR);
    const blurCtx = blurCanvas.getContext('2d');
    if (!srcCtx || !blurCtx) return;

    // Apply smooth feathered lens softness across all 4 corners (TL, TR, BL, BR)
    const corners = [
      {
        srcX: 0,
        srcY: 0,
        gradX: 0,
        gradY: 0,
        sampleX: Math.round(cornerR * 0.75),
        sampleY: Math.round(cornerR * 0.75),
      },
      {
        srcX: width - cornerR,
        srcY: 0,
        gradX: cornerR,
        gradY: 0,
        sampleX: Math.round(width - 1 - cornerR * 0.75),
        sampleY: Math.round(cornerR * 0.75),
      },
      {
        srcX: 0,
        srcY: height - cornerR,
        gradX: 0,
        gradY: cornerR,
        sampleX: Math.round(cornerR * 0.75),
        sampleY: Math.round(height - 1 - cornerR * 0.75),
      },
      {
        srcX: width - cornerR,
        srcY: height - cornerR,
        gradX: cornerR,
        gradY: cornerR,
        sampleX: Math.round(width - 1 - cornerR * 0.75),
        sampleY: Math.round(height - 1 - cornerR * 0.75),
      },
    ];

    for (const c of corners) {
      // Sample background paper color inside each corner (away from desk margins & spiral holes)
      const samplePx = ctx.getImageData(
        Math.max(0, Math.min(width - 1, c.sampleX)),
        Math.max(0, Math.min(height - 1, c.sampleY)),
        1,
        1
      ).data;
      const paperBg = `rgb(${samplePx[0]},${samplePx[1]},${samplePx[2]})`;

      // 1. Prepare source canvas with edge padding
      srcCtx.save();
      srcCtx.fillStyle = paperBg;
      srcCtx.fillRect(0, 0, cornerR + pad * 2, cornerR + pad * 2);
      srcCtx.drawImage(ctx.canvas, c.srcX, c.srcY, cornerR, cornerR, pad, pad, cornerR, cornerR);
      srcCtx.restore();

      // 2. Blur the corner onto dedicated blur canvas
      blurCtx.clearRect(0, 0, cornerR, cornerR);
      blurCtx.filter = `blur(${blurPx}px)`;
      blurCtx.drawImage(srcCanvas, pad, pad, cornerR, cornerR, 0, 0, cornerR, cornerR);
      blurCtx.filter = 'none';

      // 3. Feathered radial gradient mask from corner outwards
      const grad = blurCtx.createRadialGradient(c.gradX, c.gradY, cornerR * 0.20, c.gradX, c.gradY, cornerR);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.6)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      blurCtx.globalCompositeOperation = 'destination-in';
      blurCtx.fillStyle = grad;
      blurCtx.fillRect(0, 0, cornerR, cornerR);
      blurCtx.globalCompositeOperation = 'source-over';

      // 4. Composite back onto main canvas
      ctx.drawImage(blurCanvas, c.srcX, c.srcY);
    }
  }
}
