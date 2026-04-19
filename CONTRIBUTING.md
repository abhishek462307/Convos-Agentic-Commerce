# Contributing to Convos

Thanks for contributing. This guide explains how to set up the project locally, how to structure changes, and what checks are expected before opening a pull request.

## Repository expectations

We aim for:

- Small, focused PRs
- Clear intent and context
- Tests or evidence of validation when behavior changes
- Minimal unrelated refactors

## Getting started

### 1. Fork and branch

1. Fork the repository.
2. Create a branch from `main`:

```bash
git checkout -b feature/your-change
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Set the required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

### 4. Bootstrap the database

Run these files in order in the Supabase SQL Editor:

```text
1. base_schema.sql
2. migration.sql
3. 01_rls_migration.sql
```

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`, complete `/setup`, and verify the dashboard loads.

## Development workflow

### Scope and organization

- Keep PRs scoped to one feature, bug fix, or refactor.
- Avoid mixing formatting or unrelated cleanup in the same PR.
- Use existing patterns in `src/app`, `src/components`, and `src/lib`.

### Data and auth

- Database and auth changes should use Supabase.
- For schema changes, include migration steps or SQL notes in the PR description.

### Payments

- Payment-related changes should align with existing Stripe integration patterns.
- Do not introduce new payment providers without a clear design and migration plan.

### Optional integrations

- Guard optional features behind env configuration.
- Do not assume provider credentials exist in development.

## Tests and checks

Run the same checks used by CI before opening a PR:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

If a check cannot be run locally (e.g. external service dependency), describe what you did to validate the change.

## Pull request checklist

- Clear title and short problem statement
- Linked issue or context
- Screenshots or video for UI changes
- Migration or env notes when applicable
- Risks, rollout considerations, or breaking changes

## Commit style

Use clear, imperative messages:

- `Add merchant setup guard`
- `Fix checkout tax calculation`
- `Refactor order status mapping`

## Reporting security issues

Do not open public issues for vulnerabilities. See `SECURITY.md`.

## Code of conduct

By participating, you agree to follow `CODE_OF_CONDUCT.md`.
