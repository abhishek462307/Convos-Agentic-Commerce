export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();
    try {
      await import('../sentry.server.config');
    } catch {
      // Sentry config is optional in open-source setups
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    try {
      await import('../sentry.edge.config');
    } catch {
      // Sentry config is optional in open-source setups
    }
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const Sentry = await import('@sentry/nextjs');
  return (Sentry.captureRequestError as (...a: unknown[]) => void)(...args);
};
