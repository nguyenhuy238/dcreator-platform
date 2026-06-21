# Resend password reset environment

Forgot Password sends temporary password emails through Resend. These variables are required at server startup/build time:

```bash
RESEND_API_KEY=
PASSWORD_RESET_FROM_EMAIL="dCreator <no-reply@dcreator.vn>"
```

Do not commit `.env` files or real secret values. Keep secrets only in local shell, local `.env`, or the deploy provider secret store.

## Local development

Add the variables to `apps/web/.env` or export them in the shell before starting the web app:

```bash
RESEND_API_KEY=your-resend-api-key
PASSWORD_RESET_FROM_EMAIL="dCreator <no-reply@dcreator.vn>"
npm run dev -w web
```

## Vercel

This repo is linked to Vercel through `.vercel/project.json`. Add both variables to every Vercel target used by the app:

```bash
vercel env add RESEND_API_KEY development
vercel env add PASSWORD_RESET_FROM_EMAIL development

vercel env add RESEND_API_KEY preview
vercel env add PASSWORD_RESET_FROM_EMAIL preview

vercel env add RESEND_API_KEY production
vercel env add PASSWORD_RESET_FROM_EMAIL production
```

After changing Production values, redeploy the app:

```bash
vercel --prod
```

Vercel UI path: Project Settings -> Environment Variables. Add the same two keys for Development, Preview, and Production.

## Docker

No `Dockerfile` or `docker-compose.yml` is present in this repo. If Docker deployment is added later, pass these variables to the web runtime container:

```yaml
environment:
  RESEND_API_KEY: ${RESEND_API_KEY}
  PASSWORD_RESET_FROM_EMAIL: ${PASSWORD_RESET_FROM_EMAIL}
```

## GitHub Actions

No `.github/workflows` directory is present in this repo. If GitHub Actions deploy is added later, pass repository or environment secrets into the deploy step:

```yaml
env:
  RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
  PASSWORD_RESET_FROM_EMAIL: ${{ secrets.PASSWORD_RESET_FROM_EMAIL }}
```
