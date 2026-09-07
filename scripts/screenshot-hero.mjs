import { chromium } from "playwright";

const BASE = "http://localhost:3456";
const DIR = "snapshots";

async function main() {
  const browser = await chromium.launch();

  // Desktop
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
  // Wait for the hero image to be visible
  await desktopPage.waitForSelector('img[alt*="radiant"]', { state: "visible", timeout: 15000 }).catch(() => {});
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: `${DIR}/hero-desktop.png` });
  console.log("✅ hero-desktop");
  await desktopPage.close();

  // Tablet
  const tabletCtx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tabletCtx.newPage();
  await tabletPage.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
  await tabletPage.waitForSelector('img[alt*="radiant"]', { state: "visible", timeout: 15000 }).catch(() => {});
  await tabletPage.waitForTimeout(3000);
  await tabletPage.screenshot({ path: `${DIR}/hero-tablet.png` });
  console.log("✅ hero-tablet");
  await tabletPage.close();

  // Mobile
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
  await mobilePage.waitForSelector('img[alt*="radiant"]', { state: "visible", timeout: 15000 }).catch(() => {});
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: `${DIR}/hero-mobile.png` });
  console.log("✅ hero-mobile");
  await mobilePage.close();

  await browser.close();
  console.log("\nDone");
}

main();
