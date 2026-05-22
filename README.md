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
2. Cấu hình PostgreSQL trong `apps/web/.env`:
- Dùng DB riêng cho dự án này (không dùng chung DB với project khác).
- Ví dụ mặc định: `dcreator_platform_web`.
- (Khuyến nghị) tạo thêm `SHADOW_DATABASE_URL` cho Prisma migrate dev.
3. Cài dependencies:
```bash
npm install
```
4. Với máy clone mới, setup DB bằng 1 lệnh (reset schema + migrate + seed):
```bash
npm run db:setup --workspace=web
```
5. Nếu chỉ apply migration (không reset dữ liệu):
```bash
npm run db:migrate --workspace=web
npm run db:generate --workspace=web
npm run db:seed --workspace=web
```
6. Chạy local:
```bash
npm run dev
```

## Lỗi thường gặp khi clone mới

- `Drift detected`:
  DB đang chứa schema cũ/khác project. Chạy `npm run db:setup --workspace=web` để reset về đúng migration của repo.
- `P2021: table public.Account does not exist` khi seed:
  Chưa migrate thành công nhưng đã seed. Chạy lại `db:setup` hoặc chạy migrate trước rồi seed.

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
