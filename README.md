Convos
Convos

Convos is a self‑hosted, single‑merchant commerce application that bundles a storefront, checkout, and merchant dashboard with optional AI‑assisted shopping. It is designed for teams who want full control of data, infrastructure, and brand experience without a hosted SaaS dependency.

Website: https://www.convos.store
Demo store: https://convos.store/store/artisancoffee

License: AGPL‑3.0‑only. See LICENSE.

Quick deploy links
Deploy with Vercel Deploy to Netlify Deploy to Render Deploy on Railway

Fly.io: https://fly.io/docs/apps/
Docker (self‑host): docker compose up --build
For any platform, you still need a Supabase project and environment configuration.

What you get
Storefront

Conversational shopping experience with cart and checkout
AI‑assisted product discovery (optional)
Product/category browsing and search
Merchant dashboard

Products, variants, inventory, and collections
Orders, refunds, and payment activity
Customers and segmentation
Store settings (brand, domain, SEO, shipping, email, and more)
Setup and operations

First‑run setup flow for creating the initial merchant workspace
Self‑host readiness checks in the dashboard
Optional integrations for payments, AI, email, and messaging
Architecture overview
Frontend: Next.js 15 + React 19 + TypeScript
Backend: Next.js App Router API routes
Database + Auth: Supabase (Postgres + Auth)
Payments: Stripe (optional)
AI: OpenAI, Anthropic, Azure OpenAI (optional)
Requirements
Required

Node.js 20+
npm 10+
A Supabase project
Optional integrations

OpenAI / Anthropic / Azure OpenAI (AI features)
Stripe (payments)
SMTP (transactional email)
MCP (external assistant access)
WhatsApp (via Baileys‑compatible bridge)
Quick start (local development)
1. Install dependencies
npm ci
2. Create your local env file
cp .env.example .env.local
3. Set required environment variables
Minimum required values:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
For local development:

NEXT_PUBLIC_APP_URL=http://localhost:3000
4. Bootstrap the database
Open the Supabase SQL Editor and execute these files in order:

1. base_schema.sql
2. migration.sql
3. 01_rls_migration.sql
Notes:

base_schema.sql creates the minimum tables required for a blank project.
The setup wizard blocks merchant creation if required schema is missing.
Running files out of order can leave the app partially initialized.
5. Start the app
npm run dev
6. Complete first‑run setup
Visit http://localhost:3000
Create an account or sign in
Complete /setup to create the first merchant workspace
You will be redirected to /dashboard
First‑run flow (expected behavior)
Signed‑out users are redirected from / to /login.
Login/signup redirects to /setup.
Completing setup creates the merchant workspace.
The merchant dashboard loads.
If this does not happen, validate your Supabase keys and confirm the SQL bootstrap order.

Supabase setup (recommended)
Create a new Supabase project.
Copy Project URL and anon public key for:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
Copy the service role key for:
SUPABASE_SERVICE_ROLE_KEY
Configure Auth redirect URLs to match your NEXT_PUBLIC_APP_URL:
https://your-domain.com/*
http://localhost:3000/* for local testing
Run the SQL bootstrap files in order.
Environment variables
All variables are documented in .env.example. Only core Supabase values are required for first boot. Everything else is optional unless the feature is enabled.

Required
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
Optional integrations
AI: OPENAI_*, ANTHROPIC_*, AZURE_OPENAI_*
Stripe: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PLATFORM_WEBHOOK_SECRET
SMTP: PLATFORM_SMTP_*
MCP: MCP_API_KEY, MCP_CLIENT_SECRET, MCP_JWT_SECRET
WhatsApp: BAILEYS_*
If a provider is not configured, keep those values empty and the feature will remain disabled.

Internal secrets (production)
Set strong values in production:

MIGRATION_SECRET
INTERNAL_API_SECRET
EMAIL_INTERNAL_SECRET
CRON_SECRET
any MCP secrets you use
Docker
cp .env.example .env.local
docker compose up --build
The container runs the Next.js app only. Supabase remains an external dependency.

Deployment guidance (detailed)
Vercel
Create a new project from your GitHub repo.
Add required environment variables (see above).
Set NEXT_PUBLIC_APP_URL to your Vercel domain.
Add the Vercel URL to Supabase Auth redirect URLs.
Deploy.
Netlify / Render / Railway
Connect the repo and configure build command: npm run build
Set start command: npm run start
Add required environment variables
Update Supabase Auth redirect URLs to include your domain
Fly.io / VPS / self‑managed
Build the app using npm run build
Run npm run start in production mode
Set env variables in your process manager or container
Add your domain to Supabase Auth redirect URLs
Production checklist
Before going live:

Set NEXT_PUBLIC_APP_URL to your HTTPS domain.
Update Supabase auth redirect URLs to match that domain.
Set strong values for internal secrets.
Configure payment webhooks if Stripe is enabled.
Validate the install in Settings -> Self‑Host Setup.
Troubleshooting
Login/Setup fails: missing or incorrect Supabase keys.
Auth redirect loops: NEXT_PUBLIC_APP_URL mismatch or missing Supabase redirect URL.
Setup blocked: SQL bootstrap not fully applied or run out of order.
Payments not working: missing Stripe keys or webhook secret.
Security reporting
Please do not report vulnerabilities in public issues. See SECURITY.md for the correct channels.

Documentation
Self‑hosting: docs/SELF_HOSTING.md
Contributing: CONTRIBUTING.md
Security: SECURITY.md
Code of conduct: CODE_OF_CONDUCT.md
