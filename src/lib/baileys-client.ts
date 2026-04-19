const BAILEYS_SERVER_URL = process.env.BAILEYS_SERVER_URL || 'http://localhost:4000'
const BAILEYS_API_SECRET = process.env.BAILEYS_API_SECRET

interface BaileysResponse {
  [key: string]: any
}

async function baileysRequest(path: string, options: { method?: string; body?: any } = {}): Promise<BaileysResponse> {
  const res = await fetch(`${BAILEYS_SERVER_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
        'Content-Type': 'application/json',
        ...(BAILEYS_API_SECRET ? { 'x-api-secret': BAILEYS_API_SECRET } : {})
      },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Baileys server error' }))
    throw new Error(err.error || `Baileys server returned ${res.status}`)
  }

  return res.json()
}

export async function baileysConnect(merchantId: string) {
  return baileysRequest('/connect', { method: 'POST', body: { merchantId } })
}

export async function baileysDisconnect(merchantId: string) {
  return baileysRequest('/disconnect', { method: 'POST', body: { merchantId } })
}

export async function baileysStatus(merchantId: string) {
  return baileysRequest(`/status/${merchantId}`)
}

export async function baileysSend(merchantId: string, to: string, text: string, mediaUrl?: string, mediaType?: string) {
  return baileysRequest('/send', { method: 'POST', body: { merchantId, to, text, mediaUrl, mediaType } })
}

export async function baileysBroadcast(merchantId: string, recipients: string[], text: string, mediaUrl?: string, mediaType?: string, delayMs?: number) {
  return baileysRequest('/broadcast', { method: 'POST', body: { merchantId, recipients, text, mediaUrl, mediaType, delayMs } })
}

export async function baileysSendInteractive(
  merchantId: string,
  to: string,
  payload: {
    type: 'buttons' | 'list' | 'product_card'
    body: string
    footer?: string
    header?: { title?: string }
    buttons?: Array<{ text: string; id?: string; url?: string }>
    sections?: Array<{
      title: string
      rows: Array<{ title: string; description?: string; id: string }>
    }>
  }
) {
  return baileysRequest('/send-interactive', {
    method: 'POST',
    body: { merchantId, to, ...payload }
  })
}
