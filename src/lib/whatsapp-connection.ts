import appLogger from '@/lib/logger';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { clearWhatsAppAuth, useSupabaseAuthState } from './whatsapp';
import { supabaseAdmin } from './supabase-admin';
import pino from 'pino';
import { Boom } from '@hapi/boom';

const logger = pino({ level: 'silent' });
const connections = new Map<string, any>();
const retryCounts = new Map<string, number>();

export async function connectWhatsApp(merchantId: string, options: { force?: boolean } = {}) {
  if (connections.has(merchantId)) {
    logger.info(`Connection already exists for ${merchantId}`);
    return;
  }

  if (options.force) {
    await clearWhatsAppAuth(merchantId);
    await supabaseAdmin
      .from('whatsapp_configs')
      .upsert({
        merchant_id: merchantId,
        status: 'connecting',
        qr_code: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'merchant_id' });
  }

  const { state, saveCreds } = await useSupabaseAuthState(merchantId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger,
    browser: ['Convos', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: false,
  });

  connections.set(merchantId, sock);
  retryCounts.set(merchantId, retryCounts.get(merchantId) || 0);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await supabaseAdmin
        .from('whatsapp_configs')
        .upsert({ 
          merchant_id: merchantId, 
          qr_code: qr, 
          status: 'qr_ready',
          updated_at: new Date().toISOString()
        }, { onConflict: 'merchant_id' });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const currentRetry = retryCounts.get(merchantId) || 0;
      const nextRetry = currentRetry + 1;
      retryCounts.set(merchantId, nextRetry);

      appLogger.info('WhatsApp connection closed', { err: lastDisconnect?.error, shouldReconnect, merchantId });
      
      connections.delete(merchantId);
      
      if (shouldReconnect && nextRetry <= 3) {
        setTimeout(() => connectWhatsApp(merchantId), 2000 * nextRetry);
      } else {
        await supabaseAdmin
          .from('whatsapp_configs')
          .update({ 
            status: 'disconnected', 
            qr_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('merchant_id', merchantId);
      }
    } else if (connection === 'open') {
      logger.info('Opened connection');
      retryCounts.set(merchantId, 0);
      await supabaseAdmin
        .from('whatsapp_configs')
        .update({ 
          status: 'connected', 
          qr_code: null,
          phone_number: sock.user?.id.split(':')[0],
          updated_at: new Date().toISOString()
        })
        .eq('merchant_id', merchantId);
    }
  });

  return sock;
}

export function getWhatsAppConnection(merchantId: string) {
  return connections.get(merchantId);
}

export async function disconnectWhatsApp(merchantId: string) {
  const sock = connections.get(merchantId);
  if (sock) {
    await sock.logout();
    connections.delete(merchantId);
  }
}
