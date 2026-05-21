# Auth & Role Management Module

## Environment variables

- `AUTH_SESSION_SECRET`: minimum 32 chars, used for signing session token.
- `DATABASE_URL`: PostgreSQL connection for Prisma.

## API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/role-requests/creator`
- `POST /api/role-requests/brand`
- `POST /api/admin/role-requests/:requestId/approve`

## Security notes

- Passwords use `scrypt` hash with random salt (`salt:hash`).
- Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Session state is persisted in DB (`AuthSession`) and can be revoked on logout.
- Same-origin check is enforced for all state-changing auth endpoints.
- Login rate limit: max 5 attempts / 10 minutes per `IP+email` key.
- Middleware route guard validates signed session token and role gates protected routes.

## Route guard rules

- `/dashboard/user`: `USER` and above.
- `/dashboard/creator`: `CREATOR`.
- `/dashboard/brand`: `BRAND_OWNER` or `BRAND_STAFF`.
- `/admin`: `ADMIN` or `OPS`.

## Test cases (automated)

- Register schema validates a valid payload.
- Login schema rejects invalid password length.
- Creator/Brand role-request schemas validate expected payloads.
- Password hash verification passes and fails correctly.
- Role helper logic enforces expected permissions.
