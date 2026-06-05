# Reset Deploy Data

Use this workflow only when deploy/staging data must be cleaned before entering real data. It deletes business/test data but keeps database structure, Prisma migrations, functions, triggers, RLS policies, and schema objects.

Do not run it on real production data without a provider snapshot and written confirmation.

## What Gets Reset

The guarded SQL resets matching tables that exist in `public`, including campaign, mission, contribution, reward/voucher, payment, wallet ledger, brand/product, creator profile, notification, audit, support, analytics, role-request, profile, session, and account-role data.

It does not truncate `Account`. After dependent rows are removed, it prunes non-seed `Account` rows and preserves these seed emails when present:

- `admin@dcreator.vn`
- `brand@dcreator.vn`
- `creator@dcreator.vn`
- `user@dcreator.vn`

`AdminSetting`, Prisma migration tables, schemas, functions, triggers, RLS policies, and Supabase `auth.users` are not touched.

## Required Environment

Set these values in the deploy shell, not in committed files:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
ALLOW_DEPLOY_DATA_RESET=true
RESET_DEPLOY_DATA_CONFIRM=RESET_DEPLOY_DATA
DEPLOY_SEED_PASSWORD="replace-with-a-strong-temporary-password"
```

If intentionally testing against a local database, also set:

```bash
ALLOW_LOCAL_DEPLOY_DATA_RESET=true
```

## Commands

Create a backup first:

```bash
npm run db:backup:deploy
```

Reset only:

```bash
npm run db:reset:deploy
```

Seed accounts and clean data:

```bash
npm run db:seed:deploy
```

Full sequence:

```bash
npm run db:reset-and-seed:deploy
```

The full sequence runs backup, reset, seed accounts, seed clean data, then a database health verification.

## Seed Accounts

All seed accounts use `DEPLOY_SEED_PASSWORD`.

- Admin/Ops: `admin@dcreator.vn`
- Brand/Merchant: `brand@dcreator.vn`
- Creator: `creator@dcreator.vn`
- User: `user@dcreator.vn`

The seed also creates a brand, brand membership, brand subscription, creator profile, creator social channel, profile rows, wallets, four clean products, one active campaign, one draft campaign, one reward, and one mission.

## Verify After Reset

Check these flows manually after the scripts pass:

- Login as admin and open admin/ops CMS.
- Login as brand and open brand dashboard.
- Login as creator and open creator dashboard/jobs.
- Login as user and open the active campaign detail.
- Confirm campaign detail has rewards and missions.
- Confirm support/donate flow can start with N-Points.
- Confirm old campaign/order/payment/voucher test data no longer appears.
- Check server logs and browser console for errors.

## Rollback

Preferred rollback is the provider snapshot taken immediately before reset.

If using the generated `pg_dump` file, restore to a new database first, validate it, then repoint deploy:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" tmp/deploy-db-backups/deploy-data-<timestamp>.dump
```

Do not restore over production blindly. Validate target URL and maintenance state before restoring.
