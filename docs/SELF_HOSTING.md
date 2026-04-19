# Self-hosting Convos

This guide walks through a full self-host setup for a single-merchant Convos deployment, including environment configuration, database bootstrap, and production readiness.

## Contents

1. Requirements
2. Install dependencies
3. Configure environment
4. Bootstrap the database
5. Start the app
6. Complete first-run setup
7. Optional integrations
8. Docker
9. Production checklist
10. Troubleshooting

## 1. Requirements

Required:

- Node.js 20+
- npm 10+
- A Supabase project (database + auth)

Optional integrations:

- OpenAI, Anthropic, or Azure OpenAI (AI features)
- Stripe (payment flows)
- SMTP (transactional email)
- MCP (external assistant access)
- WhatsApp via a Baileys-compatible bridge

## 2. Install dependencies

```bash
npm ci
```

## 3. Configure environment

Create a local environment file from the committed template:

```bash
cp .env.example .env.local
```

### Required values

These are required for the app to boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

For local development:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional values

All other values in `.env.example` are optional unless you enable their feature.

## 4. Bootstrap the database

Open the Supabase SQL Editor and execute these files **in order**:

```text
1. base_schema.sql
2. migration.sql
3. 01_rls_migration.sql
```

Notes:

- `base_schema.sql` creates the minimum tables for a blank Supabase project.
- The setup wizard checks for required schema before allowing merchant creation.
- Running these out of order can leave the app in a partially initialized state.

## 5. Start the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

## 6. Complete first-run setup

Expected flow:

1. Signed-out users are redirected from `/` to `/login`.
2. After signup or login, the app routes to `/setup`.
3. Completing setup creates the first merchant workspace.
4. The merchant dashboard loads.

If setup does not complete, confirm Supabase keys and SQL bootstrap order.

## 7. Optional integrations

Configure only the features you plan to use.

### AI providers

Use one of the following:

- OpenAI: `OPENAI_*`
- Anthropic: `ANTHROPIC_*`
- Azure OpenAI: `AZURE_OPENAI_*`

### Stripe

Required for payments:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PLATFORM_WEBHOOK_SECRET`

### SMTP

Use `PLATFORM_SMTP_*` for transactional email.

### MCP

Required for MCP access:

- `MCP_API_KEY`
- `MCP_CLIENT_SECRET`
- `MCP_JWT_SECRET`

### WhatsApp

Use `BAILEYS_SERVER_URL` and `BAILEYS_API_SECRET`.

If a provider is not configured, leave its values empty and the feature will remain disabled.

## 8. Docker

```bash
cp .env.example .env.local
docker compose up --build
```

The container runs the Next.js app only. Supabase remains external.

## 9. Production checklist

Before deploying publicly:

1. Set `NEXT_PUBLIC_APP_URL` to your production HTTPS domain.
2. Update Supabase auth redirect URLs to match that domain.
3. Set strong values for internal secrets:
   - `MIGRATION_SECRET`
   - `INTERNAL_API_SECRET`
   - `EMAIL_INTERNAL_SECRET`
   - `CRON_SECRET`
   - any MCP secrets you use
4. Configure Stripe webhook secrets if Stripe is enabled.
5. Validate the install in `Settings -> Self-Host Setup` after setup is complete.

## 10. Troubleshooting

- Missing `NEXT_PUBLIC_APP_URL` breaks generated links and auth callbacks.
- Missing Supabase keys prevents login and setup from completing.
- Running only one SQL file leaves the app partially initialized.
- Empty optional values are acceptable only if the related feature is disabled.
