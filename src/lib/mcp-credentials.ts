function randomToken(bytes = 24) {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function generateMcpApiKey() {
  return `sk_mcp_${randomToken(24)}`;
}

export function generateMcpClientId() {
  return `mcp_cli_${randomToken(12)}`;
}

export function generateMcpClientSecret() {
  return `mcp_sec_${randomToken(24)}`;
}
