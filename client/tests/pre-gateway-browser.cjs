// Run against a locally started DineFor client with Playwright Chromium installed.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = process.env.DINEFOR_QA_CLIENT_URL || "http://localhost:5173";
const widths = [320, 360, 390, 430, 768, 1024, 1440];
const buffetPath = process.env.DINEFOR_QA_BUFFET_PATH;
const routes = ["/", "/discover", "/listings", "/map", "/login", "/register", "/best-buffets-in-colombo"];

async function verifyWidth(page, label) {
  const size = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(size.document <= size.viewport + 1, `${label} overflows horizontally by ${size.document - size.viewport}px`);
}

async function run() {
  const browser = await chromium.launch();
  const findings = [];
  try {
    const page = await browser.newPage();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [...routes, ...(buffetPath ? [buffetPath] : [])]) {
        try {
          const response = await page.goto(new URL(route, origin).href);
          assert.ok(response?.ok(), `Navigation failed for ${route}`);
          await page.locator("h1").first().waitFor({ state: "visible" });
          await verifyWidth(page, `${route} at ${width}px`);
          if (route === buffetPath) {
            const opener = page.getByRole("button", { name: "Open buffet photo gallery" });
            await opener.focus();
            await page.keyboard.press("Enter");
            const dialog = page.getByRole("dialog", { name: /photo gallery/i });
            await dialog.waitFor({ state: "visible" });
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            assert.ok(await opener.evaluate((element) => element === document.activeElement), "Gallery focus was not restored");
          }
          console.log(`PASS ${width}px ${route}`);
        } catch (error) {
          findings.push(`${width}px ${route}: ${error.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (findings.length) throw new Error(findings.join("\n"));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
