# dCreator Platform

Nền tảng độc lập 100% cho Creator Economy + Social Commerce + Crowd-sponsorship + Reward/Voucher.

## Kiến trúc

- `apps/web`: Next.js App Router, gồm Web User + Creator Dashboard + Brand Dashboard + Admin/Ops Dashboard + API routes.
- `apps/web/prisma`: Schema PostgreSQL độc lập cho auth/account, campaign, mission, wallet, reward, payment, audit.
- `packages/*`: shared config/ui cho monorepo.

## Module đã khởi tạo

- Campaign Engine (`/api/campaigns`)
- Mission/Proof Engine (`/api/missions`)
- Wallet/N-Points Engine (`/api/wallet`)
- Reward/Voucher Engine (`/api/rewards`)
- Payment Integration (PayOS init endpoint: `/api/payments/payos`)
- Health check (`/api/health`)

## Chuẩn bị môi trường

1. Tạo file env:
```bash
cp apps/web/.env.example apps/web/.env
```
2. Cấu hình PostgreSQL trong `DATABASE_URL`.
3. Cài dependencies:
```bash
npm install
```
4. Tạo Prisma client + migrate + seed:
```bash
npm run db:generate --workspace=web
npm run db:migrate --workspace=web
npm run db:seed --workspace=web
```
5. Chạy local:
```bash
npm run dev
```

## Security baseline

- API payment có `INTERNAL_API_KEY` guard.
- Validation request bằng `zod`.
- Chuẩn hóa JSON error response + HTTP status code.

## Giai đoạn tiếp theo

- Auth production (Auth.js/custom JWT + RBAC + session strategy).
- Proof submission workflow + moderation queue.
- Settlement & payout pipeline cho Creator.
- Notification service (email/push/realtime) + audit logging đầy đủ.
- CI/CD, monitoring, rate-limit, fraud scoring.
