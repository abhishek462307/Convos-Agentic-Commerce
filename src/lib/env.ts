import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalStripeSecret = z.preprocess(emptyToUndefined, z.string().startsWith('sk_').optional());
const optionalWebhookSecret = z.preprocess(emptyToUndefined, z.string().startsWith('whsec_').optional());
const optionalLogLevel = z.preprocess(
  emptyToUndefined,
  z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional()
);

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: optionalString,
  AZURE_OPENAI_API_KEY: optionalString,
  AZURE_OPENAI_ENDPOINT: optionalUrl,
  AZURE_OPENAI_DEPLOYMENT_NAME: optionalString,

  STRIPE_SECRET_KEY: optionalStripeSecret,
  STRIPE_PLATFORM_WEBHOOK_SECRET: optionalWebhookSecret,

  INTERNAL_API_SECRET: optionalString,
  CRON_SECRET: optionalString,

  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  SENTRY_ORG: optionalString,
  SENTRY_PROJECT: optionalString,

  PLATFORM_SMTP_HOST: optionalString,
  PLATFORM_SMTP_PORT: optionalString,
  PLATFORM_SMTP_USER: optionalString,
  PLATFORM_SMTP_PASSWORD: optionalString,
  PLATFORM_SMTP_FROM_EMAIL: optionalEmail,
  PLATFORM_SMTP_FROM_NAME: optionalString,

  AZURE_OPENAI_CHAT_DEPLOYMENT: optionalString,
  AZURE_EMBEDDING_DEPLOYMENT: optionalString,

  BAILEYS_SERVER_URL: optionalUrl,
  BAILEYS_API_SECRET: optionalString,

  MCP_API_KEY: optionalString,
  MCP_CLIENT_SECRET: optionalString,
  MCP_JWT_SECRET: optionalString,
  MIGRATION_SECRET: optionalString,
  EMAIL_INTERNAL_SECRET: optionalString,
  LOG_LEVEL: optionalLogLevel,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let _cachedEnv: ServerEnv | null = null;

export function validateEnv(): ServerEnv {
  if (_cachedEnv) return _cachedEnv;

  const result = serverSchema.safeParse(process.env);

  if (result.success) {
    _cachedEnv = result.data;
    return _cachedEnv;
  }

  const missing = result.error.issues
    .map((i) => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`\n❌ Environment validation failed:\n${missing}\n`);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variables — see logs above');
  }

  return process.env as unknown as ServerEnv;
}

export const env = validateEnv();
