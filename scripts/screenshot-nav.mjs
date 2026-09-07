import { chromium } from 'playwright';

const BASE = 'http://localhost:3456';

async function main() {
  const browser = await chromium.launch();
  
  // Desktop
  const dCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dPage = await dCtx.newPage();
  await dPage.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await dPage.waitForTimeout(3000);
  await dPage.screenshot({ path: 'snapshots/nav-fix-desktop.png' });
  
  // Mobile
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mCtx.newPage();
  await mPage.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await mPage.waitForTimeout(3000);
  await mPage.screenshot({ path: 'snapshots/nav-fix-mobile.png' });
  
  // Mobile - click the menu toggle
  const toggle = await mPage.$('.sm-toggle');
  if (toggle) {
    await toggle.click();
    await mPage.waitForTimeout(1500);
    await mPage.screenshot({ path: 'snapshots/nav-fix-mobile-open.png' });
  } else {
    console.log('No toggle found');
  }
  
  await browser.close();
  console.log('Done');
}

main().catch(e => { console.error(e); process.exit(1); });
