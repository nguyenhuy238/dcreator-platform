# dCreator Security Checklist

## Access Control
- [x] RBAC implemented (`Role`, route guards, API guards).
- [x] Route guard for `/dashboard/*` and `/admin/*`.
- [x] API authorization on protected routes.

## Input and API Safety
- [x] Zod validation for auth/contribution/payment/proof/admin flows.
- [x] Generic 500 response (no internal error leakage).
- [x] No secret env returned from API responses.

## Abuse Protection
- [x] Rate limit: login.
- [x] Rate limit: contribution.
- [x] Rate limit: proof submit.
- [x] Rate limit: payment create.

## Payment and Financial Security
- [x] Webhook signature verification (HMAC SHA-256).
- [x] Idempotency on contribution/payment/topup/payout.
- [x] No hard delete financial records (append/update status only).
- [x] User cannot self-edit wallet balances (service-controlled transactions only).

## Logging and Privacy
- [x] Do not expose sensitive fields in UI (email masking).
- [x] Do not log secrets or raw sensitive payload to response.
- [x] Audit log for admin decisions and finance transitions.

## Audit Coverage
- [x] Admin approve/reject campaign.
- [x] Admin approve/reject creator/brand.
- [x] Brand/admin approve/reject proof.
- [x] Wallet balance change.
- [x] Payment status change.
- [x] Voucher cancelled/redeemed.
- [x] User locked/unlocked.
- [ ] Payout approved/rejected (pending dedicated payout-review endpoint flow).

## Fraud Coverage
- [x] Contribution spam.
- [x] Multiple failed payments.
- [x] Duplicate webhook.
- [x] Proof spam.
- [x] Voucher redeem multiple attempts.
- [x] Shared session heuristic.
- [x] Creator duplicate URL submissions.

## Production Hardening TODO
- [ ] Move rate limit store to Redis.
- [ ] Add WAF / bot mitigation for public endpoints.
- [ ] Add alert pipeline from `RiskFlag` high score to Ops channel.
