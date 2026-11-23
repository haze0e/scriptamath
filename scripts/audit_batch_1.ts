import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const outDir = '/tmp/scriptamath_audit/batch_1';
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
  // Wait for font and canvas rendering to stabilize
  await page.waitForTimeout(2000);

  // Navigate to Question 8 page: Question 8 is around page 3 or 4
  // Let's find which page has Question 8 by checking page text or clicking next page
  const pageCountText = await page.textContent('.text-slate-400') || '';
  console.log('Page info:', pageCountText);

  // Let's capture page 1 full page first
  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: path.join(outDir, 'sample0_p1_full.png') });

  // Now let's navigate to Question 8. In numerical analysis sample, let's navigate pages
  let foundQ8 = false;
  for (let p = 0; p < 8; p++) {
    // Check if Question 8 is on current canvas or navigate
    const isQ8 = await page.evaluate(() => {
      const pIdx = (window as any).__CURRENT_PAGE_IDX__;
      return pIdx;
    });
    // Take screenshot of each page until we find Question 8
    await canvas.screenshot({ path: path.join(outDir, `sample0_page_${p + 1}.png`) });

    // Look for right arrow button to go to next page
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    if (await nextBtn.isVisible() && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await page.waitForTimeout(800);
    } else {
      break;
    }
  }

  // Zoomed crop of corner softness on Page 1
  await page.goto('http://localhost:5173/?sample=numerical-integration-assignment');
  await page.waitForTimeout(1500);
  const cornerDataUrl = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 600;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    // Crop top-left corner
    ctx.drawImage(c, 0, 0, 200, 200, 0, 0, 600, 600);
    return crop.toDataURL('image/png');
  });
  if (cornerDataUrl) {
    fs.writeFileSync(path.join(outDir, 'corner_tl_crop_3x.png'), Buffer.from(cornerDataUrl.split(',')[1], 'base64'));
  }

  console.log('2. Loading SAMPLE_ASSIGNMENTS[1] (Fourier Series)...');
  await page.goto('http://localhost:5173/?sample=fourier-series-assignment');
  await page.waitForTimeout(2000);
  await canvas.screenshot({ path: path.join(outDir, 'fourier_full.png') });

  // 3x zoomed crop of Fourier formulas
  const fourierCrop = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    // Crop center of page where Fourier integral formulas are drawn
    ctx.drawImage(c, 160, 320, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (fourierCrop) {
    fs.writeFileSync(path.join(outDir, 'fourier_crop_3x.png'), Buffer.from(fourierCrop.split(',')[1], 'base64'));
  }

  console.log('3. Loading Real Acads 1: ch13_probability_discrete_distributions.md...');
  const acad1Content = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch13_probability_discrete_distributions.md', 'utf-8');
  // Fill textarea
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
    ctx.drawImage(c, 180, 200, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad1Crop) {
    fs.writeFileSync(path.join(outDir, 'acad1_crop_3x.png'), Buffer.from(acad1Crop.split(',')[1], 'base64'));
  }

  console.log('4. Loading Real Acads 2: ch08_pca_principal_component_analysis.md...');
  const acad2Content = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch08_pca_principal_component_analysis.md', 'utf-8');
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
    ctx.drawImage(c, 180, 220, 300, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (acad2Crop) {
    fs.writeFileSync(path.join(outDir, 'acad2_crop_3x.png'), Buffer.from(acad2Crop.split(',')[1], 'base64'));
  }

  await browser.close();
  console.log('Audit completed! Images saved to', outDir);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
