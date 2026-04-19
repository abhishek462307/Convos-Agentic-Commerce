export function getMcpJwtSecret(): string {
  const secret = process.env.MCP_JWT_SECRET || process.env.MIGRATION_SECRET;
  if (!secret) {
    throw new Error('MCP JWT secret is not configured');
  }

  return secret;
}
