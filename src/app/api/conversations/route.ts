import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMerchantBySubdomain(subdomain: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('id')
    .eq('subdomain', subdomain)
    .single();
  if (error || !data) return null;
  return data;
}

async function getStoreCustomerId(merchantId: string, userId: string) {
  const { data } = await supabase
    .from('store_customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('user_id', userId)
    .single();
  return data?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    const { action, subdomain, conversationId, message, sessionId } = await request.json();

    if (action === 'create') {
      if (!subdomain || !sessionId) {
        return NextResponse.json({ error: 'Missing subdomain or sessionId' }, { status: 400 });
      }

      const merchant = await getMerchantBySubdomain(subdomain);
      if (!merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
      }

      const authUser = await getAuthUser(request);
      let customerId: string | null = null;
      if (authUser) {
        customerId = await getStoreCustomerId(merchant.id, authUser.id);
      }

      const { data: conversation, error } = await supabase
        .from('storefront_conversations')
        .insert({
          merchant_id: merchant.id,
          session_id: sessionId,
          customer_id: customerId,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create storefront conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ conversation });
    }

    if (action === 'message') {
      if (!conversationId || !sessionId || !message || typeof message.text !== 'string' || typeof message.sender !== 'string') {
        return NextResponse.json({ error: 'Missing conversationId, sessionId, or message fields' }, { status: 400 });
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('storefront_conversations')
        .select('id, merchant_id, session_id, customer_id')
        .eq('id', conversationId)
        .single();

      if (conversationError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      if (subdomain) {
        const merchant = await getMerchantBySubdomain(subdomain);
        if (!merchant || merchant.id !== conversation.merchant_id) {
          return NextResponse.json({ error: 'Conversation does not belong to this storefront' }, { status: 403 });
        }
      }

      const authUser = await getAuthUser(request);
      const storeCustomerId = authUser
        ? await getStoreCustomerId(conversation.merchant_id, authUser.id)
        : null;

      const sessionMatches = conversation.session_id === sessionId;
      const canUseCustomerIdentity = !!storeCustomerId && (!conversation.customer_id || conversation.customer_id === storeCustomerId);

      if (!sessionMatches && !canUseCustomerIdentity && conversation.session_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const conversationUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (!conversation.session_id) {
        conversationUpdates.session_id = sessionId;
      }
      if (storeCustomerId && !conversation.customer_id) {
        conversationUpdates.customer_id = storeCustomerId;
      }
      await supabase
        .from('storefront_conversations')
        .update(conversationUpdates)
        .eq('id', conversationId);

      const { data: msg, error } = await supabase
        .from('storefront_messages')
        .insert({
          conversation_id: conversationId,
          sender: message.sender,
          text: message.text,
          metadata: message.metadata || null
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to insert storefront message:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: msg });
    }

    if (action === 'end') {
      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('storefront_conversations')
        .select('id, merchant_id, session_id, customer_id')
        .eq('id', conversationId)
        .single();

      if (conversationError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const authUser = await getAuthUser(request);
      let canEnd = false;

      if (authUser) {
        const merchantAccess = await getMerchantAccess(authUser.id, conversation.merchant_id);
        if (merchantAccess.ok) {
          canEnd = true;
        } else {
          const storeCustomerId = await getStoreCustomerId(conversation.merchant_id, authUser.id);
          canEnd = !!storeCustomerId && (!conversation.customer_id || conversation.customer_id === storeCustomerId);
        }
      }

      if (!canEnd && sessionId && conversation.session_id === sessionId) {
        canEnd = true;
      }

      if (!canEnd) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error } = await supabase
        .from('storefront_conversations')
        .update({ status: 'ended', updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Conversations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('id');
  const merchantId = searchParams.get('merchantId');
  const sessionId = searchParams.get('sessionId');
  const authUser = await getAuthUser(request);

  if (conversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from('storefront_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let canView = false;
    if (sessionId && conversation.session_id === sessionId) {
      canView = true;
    }

    if (authUser) {
      const merchantAccess = await getMerchantAccess(authUser.id, conversation.merchant_id);
      if (merchantAccess.ok) {
        canView = true;
      } else {
        const storeCustomerId = await getStoreCustomerId(conversation.merchant_id, authUser.id);
        if (storeCustomerId && (!conversation.customer_id || conversation.customer_id === storeCustomerId)) {
          canView = true;
        }
      }
    }

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: messages } = await supabase
      .from('storefront_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ conversation, messages });
  }

  if (merchantId) {
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getMerchantAccess(authUser.id, merchantId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? 'Merchant not found' : 'Forbidden' },
        { status: access.status }
      );
    }

    const { data: conversations } = await supabase
      .from('storefront_conversations')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ conversations });
  }

  return NextResponse.json({ error: 'Missing id or merchantId' }, { status: 400 });
}
