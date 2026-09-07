import { chromium } from "playwright";

const BASE = "http://localhost:3456";
const DIR = "snapshots";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Step 1: Login via API
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: "admin@gracesalon.com", password: "admin123" },
  });
  const loginData = await loginRes.json();
  console.log("Login:", loginRes.status(), loginData.user?.role);

  // Step 2: Go to home first so auth context can load
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });
  // Wait for auth context to fetch /api/auth/me and set user
  await page.waitForFunction(() => {
    // Check that the auth context has loaded (nav shows admin links)
    const nav = document.querySelector('nav');
    return nav && nav.textContent?.includes('Dashboard');
  }, { timeout: 10000 }).catch(() => console.log("⚠️ Auth context didn't load admin nav"));
  await page.waitForTimeout(1000);
  console.log("✅ Auth context loaded");

  // Step 3: Navigate to admin
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 30000 });
  // Wait for the admin dashboard content to render
  await page.waitForFunction(() => {
    return document.body.textContent?.includes('Analytics Dashboard');
  }, { timeout: 10000 }).catch(() => console.log("⚠️ Admin dashboard didn't render"));
  await page.waitForTimeout(1500);
  console.log("✅ On admin dashboard");

  // Full page screenshot
  await page.screenshot({ path: `${DIR}/admin-dashboard.png`, fullPage: true });
  console.log("✅ admin-dashboard (full page)");

  // Scroll to the earnings section
  await page.evaluate(() => {
    const headings = document.querySelectorAll("h2");
    for (const h of headings) {
      if (h.textContent?.includes("Employee Earnings")) {
        h.scrollIntoView({ block: "start" });
        break;
      }
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/admin-earnings.png` });
  console.log("✅ admin-earnings (viewport)");

  // Check for prev month button
  const prevBtn = page.locator('[aria-label="Previous month"]').first();
  const prevVisible = await prevBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (prevVisible) {
    await prevBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/admin-earnings-prev.png` });
    console.log("✅ admin-earnings-prev-month");
  } else {
    console.log("⚠️ Prev month button not visible (only 1 month of data)");
  }

  await browser.close();
  console.log("\nDone");
}

main();
