import { chromium } from "playwright";

const BASE = "http://localhost:3456";
const DIR = "snapshots";

const pages = [
  { name: "services",  path: "/services" },
  { name: "team",      path: "/team" },
  { name: "booking",   path: "/booking" },
  { name: "contact",   path: "/contact" },
  { name: "privacy",   path: "/privacy" },
  { name: "terms",     path: "/terms" },
  { name: "not-found", path: "/this-does-not-exist" },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const pg of pages) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `${DIR}/${pg.name}.png`,
        fullPage: true,
      });
      console.log(`✅ ${pg.name}`);
    } catch (err) {
      console.error(`❌ ${pg.name}: ${err.message}`);
    }
    await page.close();
  }

  // Mobile
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  try {
    await mobilePage.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: `${DIR}/home-mobile.png`, fullPage: true });
    console.log(`✅ home-mobile`);
  } catch (err) {
    console.error(`❌ home-mobile: ${err.message}`);
  }
  await mobilePage.close();

  await browser.close();
  console.log("Done");
}

main();
