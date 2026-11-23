import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const outDir = '/tmp/scriptamath_audit/batch_3';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('1. Loading SAMPLE_ASSIGNMENTS[0] (Question 8)...');
  await page.goto('http://localhost:5173/?sample=numerical-integration-assignment');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000);

  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: path.join(outDir, 'sample0_p1_full.png') });

  // Navigate pages to capture Question 8
  for (let p = 0; p < 7; p++) {
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await page.waitForTimeout(600);
      await canvas.screenshot({ path: path.join(outDir, `sample0_page_${p + 2}.png`) });
    }
  }

  console.log('2. Loading SAMPLE_ASSIGNMENTS[1] (Fourier Series)...');
  await page.goto('http://localhost:5173/?sample=fourier-series-assignment');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'fourier_full.png') });

  const fourierCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 320, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (fourierCrop) {
    fs.writeFileSync(path.join(outDir, 'fourier_crop_3x.png'), Buffer.from(fourierCrop.split(',')[1], 'base64'));
  }

  console.log('3. Loading Real Acads 1: ch13_probability_discrete_distributions.md...');
  const acad1Content = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch13_probability_discrete_distributions.md', 'utf-8');
  await page.locator('textarea').first().fill(acad1Content.slice(0, 3500));
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'acad1_full.png') });

  const acad1Crop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 280, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad1Crop) {
    fs.writeFileSync(path.join(outDir, 'acad1_crop_3x.png'), Buffer.from(acad1Crop.split(',')[1], 'base64'));
  }

  console.log('4. Loading Real Acads 2: ch14_continuous_distributions_confidence_intervals.md...');
  const acad2Content = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch14_continuous_distributions_confidence_intervals.md', 'utf-8');
  await page.locator('textarea').first().fill(acad2Content.slice(0, 3500));
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'acad2_full.png') });

  const acad2Crop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 280, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad2Crop) {
    fs.writeFileSync(path.join(outDir, 'acad2_crop_3x.png'), Buffer.from(acad2Crop.split(',')[1], 'base64'));
  }

  console.log('5. Loading Targeted Batch 3 Academic LaTeX & 2D Math alignment test...');
  const testBatch3 = `# Batch 3 Comprehensive Verification

1.5 is a decimal number and not a numbered list item.
(a + b)^2 = a^2 + 2ab + b^2 is an algebraic identity.
(a) + b = c is an equation starting with (a).
Answer the following questions carefully.

## Academic Operators & Limits

$$\\iint_D f(x, y)\\,dx\\,dy + \\iiint_V g(x, y, z)\\,dV + \\oint_C \\mathbf{F} \\cdot d\\mathbf{r}$$

$$\\int\\limits_a^b f(x)\\,dx = \\sum\\nolimits_{i=1}^n f(x_i)\\Delta x$$

$$\\lim_{x \\to \\infty} \\frac{\\sin x}{x} = 0, \\quad \\operatorname{tr}(A) = \\sum_{i=1}^n a_{ii}$$

## Tall Exponents & Tight Box

$$f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x - \\mu)^2}{2\\sigma^2}}$$

$$\\boxed{E = mc^2}$$

## 2D Matrix Alignment (Centered Around Math Axis)

$$A = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}, \\quad \\lVert v \\rVert = \\begin{Vmatrix} x \\\\ y \\end{Vmatrix}, \\quad f(x) = \\begin{cases} 1 & x \\ge 0 \\\\ 0 & x < 0 \\end{cases}$$

$$M = \\begin{aligned} u &+ v = 1 \\\\ 2u &- v = 3 \\end{aligned}$$
`;

  await page.locator('textarea').first().fill(testBatch3);
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'batch3_targeted_full.png') });

  // 3x Zoom on academic operators (iint, iiint, oint, limits, nolimits)
  const opCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 200, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (opCrop) {
    fs.writeFileSync(path.join(outDir, 'batch3_operators_crop_3x.png'), Buffer.from(opCrop.split(',')[1], 'base64'));
  }

  // 3x Zoom on tall exponent & tight box
  const expCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 420, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (expCrop) {
    fs.writeFileSync(path.join(outDir, 'batch3_exponent_box_crop_3x.png'), Buffer.from(expCrop.split(',')[1], 'base64'));
  }

  // 3x Zoom on matrices (pmatrix, Vmatrix, cases, aligned)
  const matrixCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 620, 340, 220, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (matrixCrop) {
    fs.writeFileSync(path.join(outDir, 'batch3_matrix_crop_3x.png'), Buffer.from(matrixCrop.split(',')[1], 'base64'));
  }

  console.log('Batch 3 audit complete! Artifacts saved to', outDir);
  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
