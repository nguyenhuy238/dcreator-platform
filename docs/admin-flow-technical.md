# dCreator Admin Flow Technical Documentation

## 1. Tổng quan Admin Flow

Admin Flow được triển khai theo kiến trúc tách biệt khỏi Brand/Creator Flow:

- `Admin UI`: `apps/web/app/admin/**`
- `Admin API`: `apps/web/app/api/admin/**`
- `Admin service layer`: `apps/web/lib/services/admin-*.service.ts`

Chuẩn xử lý cho action quan trọng:

1. Guard quyền `ADMIN | OPS` ở API.
2. Validate input (zod).
3. Validate trạng thái hiện tại + status transition.
4. Cập nhật DB.
5. Ghi `AuditLog`.
6. Tạo `Notification`.
7. Trả response chuẩn (`ok` / error mapping).

---

## 2. Danh sách route Admin

### Core

- `/admin`
- `/admin/analytics`
- `/admin/reports`
- `/admin/audit`
- `/admin/settings`

### Account review

- `/admin/brands`
- `/admin/brands/[id]`
- `/admin/creators`
- `/admin/creators/[id]`
- `/admin/brand-applications`
- `/admin/creator-applications`
- `/admin/users`

### Campaign + application

- `/admin/campaigns`
- `/admin/campaigns/[id]`
- `/admin/campaigns/[id]/applications`
- `/admin/campaign-applications`
- `/admin/campaign-applications/[id]`

### Content

- `/admin/content-review`
- `/admin/content-review/[id]`
- `/admin/proofs` (redirect về content-review)

### Product/Inventory/Fulfillment

- `/admin/products`
- `/admin/products/[id]`
- `/admin/inventory`
- `/admin/product-inventory`
- `/admin/fulfillment`
- `/admin/fulfillment/[id]`

### Finance

- `/admin/finance`
- `/admin/payouts`
- `/admin/payouts/[id]`
- `/admin/vouchers`

### Support

- `/admin/support`
- `/admin/support/[id]`

---

## 3. Danh sách API Admin

### Brand

- `GET /api/admin/brands`
- `GET /api/admin/brands/[id]`
- `PATCH /api/admin/brands/[id]/approve`
- `PATCH /api/admin/brands/[id]/reject`
- `PATCH /api/admin/brands/[id]/request-changes`

### Creator

- `GET /api/admin/creators`
- `GET /api/admin/creators/[id]`
- `PATCH /api/admin/creators/[id]/approve`
- `PATCH /api/admin/creators/[id]/reject`
- `PATCH /api/admin/creators/[id]/request-changes`

### Campaign

- `GET /api/admin/campaigns`
- `GET /api/admin/campaigns/[id]`
- `PATCH /api/admin/campaigns/[id]/approve`
- `PATCH /api/admin/campaigns/[id]/reject`
- `PATCH /api/admin/campaigns/[id]/request-changes`
- `PATCH /api/admin/campaigns/[id]/pause`
- `GET /api/admin/campaigns/[id]/applications`

### Campaign applications

- `GET /api/admin/campaign-applications`
- `GET /api/admin/campaign-applications/[id]`
- `PATCH /api/admin/campaign-applications/[id]/approve`
- `PATCH /api/admin/campaign-applications/[id]/reject`
- `PATCH /api/admin/campaign-applications/[id]/send-to-brand-review`
- `PATCH /api/admin/campaign-applications/[id]/assign-task`

### Content review

- `GET /api/admin/content-review`
- `GET /api/admin/content-review/[id]`
- `PATCH /api/admin/content-review/[id]/approve`
- `PATCH /api/admin/content-review/[id]/reject`
- `PATCH /api/admin/content-review/[id]/request-changes`
- `PATCH /api/admin/content-review/[id]/send-to-brand-review`

### Products

- `GET /api/admin/products`
- `GET /api/admin/products/[id]`
- `PATCH /api/admin/products/[id]/approve`
- `PATCH /api/admin/products/[id]/reject`
- `PATCH /api/admin/products/[id]/request-changes`

### Fulfillment

- `GET /api/admin/fulfillment`
- `POST /api/admin/fulfillment`
- `GET /api/admin/fulfillment/[id]`
- `PATCH /api/admin/fulfillment/[id]/status`

### Finance/Payout

- `GET /api/admin/finance/overview`
- `GET /api/admin/payouts`
- `GET /api/admin/payouts/[id]`
- `PATCH /api/admin/payouts/[id]/approve`
- `PATCH /api/admin/payouts/[id]/reject`
- `PATCH /api/admin/payouts/[id]/mark-paid`
- `GET /api/admin/payments`

### Support

- `GET /api/admin/support`
- `GET /api/admin/support/[id]`
- `PATCH /api/admin/support/[id]`
- `POST /api/admin/support/[id]/reply`

### Reports/Analytics

- `GET /api/admin/reports`
- `GET /api/admin/analytics`

### Notifications

- `POST /api/admin/notifications/send`

### Legacy dashboard APIs (đang còn dùng một phần)

- `/api/admin/dashboard/**`

---

## 4. Danh sách model/schema liên quan

Theo `apps/web/prisma/schema.prisma`:

- `Account`, `AccountRole`
- `BrandApplication`, `Brand`, `BrandMember`
- `CreatorApplication`, `CreatorProfile`
- `Campaign`, `Mission`, `MissionSubmission`, `ProofReview`
- `ProductSubmission`, `InventoryBatch`, `FulfillmentOrder`
- `Wallet`, `WalletTransaction`, `WalletLedger`
- `PaymentTransaction`, `PayoutRequest`
- `Notification`
- `AuditLog`
- `SupportTicket`, `SupportTicketComment`
- `AnalyticsEvent`, `AnalyticsDaily`
- `RiskFlag`

---

## 5. Danh sách status/enum dùng trong Admin Flow

- `Role`: `ADMIN`, `OPS`, ...
- `ApplicationStatus`: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`
- `BrandStatus`: `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `REJECTED`
- `CampaignStatus`: `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`
- `MissionLifecycleStatus`: `ACCEPTED`, `DOING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `DONE`, ...
- `MissionStatus`: `OPEN`, `SUBMITTED`, `APPROVED`, `REJECTED`
- `ProductReviewStatus`: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`
- `InventoryStockStatus`: `IN_STOCK`, `RESERVED`, `OUT_OF_STOCK`
- `FulfillmentStatus`: `PENDING`, `PROCESSING`, `FAILED`, `COMPLETED`
- `PayoutRequestStatus`: `PENDING`, `APPROVED`, `REJECTED`, `PAID`
- `PaymentTransactionStatus`: `PENDING`, `SUCCESS`, `FAILED`
- `NotificationEvent`, `NotificationChannel`, `NotificationDeliveryStatus`
- `SupportTicketStatus`, `SupportTicketPriority`, `SupportTicketCategory`

---

## 6. Transition rule cho từng module

### Brand approval

- `BrandApplication`: `PENDING_REVIEW -> APPROVED | REJECTED | NEEDS_REVISION`
- Khi `APPROVED`: upsert `Brand`, add role `BRAND_OWNER`, add `BrandMember OWNER`, set brand `status=ACTIVE`.

### Creator approval

- `CreatorApplication`: `PENDING_REVIEW -> APPROVED | REJECTED | NEEDS_REVISION`
- Khi `APPROVED`: upsert `CreatorProfile`, assign role `CREATOR`.

### Product approval

- `ProductSubmission`: chỉ cho phép từ `PENDING_REVIEW | CHANGES_REQUESTED` sang `APPROVED | REJECTED | CHANGES_REQUESTED`.

### Campaign approval

- `APPROVE`: `DRAFT|PAUSED -> ACTIVE` (có readiness checks)
- `REJECT`: `DRAFT|PAUSED -> ARCHIVED`
- `REQUEST_CHANGES`: `DRAFT|PAUSED -> DRAFT`
- `PAUSE`: `ACTIVE -> PAUSED`

### Creator application approval (đang map trên `MissionSubmission`)

- `ACCEPTED|DOING -> DOING` (admin approve / send to brand / assign task bằng tag note)
- Reject -> `REJECTED`

### Content review (đang map trên `MissionSubmission`)

- Approve -> `lifecycleStatus=APPROVED`
- Reject/changes -> `lifecycleStatus=REJECTED`
- Send to brand review -> `lifecycleStatus=DOING` + tag
- Ready to publish/published hiện là semantic tag + lifecycle (`APPROVED` / `DONE`)

### Fulfillment

- UI status map về DB:
  - `pending -> PENDING`
  - `preparing|shipped -> PROCESSING`
  - `delivered -> COMPLETED`
  - `failed|cancelled -> FAILED`
- `opsStatus`, tracking, method, payment status lưu trong JSON meta.

### Payout

- `PENDING -> APPROVED | REJECTED`
- `APPROVED -> PAID`
- Reject có refund về wallet (transaction adjustment).

---

## 7. Quy tắc phân quyền ADMIN/OPS

- UI guard ở `app/admin/layout.tsx`.
- API guard dùng `requireAdminOps()` (`ADMIN|OPS`) + CSRF same-origin.
- Một số action tài chính có helper `requireAdminForFinanceAction()` (strict `ADMIN`), chưa áp đều toàn bộ endpoint.
- Multi-role hỗ trợ qua `AccountRole`; role check theo danh sách `roles`.

---

## 8. Cơ chế AuditLog

Service: `createAuditLog()` / `writeAuditLog()`.

Trường dữ liệu:

- `actorId`
- `actorRole`
- `action`
- `targetType`
- `targetId`
- `oldStatus`
- `newStatus`
- `reason`
- `metadata`
- `createdAt`

Đã gắn cho các action chính của Admin Flow (brand/creator/campaign/product/content/campaign-application/payout/fulfillment/support).

---

## 9. Cơ chế Notification

Service: `createNotification()` và `createNotificationForAdminOps()`.

- Mặc định gửi `IN_APP`.
- Có interface `EMAIL`, chưa bắt buộc gửi thật nếu chưa cấu hình provider.
- Action admin tạo notification tới đúng đối tượng (brand/creator/admin-ops).

---

## 10. Các điểm giao tiếp với Brand Flow

- Brand onboarding submit `BrandApplication`; admin duyệt tạo/cập nhật `Brand`.
- Campaign do brand tạo được admin review/publish/pause/reject.
- Product submission của brand được admin duyệt.
- Brand nhận notification khi campaign/product/content/application thay đổi trạng thái.
- Support ticket có thể gắn `relatedBrandId`, `relatedCampaignId`, `relatedOrderId`, `relatedPayoutId`.

---

## 11. Các điểm giao tiếp với Creator Flow

- Creator onboarding submit `CreatorApplication`; admin duyệt tạo `CreatorProfile` + role.
- Creator apply campaign/content submission đi qua `MissionSubmission` + `ProofReview`.
- Fulfillment gắn `creatorAccountId` và notify creator theo trạng thái.
- Payout dựa trên `PayoutRequest` + wallet transactions; creator nhận notify approve/reject/paid.

---

## 12. Các phần đã hoàn thiện

- Admin layout/sidebar/header + UX polish detail pages.
- Guard UI + guard API `ADMIN|OPS`.
- Module API + service cho: Brand, Creator, Campaign, Campaign Applications, Content Review, Product/Inventory, Fulfillment, Finance/Payout, Support, Reports/Analytics.
- AuditLog + Notification đã tích hợp cho hầu hết action quan trọng.
- Lint riêng phạm vi `app/admin/**` đã sạch warning.

---

## 13. Các phần còn thiếu / TODO

- Chuẩn hóa enum naming theo business spec mới (ví dụ `CHANGES_REQUESTED` vs `NEEDS_REVISION`) chưa đồng nhất hoàn toàn.
- `Campaign Application` và `Content Review` đang encode trạng thái qua `MissionSubmission + note tags`; nên tách state machine rõ hơn.
- Fulfillment đang dùng JSON meta trong `failureReason`, cần tách cột riêng nếu mở rộng logistics.
- API legacy `/api/admin/dashboard/**` còn overlap với API mới.
- Một số notification event đang reuse event gần nghĩa, cần event chuyên biệt hơn.
- Chưa có test E2E tự động đầy đủ cho toàn bộ Admin Flow.

---

## 14. Cách test thủ công

1. Đăng nhập tài khoản role `ADMIN`/`OPS`, truy cập `/admin`.
2. Test Brand onboarding review: approve/reject/request changes, check status + notification + audit.
3. Test Creator onboarding review: approve/reject/request changes, check role/profile + notification + audit.
4. Test Campaign review: approve/request changes/reject/pause, check readiness + status + logs.
5. Test Campaign application: approve/reject/send-to-brand/assign-task.
6. Test Content review: approve/reject/request changes/send-to-brand-review.
7. Test Product/Inventory review: approve/reject/request changes.
8. Test Fulfillment: create export request, update trạng thái, check tồn kho + notify + audit.
9. Test Payout: approve/reject/mark paid, check wallet transaction + payout status + notify + audit.
10. Test Support: update status/reply/assign, check comments + notification + audit.

---

## 15. Lỗi / technical debt còn tồn tại

- Lint toàn `apps/web` còn warning ngoài phạm vi admin (không phải regression admin).
- Chưa tách hoàn toàn state machine theo module riêng cho application/content.
- Một số service còn dùng `prisma as any`, cần giảm dần để tăng type-safety.
- API cũ/mới song song, cần kế hoạch deprecate.
- Chưa có middleware route-level chung cho `/admin/*`; guard hiện phân tán ở layout + API.

