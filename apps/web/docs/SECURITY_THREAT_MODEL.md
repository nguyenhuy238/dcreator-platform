# dCreator Standalone Threat Model

## Scope
- Web app API routes (`apps/web/app/api/**`)
- Auth/session, role-based access, admin operations
- Payment/webhook, wallet, payout, voucher, contribution, mission proof

## Critical Assets
- `Account`, `AuthSession`, roles and lock state
- `Wallet`, `WalletTransaction`, `PaymentTransaction`, `PayoutRequest`
- `Contribution`, `RewardClaim` (voucher), `MissionSubmission`
- Secret env (`PAYOS_WEBHOOK_SECRET`, `INTERNAL_API_KEY`, session secret)
- Audit and fraud evidence (`AuditLog`, `RiskFlag`)

## Trust Boundaries
- Browser/client -> API routes
- API routes -> DB (Prisma)
- External payment gateway webhook -> webhook routes
- Admin/Ops routes -> privileged operations

## Main Threats
1. Broken access control
- Mitigation: role guard in middleware + API guard (`requireAuth`, `requireAnyRole`, `requireAdminOps`).
2. Unauthorized API manipulation
- Mitigation: route-level authorization checks + resource ownership checks.
3. Input injection / malformed payload
- Mitigation: Zod validation on auth/payment/contribution/proof/admin payloads.
4. Abuse/spam traffic
- Mitigation: rate limit on login, contribution, proof submit, payment create.
5. Webhook forgery / replay
- Mitigation: HMAC signature verification + idempotency checks + duplicate webhook fraud flag.
6. Financial tampering
- Mitigation: no direct wallet mutation endpoint; balance changes only in service transaction flows.
7. Duplicate processing
- Mitigation: idempotency keys + pending-only state transition for webhook processing.
8. Data integrity and non-repudiation
- Mitigation: audit log for approvals/rejections/financial states/locks.
9. Sensitive data leakage
- Mitigation: generic 500 errors, masked emails in admin UI, avoid logging secrets/payloads.
10. Fraud behavior
- Mitigation: `RiskFlag` detection for spam/failure/replay/redeem/duplicate URL/shared session heuristic.

## Residual Risks
- In-memory rate limit resets on restart (recommend Redis).
- Device fingerprint is heuristic via session metadata/event, not full fingerprinting.
- Need SIEM forwarding and alerting policy for production.
