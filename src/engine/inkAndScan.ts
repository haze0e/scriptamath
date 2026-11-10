import { PaperScanSettings, PaperTemplateId, ScanFilter } from '../types';
import { SeededNoise } from './noise';

export class InkAndScanPipeline {
  private noise: SeededNoise;

  constructor(noise: SeededNoise) {
    this.noise = noise;
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
    topMargin: number
  ) {
    ctx.save();

    // Base paper colors
    let baseColor = '#fcfbf8'; // soft warm ivory
    if (paper.template === 'unruled-bond') baseColor = '#fbfbf9';
    if (paper.template === 'engineering-graph') baseColor = '#fafcfe';
    if (paper.template === 'exam-booklet') baseColor = '#fdfcf7';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper grain fibers
    if (paper.showPaperTexture) {
      this.drawPaperTextureFibers(ctx, width, height);
    }

    // Template specific ruling lines & margins
    if (paper.template === 'indian-ruled') {
      this.drawIndianCollegeRuled(ctx, width, height, lineHeight, topMargin, pageIndex, paper);
    } else if (paper.template === 'engineering-graph') {
      this.drawEngineeringGraph(ctx, width, height);
    } else if (paper.template === 'exam-booklet') {
      this.drawExamBooklet(ctx, width, height, lineHeight, topMargin, pageIndex, paper);
    }

    // Spiral notebook punch holes on left margin (default true for unruled-bond, or if explicitly enabled)
    const shouldDrawSpiral = paper.spiralHoles ?? (paper.template === 'unruled-bond');
    if (shouldDrawSpiral) {
      this.drawSpiralNotebookHoles(ctx, width, height);
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
    paper: PaperScanSettings
  ) {
    const leftMarginX1 = 150;
    const leftMarginX2 = 156;

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
    ctx.fillStyle = '#1b3b8c'; // Blue ink
    ctx.font = 'bold 15px Caveat, cursive';
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
    let currY = topMargin + 30;
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
    ctx.moveTo(130, topMargin + 30);
    ctx.lineTo(130, height - 60);
    ctx.stroke();
  }

  /**
   * Realistic Spiral Notebook Margin:
   * - Punched holes along left margin (pitch ~45px, radius 8.5px)
   * - Dark notebook backboard / desk shadow showing through holes
   * - Paper cut thickness rim highlights and soft top-left inner shadow
   * - Wire binding coils looping through holes to outer page edge
   * - Subtle micro-perforation tear guide line
   */
  private drawSpiralNotebookHoles(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    const holeX = 46;
    const holeRadius = 8.5;
    const startY = 70;
    const endY = height - 70;
    const pitch = 45;

    // 1. Subtle micro-perforation line down the margin (tear guide)
    ctx.strokeStyle = 'rgba(175, 180, 195, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(82, 30);
    ctx.lineTo(82, height - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Punched holes & metal spiral rings
    for (let y = startY; y <= endY; y += pitch) {
      // Background behind hole (desk/under-page dark surface)
      ctx.fillStyle = '#22252a';
      ctx.beginPath();
      ctx.arc(holeX, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Soft inner drop-shadow at top-left inside hole
      const innerShadow = ctx.createRadialGradient(
        holeX - 2,
        y - 2,
        holeRadius * 0.2,
        holeX,
        y,
        holeRadius
      );
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      innerShadow.addColorStop(0.7, 'rgba(15, 18, 22, 0.4)');
      innerShadow.addColorStop(1, 'rgba(34, 37, 42, 0)');
      ctx.fillStyle = innerShadow;
      ctx.beginPath();
      ctx.arc(holeX, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Paper cut thickness highlight on bottom-right rim of the punched hole
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(holeX, y, holeRadius, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Dark paper cut shadow on top-left rim
      ctx.strokeStyle = 'rgba(60, 60, 65, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(holeX, y, holeRadius, 1.0 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();

      // Metal coil wire loop curving from behind hole to outer edge
      ctx.save();
      ctx.strokeStyle = '#383c44';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(holeX + 1, y - 1);
      ctx.bezierCurveTo(
        holeX - 18,
        y - 4,
        14,
        y - 3,
        6,
        y + 2
      );
      ctx.stroke();

      // Wire highlight reflection
      ctx.strokeStyle = '#858d9a';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(holeX - 2, y - 2);
      ctx.bezierCurveTo(
        holeX - 16,
        y - 5,
        16,
        y - 4,
        8,
        y + 1
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws microscopic paper texture fibers and subtle organic page creases.
   */
  private drawPaperTextureFibers(ctx: CanvasRenderingContext2D, width: number, height: number) {
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

    // 2. Subtle organic paper micro-creases/handling folds
    // Diagonal gentle fold across upper quadrant
    const creaseGrad1 = ctx.createLinearGradient(0, height * 0.15, width * 0.45, 0);
    creaseGrad1.addColorStop(0, 'rgba(0, 0, 0, 0)');
    creaseGrad1.addColorStop(0.48, 'rgba(0, 0, 0, 0.014)');
    creaseGrad1.addColorStop(0.52, 'rgba(255, 255, 255, 0.022)');
    creaseGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = creaseGrad1;
    ctx.fillRect(0, 0, width * 0.5, height * 0.25);

    // Diagonal gentle handling curve across lower page
    const creaseGrad2 = ctx.createLinearGradient(width * 0.5, height, width, height * 0.7);
    creaseGrad2.addColorStop(0, 'rgba(0, 0, 0, 0)');
    creaseGrad2.addColorStop(0.48, 'rgba(0, 0, 0, 0.012)');
    creaseGrad2.addColorStop(0.52, 'rgba(255, 255, 255, 0.018)');
    creaseGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = creaseGrad2;
    ctx.fillRect(width * 0.4, height * 0.65, width * 0.6, height * 0.35);

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
    paper: PaperScanSettings
  ) {
    // 1. Apply Scanner Contrast Filter FIRST (so it doesn't bleach out shadows & grain)
    if (paper.scanFilter !== 'original') {
      this.applyScannerFilter(ctx, width, height, paper.scanFilter);
    }

    // 2. Re-apply subtle physical paper fiber grain OVER the whitened scan
    if (paper.showPaperTexture) {
      this.drawPaperTextureFibers(ctx, width, height);
    }

    // 3. Ambient mobile phone desk lighting gradient
    this.applyAmbientDeskLighting(ctx, width, height);

    // 4. Smartphone corner shadow gradient (if enabled)
    if (paper.shadowIntensity > 0) {
      this.drawSmartphoneCornerShadow(ctx, width, height, paper.shadowIntensity);
    }

    // 5. Spine page curl & 2D keystone camera perspective tilt
    if (paper.perspectiveTilt > 0) {
      this.drawSpinePageCurl(ctx, width, height, paper.perspectiveTilt);
      this.applyKeystonePerspective(ctx, width, height, paper.perspectiveTilt);
    }

    // 6. Corner lens optical softness
    if (paper.scanFilter === 'camscanner' || paper.scanFilter === 'natural-photo') {
      this.applyCornerLensSoftness(ctx, width, height);
    }

    // 7. High-frequency CMOS sensor grain (LAST - covers all pixels so paper is never sterile pure #FFFFFF)
    this.applySensorISOGrain(ctx, width, height, 3.2);
  }

  /**
   * Ambient Mobile Phone Lighting Gradient:
   * Recreates natural desk lamp / room light falloff where top-left receives warm illumination
   * while bottom-right has a subtle cool falloff.
   */
  public applyAmbientDeskLighting(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(255, 250, 240, 0.04)'); // subtle warm highlight
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(20, 25, 40, 0.06)');    // subtle cool shadow falloff

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

    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * noiseIntensity * 2;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));         // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain)); // B
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Real 2D Keystone Perspective Tilt / Camera Shear skew.
   */
  private applyKeystonePerspective(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) {
    if (intensity <= 0) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.fillStyle = '#ebe9e2';
    ctx.fillRect(0, 0, width, height);

    const skewX = ((this.noise.random() - 0.5) * 0.007) * intensity;
    const skewY = ((this.noise.random() - 0.5) * 0.005) * intensity;
    const rotAngle = ((this.noise.random() - 0.5) * 0.006) * intensity;
    const scale = 1.0 - 0.012 * intensity;
    const cx = width * 0.5;
    const cy = height * 0.5;

    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);
    ctx.scale(scale, scale);
    ctx.transform(1, skewY, skewX, 1, 0, 0);
    ctx.translate(-cx, -cy);

    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }

  /**
   * Back-page bleed through ghosting (faint flipped ink impression)
   */
  public drawBackPageBleed(
    ctx: CanvasRenderingContext2D,
    bleedCanvas: HTMLCanvasElement,
    width: number,
    height: number,
    bleedAmount: number
  ) {
    if (bleedAmount <= 0) return;

    ctx.save();
    // Horizontally flipped ghosting with 4-8% opacity and +18px vertical offset
    ctx.globalAlpha = bleedAmount * 0.12;
    ctx.translate(width, 18);
    ctx.scale(-1, 1);
    ctx.drawImage(bleedCanvas, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * Spine page curl near left margin (simulates book binding curvature)
   */
  private drawSpinePageCurl(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) {
    ctx.save();
    const curlWidth = 70 * intensity;
    const gradient = ctx.createLinearGradient(0, 0, curlWidth, 0);
    gradient.addColorStop(0, `rgba(10, 15, 25, ${0.18 * intensity})`);
    gradient.addColorStop(0.3, `rgba(20, 25, 35, ${0.08 * intensity})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, curlWidth, height);
    ctx.restore();
  }

  /**
   * Smartphone corner shadow & warm desk lighting
   */
  private drawSmartphoneCornerShadow(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ) {
    ctx.save();
    // 1. Diagonal phone cast shadow on bottom right
    const shadowGrad = ctx.createRadialGradient(
      width * 0.95,
      height * 0.95,
      10,
      width * 0.75,
      height * 0.75,
      width * 0.75
    );
    shadowGrad.addColorStop(0, `rgba(20, 25, 40, ${0.32 * intensity})`);
    shadowGrad.addColorStop(0.5, `rgba(40, 45, 60, ${0.12 * intensity})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Warm uneven desk ambient light gradient
    const warmGrad = ctx.createLinearGradient(0, 0, width, height);
    warmGrad.addColorStop(0, `rgba(255, 245, 225, ${0.08 * intensity})`);
    warmGrad.addColorStop(1, `rgba(180, 160, 140, ${0.05 * intensity})`);
    ctx.fillStyle = warmGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle camera lens optical vignette around outer perimeter
    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.45,
      width * 0.5,
      height * 0.5,
      width * 0.82
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(15, 20, 30, ${0.15 * intensity})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  /**
   * Scanner filters:
   * - Natural Photo: warm photo contrast
   * - CamScanner Magic Color: whitened paper + boosted saturated blue ink
   * - B&W Xerox: high-contrast monochrome
   */
  private applyScannerFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    filter: ScanFilter
  ) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    const litLimitX = width * 0.45;
    const litLimitY = height * 0.45;

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
          const grain = (this.noise.random() - 0.5) * 3.5;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b + lightWaveY;

          if (lum > 218) {
            if (b > r + 8 && b > g + 4) {
              d[i] = 175;
              d[i + 1] = 202;
              d[i + 2] = 232;
            } else {
              const pv = Math.min(255, Math.max(247, Math.round(252 + grain)));
              d[i] = pv;
              d[i + 1] = pv;
              d[i + 2] = Math.min(255, pv + 1);
            }
          } else {
            const t = Math.max(0, Math.min(1, (lum - 115) / 103));
            const smoothT = t * t * (3 - 2 * t);

            let inkR = Math.max(10, r * 0.68);
            let inkG = Math.max(16, g * 0.76);
            let inkB = Math.min(245, b * 1.20 + 16);

            if (b > r + 8 && isUpperZoneY && x < litLimitX) {
              const litZone = (1.0 - x / litLimitX) * yFactor;
              inkR = Math.min(255, inkR + Math.round(10 * litZone));
              inkG = Math.max(0, inkG - Math.round(4 * litZone));
              inkB = Math.min(255, inkB + Math.round(7 * litZone));
            }

            const paperBase = 252 + grain * 0.5;
            d[i] = Math.round(inkR * (1 - smoothT) + paperBase * smoothT);
            d[i + 1] = Math.round(inkG * (1 - smoothT) + paperBase * smoothT);
            d[i + 2] = Math.round(inkB * (1 - smoothT) + (paperBase + 1) * smoothT);
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
   * Applies subtle optical softness (0.5px blur) at extreme top-left and bottom-right 12% corners
   * of the canvas so page center remains tack-sharp while corners exhibit authentic camera optics.
   */
  private applyCornerLensSoftness(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cornerR = Math.min(width, height) * 0.16;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.filter = 'blur(1.0px)';

    // 1. Top-left corner
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, cornerR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // 2. Bottom-right corner
    ctx.save();
    ctx.beginPath();
    ctx.arc(width, height, cornerR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    ctx.restore();
  }
}
