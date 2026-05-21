# dCreator System Architecture (SaaS/Web App độc lập)

## 1. Kiến trúc tổng quan

dCreator được thiết kế là nền tảng SaaS đa vai trò, multi-tenant mức tổ chức (Brand), theo kiến trúc **modular monolith + event-driven async pipeline** trong giai đoạn đầu để tối ưu tốc độ ra mắt, chi phí vận hành, và tính nhất quán dữ liệu giao dịch (wallet/payment/reward).

### Text Architecture Diagram

```text
[Web Client: User | Creator | Brand | Admin]
        |
        v
[CDN/WAF + API Gateway/BFF]
        |
        v
[Backend App - Modular Monolith]
  |-- Auth & RBAC Module
  |-- Campaign Marketplace Module
  |-- Contribution Module
  |-- Mission & Proof Module
  |-- Reward/Voucher Module
  |-- Wallet/N-Points Ledger Module
  |-- Payment Module
  |-- Notification Orchestrator
  |-- Fraud/Risk Engine (rule-based)
  |-- Analytics Query API
  |-- Admin/Ops Module
        |
        +-----------------------------+
        |                             |
        v                             v
 [PostgreSQL Primary]           [Redis]
 (OLTP + Ledger + Audit)        (cache, rate limit, queue short-lived)
        |
        v
 [Object Storage (S3-compatible)]
 (proof media, voucher assets, export reports)
        |
        v
 [Event Bus / Queue]
 (Outbox -> workers -> notification, analytics ETL, fraud checks)
        |
        v
 [Data Warehouse / OLAP]
 (BI dashboards, KPI, cohort)

External Integrations:
- Payment Gateway + Webhook
- Email/SMS/Push Provider
- Optional Social Platform APIs (verify proof metadata)
```

## 2. Tech stack đề xuất

| Layer | Đề xuất | Lý do |
|---|---|---|
| Frontend | Next.js (App Router), TypeScript, React Query, Zod | SSR/SEO cho marketplace, typed validation, DX tốt |
| UI | Shared UI package + Tailwind CSS + design tokens | Tái sử dụng giữa vai trò, nhất quán giao diện |
| Backend | Node.js (NestJS hoặc Fastify + module pattern), TypeScript | Phù hợp domain web/API, dễ module hóa |
| DB OLTP | PostgreSQL | ACID mạnh cho payment/wallet/audit |
| Cache/Queue nhẹ | Redis | Caching, rate limit, distributed lock ngắn hạn |
| Message Queue | Kafka/RabbitMQ/SQS (tùy cloud) | Xử lý bất đồng bộ, tách tải nền |
| Object Storage | S3-compatible | Lưu proof/media với lifecycle policy |
| Analytics | ClickHouse/BigQuery/Snowflake | Truy vấn KPI nhanh theo sự kiện lớn |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki | Tracing/metrics/log tập trung |
| CI/CD | GitHub Actions + IaC (Terraform) | Chuẩn hóa deploy, dễ audit |
| Infra | Kubernetes (mid-term) hoặc ECS/App Service (MVP) | Linh hoạt scale theo giai đoạn |

## 3. Monolith hay microservice? Giải thích lựa chọn

### Quyết định đề xuất
**Giai đoạn MVP + Growth sớm: Modular Monolith.**

### Trade-off

| Tiêu chí | Modular Monolith | Microservices |
|---|---|---|
| Time-to-market | Nhanh hơn | Chậm hơn do phân tán hệ thống |
| Vận hành | Đơn giản | Phức tạp (service discovery, tracing, ops) |
| Nhất quán giao dịch | Dễ đảm bảo ACID trong 1 DB | Cần saga/outbox phức tạp |
| Scale độc lập module | Hạn chế | Tốt hơn |
| Tổ chức team lớn | Hạn chế khi > nhiều squad | Phù hợp scale tổ chức |

### Lộ trình tiến hóa
- Giai đoạn 1: Modular Monolith + Outbox events.
- Giai đoạn 2: Tách dịch vụ có tải cao/độc lập rõ: Notification, Analytics ingestion, Fraud engine, Payment adapter.
- Giai đoạn 3: Tách Wallet Ledger khi cần SLA/certification cao.

## 4. Frontend architecture

| Thành phần | Thiết kế |
|---|---|
| App shell | Next.js web app đa khu vực: `/marketplace`, `/creator`, `/brand`, `/admin` |
| BFF/API client | Typed SDK từ OpenAPI; server actions chỉ cho trường hợp cần |
| State management | React Query cho server state; Zustand/Context cho UI state cục bộ |
| Form | React Hook Form + Zod schema đồng nhất với backend contracts |
| Access control UI | Route guard + permission-based component rendering |
| Performance | SSR cho public pages, ISR cho listing, lazy load dashboard modules |

## 5. Backend architecture

### Module boundaries

| Module | Trách nhiệm |
|---|---|
| Auth | Identity, session/token, RBAC, policy checks |
| Campaign | CRUD campaign, publish lifecycle, eligibility rules |
| Contribution | User support flow bằng tiền/points, allocation |
| Reward/Voucher | Issuance, claim, redeem, expiration/revoke |
| Wallet | Ledger N-Points, balance projection, reconciliation |
| Mission/Proof | Assignment mission, submit proof, moderation workflow |
| Payment | Payment intent, webhook verify, refund orchestration |
| Notification | Event consume, template render, gửi đa kênh |
| Fraud/Risk | Rule engine, risk score, action recommend |
| Admin/Ops | Case management, override có audit |
| Analytics API | Query KPI role-based |
| Audit | Immutable action trail |

### Kiểu tương tác
- Sync: REST API nội bộ module trong process.
- Async: Domain events qua outbox -> queue -> workers.

## 6. Database architecture

### OLTP (PostgreSQL)

| Nhóm schema | Bảng lõi |
|---|---|
| identity | users, roles, permissions, user_role_bindings, sessions |
| campaign | campaigns, campaign_rules, campaign_budgets, campaign_status_logs |
| mission | missions, mission_assignments, proofs, proof_reviews |
| reward | rewards, vouchers, voucher_redemptions |
| wallet | wallets, wallet_ledger_entries, wallet_balance_snapshots |
| payment | payment_intents, payment_transactions, payment_webhook_events, refunds |
| ops | fraud_flags, risk_cases, disputes |
| analytics | event_outbox, materialized_metrics (MVP) |
| audit | audit_logs |

### Nguyên tắc dữ liệu
- Soft delete cho entity nghiệp vụ, hard delete chỉ cho dữ liệu tạm.
- Ledger append-only với khóa idempotency.
- Partition theo thời gian cho audit_logs, event tables, webhook events.
- Read replicas cho dashboard query nặng.

## 7. Auth architecture

| Thành phần | Thiết kế |
|---|---|
| Auth protocol | OIDC-compatible, JWT access token + refresh token rotate |
| RBAC | Role theo actor (User/Creator/Brand/Admin/Ops) + permission chi tiết |
| Tenant model | Brand tenant isolation logic ở app + row-level access policy |
| Session security | HttpOnly secure cookie (web), token binding thiết bị nếu cần |
| Hardening | MFA cho Admin/Ops và thao tác nhạy cảm |
| Authorization layer | Policy guard tại endpoint + domain service check |

## 8. Payment architecture

```text
Client -> Create Payment Intent -> Gateway Hosted Checkout
       <- Redirect/Status Poll
Gateway -> Webhook -> Verify Signature -> Idempotent Process
        -> Update payment_transaction
        -> Emit PaymentSucceeded/Failed/Refunded
        -> Trigger Wallet/Reward/Campaign budget updates
```

| Quy tắc | Thiết kế |
|---|---|
| Idempotency | Mọi webhook xử lý theo `provider_event_id` duy nhất |
| Double-entry link | Payment success phải map transaction + budget movement |
| Reconciliation | Job đối soát định kỳ với provider statement |
| Failure handling | Retry exponential + DLQ cho webhook processing |

## 9. Realtime architecture

| Use case realtime | Công nghệ |
|---|---|
| Cập nhật trạng thái proof/campaign | WebSocket hoặc SSE qua gateway |
| Notification in-app | Pub/Sub nội bộ + Redis |
| Dashboard near real-time | Polling 15-60s ở MVP, nâng cấp stream sau |

Trade-off: MVP ưu tiên SSE/polling để giảm độ phức tạp vận hành; WebSocket full-duplex chỉ bật cho màn hình cần tần suất cao.

## 10. Storage architecture

| Loại dữ liệu | Nơi lưu | Chính sách |
|---|---|---|
| Proof media/video metadata | Object storage | Pre-signed URL upload, antivirus scan async |
| Avatar/banner/creative | Object storage + CDN | Versioning + cache headers |
| Export report | Object storage | TTL và lifecycle archive/delete |
| Transactional data | PostgreSQL | Backup + PITR |

## 11. Notification architecture

| Bước | Mô tả |
|---|---|
| Event emit | Domain event phát từ module nghiệp vụ |
| Orchestration | Worker ánh xạ event -> template -> channel |
| Channel delivery | Email/SMS/Push/In-app |
| Delivery tracking | Lưu trạng thái sent/delivered/failed |
| Retry | Retry theo policy, dead-letter nếu vượt ngưỡng |

## 12. Admin/Ops architecture

| Thành phần | Mô tả |
|---|---|
| Ops Console | Dashboard moderation campaign/proof/payment/fraud |
| Case Management | Quản lý dispute/fraud case có SLA |
| Rule Management | Cấu hình ngưỡng risk/fraud (versioned rules) |
| Manual Action | Approve/reject/hold/refund/revoke với bắt buộc reason |
| Audit & Forensics | Timeline hành động và truy vết actor |

## 13. Security architecture

| Layer | Biện pháp |
|---|---|
| Edge | WAF, DDoS protection, bot mitigation |
| App | RBAC + ABAC bổ sung cho tài nguyên tenant |
| Data | TLS 1.2+, encryption at rest, secret vault |
| API | Rate limiting, input validation, anti-replay webhook |
| Secure SDLC | SAST/DAST, dependency scan, secret scan |
| Ops security | MFA bắt buộc, IP allowlist cho admin nhạy cảm |

## 14. Deployment architecture

```text
Git Push -> CI (lint/test/build/security scan) -> Artifact Registry
      -> CD Staging (auto) -> E2E/Smoke -> Manual Gate
      -> CD Production (blue/green or canary)
```

| Môi trường | Mục tiêu |
|---|---|
| Dev | Phát triển nhanh, data seed |
| Staging | Gần production, test tích hợp payment sandbox |
| Production | HA, autoscaling, backup/PITR, observability đầy đủ |

## 15. Folder structure đề xuất

```text
dcreator-platform/
  apps/
    web/                       # Next.js frontend (multi-role)
    api/                       # Backend app (modular monolith)
    workers/                   # Async workers: notification, analytics, fraud
  packages/
    ui/                        # Shared UI components + tokens
    config/                    # Shared ESLint/TS/Prettier config
    contracts/                 # OpenAPI schemas, DTO contracts
    observability/             # Logging/tracing setup
    testing/                   # Test utilities, fixtures
  infrastructure/
    terraform/                 # IaC modules
    k8s/                       # Helm/chart manifests (nếu dùng K8s)
  docs/
    PRD-dCreator.md
    ARCHITECTURE-dCreator.md
    ADR/                       # Architecture Decision Records
  scripts/
    db/
    ci/
```

## 16. Coding convention

| Hạng mục | Convention |
|---|---|
| Ngôn ngữ | TypeScript strict mode |
| Naming | `camelCase` biến/hàm, `PascalCase` class/type, `SCREAMING_SNAKE_CASE` env |
| Module | Domain-first (`modules/campaign/...`) |
| Validation | Boundary validation bắt buộc bằng schema |
| Time | Lưu UTC, convert timezone ở presentation layer |
| Money/Points | Dùng integer minor unit, không dùng float |

## 17. API design convention

| Quy ước | Mô tả |
|---|---|
| Style | RESTful, resource-based, versioned `/api/v1` |
| Idempotency | POST giao dịch bắt buộc `Idempotency-Key` |
| Pagination | Cursor-based cho list lớn, offset cho list nhỏ |
| Filtering | Query params chuẩn hóa (`status`, `from`, `to`, `sort`) |
| Response envelope | `data`, `meta`, `error` nhất quán |
| Compatibility | Backward compatible; breaking change qua version mới |

## 18. Error handling convention

| Loại lỗi | Cách xử lý |
|---|---|
| Validation lỗi client | HTTP 400 với field-level errors |
| AuthN/AuthZ | HTTP 401/403, message chuẩn hóa không lộ thông tin nhạy cảm |
| Not found | HTTP 404 với error code domain-specific |
| Business rule violation | HTTP 409/422 tùy ngữ cảnh |
| External dependency lỗi | HTTP 502/503 + retry hint |
| Internal error | HTTP 500 với trace id, log chi tiết server-side |

Error format chuẩn: `code`, `message`, `details`, `traceId`, `timestamp`.

## 19. Logging & monitoring

| Thành phần | Thiết kế |
|---|---|
| Structured logs | JSON logs, correlation id xuyên request/event |
| Metrics | RED/USE metrics cho API, queue, DB |
| Tracing | Distributed tracing qua OpenTelemetry |
| Alerting | SLO-based alert: error rate, latency, queue lag, webhook failure |
| Audit logs | Tách khỏi app logs, immutable, retention dài hạn |
| Dashboard | Dashboard theo domain: payment, wallet, campaign, ops |

## 20. Scalability plan

### Phase A (MVP: 0 -> 50k MAU)
- 1 backend app scale ngang (stateless) + PostgreSQL primary/read replica.
- Redis cho cache/rate-limit.
- Worker process riêng cho jobs nặng.

### Phase B (Growth: 50k -> 500k MAU)
- Tách `workers` thành deployment độc lập.
- Thêm queue bền vững + DLQ + replay tooling.
- Materialized views + read replicas cho dashboard.

### Phase C (Scale: >500k MAU)
- Tách service Notification, Fraud, Analytics ingestion.
- Tách Wallet Ledger service nếu TPS giao dịch tăng mạnh.
- Sharding theo tenant/campaign thời gian nếu cần.

### Trade-off mở rộng

| Quyết định | Ưu điểm | Chi phí |
|---|---|---|
| Giữ modular monolith lâu hơn | Tốc độ phát triển nhanh, ít overhead ops | Scale module độc lập khó hơn |
| Tách sớm microservice | Scale linh hoạt từng domain | Độ phức tạp kỹ thuật và đội ngũ tăng mạnh |
| OLTP + OLAP tách biệt | Truy vấn analytics nhanh, không ảnh hưởng giao dịch | Tăng chi phí pipeline dữ liệu |

---

## Bảng module tổng hợp

| Module | Actor chính | Dữ liệu chính | KPI vận hành |
|---|---|---|---|
| Auth & Role Management | Tất cả | users, roles, sessions | Login success rate, auth latency |
| Campaign Marketplace | User/Creator/Brand | campaigns, listings | CTR, campaign discovery rate |
| Campaign Detail | Tất cả | campaign_rules, milestones | Detail-to-action conversion |
| Contribution/Support Flow | User/Fan | contributions, allocations | Contribution success rate |
| Reward/Voucher System | User/Creator/Brand/Ops | rewards, vouchers, redemptions | Redeem rate, fraud redemption rate |
| Wallet/N-Points | User/Creator | wallets, ledger_entries | Ledger reconciliation mismatch |
| Mission & Proof Review | Creator/Ops | missions, proofs, reviews | Proof approval SLA |
| Creator Dashboard | Creator | earnings, mission stats | Mission completion rate |
| Brand Dashboard | Brand | spend, ROI metrics | CAC/CPA, budget burn |
| Admin/Ops Dashboard | Admin/Ops | flags, disputes, audits | Case resolution time |
| Payment Webhook | System/Ops | webhook_events, transactions | Webhook success + retry rate |
| Analytics | Brand/Ops | events, aggregates | Query latency, data freshness |
| Notification | Tất cả | notifications, templates | Delivery success rate |
| Audit Log | Admin/Ops/Compliance | audit_logs | Coverage ratio critical actions |
| Fraud/Risk Control | Ops | risk_scores, flags | Confirmed fraud rate |
