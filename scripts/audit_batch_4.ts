import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const outDir = '/tmp/scriptamath_audit/batch_4';
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('1. Loading SAMPLE_ASSIGNMENTS[0] (Question 8)...');
  await page.goto('http://localhost:5173/?sample=numerical-integration-assignment');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000);

  const canvas = page.locator('canvas').first();

  // Navigate to Question 8
  for (let p = 0; p < 7; p++) {
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await canvas.screenshot({ path: path.join(outDir, 'sample0_q8_full.png') });

  // 3x Zoom on Question 8
  const q8Crop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 260, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (q8Crop) {
    fs.writeFileSync(path.join(outDir, 'sample0_q8_crop_3x.png'), Buffer.from(q8Crop.split(',')[1], 'base64'));
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
    ctx.drawImage(c, 160, 240, 320, 200, 0, 0, 900, 600);
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
    ctx.drawImage(c, 160, 240, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad2Crop) {
    fs.writeFileSync(path.join(outDir, 'acad2_crop_3x.png'), Buffer.from(acad2Crop.split(',')[1], 'base64'));
  }

  console.log('5. Testing UI Controls (Pen style & Stroke width)...');
  // Switch tab to paper / biomechanics to check pen controls
  const paperTabBtn = page.locator('button:has-text("Paper & Cam")').first();
  if (await paperTabBtn.isVisible()) {
    await paperTabBtn.click();
    await page.waitForTimeout(400);

    // Click Gel pen
    const gelBtn = page.locator('button:has-text("Gel Pen")').first();
    if (await gelBtn.isVisible()) {
      await gelBtn.click();
      await page.waitForTimeout(600);
    }
  }

  await canvas.screenshot({ path: path.join(outDir, 'ui_gel_pen_full.png') });

  console.log('Audit complete. Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  await browser.close();
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
