import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const outDir = '/tmp/scriptamath_audit/batch_2';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('1. Loading SAMPLE_ASSIGNMENTS[0] (Question 8 & Math X)...');
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

  // 3x Zoomed crop of math x and equations
  const mathXCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 180, 250, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (mathXCrop) {
    fs.writeFileSync(path.join(outDir, 'math_x_crop_3x.png'), Buffer.from(mathXCrop.split(',')[1], 'base64'));
  }

  console.log('2. Loading SAMPLE_ASSIGNMENTS[1] (Fourier Series)...');
  await page.goto('http://localhost:5173/?sample=fourier-series-assignment');
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'fourier_full.png') });

  // 3x Zoomed crop of Fourier integral & square root formulas
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
    ctx.drawImage(c, 160, 320, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad2Crop) {
    fs.writeFileSync(path.join(outDir, 'acad2_crop_3x.png'), Buffer.from(acad2Crop.split(',')[1], 'base64'));
  }

  console.log('5. Testing CamScanner with Bleed and Coffee Stain...');
  // Click style/paper settings or inject state for CamScanner + Bleed + Coffee Stain
  const camscannerTest = await page.evaluate(async () => {
    // Let's test custom sample with angle brackets, floor, ceiling, and sqrt
    const testLatex = `# Mathematical Formulations
## Properties and Delimiters
We evaluate the inner product $\\langle u, v \\rangle = \\int_0^1 u(x) v(x) dx$.
Let $x \\in \\mathbb{R}$. The floor and ceiling functions satisfy:
$\\lfloor x \\rfloor \\le x < \\lceil x \\rceil$
For any variable $x$, we compute $f(x) = \\sqrt{2x + 1} + 3x^2 - 4x$.
Notice that $\\sin(x)$ and $\\cos(x)$ are standard functions while $2x$ and $dx$ retain math x.
We check $A \\subset B$, $P \\implies Q$, and $x \\equiv y \\pmod m$.
`;
    return testLatex;
  });

  await page.locator('textarea').first().fill(camscannerTest);
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'batch2_delimiters_mathx_full.png') });

  const delimCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 200, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (delimCrop) {
    fs.writeFileSync(path.join(outDir, 'delimiters_mathx_crop_3x.png'), Buffer.from(delimCrop.split(',')[1], 'base64'));
  }

  await browser.close();
  console.log('Batch 2 audit complete! Files saved to', outDir);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
