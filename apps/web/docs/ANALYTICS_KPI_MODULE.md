# Analytics/KPI Module

## API ingest event
- `POST /api/analytics/events`
- Body:
```json
{
  "eventName": "campaign_view",
  "sessionId": "8f2dd26b-5130-4ca7-b8b3-e1a22e8d3271",
  "campaignId": "cmp_xxx",
  "brandId": "acc_brand_xxx",
  "creatorId": "acc_creator_xxx",
  "metadata": {
    "source": "campaign_detail",
    "amountVnd": 200000
  }
}
```

## Client helper
- `lib/analytics/track-event.ts`
- Example:
```ts
import { trackEvent } from "@/lib/analytics/track-event";

await trackEvent({
  eventName: "campaign_cta_click",
  campaignId: campaign.id,
  brandId: campaign.brandId,
  creatorId: campaign.creatorId ?? undefined,
  metadata: { source: "campaign_detail_cta" }
});
```

## KPI endpoints
- Brand: `GET /api/brand/dashboard/analytics`
- Creator: `GET /api/creator/dashboard/analytics`
- Admin: `GET /api/admin/dashboard/analytics`

## Prisma query examples
```ts
// Brand campaign views
await prisma.analyticsEvent.count({
  where: { brandId, eventName: "campaign_view" }
});

// Brand CTA rate
const [views, clicks] = await Promise.all([
  prisma.analyticsEvent.count({ where: { brandId, eventName: "campaign_view" } }),
  prisma.analyticsEvent.count({ where: { brandId, eventName: "campaign_cta_click" } })
]);
const ctaRate = views ? (clicks / views) * 100 : 0;

// Creator proof approved
await prisma.analyticsEvent.count({
  where: { creatorId: accountId, eventName: "proof_approved" }
});

// Admin failed payments
await prisma.analyticsEvent.count({
  where: { eventName: "payment_failed" }
});
```

## Privacy
- Event metadata bị lọc key nhạy cảm (`password`, `token`, `cookie`, `authorization`, `card`, `cvv`, `otp`...).
- Không lưu payload thô từ client ngoài các field cần thiết.
- `userId` nullable để hỗ trợ guest.
