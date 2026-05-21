# dCreator — Claude Code Rules
# Single source of truth cho Claude khi làm việc với codebase này.
# File này được load tự động bởi Claude Code ở mọi session.

---

## 1. PROJECT IDENTITY

Đây là **dCreator** — nền tảng Creator Economy + Social Commerce + Crowd-sponsorship
thuộc hệ sinh thái **NONE O2O Ecosystem** (Việt Nam).

Core philosophy: **"Inventory as Capital"**
→ Brand đưa hàng tồn kho làm vốn campaign
→ Creator kêu gọi Fan ủng hộ qua commerce
→ Fan mua voucher/gift = ủng hộ Creator + nhận hàng thật + tích điểm

**KHÔNG phải:** app donate / sàn TMĐT thông thường / crowdfunding vốn.
**LÀ:** Commerce + Creator Economy + Loyalty + O2O Retail trong một hệ thống.

---

## 2. TECH STACK

``` 
Frontend : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
UI       : Radix UI · shadcn/ui · Framer Motion
Backend  : Supabase (PostgreSQL + Auth + Realtime + Storage) · Prisma ORM
           Next.js Server Actions + API Routes
State    : Zustand (cart/local) · TanStack Query + IndexedDB persist (server data)
Payment  : PayOS · OnePay (webhook-based settlement)
Notify   : OneSignal · Telegram queue · Messenger hooks
Deploy   : Bun runtime · Caddy reverse proxy → localhost:3000
```

**Data access priority:** Supabase RPC (PL/pgSQL) > Supabase SDK > Prisma
Business logic sống ở DB migrations, KHÔNG ở TypeScript service layer.

---

## 3. PROJECT STRUCTURE

```
src/
├── app/
│   ├── (main)/          # homepage, auth, wallet, user profile
│   ├── (merchant)/      # brand dashboard, merchant portal
│   ├── (storefront)/    # e-commerce, cart, checkout
│   ├── (pos)/           # POS terminal
│   ├── (dcreator)/      # ← PRIMARY VERTICAL: campaign, donate, mission
│   └── ops/             # OPS CMS, admin panel
├── features/            # feature-sliced modules
├── shared/              # infra, providers, lib, types
supabase/
└── migrations/          # canonical business logic — không sửa tùy tiện
```

**Multi-domain routing** (middleware.ts):
- `kocogi.vn` → main + ops
- `foodify.vn` → merchant + POS
- `samsua.online` → storefront
- `dcreator.kocogi.vn` → dCreator platform

---

## 4. CORE DATABASE TABLES (dCreator)

```sql
-- Campaign core
campaigns              (id, title, creator_id, brand_id, type, status,
                        funding_goal, funded_amount, max_backers,
                        start_date, end_date, cover_image)

campaign_rewards       (id, campaign_id, title, price_points,
                        stock_total, stock_remaining, reward_type)

campaign_missions      (id, campaign_id, title, mission_type,
                        reward_points, max_participants, deadline)

campaign_backers       (id, campaign_id, user_id, amount_points,
                        contribution_count, first_backed_at)

campaign_participants  (id, campaign_id, creator_id, status,
                        applied_at, approved_at, reject_reason)

campaign_tiktoks       (id, campaign_id, creator_id, video_url,
                        thumbnail, views, likes)

-- User assets
user_vouchers          (id, user_id, campaign_id, reward_id, code,
                        status, value, expires_at, redeemed_at_station_id)

user_missions          (id, user_id, mission_id, status,
                        accepted_at, submitted_at, proof_url, reject_reason)

creator_channels       (id, creator_id, platform, channel_url,
                        followers, verified)

-- Finance
wallets                (id, owner_id, owner_type, balance_points,
                        balance_fiat, is_locked)

wallet_transactions    (id, wallet_id, type, amount, reference_id)

payment_transactions   (id, user_id, gateway, amount, status,
                        order_code, webhook_received_at)
```

---

## 5. CRITICAL RPCs

Gọi qua: `supabase.rpc('rpc_name', { param: value })`

| RPC | Parameters | Must-know |
|-----|-----------|-----------|
| `donate_to_campaign` | p_campaign_id, p_user_id, p_reward_id, p_amount_points, p_payment_method | **ATOMIC** — dùng SELECT FOR UPDATE tránh race condition |
| `claim_campaign_reward` | p_contribution_id, p_user_id, p_shipping_address_id | Verify contribution confirmed → issue voucher → trừ stock_remaining |
| `request_voucher_redemption` | p_voucher_code, p_station_id, p_user_id | O2O flow — update status=used, ghi station |
| `accept_mission_task` | p_mission_id, p_user_id | Lock slot, check max_participants |
| `submit_mission_proof_v3` | p_user_mission_id, p_proof_url, p_proof_type, p_notes | status → pending_review |
| `approve_mission_submission` | p_user_mission_id, p_ops_user_id | status → done, credit N-Points tự động |
| `confirm_gateway_payment` | p_order_code, p_gateway, p_amount, p_webhook_data | **IDEMPOTENT** — check status trước |
| `fund_campaign_budget` | p_campaign_id, p_brand_id, p_amount, p_funding_type | Trừ prepaid fund Brand |
| `disburse_master_camp` | p_campaign_id, p_ops_user_id | Payout + retention loop |

---

## 6. REALTIME SUBSCRIPTIONS

**Bắt buộc** trên Campaign Detail page:

```typescript
const channel = supabase
  .channel(`campaign-${campaignId}`)
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'campaigns',
    filter: `id=eq.${campaignId}`
  }, handleCampaignUpdate)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'campaign_backers',
    filter: `campaign_id=eq.${campaignId}`
  }, handleBackersUpdate)
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'campaign_rewards',
    filter: `campaign_id=eq.${campaignId}`
  }, handleRewardsUpdate)
  .subscribe()

// Cleanup bắt buộc:
return () => supabase.removeChannel(channel)
```

---

## 7. STATE MACHINES

```
Campaign:      draft → active → completed | cancelled
Participant:   pending → approved | rejected
Mission:       doing → pending_review → done | rejected
Contribution:  payment_pending → confirmed → reward_allocated → voucher_issued | failed
```

---

## 8. BUSINESS RULES — KHÔNG ĐƯỢC VI PHẠM

### 8.1 Token Flow (ONE-WAY — tuyệt đối)
```
VNĐ → N-Points → Voucher → Redeem tại None Station
```
- Voucher **KHÔNG** quy đổi ngược ra VNĐ
- User thường **KHÔNG** cash-out (chỉ Creator sau payout approval)

### 8.2 Language / CTA
- **DÙNG:** "Ủng Hộ", "Đổi Quà", "Tham Gia", "Nhận Reward"
- **KHÔNG DÙNG:** "Buy Now", "Add to Cart", "Purchase", "Mua Ngay"
- **KHÔNG GỌI** đây là "đầu tư tài chính" hay "crowdfunding vốn"

### 8.3 Campaign
- Chỉ `status = active` mới nhận donation
- `stock_remaining = 0` → lock reward tier đó
- `max_backers` đủ → campaign đóng nhận mới

### 8.4 Race Conditions — phải xử lý
- `donate_to_campaign`: SELECT FOR UPDATE trong RPC
- `accept_mission_task`: lock slot theo max_participants
- `stock_remaining`: atomic decrement với check > 0

### 8.5 Payment Webhooks
- **PHẢI** verify signature (PayOS checksum, OnePay hash)
- **PHẢI** idempotent: check `payment_transaction.status` trước khi credit
- Response `200 OK` kể cả khi đã xử lý rồi (tránh retry loop)

### 8.6 Brand Rules
- Brand lock khi: `is_locked = true` hoặc `credit_balance ≤ debt_limit`
- Subscription renewal: trừ `credit_balance` → fallback OnePay token → grace 5 ngày → lock
- Fee deduction: theo `commission_rate`, loại trừ `shipping_fee`

---

## 9. DESIGN DNA — CODE IMPLEMENTATION

### 9.1 Color Tokens (Tailwind classes)
```
Background   : bg-white, bg-zinc-50
Text primary : text-zinc-900
Text muted   : text-zinc-500, text-zinc-400
Border       : border-zinc-100, border-zinc-200
CTA primary  : bg-zinc-900 text-white
Success      : text-emerald-600 bg-emerald-50 border-emerald-200
Warning      : text-amber-600 bg-amber-50 border-amber-200
Error        : text-red-600 bg-red-50 border-red-200
```

### 9.2 Component Patterns
```tsx
// Card
<div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-zinc-100
                shadow-sm hover:-translate-y-1 hover:shadow-md
                transition-all duration-300 p-6">

// Button primary
<button className="bg-zinc-900 text-white rounded-xl px-6 py-3 font-semibold
                   hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200">

// Filter pill
<button className={cn(
  "rounded-full px-4 py-1.5 text-sm transition-all duration-200",
  active ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
)}>

// Loading skeleton
<div className="animate-pulse bg-zinc-100 rounded-xl h-48 w-full" />
```

### 9.3 Layout Rules
```tsx
// Mobile bottom nav safe area — LUÔN LUÔN thêm
<main className="pb-24">  {/* tránh BottomNav đè content */}

// Bottom nav
<nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl
                border-t border-zinc-100
                pb-[env(safe-area-inset-bottom)]">
```

### 9.4 State Requirements — MỌI component fetch data PHẢI có
```tsx
// Pattern bắt buộc:
if (isLoading) return <SkeletonCard />          // 1. Loading
if (error) return <ErrorState message={...} />  // 2. Error
if (!data?.length) return <EmptyState />        // 3. Empty
return <ActualContent data={data} />            // 4. Data

// Toast notifications
toast.success("Đã ủng hộ campaign thành công!")  // emerald
toast.error("Không đủ N-Points")                  // red
```

### 9.5 Donate CTA Eligibility States
```tsx
// Theo thứ tự kiểm tra:
if (!user) return <Button onClick={redirectLogin}>Đăng nhập để tham gia</Button>
if (campaign.status !== 'active') return <Button disabled>Đã kết thúc</Button>
if (backerSlotFull) return <Button disabled>Hết slot</Button>
if (participantStatus === 'pending') return <Button disabled>Đang chờ duyệt</Button>
if (participantStatus === 'rejected') return <Button onClick={reapply}>Đăng ký lại</Button>
return <Button onClick={openDonateModal}>Ủng Hộ Creator</Button>
```

---

## 10. SECURITY RULES

```typescript
// ✅ ĐÚNG — dùng Supabase service role ở server-side only
import { createServiceClient } from '@/shared/lib/supabase/server'

// ❌ SAI — KHÔNG expose service role ở client
const supabase = createClient(url, SERVICE_ROLE_KEY) // client-side = lỗi bảo mật

// ✅ Webhook signature verify (PayOS)
const isValid = crypto
  .createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY!)
  .update(rawBody)
  .digest('hex') === receivedSignature
if (!isValid) return new Response('Unauthorized', { status: 401 })

// ✅ Idempotent webhook
const existing = await supabase
  .from('payment_transactions')
  .select('status')
  .eq('order_code', orderCode)
  .single()
if (existing.data?.status === 'paid') return new Response('OK') // đã xử lý
```

---

## 11. FILE CONVENTIONS

### Naming
```
src/app/(dcreator)/campaigns/[id]/page.tsx    # route page
src/features/dcreator/components/CampaignCard.tsx
src/features/dcreator/hooks/useCampaignDetail.ts
src/features/dcreator/actions/donateActions.ts
src/features/dcreator/types/campaign.types.ts
```

### Import order
```typescript
// 1. React/Next
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// 2. External libs
import { motion } from 'framer-motion'
// 3. Internal shared
import { supabase } from '@/shared/lib/supabase/client'
import { cn } from '@/shared/lib/utils'
// 4. Feature-local
import { CampaignCard } from '../components/CampaignCard'
import type { Campaign } from '../types/campaign.types'
```

---

## 12. CRITICAL FILES — KHÔNG SỬA TÙY TIỆN

| File | Lý do |
|------|-------|
| `middleware.ts` | Domain routing + auth guard toàn hệ thống |
| `src/features/checkout/useCheckout.ts` | Checkout orchestration — source of truth |
| `src/app/api/webhooks/payos/route.ts` | PayOS webhook — idempotent |
| `src/app/api/webhooks/onepay/ipn/route.ts` | OnePay IPN |
| `prisma/schema.prisma` | Schema source of truth |
| `supabase/migrations/` | Business logic DB — không reorder |

**Trước khi sửa file trên: hỏi lại hoặc comment rõ lý do.**

---

## 13. KNOWN TECHNICAL DEBT

- `next.config.ts` + `next.config.mjs` tồn tại song song → merge vào `next.config.ts`
- Checkout logic duplicate giữa `page.tsx` và `useCheckout.ts` → chỉ dùng hook
- `NoneEngineContext.tsx` vẫn còn `createMockData` → replace bằng live Supabase fetch
- Migration files có nhiều `manual/emergency/hotfix` → không tạo thêm pattern này
- Mix Prisma + Supabase SDK + raw SQL → ưu tiên Supabase RPC cho business logic

---

## 14. ENVIRONMENT VARIABLES

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only
DATABASE_URL=                   # Prisma

# Payment
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
ONEPAY_MERCHANT_ID=
ONEPAY_ACCESS_CODE=
ONEPAY_HASH_SECRET=

# Notifications
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Shipping/Map
AHAMOVE_API_KEY=
NEXT_PUBLIC_GOONG_API_KEY=

# AI (optional)
OPENROUTER_API_KEY=
GEMINI_API_KEY=
```
