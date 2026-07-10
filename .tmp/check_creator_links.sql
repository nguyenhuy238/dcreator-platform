SELECT a.id, a.email, a.role, cp.id AS creator_profile_id, cp."mainPlatform", cp."socialUrl", cp."followerCount"
FROM "Account" a
LEFT JOIN "CreatorProfile" cp ON cp."accountId" = a.id
WHERE a.email = 'hathiduyen10042004@gmail.com';

SELECT csl.id, csl.platform, csl.handle, csl."socialUrl", csl.followers, csl."isActive", csl."verificationStatus", csl.status
FROM "CreatorSocialLink" csl
JOIN "CreatorProfile" cp ON cp.id = csl."creatorProfileId"
JOIN "Account" a ON a.id = cp."accountId"
WHERE a.email = 'hathiduyen10042004@gmail.com'
ORDER BY csl."createdAt" DESC;
