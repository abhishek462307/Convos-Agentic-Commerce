"use server"

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { sendPromotionalEmail } from '@/lib/email';
import logger from '@/lib/logger';

interface EmailTemplateData {
  merchant_id: string;
  name: string;
  subject: string;
  content: string;
  preview_text?: string;
  headline?: string;
  body_text?: string;
  cta_text?: string;
  cta_url?: string;
}

interface CampaignData {
  merchant_id: string;
  name: string;
  type: string;
  subject?: string;
  content?: Record<string, unknown> | string;
  segment_id?: string | null;
  status?: string;
  scheduled_at?: string | null;
  stats?: Record<string, number>;
  template_id?: string;
}

interface WhatsAppBroadcastData {
  merchant_id: string;
  name: string;
  segment_id?: string | null;
  message_template: string;
  product_ids?: string[];
  status?: string;
  stats?: { sent: number; read: number; replied: number };
}

interface AutomationData {
  id?: string;
  merchant_id: string;
  trigger_type: string;
  name: string;
  status?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SegmentData {
  merchant_id: string;
  name: string;
  type: 'dynamic' | 'static';
  description?: string;
  filters?: Record<string, unknown>;
  customer_count?: number;
}

interface SegmentCustomer {
  email: string;
  name?: string;
  phone?: string;
  total_spent?: number | string;
  total_orders?: number | string;
  created_at?: string;
}

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

// Email Templates
export async function getEmailTemplates(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching email templates:', error);
    return [];
  }
  return data;
}

export async function createEmailTemplate(templateData: EmailTemplateData) {
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .insert([templateData])
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/marketing/email');
  return data;
}

export async function updateEmailTemplate(templateId: string, templateData: Partial<EmailTemplateData>) {
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .update({ ...templateData, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/marketing/email');
  return data;
}

export async function deleteEmailTemplate(templateId: string) {
  const { error } = await supabaseAdmin
    .from('email_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
  revalidatePath('/marketing/email');
  return { success: true };
}

// Campaigns
export async function getMarketingCampaigns(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select(`
      *,
      segment:marketing_segments(name)
    `)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching campaigns:', error);
    return [];
  }
  return data;
}

export async function createMarketingCampaign(campaignData: CampaignData) {
  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .insert([campaignData])
    .select()
    .single();
  
  if (error) throw error;
  revalidatePath('/marketing/campaigns');
  revalidatePath('/marketing');
  return data;
}

// WhatsApp
export async function getWhatsAppCampaigns(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_campaigns')
    .select(`
      *,
      segment:marketing_segments(name)
    `)
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching WhatsApp campaigns:', error);
    return [];
  }
  return data;
}

export async function createWhatsAppBroadcast(broadcastData: WhatsAppBroadcastData) {
  // Fetch recipient count if segment is provided
  let totalCustomers = 0;
  if (broadcastData.segment_id) {
    const { count } = await supabaseAdmin
      .from('marketing_segment_customers')
      .select('*', { count: 'exact', head: true })
      .eq('segment_id', broadcastData.segment_id);
    totalCustomers = count || 0;
  }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_campaigns')
      .insert([{
        ...broadcastData,
        product_ids: broadcastData.product_ids || [],
        total_customers: totalCustomers,
        sent_count: 0,
        stats: { sent: 0, read: 0, replied: 0 }
      }])
      .select()
      .single();
  
  if (error) throw error;
  revalidatePath('/marketing/whatsapp');
  revalidatePath('/marketing');
  return data;
}

export async function updateWhatsAppBroadcast(broadcastId: string, broadcastData: Partial<WhatsAppBroadcastData>) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_campaigns')
    .update({
      name: broadcastData.name,
        segment_id: broadcastData.segment_id,
        message_template: broadcastData.message_template,
        updated_at: new Date().toISOString()
    })
    .eq('id', broadcastId)
    .select()
    .single();
  
  if (error) throw error;
  revalidatePath('/marketing/whatsapp');
  return data;
}

export async function deleteWhatsAppBroadcast(broadcastId: string) {
  const { error } = await supabaseAdmin
    .from('whatsapp_campaigns')
    .delete()
    .eq('id', broadcastId);
  
  if (error) throw error;
  revalidatePath('/marketing/whatsapp');
  return { success: true };
}

export async function sendWhatsAppBroadcastAction(campaignId: string, merchantId: string) {
  try {
    // Call the broadcast API endpoint which handles real/simulated sending
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}/api/whatsapp/broadcast`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {})
      },
      body: JSON.stringify({ campaignId, merchantId })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send broadcast');
    }
    
    revalidatePath('/marketing/whatsapp');
    return { 
      success: true, 
      recipientCount: result.recipientCount,
      sentCount: result.sentCount,
      isLive: result.isLive
    };
  } catch (error: unknown) {
    logger.error('Error sending WhatsApp broadcast:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send broadcast');
  }
}

export async function sendWhatsAppTestMessage(phone: string, message: string, merchantId?: string) {
  try {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {})
      },
      body: JSON.stringify({ phone: cleanPhone, message, merchantId })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send message');
    }

    return result;
  } catch (error: unknown) {
    logger.error('Error sending WhatsApp test message:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send message');
  }
}


// Automations
export async function getMarketingAutomations(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('marketing_automations')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching automations:', error);
    return [];
  }
  return data;
}

export async function updateAutomationStatus(automationId: string, active: boolean) {
  const { data, error } = await supabaseAdmin
    .from('marketing_automations')
    .update({ status: active ? 'active' : 'paused' })
    .eq('id', automationId)
    .select()
    .single();
  
  if (error) throw error;
  revalidatePath('/marketing/automations');
  return data;
}

export async function createMarketingAutomation(automationData: AutomationData) {
  if (automationData.id) {
    const { data, error } = await supabaseAdmin
      .from('marketing_automations')
      .update(automationData)
      .eq('id', automationData.id)
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/marketing/automations');
    return data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('marketing_automations')
      .insert([automationData])
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/marketing/automations');
    return data;
  }
}

// Segments
export async function getMarketingSegments(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('marketing_segments')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching segments:', error);
    return [];
  }
  return data;
}

export async function getWhatsAppStats(merchantId: string) {
  try {
    const [customersCount, activeInquiries, campaigns] = await Promise.all([
      supabaseAdmin
        .from('store_customers')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId),
      supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('status', 'active'),
      supabaseAdmin
        .from('whatsapp_campaigns')
        .select('stats')
        .eq('merchant_id', merchantId)
        .eq('status', 'delivered')
    ]);

    const campaignsData = campaigns.data || [];
    let totalRead = 0;
    let totalReplied = 0;
    
    campaignsData.forEach(c => {
      totalRead += c.stats?.read || 0;
      totalReplied += c.stats?.replied || 0;
    });

    const avgReadRate = campaignsData.length > 0 
      ? (totalRead / (campaignsData.length * 100)) * 100 
      : 0;

    return {
      activeContacts: customersCount.count || 0,
      readRate: avgReadRate.toFixed(1),
      activeInquiries: activeInquiries.count || 0,
      totalReplied
    };
  } catch (error) {
    logger.error('Error fetching WhatsApp stats:', error);
    return {
      activeContacts: 0,
      readRate: '0.0',
      activeInquiries: 0,
      totalReplied: 0
    };
  }
}

export async function createMarketingSegment(segmentData: SegmentData) {
  const { data, error } = await supabaseAdmin
    .from('marketing_segments')
    .insert([segmentData])
    .select()
    .single();
  
  if (error) throw error;
  revalidatePath('/marketing/segments');
  return data;
}

export async function updateMarketingSegment(segmentId: string, segmentData: Partial<SegmentData>) {
  const { data, error } = await supabaseAdmin
    .from('marketing_segments')
    .update(segmentData)
    .eq('id', segmentId)
    .select()
    .single();
  
  if (error) throw error;
  revalidatePath('/marketing/segments');
  return data;
}

export async function deleteMarketingSegment(segmentId: string) {
  const { error } = await supabaseAdmin
    .from('marketing_segments')
    .delete()
    .eq('id', segmentId);
  
  if (error) throw error;
  revalidatePath('/marketing/segments');
  return { success: true };
}

export async function getSegmentCustomers(segmentId: string): Promise<SegmentCustomer[]> {
  const { data, error } = await supabaseAdmin
    .from('marketing_segment_customers')
    .select(`
      customer:store_customers(*)
    `)
    .eq('segment_id', segmentId);
  
  if (error) {
    logger.error('Error fetching segment customers:', error);
    return [];
  }
  return data.map(d => d.customer) as unknown as SegmentCustomer[];
}

export async function addCustomersToSegment(segmentId: string, customerIds: string[]) {
  const inserts = customerIds.map(customerId => ({
    segment_id: segmentId,
    customer_id: customerId
  }));

  const { error } = await supabaseAdmin
    .from('marketing_segment_customers')
    .upsert(inserts, { onConflict: 'segment_id,customer_id' });
  
  if (error) throw error;

  // Update customer count
  const { data: countData } = await supabaseAdmin
    .from('marketing_segment_customers')
    .select('id', { count: 'exact' })
    .eq('segment_id', segmentId);

  await supabaseAdmin
    .from('marketing_segments')
    .update({ customer_count: countData?.length || 0 })
    .eq('id', segmentId);

  revalidatePath('/marketing/segments');
  return { success: true };
}

export async function getAllCustomers(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('store_customers')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
}

// CSV Export
export async function exportSegmentToCSV(segmentId: string) {
  try {
    const customers = await getSegmentCustomers(segmentId);
    
    const headers = ['Name', 'Email', 'Phone', 'Total Spent', 'Total Orders', 'Created At'];
    const rows = customers.map(c => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.total_spent || '0',
      c.total_orders || '0',
      c.created_at || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return { success: true, csv };
  } catch (error) {
    logger.error('Error exporting segment:', error);
    throw error;
  }
}

// CSV Import
export async function importCustomersFromCSV(
  merchantId: string, 
  segmentId: string | null, 
  csvData: { name?: string; email: string; phone?: string }[]
) {
  try {
    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    
    for (const row of csvData) {
      if (!row.email) {
        results.skipped++;
        continue;
      }

      // Check if customer exists
      const { data: existing } = await supabaseAdmin
        .from('store_customers')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('email', row.email)
        .single();

      let customerId: string;

      if (existing) {
        customerId = existing.id;
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabaseAdmin
          .from('store_customers')
          .insert({
            merchant_id: merchantId,
            email: row.email,
            name: row.name || null,
            phone: row.phone || null,
            total_spent: 0,
            total_orders: 0
          })
          .select('id')
          .single();

        if (error || !newCustomer) {
          results.errors.push(`Failed to import: ${row.email}`);
          continue;
        }
        customerId = newCustomer.id;
      }

      // Add to segment if provided
      if (segmentId) {
        await supabaseAdmin
          .from('marketing_segment_customers')
          .upsert({
            segment_id: segmentId,
            customer_id: customerId
          }, { onConflict: 'segment_id,customer_id' });
      }

      results.imported++;
    }

    // Update segment customer count
    if (segmentId) {
      const { count } = await supabaseAdmin
        .from('marketing_segment_customers')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId);

      await supabaseAdmin
        .from('marketing_segments')
        .update({ customer_count: count || 0 })
        .eq('id', segmentId);
    }

    revalidatePath('/marketing/segments');
    return results;
  } catch (error) {
    logger.error('Error importing customers:', error);
    throw error;
  }
}

// Dynamic Segment Rules
export async function applyDynamicSegmentRules(segmentId: string, merchantId: string, rules: {
  field: string;
  operator: string;
  value: string;
}[]) {
  try {
    // Build query based on rules
    let query = supabaseAdmin
      .from('store_customers')
      .select('id')
      .eq('merchant_id', merchantId);

    for (const rule of rules) {
      switch (rule.operator) {
        case 'equals':
          query = query.eq(rule.field, rule.value);
          break;
        case 'not_equals':
          query = query.neq(rule.field, rule.value);
          break;
        case 'greater_than':
          query = query.gt(rule.field, parseFloat(rule.value));
          break;
        case 'less_than':
          query = query.lt(rule.field, parseFloat(rule.value));
          break;
        case 'contains':
          query = query.ilike(rule.field, `%${rule.value}%`);
          break;
        case 'is_null':
          query = query.is(rule.field, null);
          break;
        case 'is_not_null':
          query = query.not(rule.field, 'is', null);
          break;
      }
    }

    const { data: matchingCustomers, error } = await query;
    if (error) throw error;

    // Clear existing segment customers
    await supabaseAdmin
      .from('marketing_segment_customers')
      .delete()
      .eq('segment_id', segmentId);

    // Add matching customers
    if (matchingCustomers && matchingCustomers.length > 0) {
      const inserts = matchingCustomers.map(c => ({
        segment_id: segmentId,
        customer_id: c.id
      }));

      await supabaseAdmin
        .from('marketing_segment_customers')
        .insert(inserts);
    }

    // Update segment with rules and count
    await supabaseAdmin
      .from('marketing_segments')
      .update({ 
        rules,
        customer_count: matchingCustomers?.length || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', segmentId);

    revalidatePath('/marketing/segments');
    return { 
      success: true, 
      matchedCount: matchingCustomers?.length || 0 
    };
  } catch (error) {
    logger.error('Error applying segment rules:', error);
    throw error;
  }
}

// Subscribers
export async function getNewsletterSubscribers(merchantId: string) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching subscribers:', error);
    return [];
  }
  return data;
}

// Execution Actions
export async function sendEmailCampaign(campaignId: string, merchantId: string) {
  try {
    // 1. Fetch campaign with segment
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*, segment:marketing_segments(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) throw new Error('Campaign not found');

    // 2. Fetch merchant SMTP config
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('store_name, subdomain, currency, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) throw new Error('Merchant not found');

      // 3. Fetch recipients from segment
      let recipients: { email: string; name?: string }[] = [];
      
      if (campaign.segment_id) {
        const { data: segmentCustomers } = await supabaseAdmin
          .from('marketing_segment_customers')
          .select('customer:store_customers(email, name)')
          .eq('segment_id', campaign.segment_id);
        
        recipients = (segmentCustomers || [])
          .map(d => d.customer as unknown as SegmentCustomer | null)
          .filter((c): c is SegmentCustomer => !!c?.email);
      } else {
        const { data: subscribers } = await supabaseAdmin
          .from('newsletter_subscribers')
          .select('email, name')
          .eq('merchant_id', merchantId)
          .eq('subscribed', true);
        
        recipients = (subscribers || []) as { email: string; name?: string }[];
      }

      if (recipients.length === 0) {
        throw new Error('No recipients found for this campaign');
      }

      // 4. Mark as sending
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      // 5. Prepare email content — use merchant SMTP if available, platform fallback handled by resolveSmtpConfig
      const storeUrl = `https://${merchant.subdomain}.convos.sh`;
      const smtpConfig = merchant.smtp_enabled && merchant.smtp_host ? {
        smtp_enabled: merchant.smtp_enabled,
        smtp_host: merchant.smtp_host,
        smtp_port: merchant.smtp_port,
        smtp_user: merchant.smtp_user,
        smtp_password: merchant.smtp_password,
        smtp_from_email: merchant.smtp_from_email,
        smtp_from_name: merchant.smtp_from_name,
      } : undefined;

      const content = typeof campaign.content === 'object' && campaign.content !== null
        ? campaign.content
        : { bodyText: campaign.content };

      // 6. Send emails (with rate limiting)
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 10;
      const delayBetweenBatches = 1000; // 1 second

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
          const results = await Promise.allSettled(
            batch.map((recipient, idx) => 
              sendPromotionalEmail({
                customerEmail: recipient.email,
                customerName: recipient.name,
                storeName: merchant.store_name || 'Store',
                storeUrl,
                subject: content.subject || campaign.name,
                previewText: content.previewText,
                headline: content.headline || campaign.name,
                bodyText: content.bodyText || 'Check out our latest offers!',
                ctaText: content.ctaText || 'Shop Now',
                ctaUrl: content.ctaUrl || storeUrl,
                currency: merchant.currency || 'USD',
                unsubscribeUrl: `${storeUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`,
                campaignId: campaignId,
                recipientId: `${i + idx}`,
              }, smtpConfig)
            )
          );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      });

      // Rate limiting delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

      // 7. Update campaign stats (opens/clicks tracked via /api/track endpoints)
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          stats: {
            reach: sentCount,
            sent: sentCount,
            failed: failedCount,
            opens: 0,
            clicks: 0,
            open_rate: 0,
            click_rate: 0
          }
        })
        .eq('id', campaignId);
    
    revalidatePath('/marketing');
    revalidatePath('/marketing/email');
    return { success: true, sentCount, failedCount };
  } catch (error: unknown) {
    logger.error('Error sending email campaign:', error);
    
    // Mark as failed
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);

    throw new Error(error instanceof Error ? error.message : 'Failed to send campaign');
  }
}
