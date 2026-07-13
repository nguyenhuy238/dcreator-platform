# dCreator Thống kê & Báo cáo

## 1. Tổng quan module

Module Thống kê & Báo cáo giúp đo hoạt động thật của dCreator cho Outcome 3:

Thương hiệu -> Chiến dịch -> Nhà sáng tạo ứng tuyển -> Nhiệm vụ -> Minh chứng -> Duyệt -> Thanh toán -> Thống kê.

Ba nhóm người dùng chính:

- Admin/OPS: xem toàn hệ thống, hàng chờ duyệt, chiến dịch, nhà sáng tạo, thanh toán và rút tiền.
- Thương hiệu/Merchant: xem hiệu quả chiến dịch, nhà sáng tạo, minh chứng, hoa hồng và rút tiền trong phạm vi thương hiệu.
- Creator: xem hiệu suất cá nhân theo ứng tuyển, nhiệm vụ, minh chứng, thu nhập và việc cần xử lý.

MVP không dùng donation/backer/contribution legacy làm KPI core. Các event hoặc bảng legacy vẫn có thể tồn tại để tương thích, nhưng báo cáo chính dựa trên campaign, creator mission, mission application/submission, wallet transaction, payout request và payment mapping đã chuẩn hóa.

## 2. Danh mục route và API

| Vai trò | UI Route | API | Mục đích | Guard |
|---|---|---|---|---|
| Admin/OPS | `/admin/analytics` | `GET /api/admin/dashboard/analytics` | Tổng quan thống kê quản trị | `requireAdminOps` |
| Admin/OPS | `/admin/analytics` | `GET /api/admin/dashboard/analytics/filter-options` | Danh sách lọc thương hiệu/chiến dịch | `requireAdminOps` |
| Admin/OPS | `/admin/analytics` | `GET /api/admin/dashboard/analytics/export` | Xuất CSV quản trị | `requireAdminOps` |
| Admin/OPS | N/A | `GET /api/admin/analytics` | Alias legacy về endpoint quản trị | Qua route canonical |
| Thương hiệu | `/dashboard/brand/analytics` | `GET /api/brand/dashboard/analytics` | Thống kê theo phạm vi thương hiệu | `requireBrandActor` |
| Thương hiệu | `/dashboard/brand/analytics` | `GET /api/brand/dashboard/analytics/filter-options` | Danh sách chiến dịch của thương hiệu | `requireBrandActor` |
| Thương hiệu | `/dashboard/brand/analytics` | `GET /api/brand/dashboard/analytics/export` | Xuất CSV thương hiệu | `requireBrandActor` |
| Nhà sáng tạo | `/dashboard/creator/analytics` | `GET /api/creator/dashboard/analytics` | Thống kê cá nhân của nhà sáng tạo | `requireApprovedCreator` |
| Nhà sáng tạo | `/dashboard/creator/analytics` | `GET /api/creator/dashboard/analytics/filter-options` | Danh sách chiến dịch của nhà sáng tạo | `requireApprovedCreator` |
| Nhà sáng tạo | `/dashboard/creator/analytics` | `GET /api/creator/dashboard/analytics/export` | Xuất CSV nhà sáng tạo | `requireApprovedCreator` |

## 3. Mapping nguồn dữ liệu

| Nhóm KPI | Nguồn chính | Nguồn bổ sung | Ghi chú |
|---|---|---|---|
| Tổng quan chiến dịch | `Campaign`, `BrandCampaignRequest` | `Campaign.status`, trạng thái review | Admin xem toàn hệ thống; thương hiệu chỉ xem phạm vi của mình. |
| Phễu chuyển đổi | `CreatorMission`, `MissionApplication`, `MissionSubmission` | Các enum lifecycle/review | Đo ứng tuyển -> duyệt -> giao/nhận nhiệm vụ -> nộp minh chứng -> duyệt/từ chối -> ghi nhận thưởng. |
| Chờ duyệt | `CreatorMission`, `MissionSubmission`, hàng chờ review campaign | API review Admin/Brand | Dùng cho hàng chờ vận hành. |
| Thanh toán / hoa hồng | `PaymentTransaction`, `WalletTransaction`, `PayoutRequest` | `analytics-payment-mapping.service.ts` | Giao dịch chưa phân loại được tách khỏi KPI chính. |
| Hiệu quả chiến dịch | `Campaign`, `CreatorMission`, `MissionApplication`, `MissionSubmission` | Payment summary theo chiến dịch | Admin/Brand có bảng chiến dịch; nhà sáng tạo chỉ thấy chiến dịch mình có liên quan. |
| Hiệu quả nhà sáng tạo | `CreatorMission`, `Account`, `CreatorProfile`, `MissionSubmission` | Mapping hoa hồng/rút tiền | Brand/Admin xem xếp hạng; creator không thấy dữ liệu creator khác. |
| Việc cần xử lý của nhà sáng tạo | `CreatorMission`, `MissionSubmission`, `PayoutRequest` | Trạng thái minh chứng/rút tiền | Chỉ dùng trong dashboard nhà sáng tạo. |
| Event tracking | `AnalyticsEvent` | `DCREATOR_ANALYTICS_EVENTS`, `trackDcreatorEvent` | Event canonical được giữ trong metadata khi cần tương thích enum legacy. |

## 4. Mô hình phân quyền

Admin/OPS:

- Dùng `requireAdminOps`.
- Có quyền xem dữ liệu toàn hệ thống.
- Bộ lọc thương hiệu/chiến dịch được tính ở server.

Thương hiệu:

- Dùng `requireBrandActor`.
- Scope lấy từ `account.currentBrandId` hoặc brand IDs đã được guard xác thực.
- Không tin `brandId` do client truyền lên.
- `campaignId` được service kiểm tra thuộc phạm vi thương hiệu trước khi trả dữ liệu.
- Không leak payout hoặc dữ liệu creator của thương hiệu khác.

Nhà sáng tạo:

- Dùng `requireApprovedCreator`.
- Scope lấy từ `account.id` của phiên đăng nhập.
- Không nhận `accountId` từ client.
- `campaignId` được kiểm tra qua `CreatorMission`, `MissionApplication` hoặc `MissionSubmission` của chính creator.

Nguyên tắc chung:

- Filter từ client chỉ là điều kiện lọc, không phải quyền truy cập.
- Scope luôn lấy từ guard server-side.
- Event business-critical được ghi ở server sau khi workflow thành công.

## 5. Xuất CSV

Admin:

- `GET /api/admin/dashboard/analytics/export?type=campaignPerformance`
- `GET /api/admin/dashboard/analytics/export?type=topCreators`
- `GET /api/admin/dashboard/analytics/export?type=funnel`
- `GET /api/admin/dashboard/analytics/export?type=pendingReview`

Thương hiệu:

- `GET /api/brand/dashboard/analytics/export?type=campaignPerformance`
- `GET /api/brand/dashboard/analytics/export?type=creatorPerformance`
- `GET /api/brand/dashboard/analytics/export?type=funnel`
- `GET /api/brand/dashboard/analytics/export?type=pendingReview`

Nhà sáng tạo:

- `GET /api/creator/dashboard/analytics/export?type=campaignPerformance`
- `GET /api/creator/dashboard/analytics/export?type=funnel`
- `GET /api/creator/dashboard/analytics/export?type=pendingActions`

Filter hỗ trợ:

- `from`
- `to`
- `campaignId`
- Admin hỗ trợ thêm `brandId`

Header CSV đã được chuẩn hóa tiếng Việt. Query `type` giữ nguyên để không đổi API contract. CSV helper escape cell có dấu phẩy, dấu nháy kép, CR hoặc LF. Format filename:

- `dcreator-admin-analytics-{type}-{YYYY-MM-DD}.csv`
- `dcreator-brand-analytics-{type}-{YYYY-MM-DD}.csv`
- `dcreator-creator-analytics-{type}-{YYYY-MM-DD}.csv`

## 6. Ghi chú payment mapping

File chính:

- `apps/web/lib/analytics-payment-mapping.ts`
- `apps/web/lib/services/analytics-payment-mapping.service.ts`

Schema groundwork đã có:

- `PaymentTransaction.intent`
- `PayoutRequest.creatorMissionId`
- `PayoutRequest.campaignId`
- `PayoutRequest.referenceType`
- `PayoutRequest.referenceId`

Quy tắc:

- Hoa hồng đã ghi nhận lấy từ `WalletTransaction` loại commission credit và scope mission/campaign.
- Rút tiền đã yêu cầu/đã thanh toán lấy từ `PayoutRequest`.
- Thương hiệu chỉ tính payout nếu payout có reference trực tiếp tới campaign hoặc creator mission thuộc thương hiệu đó.
- Payout legacy không có reference không được quy cho thương hiệu để tránh sai số cross-brand.
- Admin có thể xem tổng quan payout toàn nền tảng.
- `unknownPaymentTransactionsVnd` là phần giao dịch có intent thiếu/chưa phân loại và không cộng vào KPI core.

Hạn chế:

- Nếu một payout gom nhiều mission/campaign, direct reference chưa đủ. Trường hợp đó cần `PayoutAllocation` trong tương lai.

## 7. Event taxonomy

Event canonical MVP:

- `campaign_request_created`
- `campaign_request_approved`
- `campaign_created`
- `campaign_published`
- `campaign_completed`
- `creator_application_submitted`
- `creator_application_approved`
- `creator_application_rejected`
- `creator_mission_assigned`
- `creator_mission_accepted`
- `creator_mission_declined`
- `creator_proof_submitted`
- `creator_proof_approved`
- `creator_proof_rejected`
- `creator_reward_credited`
- `creator_payout_requested`
- `creator_payout_paid`
- `payment_succeeded`
- `payment_failed`
- `analytics_dashboard_viewed`
- `analytics_csv_exported`

File triển khai:

- `apps/web/lib/analytics-events.ts`
- `apps/web/lib/analytics-event-taxonomy.ts`
- `apps/web/lib/services/analytics-event.service.ts`

Đã gắn tracking server-side cho:

- Ứng tuyển của creator.
- Ứng tuyển được duyệt/từ chối.
- Nhiệm vụ được giao/được nhận.
- Minh chứng đã nộp/đã duyệt/bị từ chối.
- Thanh toán thành công/thất bại.
- Call rút tiền đã yêu cầu/đã thanh toán.
- Call xuất CSV Admin/Brand/Creator.

Tương thích DB:

- `AnalyticsEvent.eventName` hiện là Prisma enum legacy.
- Event canonical map được sang enum legacy sẽ persist.
- Tên event canonical được giữ ở `metadata.dcreatorEventName`.
- Event chưa có enum sẽ được helper skip fail-safe cho tới khi có migration enum additive.

An toàn metadata:

- Không ghi password, token, secret, cookie, authorization, OTP, checksum, signature, hash, rawPayload, accountNumber, bankAccount, private URL, card, CVV.
- Chuỗi dài được cắt ngắn.
- Tracking lỗi không làm fail business workflow.

## 8. Checklist QA thủ công

### Admin

- [ ] Mở `/admin/analytics`.
- [ ] Dashboard tải thành công.
- [ ] KPI cards hiển thị tiếng Việt.
- [ ] Tổng quan chiến dịch hiển thị.
- [ ] Phễu chuyển đổi hiển thị.
- [ ] Hàng chờ duyệt hiển thị.
- [ ] Tổng quan thanh toán / hoa hồng hiển thị.
- [ ] Bảng hiệu quả chiến dịch hiển thị.
- [ ] Bảng nhà sáng tạo nổi bật hiển thị.
- [ ] Lọc theo thương hiệu.
- [ ] Lọc theo chiến dịch.
- [ ] Lọc theo ngày.
- [ ] Xuất CSV chiến dịch.
- [ ] Xuất CSV top nhà sáng tạo.
- [ ] Xuất CSV phễu.
- [ ] Xuất CSV chờ duyệt.
- [ ] Không thấy mock data.
- [ ] Không có console error trên happy path.

### Thương hiệu

- [ ] Mở `/dashboard/brand/analytics`.
- [ ] Dashboard tải thành công.
- [ ] Chỉ thấy chiến dịch của thương hiệu hiện tại.
- [ ] KPI cards hiển thị tiếng Việt.
- [ ] Phễu chuyển đổi hiển thị.
- [ ] Hàng chờ duyệt hiển thị.
- [ ] Tổng quan thanh toán / hoa hồng hiển thị.
- [ ] Hiệu quả chiến dịch hiển thị.
- [ ] Hiệu quả nhà sáng tạo hiển thị.
- [ ] Lọc theo chiến dịch.
- [ ] Lọc theo ngày.
- [ ] Xuất CSV.
- [ ] Thử `campaignId` ngoài phạm vi brand và xác nhận bị chặn.
- [ ] Không thấy payout/creator data của brand khác.

### Nhà sáng tạo

- [ ] Mở `/dashboard/creator/analytics`.
- [ ] Dashboard tải thành công.
- [ ] Chỉ thấy chiến dịch/nhiệm vụ của creator đang đăng nhập.
- [ ] KPI cards hiển thị tiếng Việt.
- [ ] Phễu chuyển đổi hiển thị.
- [ ] Việc cần xử lý hiển thị.
- [ ] Tổng quan thu nhập / hoa hồng hiển thị.
- [ ] Hiệu quả chiến dịch hiển thị.
- [ ] Lọc theo chiến dịch.
- [ ] Lọc theo ngày.
- [ ] Xuất CSV.
- [ ] Thử `campaignId` ngoài phạm vi creator và xác nhận bị chặn.
- [ ] Không thấy dữ liệu creator khác.

## 9. Hạn chế đã biết

- Chưa có chart.
- Chưa có phân tích ROI nâng cao.
- Chưa có migration enum đầy đủ cho toàn bộ canonical events.
- Chưa có `PayoutAllocation`.
- Payout legacy không có reference không thể map an toàn cho thương hiệu.
- Một số event canonical chỉ là tracking call, chưa persist DB do enum legacy thiếu value.
- `prisma generate` / build có thể fail cục bộ trên Windows do lock file Prisma query engine DLL `EPERM`.
- Full test suite có thể còn lỗi legacy ngoài scope Analytics/Report.

## 10. Kịch bản demo Outcome 3

1. Admin mở `/admin/analytics`.
2. Admin giới thiệu tổng quan toàn hệ thống: chiến dịch đang chạy, phễu nhiệm vụ, hàng chờ duyệt, thanh toán và hoa hồng.
3. Admin lọc theo thương hiệu, chiến dịch và ngày để chứng minh dữ liệu có thể drill-down theo vận hành.
4. Admin xuất CSV hiệu quả chiến dịch hoặc top nhà sáng tạo.
5. Đại diện thương hiệu mở `/dashboard/brand/analytics`.
6. Thương hiệu xem hiệu quả chiến dịch và hiệu quả nhà sáng tạo trong phạm vi của mình.
7. Thương hiệu lọc một chiến dịch và xuất CSV.
8. Nhà sáng tạo mở `/dashboard/creator/analytics`.
9. Nhà sáng tạo xem phễu cá nhân, việc cần xử lý, thu nhập và hiệu quả chiến dịch.
10. Người thuyết trình giải thích event tracking đã chuẩn hóa bằng `DCREATOR_ANALYTICS_EVENTS` và `trackDcreatorEvent`.
11. Chốt thông điệp: module này giúp dCreator đo được hoạt động thật từ chiến dịch, nhiệm vụ, minh chứng, review, thanh toán, rút tiền và xuất báo cáo.
12. Nêu phần mở rộng tương lai: chart, ROI, event dashboard, enum migration và `PayoutAllocation` cho payout gom nhiều mission/campaign.
