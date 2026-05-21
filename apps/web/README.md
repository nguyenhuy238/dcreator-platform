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