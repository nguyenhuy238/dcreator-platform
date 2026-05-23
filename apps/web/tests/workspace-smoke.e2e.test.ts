import assert from "node:assert/strict";
import test from "node:test";

type RoleCase = {
  name: string;
  emailEnv: string;
  passwordEnv: string;
  allowed: string[];
  denied: string[];
};

const roleCases: RoleCase[] = [
  { name: "USER only", emailEnv: "E2E_USER_EMAIL", passwordEnv: "E2E_USER_PASSWORD", allowed: ["/dashboard/user", "/dashboard/user/profile"], denied: ["/dashboard/creator", "/dashboard/brand", "/admin"] },
  { name: "USER + CREATOR", emailEnv: "E2E_CREATOR_EMAIL", passwordEnv: "E2E_CREATOR_PASSWORD", allowed: ["/dashboard/user", "/dashboard/creator"], denied: ["/dashboard/brand", "/admin"] },
  { name: "USER + BRAND_OWNER", emailEnv: "E2E_BRAND_EMAIL", passwordEnv: "E2E_BRAND_PASSWORD", allowed: ["/dashboard/user", "/dashboard/brand"], denied: ["/dashboard/creator", "/admin"] },
  { name: "USER + CREATOR + BRAND_OWNER", emailEnv: "E2E_MULTI_EMAIL", passwordEnv: "E2E_MULTI_PASSWORD", allowed: ["/dashboard/user", "/dashboard/creator", "/dashboard/brand"], denied: ["/admin"] },
  { name: "ADMIN", emailEnv: "E2E_ADMIN_EMAIL", passwordEnv: "E2E_ADMIN_PASSWORD", allowed: ["/dashboard/user", "/admin"], denied: ["/dashboard/creator", "/dashboard/brand"] },
  { name: "OPS", emailEnv: "E2E_OPS_EMAIL", passwordEnv: "E2E_OPS_PASSWORD", allowed: ["/dashboard/user", "/admin"], denied: ["/dashboard/creator", "/dashboard/brand"] }
];

async function getPlaywright() {
  const dynamicImport = new Function("modulePath", "return import(modulePath);") as (modulePath: string) => Promise<unknown>;
  return (await dynamicImport("playwright")) as {
    chromium: { launch: (arg?: object) => Promise<unknown> };
  };
}

async function login(page: {
  goto: (url: string, arg: { waitUntil: "networkidle" }) => Promise<void>;
  fill: (selector: string, value: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  waitForURL: (matcher: RegExp, arg: { timeout: number }) => Promise<void>;
}, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard|\/admin/, { timeout: 15000 });
}

test("workspace role matrix + mobile navigation smoke", async (t) => {
  const baseUrl = process.env.E2E_BASE_URL;
  if (!baseUrl) {
    t.skip("E2E_BASE_URL is not set");
    return;
  }

  let chromium: { launch: (arg?: object) => Promise<unknown> } | undefined;
  try {
    chromium = (await getPlaywright()).chromium;
  } catch {
    t.skip("playwright is not installed");
    return;
  }

  const browser = (await chromium.launch({ headless: true })) as {
    newContext: (arg?: object) => Promise<{
      newPage: () => Promise<{
        goto: (url: string, arg: { waitUntil: "networkidle" }) => Promise<void>;
        fill: (selector: string, value: string) => Promise<void>;
        click: (selector: string) => Promise<void>;
        waitForURL: (matcher: RegExp, arg: { timeout: number }) => Promise<void>;
        url: () => string;
        textContent: (selector: string) => Promise<string | null>;
        isVisible: (selector: string) => Promise<boolean>;
        evaluate: <T>(fn: () => T) => Promise<T>;
      }>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  };

  try {
    for (const roleCase of roleCases) {
      const email = process.env[roleCase.emailEnv];
      const password = process.env[roleCase.passwordEnv];
      if (!email || !password) {
        continue;
      }

      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, baseUrl, email, password);

      for (const route of roleCase.allowed) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        assert.ok(!page.url().includes("denied="), `${roleCase.name} should access ${route}`);
      }

      for (const route of roleCase.denied) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
        assert.ok(page.url().includes("/dashboard/user"), `${roleCase.name} should be redirected from ${route}`);
      }

      await context.close();
    }

    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();
    const mobileEmail = process.env.E2E_MULTI_EMAIL ?? process.env.E2E_CREATOR_EMAIL ?? process.env.E2E_USER_EMAIL;
    const mobilePassword = process.env.E2E_MULTI_PASSWORD ?? process.env.E2E_CREATOR_PASSWORD ?? process.env.E2E_USER_PASSWORD;
    if (!mobileEmail || !mobilePassword) {
      t.skip("missing mobile test credentials");
      return;
    }

    await login(mobilePage, baseUrl, mobileEmail, mobilePassword);
    await mobilePage.goto(`${baseUrl}/dashboard/user`, { waitUntil: "networkidle" });
    assert.equal(await mobilePage.isVisible('button[aria-label="Mở thanh điều hướng"]'), true);
    await mobilePage.click('button[aria-label="Mở thanh điều hướng"]');
    assert.equal(await mobilePage.isVisible('text=Đóng'), true);
    const hasSwitcher = await mobilePage.isVisible('#workspace-switcher');
    assert.equal(hasSwitcher, true, "workspace switcher should be visible on mobile");

    const hasOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(hasOverflow, false, "mobile header/layout should not overflow horizontally");

    await mobileContext.close();
  } finally {
    await browser.close();
  }
});
