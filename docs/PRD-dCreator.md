# Product Requirement Document (PRD) - dCreator

## 1. Executive Summary

dCreator là nền tảng độc lập kết hợp Creator Economy, Social Commerce, Crowd-sponsorship và Reward/Voucher nhằm kết nối 4 nhóm vai trò: Brand, Creator, User/Fan, Admin/Ops. Sản phẩm giúp Brand triển khai campaign nhanh, Creator kiếm thu nhập từ nhiệm vụ nội dung, User tham gia bằng tiền/N-Points để nhận lợi ích, và Admin kiểm soát vận hành, rủi ro, gian lận.

| Mục tiêu | Mô tả |
|---|---|
| Tăng hiệu quả marketing | Brand tạo campaign chuẩn hóa, theo dõi hiệu suất real-time |
| Tăng thu nhập Creator | Creator nhận mission rõ ràng, có quy trình proof minh bạch |
| Tăng tương tác User/Fan | User tham gia hoạt động, nhận reward/voucher/quà theo đóng góp |
| Kiểm soát vận hành | Admin/Ops duyệt, giám sát giao dịch và chống fraud theo policy |

## 2. Problem Statement

| Nhóm | Vấn đề hiện tại | Tác động |
|---|---|---|
| Brand | Khó quản lý campaign phân tán, thiếu tracking end-to-end | Tốn ngân sách, khó đo ROI |
| Creator | Thiếu nguồn job ổn định, điều kiện thanh toán không rõ | Thu nhập không đều, tranh chấp proof |
| User/Fan | Thiếu cơ chế tham gia có thưởng minh bạch | Giảm động lực tham gia chiến dịch |
| Ops | Duyệt thủ công rời rạc, khó phát hiện bất thường | Tăng rủi ro fraud, chargeback, khiếu nại |

## 3. Target Users

| Nhóm người dùng | Mô tả | Mục tiêu chính |
|---|---|---|
| Brand Manager | Quản lý ngân sách và hiệu quả campaign | Tạo campaign, tuyển creator, theo dõi KPI |
| Creator | Cá nhân/nhóm sản xuất nội dung | Nhận mission, nộp proof, nhận thưởng |
| User/Fan | Người tham gia campaign | Đóng góp points/tiền, nhận reward/voucher |
| Admin/Ops | Vận hành và kiểm soát nền tảng | Duyệt, xử lý giao dịch, chống gian lận |

## 4. Value Proposition

| Vai trò | Giá trị cốt lõi |
|---|---|
| Brand | Triển khai chiến dịch nhanh, phân bổ ngân sách rõ ràng, đo lường theo funnel |
| Creator | Nguồn mission liên tục, tiêu chí chấm rõ, thời gian xử lý thưởng minh bạch |
| User/Fan | Tham gia hoạt động có giá trị thực (voucher/reward), cơ chế tích lũy N-Points |
| Admin/Ops | Bảng điều khiển tập trung, rule-engine kiểm soát rủi ro và audit đầy đủ |

## 5. Product Scope

| Domain | In-Scope |
|---|---|
| Campaign | Tạo, duyệt, publish, tạm dừng, kết thúc campaign |
| Mission | Tạo mission theo campaign, nhận mission, nộp proof, duyệt proof |
| Reward/Voucher | Cấp phát, giới hạn, điều kiện sử dụng, hết hạn |
| Wallet/N-Points | Sổ cái points, earn/spend/refund/expire |
| Payment | Nạp tiền, tài trợ campaign, thanh toán và hoàn tiền theo rule |
| Admin/Ops | Quản trị user, duyệt nội dung, giám sát fraud, xử lý dispute |
| Analytics | Dashboard KPI theo vai trò |

## 6. MVP Scope

| Module MVP | Mô tả | Ưu tiên |
|---|---|---|
| Auth + RBAC cơ bản | Đăng ký/đăng nhập, role Brand/Creator/User/Admin | P0 |
| Campaign Management | Brand tạo campaign, Ops duyệt, publish | P0 |
| Mission & Proof | Creator nhận mission, nộp link proof, Admin duyệt | P0 |
| Wallet N-Points | Earn/spend/refund, transaction history | P0 |
| Reward/Voucher cơ bản | Rule phát thưởng và redeem voucher | P0 |
| Payment cơ bản | Nạp tiền chiến dịch, ghi nhận trạng thái giao dịch | P0 |
| Ops Console | Queue duyệt campaign/proof, flags fraud | P0 |
| KPI Dashboard MVP | Tổng quan campaign, conversion, burn rate | P1 |

## 7. Out of Scope (MVP)

| Hạng mục | Lý do defer |
|---|---|
| Livestream native trong nền tảng | Chi phí hạ tầng cao, ưu tiên link ngoài ở MVP |
| Recommendation AI nâng cao | Cần dữ liệu hành vi đủ lớn |
| Affiliate đa tầng | Phức tạp pháp lý/hoa hồng |
| Cross-border payment | Phụ thuộc compliance đa quốc gia |
| Mobile app native | MVP ưu tiên web responsive |

## 8. User Personas

| Persona | Nhu cầu | Pain point | Kỳ vọng sản phẩm |
|---|---|---|---|
| Lan - Brand Manager | Chạy chiến dịch theo ngân sách tháng | Báo cáo rời rạc | Dashboard ROI theo campaign |
| Minh - Creator Micro | Tìm job phù hợp niche | Duyệt proof chậm | SLA duyệt rõ ràng, payout minh bạch |
| Huy - Fan tích cực | Tham gia để nhận ưu đãi | Không rõ điều kiện thưởng | Rule nhận thưởng dễ hiểu |
| Trang - Ops Lead | Kiểm soát gian lận | Thiếu tín hiệu cảnh báo sớm | Fraud flags và audit log đầy đủ |

## 9. Main User Journeys

| Journey | Bước chính | Kết quả mong đợi |
|---|---|---|
| Brand launch campaign | Tạo campaign -> Nạp ngân sách -> Gửi duyệt -> Publish | Campaign active đúng lịch |
| Creator complete mission | Chọn mission -> Tạo nội dung -> Nộp proof -> Nhận duyệt | Creator nhận thưởng đúng SLA |
| User join reward program | Chọn campaign -> Dùng points/tiền -> Hoàn thành điều kiện | Nhận voucher/reward thành công |
| Ops control risk | Nhận queue -> Review rule flags -> Approve/Reject -> Audit | Giảm fraud và tranh chấp |

## 10. Functional Requirements

| Mã FR | Yêu cầu |
|---|---|
| FR-01 | Hệ thống phải cho phép Brand tạo campaign với ngân sách, thời gian, mục tiêu KPI |
| FR-02 | Hệ thống phải hỗ trợ trạng thái campaign: Draft, Pending Approval, Active, Paused, Ended, Rejected |
| FR-03 | Hệ thống phải cho phép Creator browse và nhận mission theo điều kiện eligibility |
| FR-04 | Hệ thống phải hỗ trợ nộp proof bằng link/video metadata/ảnh minh chứng |
| FR-05 | Hệ thống phải cho phép Admin/Ops duyệt proof theo rule và ghi lý do reject |
| FR-06 | Hệ thống phải quản lý wallet N-Points theo transaction ledger bất biến |
| FR-07 | Hệ thống phải hỗ trợ phát hành voucher/reward có quota, expiry, điều kiện redeem |
| FR-08 | Hệ thống phải ghi nhận thanh toán với trạng thái Pending/Success/Failed/Refunded |
| FR-09 | Hệ thống phải có module phát hiện bất thường theo ngưỡng rule-based |
| FR-10 | Hệ thống phải cung cấp dashboard KPI theo role |
| FR-11 | Hệ thống phải lưu audit log cho hành động quan trọng |
| FR-12 | Hệ thống phải hỗ trợ thông báo sự kiện chính (duyệt, thưởng, lỗi giao dịch) |

## 11. Non-functional Requirements

| Mã NFR | Yêu cầu |
|---|---|
| NFR-01 | Uptime mục tiêu MVP: >= 99.5% theo tháng |
| NFR-02 | P95 API read < 500ms, write < 800ms trong tải chuẩn MVP |
| NFR-03 | RBAC bắt buộc ở mọi endpoint nghiệp vụ |
| NFR-04 | Dữ liệu giao dịch, wallet, payment phải có idempotency key |
| NFR-05 | Mọi thay đổi trạng thái campaign/proof/payment phải audit được |
| NFR-06 | Backup dữ liệu hằng ngày, RPO <= 24h, RTO <= 8h |
| NFR-07 | Bảo mật dữ liệu nhạy cảm theo chuẩn mã hóa at-rest và in-transit |

## 12. Business Rules

| Mã BR | Rule |
|---|---|
| BR-01 | Campaign chỉ được publish khi đã được Ops duyệt và đủ ngân sách tối thiểu |
| BR-02 | Creator chỉ nhận mission nếu đạt điều kiện campaign (niche, follower, region nếu có) |
| BR-03 | Mỗi proof chỉ được duyệt 1 lần ở trạng thái cuối: Approved hoặc Rejected |
| BR-04 | Reward chỉ phát khi proof approved hoặc user hoàn tất điều kiện campaign |
| BR-05 | N-Points không âm; spend vượt số dư bị từ chối |
| BR-06 | Refund points/tiền chỉ thực hiện khi giao dịch gốc hợp lệ và còn trong thời hạn policy |
| BR-07 | Voucher hết hạn không thể redeem và không gia hạn tự động ở MVP |

## 13. Role & Permission Matrix

| Chức năng | Brand | Creator | User/Fan | Admin/Ops |
|---|---|---|---|---|
| Tạo/Sửa campaign draft | Có | Không | Không | Có |
| Gửi campaign duyệt | Có | Không | Không | Có |
| Duyệt/Reject campaign | Không | Không | Không | Có |
| Nhận mission | Không | Có | Không | Có (test/override) |
| Nộp proof | Không | Có | Không | Có (manual) |
| Duyệt proof | Không | Không | Không | Có |
| Nạp ngân sách campaign | Có | Không | Không | Có |
| Redeem voucher | Không | Có (nếu eligible) | Có | Có |
| Xem dashboard hệ thống | Giới hạn theo campaign | Giới hạn cá nhân | Giới hạn cá nhân | Toàn bộ |
| Quản lý fraud flags | Không | Không | Không | Có |

## 14. Campaign Types

| Loại campaign | Mô tả | KPI chính |
|---|---|---|
| Awareness | Tăng nhận diện qua nội dung creator | Reach, Views, Engagement Rate |
| Conversion | Tạo chuyển đổi mua hàng/đăng ký | CVR, CPA, GMV |
| Sponsorship Pool | User/Fan đóng góp vào quỹ tài trợ | Tổng đóng góp, số người tham gia |
| Voucher Drive | Kích hoạt dùng voucher theo thời gian | Redeem Rate, Incremental Orders |

## 15. Reward/Voucher Rules

| Nhóm rule | Quy tắc |
|---|---|
| Quota | Mỗi reward/voucher có tổng quota và quota theo user |
| Eligibility | Dựa trên vai trò, campaign, mission, mức đóng góp |
| Expiry | Có hạn dùng bắt buộc; hiển thị rõ timestamp hết hạn |
| Locking | Khi claim, voucher được khóa trong thời gian giữ chỗ ngắn |
| Redeem | Redeem 1 lần trừ khi định nghĩa multi-use |
| Reversal | Nếu phát hiện fraud, reward có thể revoke theo policy |

## 16. Wallet/N-Points Rules

| Rule | Mô tả |
|---|---|
| Ledger-first | Mọi thay đổi số dư phải xuất phát từ transaction ledger |
| Transaction types | Earn, Spend, Refund, Adjustment, Expire |
| Idempotency | API ghi điểm bắt buộc idempotency key |
| Expiration | Points có thể có hạn dùng theo batch earn |
| Negative balance | Không cho phép số dư âm |
| Reconciliation | Đối soát định kỳ giữa ledger và số dư materialized |

## 17. Mission/Proof Rules

| Rule | Mô tả |
|---|---|
| Assignment | Mission có thể first-come-first-serve hoặc invite-only |
| SLA proof | Proof phải nộp trong thời gian mission; quá hạn tự fail |
| Proof format | Chấp nhận link bài đăng/video + metadata tối thiểu |
| Review states | Pending, Approved, Rejected, Needs Revision |
| Re-submit | Cho phép nộp lại tối đa N lần (config per campaign) |
| Anti-spam | Chặn nộp proof trùng nội dung/link trong cùng campaign |

## 18. Payment Rules

| Rule | Mô tả |
|---|---|
| Funding | Brand phải nạp đủ ngân sách trước khi campaign active |
| States | Pending -> Success/Failed; hỗ trợ Refunded |
| Timeout | Giao dịch pending quá thời gian T chuyển sang failed |
| Webhook verify | Callback payment phải xác thực chữ ký |
| Refund policy | Hoàn tiền theo điều kiện campaign/policy và approval Ops |
| Audit | Mọi thay đổi trạng thái payment bắt buộc lưu audit trail |

## 19. Admin/Ops Rules

| Nhóm vận hành | Quy tắc |
|---|---|
| Campaign moderation | Checklist duyệt nội dung campaign trước publish |
| Proof moderation | Duyệt theo SLA và guideline chống gian lận |
| Fraud management | Rule-based flag: tài khoản mới bất thường, tần suất claim cao, trùng thiết bị/IP |
| Dispute handling | Có mã ticket, timeline xử lý, quyết định cuối có log |
| Access control | Tác vụ nhạy cảm áp dụng nguyên tắc least privilege |

## 20. Analytics/KPI

| Cấp độ | KPI |
|---|---|
| Campaign | Reach, Engagement, Submission Rate, Approval Rate, Cost per Approved Proof |
| Creator | Mission Accepted, Completion Rate, Avg Approval Time, Earnings |
| User/Fan | Participation Rate, Repeat Participation, Redeem Rate |
| Financial | Budget Burn Rate, Payment Success Rate, Refund Rate |
| Risk | Fraud Flag Rate, Confirmed Fraud Rate, Chargeback/Dispute Rate |

## 21. Risk & Compliance

| Rủi ro | Mô tả | Giảm thiểu |
|---|---|---|
| Fraud claim/redeem | Tạo tài khoản ảo, lạm dụng voucher | Device/IP fingerprint, velocity limits, manual review |
| Nội dung vi phạm | Creator đăng nội dung không phù hợp | Policy nội dung, queue kiểm duyệt, strike system |
| Thanh toán thất bại | Lỗi cổng thanh toán/webhook | Retry, reconciliation job, alerting |
| Rò rỉ dữ liệu | Truy cập trái phép dữ liệu người dùng | RBAC nghiêm ngặt, encryption, audit log |
| Tranh chấp thưởng | Không thống nhất điều kiện đạt | Điều khoản rõ ràng và lưu snapshot rule theo campaign |

## 22. Success Metrics

| Giai đoạn MVP | Chỉ số mục tiêu (90 ngày đầu) |
|---|---|
| Adoption | >= 30 Brand active, >= 500 Creator đăng ký, >= 5,000 User tham gia |
| Activation | >= 60% campaign draft được publish |
| Engagement | >= 40% creator nhận ít nhất 1 mission/tháng |
| Quality | Approval rate proof hợp lệ >= 70% |
| Financial | Payment success rate >= 95%, refund rate <= 5% |
| Ops | Median thời gian duyệt proof <= 24h |

## 23. MVP Launch Checklist

| Nhóm | Checklist |
|---|---|
| Product | Hoàn tất PRD, backlog, acceptance criteria |
| Engineering | Hoàn tất API core campaign/mission/wallet/payment; migration DB; smoke test |
| QA | Test case happy path + fraud + refund + phân quyền |
| Security | Kiểm tra auth, RBAC, secret management, webhook signature |
| Ops | SOP duyệt campaign/proof, playbook xử lý incident |
| Data | Dashboard MVP và tracking events đã xác minh |
| Legal/Policy | Terms, privacy, policy nội dung và hoàn tiền |
| Go-live | Kế hoạch rollout theo batch + monitor + rollback plan |

## 24. Future Roadmap

| Giai đoạn | Hạng mục |
|---|---|
| Phase 2 | Recommendation mission/campaign theo hành vi người dùng |
| Phase 2 | Hệ thống xếp hạng Creator và trust score |
| Phase 2 | Rule engine nâng cao cho fraud detection |
| Phase 3 | Livestream commerce native + realtime interactions |
| Phase 3 | Mobile app native cho Creator/User |
| Phase 3 | Cross-border campaign và đa tiền tệ |

---

## Phụ lục: Gợi ý chuyển PRD sang backlog

| Epic | User Story mẫu |
|---|---|
| Campaign Lifecycle | Là Brand, tôi muốn tạo campaign có KPI và ngân sách để gửi Ops duyệt |
| Mission Workflow | Là Creator, tôi muốn nhận mission và nộp proof để nhận thưởng |
| Wallet & Points | Là User, tôi muốn xem lịch sử Earn/Spend/Refund để kiểm soát số dư |
| Reward Engine | Là Admin, tôi muốn cấu hình điều kiện phát voucher để hạn chế lạm dụng |
| Ops Moderation | Là Ops, tôi muốn queue duyệt proof có filter flag để xử lý nhanh |
| Analytics | Là Brand, tôi muốn xem dashboard chuyển đổi để tối ưu ngân sách |
