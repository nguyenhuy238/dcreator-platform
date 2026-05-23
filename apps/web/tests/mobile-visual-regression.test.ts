import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

type Viewport = { name: string; width: number; height: number };

const viewports: Viewport[] = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

const routes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/campaigns",
  "/campaigns/spring-ugc-2026",
  "/dashboard/user",
  "/dashboard/creator",
  "/dashboard/brand",
  "/admin",
  "/wallet",
  "/vouchers"
];

function sanitizeRoute(route: string) {
  if (route === "/") return "home";
  return route.replaceAll("/", "_").replace(/^_+/, "");
}

function toSha(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("visual regression for key routes (375/768/1024/desktop)", async (t) => {
  const baseUrl = process.env.E2E_BASE_URL;
  if (!baseUrl) {
    t.skip("E2E_BASE_URL is not set");
    return;
  }

  const shouldUpdate = process.env.VISUAL_UPDATE === "1";
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const baselineDir = path.join(__dirname, "visual-baseline");
  const currentDir = path.join(__dirname, ".artifacts", "visual-current");

  await mkdir(baselineDir, { recursive: true });
  await mkdir(currentDir, { recursive: true });

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
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  };

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();

      for (const route of routes) {
        const url = `${baseUrl}${route}`;
        await page.goto(url, { waitUntil: "networkidle" });
        const image = await page.screenshot({ fullPage: true });
        assert.ok(image.length > 0);

        const fileName = `${viewport.name}__${sanitizeRoute(route)}.png`;
        const currentPath = path.join(currentDir, fileName);
        const baselinePath = path.join(baselineDir, fileName);
        await writeFile(currentPath, image);

        if (shouldUpdate || !existsSync(baselinePath)) {
          await writeFile(baselinePath, image);
          continue;
        }

        const baselineImage = await readFile(baselinePath);
        const same = toSha(baselineImage) === toSha(image);
        assert.equal(
          same,
          true,
          `Visual mismatch at ${route} (${viewport.name}). Compare:\n- Baseline: ${baselinePath}\n- Current: ${currentPath}\nUse VISUAL_UPDATE=1 to refresh baseline if change is expected.`
        );
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
});
