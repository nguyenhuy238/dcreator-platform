SELECT a.id, a.email, a."displayName", a.role, cp.id AS creator_profile_id
FROM "Account" a
LEFT JOIN "CreatorProfile" cp ON cp."accountId" = a.id
WHERE a.email = 'hathiduyen10042004@gmail.com';
