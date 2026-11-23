import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runFinalVerification() {
  const outDir = '/tmp/scriptamath_audit/final';
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

  const acad1 = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch13_probability_discrete_distributions.md', 'utf-8');
  const acad2 = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch14_continuous_distributions_confidence_intervals.md', 'utf-8');
  const acad3 = fs.readFileSync('/home/haze/Acads/DAI/study_guide_src/ch08_pca_principal_component_analysis.md', 'utf-8');

  // ==========================================
  // COMBINATION 1: rushed-medical-cursive
  // vector-cursive + unruled-bond + camscanner + spiralHoles + inkBleed
  // ==========================================
  console.log('=== RUNNING COMBINATION 1 ===');
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1500);

  // Click Rushed Medical Cursive persona pill
  const medPersonaBtn = page.locator('button:has-text("Medical Cursive")').first();
  if (await medPersonaBtn.isVisible()) {
    await medPersonaBtn.click();
    await page.waitForTimeout(500);
  }

  // Set Acads 1 content
  await page.locator('textarea').first().fill(acad1.slice(0, 3200));
  await page.waitForTimeout(2000);

  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: path.join(outDir, 'combo1_full.png') });

  // 3x Zoom crop
  const crop1 = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 240, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (crop1) {
    fs.writeFileSync(path.join(outDir, 'combo1_crop_3x.png'), Buffer.from(crop1.split(',')[1], 'base64'));
  }

  // ==========================================
  // COMBINATION 2: chitesh-stem-notes
  // semi-cursive + indian-ruled + natural-photo + roughWorkColumn + marginAnnotation
  // ==========================================
  console.log('=== RUNNING COMBINATION 2 ===');
  // Click Chitesh persona pill
  const chiteshBtn = page.locator('button:has-text("Chitesh")').first();
  if (await chiteshBtn.isVisible()) {
    await chiteshBtn.click();
    await page.waitForTimeout(500);
  }

  // Go to Paper & Cam tab
  const paperTab = page.locator('button:has-text("Paper & Cam")').first();
  if (await paperTab.isVisible()) {
    await paperTab.click();
    await page.waitForTimeout(400);

    // Select Indian College Ruled
    const ruledBtn = page.locator('button:has-text("Indian College Ruled A4")').first();
    if (await ruledBtn.isVisible()) {
      await ruledBtn.click();
      await page.waitForTimeout(400);
    }

    // Select Natural Phone Photo
    const photoBtn = page.locator('button:has-text("Natural Phone Photo")').first();
    if (await photoBtn.isVisible()) {
      await photoBtn.click();
      await page.waitForTimeout(400);
    }

    // Toggle Rough Work Column if not on
    const toggleRough = page.locator('button[aria-label="Toggle rough work column"]').first();
    if (await toggleRough.isVisible()) {
      await toggleRough.click();
      await page.waitForTimeout(400);
    }

    // Fill margin annotation
    const marginInput = page.locator('input[placeholder*="Problem 3"]').first();
    if (await marginInput.isVisible()) {
      await marginInput.fill('Q2. Continuous PDF & CLT — Chitesh');
      await page.waitForTimeout(400);
    }
  }

  // Switch back to editor and set Acads 2 content
  const editorTab = page.locator('button:has-text("Markdown & Math")').first();
  if (await editorTab.isVisible()) {
    await editorTab.click();
    await page.waitForTimeout(400);
  }

  await page.locator('textarea').first().fill(acad2.slice(0, 3200));
  await page.waitForTimeout(2000);

  await canvas.screenshot({ path: path.join(outDir, 'combo2_full.png') });

  const crop2 = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 240, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (crop2) {
    fs.writeFileSync(path.join(outDir, 'combo2_crop_3x.png'), Buffer.from(crop2.split(',')[1], 'base64'));
  }

  // Zoom crop of the right-margin rough work column and margin annotation
  const crop2Rough = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 780, 240, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (crop2Rough) {
    fs.writeFileSync(path.join(outDir, 'combo2_rough_crop_3x.png'), Buffer.from(crop2Rough.split(',')[1], 'base64'));
  }

  // ==========================================
  // COMBINATION 3: palmer-business-cursive
  // vector-cursive + indian-ruled + camscanner + fountain pen
  // ==========================================
  console.log('=== RUNNING COMBINATION 3 ===');
  // Click Palmer Cursive or Fluid Cursive
  const palmerBtn = page.locator('button:has-text("Palmer Cursive")').first();
  if (await palmerBtn.isVisible()) {
    await palmerBtn.click();
    await page.waitForTimeout(500);
  } else {
    const fluidBtn = page.locator('button:has-text("Fluid Cursive")').first();
    if (await fluidBtn.isVisible()) {
      await fluidBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Go to Paper & Cam tab
  if (await paperTab.isVisible()) {
    await paperTab.click();
    await page.waitForTimeout(400);

    // Select Indian College Ruled
    const ruledBtn = page.locator('button:has-text("Indian College Ruled A4")').first();
    if (await ruledBtn.isVisible()) {
      await ruledBtn.click();
      await page.waitForTimeout(400);
    }

    // Select CamScanner
    const csBtn = page.locator('button:has-text("CamScanner")').first();
    if (await csBtn.isVisible()) {
      await csBtn.click();
      await page.waitForTimeout(400);
    }

    // Select Fountain pen
    const fountainBtn = page.locator('button:has-text("Fountain")').first();
    if (await fountainBtn.isVisible()) {
      await fountainBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // Switch back to editor and set Acads 3 content
  if (await editorTab.isVisible()) {
    await editorTab.click();
    await page.waitForTimeout(400);
  }

  await page.locator('textarea').first().fill(acad3.slice(0, 3200));
  await page.waitForTimeout(2000);

  await canvas.screenshot({ path: path.join(outDir, 'combo3_full.png') });

  const crop3 = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    if (!c) return null;
    const crop = document.createElement('canvas');
    crop.width = 900;
    crop.height = 600;
    const ctx = crop.getContext('2d')!;
    ctx.drawImage(c, 160, 240, 320, 200, 0, 0, 900, 600);
    return crop.toDataURL('image/png');
  });
  if (crop3) {
    fs.writeFileSync(path.join(outDir, 'combo3_crop_3x.png'), Buffer.from(crop3.split(',')[1], 'base64'));
  }

  console.log('Final verification run completed. Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors encountered:', consoleErrors);
  }

  await browser.close();
}

runFinalVerification().catch((err) => {
  console.error('Final verification error:', err);
  process.exit(1);
});
