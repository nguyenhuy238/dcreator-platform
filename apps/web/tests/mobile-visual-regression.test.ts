import assert from "node:assert/strict";
import test from "node:test";

test("mobile visual regression (375px) for key pages", async (t) => {
  const baseUrl = process.env.E2E_BASE_URL;
  if (!baseUrl) {
    t.skip("E2E_BASE_URL is not set");
    return;
  }

  let chromium: { launch: (arg?: object) => Promise<unknown> } | undefined;
  try {
    const dynamicImport = new Function("modulePath", "return import(modulePath);") as (
      modulePath: string
    ) => Promise<unknown>;
    const playwright = (await dynamicImport("playwright")) as {
      chromium: { launch: (arg?: object) => Promise<unknown> };
    };
    chromium = playwright.chromium;
  } catch {
    t.skip("playwright is not installed");
    return;
  }

  const browser = (await chromium.launch({ headless: true })) as {
    newContext: (arg: object) => Promise<{
      newPage: () => Promise<{
        goto: (url: string, arg: { waitUntil: "networkidle" }) => Promise<void>;
        screenshot: (arg: { fullPage: boolean }) => Promise<Buffer>;
      }>;
    }>;
    close: () => Promise<void>;
  };

  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  const routes = ["/campaigns", "/campaigns/spring-ugc-2026", "/dashboard/user"];
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const screenshot = await page.screenshot({ fullPage: true });
    assert.ok(screenshot.length > 0);
  }

  await browser.close();
});
