import logger from '@/lib/logger';
import { 
  AuthenticationState, 
  AuthenticationCreds, 
  SignalDataTypeMap, 
  BufferJSON, 
  proto,
  initAuthCreds
} from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabase-admin';

export async function useSupabaseAuthState(merchantId: string): Promise<{ 
  state: AuthenticationState; 
  saveCreds: () => Promise<void>; 
}> {
  const writeData = async (data: any, key: string) => {
    const { error } = await supabaseAdmin
      .from('whatsapp_auth')
      .upsert(
        { 
          merchant_id: merchantId, 
          key_id: key, 
          data: JSON.parse(JSON.stringify(data, BufferJSON.replacer)),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'merchant_id,key_id' }
      );
    
    if (error) {
      logger.error(`Error saving WhatsApp auth data for ${key}:`, error);
    }
  };

  const readData = async (key: string) => {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_auth')
      .select('data')
      .eq('merchant_id', merchantId)
      .eq('key_id', key)
      .single();

    if (error || !data) return null;
    return JSON.parse(JSON.stringify(data.data), BufferJSON.reviver);
  };

  const removeData = async (key: string) => {
    const { error } = await supabaseAdmin
      .from('whatsapp_auth')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('key_id', key);
    
    if (error) {
      logger.error(`Error removing WhatsApp auth data for ${key}:`, error);
    }
  };

  const creds: AuthenticationCreds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in (data as any)[category]) {
              const value = (data as any)[category][id];
              const key = `${category}-${id}`;
              if (value) {
                tasks.push(writeData(value, key));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  };
}

export async function clearWhatsAppAuth(merchantId: string) {
  const { error } = await supabaseAdmin
    .from('whatsapp_auth')
    .delete()
    .eq('merchant_id', merchantId);
  
  if (error) {
    logger.error('Error clearing WhatsApp auth:', error);
    throw error;
  }
}
