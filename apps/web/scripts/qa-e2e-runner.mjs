/* global process */
import { spawn } from "node:child_process";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const QA_ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL ?? "qa.admin@dcreator.local";
const QA_ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD ?? "Test@123456";
const QA_CREATOR_EMAIL = process.env.QA_CREATOR_EMAIL ?? "qa.creator@dcreator.local";
const QA_BRAND_EMAIL = process.env.QA_BRAND_EMAIL ?? "qa.brand@dcreator.local";
const QA_USER_EMAIL = process.env.QA_USER_EMAIL ?? "qa.user@dcreator.local";
const QA_DEFAULT_PASSWORD = process.env.QA_DEFAULT_PASSWORD ?? "Test@123456";
const QA_SCENARIO_SLUG = process.env.QA_SCENARIO_SLUG ?? "qa-e2e-campaign";

/** @typedef {{name: string, status: "PASS"|"FAIL"|"SKIP", detail: string}} Check */
/** @type {Check[]} */
const checks = [];

function add(name, status, detail) {
  checks.push({ name, status, detail });
}

function createClient() {
  /** @type {Record<string, string>} */
  const jar = {};
  const setCookie = (response) => {
    const raw = response.headers.get("set-cookie");
    if (!raw) return;
    const first = raw.split(";")[0];
    const idx = first.indexOf("=");
    if (idx <= 0) return;
    const key = first.slice(0, idx).trim();
    const val = first.slice(idx + 1).trim();
    jar[key] = val;
  };

  const cookieHeader = () =>
    Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

  return {
    async request(path, init = {}) {
      const headers = new Headers(init.headers ?? {});
      if (Object.keys(jar).length > 0) headers.set("cookie", cookieHeader());
      if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
      const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
      setCookie(res);
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { res, body };
    }
  };
}

async function login(client, email, password) {
  return client.request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

async function run() {
  /** @type {import("node:child_process").ChildProcessWithoutNullStreams | null} */
  let localDevProcess = null;
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok) throw new Error(`health status ${health.status}`);
    add("ENV /api/health", "PASS", "service reachable");
  } catch (error) {
    // Auto-start local dev server for deterministic QA run when user hasn't started one.
    localDevProcess = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      stdio: "ignore",
      shell: true
    });
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        const health = await fetch(`${BASE_URL}/api/health`);
        if (health.ok) {
          ready = true;
          break;
        }
      } catch {
        // keep retrying
      }
    }
    if (!ready) {
      add("ENV /api/health", "FAIL", `unreachable after auto-start: ${String(error)}`);
      if (localDevProcess) localDevProcess.kill("SIGTERM");
      printReportAndExit(1);
      return;
    }
    add("ENV /api/health", "PASS", "service reachable (auto-started)");
  }

  const admin = createClient();
  const creator = createClient();
  const brand = createClient();
  const user = createClient();

  // Auth & role basics
  {
    const aLogin = await login(admin, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD);
    add("Auth admin login", aLogin.res.ok ? "PASS" : "FAIL", aLogin.res.ok ? "ok" : JSON.stringify(aLogin.body));

    const me = await admin.request("/api/auth/me");
    const hasAdmin = Boolean(me.body?.data?.user?.roles?.includes?.("ADMIN") || me.body?.data?.user?.roles?.includes?.("OPS"));
    add("/api/auth/me admin role", hasAdmin ? "PASS" : "FAIL", JSON.stringify(me.body?.data?.user?.roles ?? []));
  }

  // Creator/Brand onboarding is immediate; Admin/Ops now verifies or flags risk only.
  {
    const creators = await admin.request("/api/admin/creators");
    if (!creators.res.ok) {
      add("Admin list creators for risk ops", "FAIL", JSON.stringify(creators.body));
    } else {
      const target = creators.body?.data?.find?.((item) => item?.account?.email === QA_CREATOR_EMAIL);
      add("Admin creator risk ops list", target ? "PASS" : "SKIP", target ? target.id : "creator profile not found");
    }

    const brands = await admin.request("/api/admin/brands");
    if (!brands.res.ok) {
      add("Admin list brands for risk ops", "FAIL", JSON.stringify(brands.body));
    } else {
      const target = brands.body?.data?.find?.((item) => item?.account?.email === QA_BRAND_EMAIL);
      add("Admin brand risk ops list", target ? "PASS" : "SKIP", target ? target.id : "brand not found");
    }
  }

  // User flow: campaign list/detail, contribution, voucher, wallet
  {
    await login(user, QA_USER_EMAIL, QA_DEFAULT_PASSWORD);

    const list = await user.request(`/api/campaigns?status=ACTIVE&search=${encodeURIComponent(QA_SCENARIO_SLUG)}`);
    add("User campaign list", list.res.ok ? "PASS" : "FAIL", list.res.ok ? `items=${list.body?.data?.items?.length ?? 0}` : JSON.stringify(list.body));

    const detail = await user.request(`/api/campaigns/${QA_SCENARIO_SLUG}`);
    const reward = detail.body?.data?.rewards?.find?.((item) => !item.isOutOfStock) ?? detail.body?.data?.rewards?.[0];
    add("User campaign detail", detail.res.ok ? "PASS" : "FAIL", detail.res.ok ? `reward=${reward?.id ?? "none"}` : JSON.stringify(detail.body));

    if (detail.res.ok && reward) {
      const contribution = await user.request(`/api/campaigns/${QA_SCENARIO_SLUG}/contributions`, {
        method: "POST",
        body: JSON.stringify({
          rewardId: reward.id,
          paymentMethod: "N_POINTS",
          amount: Math.max(1000, Number(reward.priceVnd ?? 0) || Number(reward.pricePoints ?? 0) * 1000 || 1000),
          idempotencyKey: `qa-e2e-${Date.now()}`
        })
      });
      add("User contribution by wallet", contribution.res.ok ? "PASS" : "FAIL", contribution.res.ok ? contribution.body?.data?.status ?? "ok" : JSON.stringify(contribution.body));
    } else {
      add("User contribution by wallet", "SKIP", "missing reward");
    }

    const vouchers = await user.request("/api/me/vouchers");
    add("User vouchers", vouchers.res.ok ? "PASS" : "FAIL", vouchers.res.ok ? `count=${vouchers.body?.data?.length ?? 0}` : JSON.stringify(vouchers.body));

    const wallet = await user.request("/api/wallet/me");
    add("User wallet transactions", wallet.res.ok ? "PASS" : "FAIL", wallet.res.ok ? `tx=${wallet.body?.data?.transactions?.length ?? 0}` : JSON.stringify(wallet.body));
  }

  // Creator flow
  {
    await login(creator, QA_CREATOR_EMAIL, QA_DEFAULT_PASSWORD);

    const me = await creator.request("/api/auth/me");
    const hasCreator = Boolean(me.body?.data?.user?.roles?.includes?.("CREATOR"));
    add("Creator capability after onboarding", hasCreator ? "PASS" : "FAIL", JSON.stringify(me.body?.data?.user?.roles ?? []));

    const apply = await creator.request(`/api/campaigns/${QA_SCENARIO_SLUG}/creator-application`, { method: "POST" });
    add("Creator apply campaign", apply.res.ok ? "PASS" : "FAIL", apply.res.ok ? "submitted" : JSON.stringify(apply.body));
  }

  // Brand flow (core)
  {
    await login(brand, QA_BRAND_EMAIL, QA_DEFAULT_PASSWORD);

    const overview = await brand.request("/api/brand/dashboard/overview");
    add("Brand dashboard overview", overview.res.ok ? "PASS" : "FAIL", overview.res.ok ? "ok" : JSON.stringify(overview.body));

    const analytics = await brand.request("/api/brand/dashboard/analytics");
    add("Brand KPI analytics", analytics.res.ok ? "PASS" : "FAIL", analytics.res.ok ? "ok" : JSON.stringify(analytics.body));
  }

  // Admin/Ops queues + logs + notifications
  {
    const overview = await admin.request("/api/admin/dashboard/overview");
    add("Admin queues overview", overview.res.ok ? "PASS" : "FAIL", overview.res.ok ? "ok" : JSON.stringify(overview.body));

    const audits = await admin.request("/api/admin/dashboard/audit-logs");
    add("Admin audit logs", audits.res.ok ? "PASS" : "FAIL", audits.res.ok ? `items=${audits.body?.data?.items?.length ?? 0}` : JSON.stringify(audits.body));

    const notifications = await admin.request("/api/me/notifications");
    add("Admin notifications", notifications.res.ok ? "PASS" : "FAIL", notifications.res.ok ? `items=${notifications.body?.data?.items?.length ?? 0}` : JSON.stringify(notifications.body));
  }

  if (localDevProcess) localDevProcess.kill("SIGTERM");
  printReportAndExit(0);
}

function printReportAndExit(code) {
  const failCount = checks.filter((item) => item.status === "FAIL").length;
  const passCount = checks.filter((item) => item.status === "PASS").length;
  const skipCount = checks.filter((item) => item.status === "SKIP").length;

  console.log(JSON.stringify({ summary: { pass: passCount, fail: failCount, skip: skipCount }, checks }, null, 2));
  process.exitCode = failCount > 0 ? 1 : code;
}

void run();
