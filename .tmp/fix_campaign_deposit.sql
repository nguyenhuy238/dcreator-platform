UPDATE "Campaign"
SET "creatorDepositAmountVnd" = 50000,
    "updatedAt" = NOW()
WHERE id = 'cmrdavbf8001deqvczhdtrj1i';

SELECT id, title, "creatorDepositRequired", "creatorDepositAmountVnd", status
FROM "Campaign"
WHERE id = 'cmrdavbf8001deqvczhdtrj1i';
