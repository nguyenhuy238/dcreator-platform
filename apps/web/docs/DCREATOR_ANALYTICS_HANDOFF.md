# Bàn giao Thống kê & Báo cáo dCreator

## Các mốc đã hoàn thành

- P0 Tổng quan thống kê quản trị.
- P1A Bộ lọc và xuất CSV cho Admin.
- P1B Thống kê thương hiệu theo phạm vi thương hiệu.
- P1C Gia cố payment mapping.
- P1D Groundwork cho payout reference và payment intent.
- P1E Thống kê nhà sáng tạo theo phạm vi nhà sáng tạo.
- P1F Analytics Event Taxonomy và chuẩn hóa tracking server-side.
- P1G Final QA & Documentation.
- P1H Chuẩn hóa giao diện tiếng Việt cho Analytics/Report.

## File chính

Admin:

- `apps/web/app/admin/analytics/page.tsx`
- `apps/web/app/admin/_components/AdminAnalyticsClient.tsx`
- `apps/web/app/api/admin/dashboard/analytics/route.ts`
- `apps/web/app/api/admin/dashboard/analytics/filter-options/route.ts`
- `apps/web/app/api/admin/dashboard/analytics/export/route.ts`
- `apps/web/app/api/admin/analytics/route.ts`
- `apps/web/lib/services/admin-analytics.service.ts`
- `apps/web/lib/admin-analytics-csv.ts`

Thương hiệu:

- `apps/web/app/dashboard/brand/analytics/page.tsx`
- `apps/web/app/dashboard/brand/_components/BrandAnalyticsClient.tsx`
- `apps/web/app/api/brand/dashboard/analytics/route.ts`
- `apps/web/app/api/brand/dashboard/analytics/filter-options/route.ts`
- `apps/web/app/api/brand/dashboard/analytics/export/route.ts`
- `apps/web/lib/services/brand-analytics.service.ts`
- `apps/web/lib/brand-analytics-csv.ts`

Nhà sáng tạo:

- `apps/web/app/dashboard/creator/analytics/page.tsx`
- `apps/web/app/dashboard/creator/_components/CreatorAnalyticsClient.tsx`
- `apps/web/app/api/creator/dashboard/analytics/route.ts`
- `apps/web/app/api/creator/dashboard/analytics/filter-options/route.ts`
- `apps/web/app/api/creator/dashboard/analytics/export/route.ts`
- `apps/web/lib/services/creator-analytics.service.ts`
- `apps/web/lib/creator-analytics-csv.ts`

Payment mapping:

- `apps/web/lib/analytics-payment-mapping.ts`
- `apps/web/lib/services/analytics-payment-mapping.service.ts`
- `apps/web/prisma/schema.prisma`
- `apps/web/prisma/migrations/20260709103000_payout_reference_payment_intent/migration.sql`

Event taxonomy:

- `apps/web/lib/analytics-events.ts`
- `apps/web/lib/analytics-event-taxonomy.ts`
- `apps/web/lib/services/analytics-event.service.ts`

Tests:

- `apps/web/tests/admin-analytics-csv.test.ts`
- `apps/web/tests/brand-analytics-csv.test.ts`
- `apps/web/tests/creator-analytics-csv.test.ts`
- `apps/web/tests/analytics-payment-mapping.test.ts`
- `apps/web/tests/analytics-event-taxonomy.test.ts`

## API chính

Admin:

- `GET /api/admin/dashboard/analytics`
- `GET /api/admin/dashboard/analytics/filter-options`
- `GET /api/admin/dashboard/analytics/export`
- `GET /api/admin/analytics`

Thương hiệu:

- `GET /api/brand/dashboard/analytics`
- `GET /api/brand/dashboard/analytics/filter-options`
- `GET /api/brand/dashboard/analytics/export`

Nhà sáng tạo:

- `GET /api/creator/dashboard/analytics`
- `GET /api/creator/dashboard/analytics/filter-options`
- `GET /api/creator/dashboard/analytics/export`

## Lệnh kiểm thử

Typecheck:

```bash
npm run check-types -w web
```

Lint file thay đổi:

```bash
npx eslint <changed-files> --max-warnings 0
```

Targeted analytics tests:

```bash
node --test --experimental-strip-types tests/admin-analytics-csv.test.ts
node --test --experimental-strip-types tests/brand-analytics-csv.test.ts
node --test --experimental-strip-types tests/creator-analytics-csv.test.ts
node --test --experimental-strip-types tests/analytics-payment-mapping.test.ts
node --test --experimental-strip-types tests/analytics-event-taxonomy.test.ts
```

## Blocker đã biết

- Prisma client generation/build có thể fail trên Windows nếu `node_modules/.prisma/client/query_engine-windows.dll.node` bị lock.
- `AnalyticsEvent.eventName` vẫn là Prisma enum legacy. Muốn persist toàn bộ event canonical cần migration enum additive.
- Payout legacy không có reference trực tiếp tới campaign/creator mission không thể quy về thương hiệu an toàn.
- Full test/lint có thể còn lỗi cũ ngoài scope Analytics/Report.

## Việc nên làm tiếp

Cho demo Outcome 3:

- Chuẩn bị demo data cho Admin, thương hiệu và nhà sáng tạo.
- Chuẩn bị happy path: chiến dịch active, creator apply được duyệt, nhiệm vụ có minh chứng được duyệt, có dữ liệu payment/payout.
- Chạy checklist thủ công trong `DCREATOR_ANALYTICS_REPORTING.md`.

Cho production hardening:

- Xử lý lỗi local Prisma generate/build.
- Thêm enum migration additive cho canonical analytics events.
- Thiết kế idempotency cho analytics event tracking.

Cho analytics nâng cao:

- Thêm chart.
- Thêm ROI attribution.
- Thêm event dashboard.
- Chỉ thêm `PayoutAllocation` khi payout có thể gom nhiều mission/campaign.
