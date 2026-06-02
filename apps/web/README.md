# dCreator Web App

Standalone dCreator app using Next.js App Router + Prisma + PostgreSQL.

## Local Development

1. Install dependencies at repo root:

```bash
npm install
```

2. Create env for web app:

```bash
cp apps/web/.env.example apps/web/.env
```

3. Generate Prisma client:

```bash
npm run db:generate --workspace=apps/web
```

4. Run migration:

```bash
npm run db:migrate --workspace=apps/web
```

5. Seed sample data:

```bash
npm run db:seed --workspace=apps/web
```

6. Run web app:

```bash
npm run dev --workspace=apps/web
```

App runs at `http://localhost:3000`.

## Safe Workflow (Recommended)

Use this flow every time schema/backend changes:

1. Prepare DB + Prisma client:

```bash
npm run db:prepare --workspace=apps/web
```

2. Optional seed refresh:

```bash
npm run db:seed --workspace=apps/web
```

3. Run full verification:

```bash
npm run verify --workspace=apps/web
```

4. Start dev safely:

```bash
npm run dev:safe --workspace=apps/web
```

Quick checklist before commit:

- Prisma model changes include migration SQL.
- `npm run verify --workspace=apps/web` passes.
- Critical routes/API are manually smoke-tested (`/campaigns`, `/api/campaigns`).

## Core Routes

- `/`
- `/campaigns`
- `/campaigns/[slug]`
- `/auth/login`
- `/auth/register`
- `/dashboard/user`
- `/dashboard/creator`
- `/dashboard/brand`
- `/admin`

## Quality Checks

```bash
npm run check-types --workspace=apps/web
npm run lint --workspace=apps/web
```

## Production Image Storage

Vercel must define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_STORAGE_BUCKET=dcreator-uploads`.

The `dcreator-uploads` bucket must be public because campaign covers use public
Storage URLs. When changing Supabase projects, verify that `next.config.js`
allows the new hostname and that an uploaded object exists under its expected
path, for example `brand-logo/example.png`.

## E2E Smoke Checks

Mobile visual regression (requires running app + Playwright installed):

```bash
E2E_BASE_URL=http://localhost:3000 npm run test --workspace=apps/web -- mobile-visual-regression
```

PayOS webhook end-to-end smoke (requires real test order and secrets):

```bash
E2E_BASE_URL=http://localhost:3000 \
PAYOS_WEBHOOK_SECRET=... \
E2E_PAYOS_ORDER_CODE=... \
E2E_PAYOS_IDEMPOTENCY_KEY=... \
E2E_PAYOS_PAID_AMOUNT_VND=... \
npm run test --workspace=apps/web -- payos-webhook-e2e
```
