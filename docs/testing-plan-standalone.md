# dCreator Standalone - Full Testing Plan

## 1) Test Strategy

### 1.1 Scope
Test toàn bộ 16 module:
1. Auth
2. Role guard
3. Campaign listing
4. Campaign detail
5. Contribution
6. Wallet
7. Reward/Voucher
8. Mission
9. Proof review
10. Brand dashboard
11. Creator dashboard
12. Admin dashboard
13. Payment webhook
14. Notification
15. Analytics
16. Security/fraud

### 1.2 Test Pyramid
- Unit test (50%): validate logic thuần (validator, service, score engine, permission policy).
- Integration test (25%): API route + service + Prisma/PostgreSQL + queue/event.
- API contract test (10%): request/response schema, status code, error format, idempotency.
- E2E test (10%): user flow từ UI đến DB side effects.
- Non-functional/concurrency (5%): race condition, duplicate webhook, transaction rollback.

### 1.3 Environments
- Local dev: chạy nhanh unit/integration với test DB.
- CI ephemeral: PostgreSQL container riêng cho mỗi run.
- Staging pre-prod: chạy E2E smoke + payment webhook replay + permission regression.

### 1.4 Quality Gates
- Unit + Integration pass >= 95% test cases bắt buộc.
- Không có bug `Critical/High` mở.
- Pass toàn bộ scenario đặc biệt:
  - nhiều user cùng chọn reward còn 1 slot
  - webhook gọi 2 lần
  - user thiếu N-Points
  - mission proof bị reject
  - voucher redeem lại lần 2
  - user không có quyền vào admin

## 2) Tools đề xuất

### 2.1 Core Stack
- Unit/Integration/API: `Vitest` (khuyến nghị) hoặc `Jest`.
- E2E + responsive + permission flow UI: `Playwright`.
- API black-box test: `Supertest` (nếu backend riêng/standalone server).
- DB transaction/race: Vitest/Jest + Prisma + worker parallel test.

### 2.2 Recommended packages (web workspace)
```bash
npm i -D vitest @vitest/coverage-v8 supertest playwright @playwright/test
```

## 3) Test Case Matrix (theo module)

| ID | Module | Test Type | Scenario | Steps (tóm tắt) | Expected Result | Priority |
|---|---|---|---|---|---|---|
| AUTH-01 | Auth | Unit | Hash/verify password | gọi hàm hash + verify | verify đúng/sai chính xác | P0 |
| AUTH-02 | Auth | API | Login sai password | POST `/api/auth/login` sai pass | `401`, error code chuẩn | P0 |
| AUTH-03 | Auth | Integration | Refresh token rotation | login -> refresh 2 lần | token cũ invalid, token mới valid | P0 |
| AUTH-04 | Auth | E2E | Session timeout | login -> idle -> action protected | bị redirect login | P1 |
| RG-01 | Role guard | Unit | Policy matrix | evaluate role x action | chỉ allow theo RBAC | P0 |
| RG-02 | Role guard | API | User không có quyền vào admin | gọi `/admin` hoặc admin API bằng role creator | `403` hoặc redirect no-access | P0 |
| RG-03 | Role guard | E2E | Route guard dashboard | creator mở brand/admin URL | chặn truy cập đúng UX | P0 |
| CAM-LIST-01 | Campaign listing | Integration | Filter/sort/paging | query nhiều filter | data đúng + total đúng | P1 |
| CAM-LIST-02 | Campaign listing | API | Invalid query params | gửi param sai schema | `400` zod error format chuẩn | P1 |
| CAM-DETAIL-01 | Campaign detail | Integration | Campaign not found | get by slug/id không tồn tại | `404` | P1 |
| CAM-DETAIL-02 | Campaign detail | E2E | Detail render | mở trang campaign | hiển thị stats, reward, mission đúng | P1 |
| CONTRIB-01 | Contribution | Integration | Create contribution success | đóng góp hợp lệ | trạng thái pending/paid đúng | P0 |
| CONTRIB-02 | Contribution | Error state | Amount invalid | amount <=0 | `400` | P1 |
| WALLET-01 | Wallet | Unit | Debit/Credit arithmetic | apply transaction | balance không âm bất hợp pháp | P0 |
| WALLET-02 | Wallet | Integration | User thiếu N-Points | redeem yêu cầu points > balance | rollback, trả `409/422` | P0 |
| WALLET-03 | Wallet | DB transaction | Atomic update | fail giữa chừng khi ghi ledger | không partial write | P0 |
| REWARD-01 | Reward/Voucher | Race condition | Nhiều user chọn reward còn 1 slot | chạy song song N request redeem | chỉ 1 request success, còn lại fail hợp lệ | P0 |
| REWARD-02 | Reward/Voucher | Integration | Voucher redeem lần 2 | redeem cùng voucher 2 lần | lần 2 fail `409 already redeemed` | P0 |
| REWARD-03 | Reward/Voucher | Permission | Redeem reward private | user không thuộc target group | `403` | P1 |
| MISSION-01 | Mission | API | Submit proof payload invalid | thiếu field proof URL | `400` | P1 |
| MISSION-02 | Mission | Integration | Mission complete criteria | submit proof hợp lệ | status pending_review | P1 |
| PROOF-01 | Proof review | Integration | Mission proof bị reject | reviewer reject + reason | proof=REJECTED, points không cộng | P0 |
| PROOF-02 | Proof review | Notification | Reject trigger notify | reject proof | user nhận notification | P1 |
| BRAND-01 | Brand dashboard | E2E | Brand KPI load | login brand -> dashboard | chart/card đúng data quyền brand | P1 |
| BRAND-02 | Brand dashboard | Permission | Creator gọi brand API | token creator gọi brand endpoint | `403` | P0 |
| CREATOR-01 | Creator dashboard | E2E | Creator earnings view | login creator | chỉ thấy dữ liệu own account | P1 |
| CREATOR-02 | Creator dashboard | Security | IDOR check | sửa creatorId query/path | bị chặn (`403/404`) | P0 |
| ADMIN-01 | Admin dashboard | Permission | Non-admin truy cập admin | user thường mở admin route | blocked + audit log | P0 |
| ADMIN-02 | Admin dashboard | Integration | Admin moderation action | approve/reject entity | state change + audit trail | P1 |
| WEBHOOK-01 | Payment webhook | API | Signature invalid | POST webhook sai chữ ký | `401/403`, no DB update | P0 |
| WEBHOOK-02 | Payment webhook | Duplicate | Webhook gọi 2 lần | replay cùng `event_id` 2 request | idempotent: chỉ ghi nhận 1 lần | P0 |
| WEBHOOK-03 | Payment webhook | DB transaction | Partial failure handling | fail sau update contribution trước wallet | rollback hoặc compensating consistent | P0 |
| NOTI-01 | Notification | Integration | Multi-channel fallback | push fail -> email fallback | message vẫn được gửi 1 lần | P1 |
| NOTI-02 | Notification | Race condition | Burst notifications | 100 event đồng thời | không duplicate ngoài policy | P1 |
| ANALYTICS-01 | Analytics | Integration | Event ingestion | gửi batch event | lưu đủ fields, timezone chuẩn | P2 |
| ANALYTICS-02 | Analytics | API | Unauthorized read | user thường gọi analytics admin endpoint | `403` | P1 |
| SEC-01 | Security/fraud | Unit | Fraud scoring rules | input suspicious pattern | score + flag đúng rule | P1 |
| SEC-02 | Security/fraud | Integration | Rate limit | spam API đóng góp/redeem | trả `429` | P0 |
| SEC-03 | Security/fraud | E2E | Session hijack guard | đổi token/session bất thường | buộc re-auth/log security event | P1 |
| UI-RESP-01 | Cross-module | Mobile responsive | iPhone/Android viewport | chạy Playwright nhiều viewport | layout không vỡ, CTA truy cập được | P1 |
| ERR-01 | Cross-module | Error state | DB unavailable | simulate DB down | API trả lỗi chuẩn, không leak stack | P0 |

## 4) API Test Coverage (minimum endpoints)
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/campaigns`, `GET /api/campaigns/:id`
- `POST /api/contributions`
- `GET /api/wallet`, `POST /api/wallet/redeem`
- `GET/POST /api/rewards`, `POST /api/vouchers/redeem`
- `POST /api/missions/:id/proofs`, `POST /api/proofs/:id/review`
- `GET /api/dashboard/brand`, `GET /api/dashboard/creator`, `GET /api/dashboard/admin`
- `POST /api/payments/webhook`
- `GET /api/notifications`, `GET /api/analytics`

## 5) Seed Test Data

### 5.1 Core seed entities
- Users:
  - `admin_1` (role admin)
  - `brand_1` (role brand)
  - `creator_1` (role creator, wallet 1000)
  - `creator_2` (role creator, wallet 50)
  - `user_1` (role user)
- Campaigns:
  - `camp_active_1` (active, has missions/rewards)
  - `camp_ended_1` (ended)
- Rewards/Vouchers:
  - `reward_last_slot` (remaining_slot=1)
  - `voucher_single_use_1` (single-use)
- Missions/Proof:
  - `mission_1` + `proof_pending_1`
- Payment:
  - `contribution_pending_1`, `webhook_event_1`

### 5.2 Seed states cho scenario đặc biệt
- Reward concurrency: `reward_last_slot.remaining_slot = 1`.
- Thiếu N-Points: `creator_2.wallet = 50`, reward cost = 100.
- Voucher double redeem: voucher trạng thái `UNUSED` ban đầu.
- Proof reject: tạo proof `PENDING` gắn cho mission.
- Webhook duplicate: cùng `event_id = payos_evt_001` gửi 2 lần.
- Unauthorized admin access: token `user_1` gọi route admin.

### 5.3 Reset strategy
- Mỗi test suite dùng transaction-per-test hoặc truncate theo thứ tự FK-safe.
- Seed idempotent: dùng upsert theo stable unique keys (`email`, `code`, `event_id`).

## 6) CI Commands đề xuất

### 6.1 Web workspace
```bash
npm run check-types --workspace=web
npm run lint --workspace=web
npm run test --workspace=web
npx vitest run --coverage
npx playwright test
```

### 6.2 Root pipeline
```bash
npm run check-types
npm run lint
npm run build
```

### 6.3 Suggested CI stage order
1. Install + cache deps.
2. Start PostgreSQL service.
3. `db:generate` + `db:migrate` + seed test data.
4. Unit + integration + API tests.
5. Race/webhook duplicate tests.
6. Playwright E2E + mobile responsive matrix.
7. Upload coverage + test report artifacts.

## 7) Go / No-Go Checklist

### 7.1 Go criteria (phải đạt)
- Tất cả test P0 pass 100%.
- Không còn bug open mức Critical/High.
- Pass 6 scenario đặc biệt bắt buộc:
  - reward còn 1 slot với nhiều user đồng thời
  - webhook duplicate 2 lần
  - user thiếu N-Points
  - mission proof bị reject
  - voucher redeem lần 2
  - user không có quyền vào admin
- Payment webhook idempotency xác nhận bằng DB log/event table.
- Permission matrix đã chạy đủ role: admin/brand/creator/user.
- Mobile responsive pass trên tối thiểu 3 viewport (375x812, 390x844, 768x1024).

### 7.2 No-Go triggers
- Có bất kỳ race condition test fail.
- Có duplicate financial transaction hoặc wallet mismatch.
- Có bypass RBAC/IDOR trên admin/brand/creator scope.
- Error response leak stack trace hoặc secret.
- Coverage < ngưỡng tối thiểu team thống nhất (gợi ý: line 80%, branch 70%).

## 8) Notes triển khai nhanh
- Hiện `apps/web` đang dùng `node --test`; nên chuẩn hóa về `Vitest` để đồng nhất unit/integration/API và coverage report.
- Tách folder:
  - `tests/unit`
  - `tests/integration`
  - `tests/api`
  - `tests/e2e`
  - `tests/concurrency`
- Đặt naming theo pattern: `<module>.<type>.spec.ts`.
