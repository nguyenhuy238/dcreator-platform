SELECT title, "creatorDepositAmountVnd", "creatorDepositRequired", "fulfillmentMode"
FROM "Campaign"
WHERE "fulfillmentMode" = 'BRAND_SHIP'
ORDER BY "updatedAt" DESC
LIMIT 15;
