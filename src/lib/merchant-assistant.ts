import logger from '@/lib/logger';
import { ensureMerchantAssistantSchema } from '@/lib/merchant-assistant-schema';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  Merchant,
  MerchantAgentMessage,
  MerchantAgentMessageAction,
  MerchantAgentThreadDetail,
  MerchantAgentThreadKind,
  MerchantAgentThreadStatus,
  MerchantAgentThreadSummary,
} from '@/types';

type ThreadRow = {
  id: string
  merchant_id: string
  kind: MerchantAgentThreadKind
  title: string
  status: MerchantAgentThreadStatus
  parent_thread_id?: string | null
  linked_intent_id?: string | null
  linked_plan_id?: string | null
  last_message_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  archived_at?: string | null
  metadata?: Record<string, unknown> | null
}

type MessageRow = {
  id: string
  thread_id: string
  role: MerchantAgentMessage['role']
  message_type: MerchantAgentMessage['messageType']
  content: string
  status?: string | null
  actions?: MerchantAgentMessageAction[] | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

function truncate(value: string, max = 120) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}...`;
}

function rowToMessage(row: MessageRow): MerchantAgentMessage {
  return {
    id: row.id,
    role: row.role,
    messageType: row.message_type,
    content: row.content,
    createdAt: String(row.created_at || new Date().toISOString()),
    status: row.status || null,
    actions: Array.isArray(row.actions) ? row.actions : [],
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata
      : null,
  };
}

function toHistoryMessage(message: MerchantAgentMessage) {
  if (message.role !== 'user' && message.role !== 'assistant') {
    return null;
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function buildDirectActions(payload: {
  suggestions?: string[]
  navigate_to?: string | null
  action_card?: {
    title: string
    confirm_label?: string
    cancel_label?: string
    action_payload?: Record<string, unknown>
  } | null
  priority_cards?: Array<{ title: string; suggested_prompt: string }> | null
}) {
  const actions: MerchantAgentMessageAction[] = [];

  for (const suggestion of payload.suggestions || []) {
    actions.push({
      id: `suggest:${suggestion}`,
      label: suggestion,
      kind: 'send_prompt',
      payload: { text: suggestion },
    });
  }

  for (const priority of payload.priority_cards || []) {
    actions.push({
      id: `priority:${priority.title}`,
      label: truncate(priority.title, 24),
      kind: 'send_prompt',
      payload: { text: priority.suggested_prompt },
    });
  }

  if (payload.action_card) {
    actions.unshift({
      id: `cancel:${payload.action_card.title}`,
      label: payload.action_card.cancel_label || 'Cancel',
      kind: 'send_prompt',
      payload: { text: `No, cancel: ${payload.action_card.title}` },
    });
    actions.unshift({
      id: `confirm:${payload.action_card.title}`,
      label: payload.action_card.confirm_label || 'Confirm',
      kind: 'send_prompt',
      payload: {
        text: `Yes, go ahead: ${payload.action_card.title}`,
        actionPayload: payload.action_card.action_payload || {},
      },
    });
  }

  if (payload.navigate_to) {
    actions.push({
      id: `navigate:${payload.navigate_to}`,
      label: 'Open page',
      kind: 'navigate',
      payload: { path: payload.navigate_to },
    });
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.kind}:${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

async function updateThreadRow(threadId: string, updates: Record<string, unknown>) {
  await ensureMerchantAssistantSchema();

  const { error } = await supabaseAdmin
    .from('merchant_agent_threads')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', threadId);

  if (error) {
    throw error;
  }
}

async function touchThread(threadId: string, status?: MerchantAgentThreadStatus) {
  await updateThreadRow(threadId, {
    ...(status ? { status } : {}),
    last_message_at: new Date().toISOString(),
  });
}

async function listThreadMessages(threadId: string) {
  await ensureMerchantAssistantSchema();

  const { data, error } = await supabaseAdmin
    .from('merchant_agent_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => rowToMessage(row as MessageRow));
}

async function syncThreadAfterMessageMutation(threadId: string) {
  const [{ data: latestRows, error: latestError }, { data: threadRows, error: threadError }] = await Promise.all([
    supabaseAdmin
      .from('merchant_agent_messages')
      .select('created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('merchant_agent_threads')
      .select('created_at')
      .eq('id', threadId)
      .limit(1),
  ]);

  if (latestError) {
    throw latestError;
  }

  if (threadError) {
    throw threadError;
  }

  const fallbackTimestamp = threadRows?.[0]?.created_at || new Date().toISOString();
  await updateThreadRow(threadId, {
    last_message_at: latestRows?.[0]?.created_at || fallbackTimestamp,
  });
}

async function getThreadRow(merchantId: string, threadId: string) {
  await ensureMerchantAssistantSchema();

  const { data, error } = await supabaseAdmin
    .from('merchant_agent_threads')
    .select('*')
    .eq('id', threadId)
    .eq('merchant_id', merchantId)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ThreadRow | null;
}

function mapThreadSummary(
  row: ThreadRow,
  lastMessagePreview: string | null,
): MerchantAgentThreadSummary {
  return {
    id: row.id,
    kind: 'main',
    title: row.title,
    status: 'active',
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
    lastMessageAt: String(row.last_message_at || row.updated_at || row.created_at || new Date().toISOString()),
    lastMessagePreview,
    parentThreadId: null,
    linkedMissionId: null,
    linkedPlanId: null,
    currentTaskState: null,
    pendingApproval: null,
    metadata: row.metadata || null,
  };
}

export async function ensureMainAssistantThread(merchant: Merchant) {
  await ensureMerchantAssistantSchema();

  const { data: existingRows, error } = await supabaseAdmin
    .from('merchant_agent_threads')
    .select('*')
    .eq('merchant_id', merchant.id)
    .eq('kind', 'main')
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const existing = (existingRows || []) as ThreadRow[];
  if (existing.length > 0) {
    const primaryThread = existing[0];

    if (existing.length > 1) {
      const duplicateIds = existing.slice(1).map((row) => row.id);
      const { error: archiveError } = await supabaseAdmin
        .from('merchant_agent_threads')
        .update({
          archived_at: new Date().toISOString(),
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .in('id', duplicateIds);

      if (archiveError) {
        throw archiveError;
      }
    }

    return primaryThread;
  }

  const now = new Date().toISOString();
  const { data, error: insertError } = await supabaseAdmin
    .from('merchant_agent_threads')
    .insert({
      merchant_id: merchant.id,
      kind: 'main',
      title: 'Store Assistant',
      status: 'active',
      last_message_at: now,
      metadata: {
        storeName: merchant.store_name,
      },
    })
    .select('*')
    .single();

  if (insertError?.code === '23505') {
    const { data: raceRows, error: raceError } = await supabaseAdmin
      .from('merchant_agent_threads')
      .select('*')
      .eq('merchant_id', merchant.id)
      .eq('kind', 'main')
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (raceError || !raceRows?.[0]) {
      throw raceError || insertError;
    }

    return raceRows[0] as ThreadRow;
  }

  if (insertError || !data) {
    throw insertError || new Error('Failed to create main assistant thread');
  }

  await appendAssistantMessage({
    threadId: data.id,
    role: 'assistant',
    messageType: 'chat',
    content: `Hey! I'm your store assistant for ${merchant.store_name}.\n\nAsk me about your store, orders, customers, catalog, or operations and I'll help directly here.`,
    actions: [
      { id: 'welcome:attention', label: 'What needs attention today?', kind: 'send_prompt', payload: { text: 'What needs attention today?' } },
      { id: 'welcome:orders', label: "Show today's orders", kind: 'send_prompt', payload: { text: "Show me today's orders" } },
      { id: 'welcome:stock', label: 'Low stock products', kind: 'send_prompt', payload: { text: 'What products are low on stock?' } },
    ],
  });

  return data as ThreadRow;
}

export async function appendAssistantMessage(input: {
  threadId: string
  role: MerchantAgentMessage['role']
  messageType: MerchantAgentMessage['messageType']
  content: string
  status?: string | null
  actions?: MerchantAgentMessageAction[]
  metadata?: Record<string, unknown> | null
}) {
  await ensureMerchantAssistantSchema();

  const { data, error } = await supabaseAdmin
    .from('merchant_agent_messages')
    .insert({
      thread_id: input.threadId,
      role: input.role,
      message_type: input.messageType,
      content: input.content,
      status: input.status || null,
      actions: input.actions || [],
      metadata: input.metadata || {},
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to append assistant message');
  }

  await touchThread(input.threadId);
  return rowToMessage(data as MessageRow);
}

async function fetchDirectAssistantResponse(input: {
  requestUrl: string
  merchantId: string
  cookieHeader?: string | null
  message: string
  history: MerchantAgentMessage[]
  routeContext?: string | null
  actionPayload?: Record<string, unknown> | null
}) {
  const response = await fetch(new URL('/api/ai/merchant-chat', input.requestUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.cookieHeader ? { cookie: input.cookieHeader } : {}),
    },
    body: JSON.stringify({
      message: input.message,
      history: input.history
        .map((item) => toHistoryMessage(item))
        .filter(Boolean),
      route_context: input.routeContext || null,
      action_payload: input.actionPayload || null,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (typeof payload?.error === 'string' && payload.error)
      || (typeof payload?.detail === 'string' && payload.detail)
      || 'Failed to process assistant message'
    );
  }

  return payload as {
    content?: string
    navigate_to?: string | null
    suggestions?: string[]
    action_card?: {
      title: string
      confirm_label?: string
      cancel_label?: string
      action_payload?: Record<string, unknown>
    } | null
    priority_cards?: Array<{ title: string; suggested_prompt: string; description?: string }> | null
  };
}

export async function listMerchantAssistantThreads(merchant: Merchant) {
  const mainThread = await ensureMainAssistantThread(merchant);
  const messages = await listThreadMessages(mainThread.id);
  const lastMessage = messages.length > 0 ? truncate(messages[messages.length - 1].content, 84) : 'Talk to your store assistant';

  return [mapThreadSummary(mainThread, lastMessage)];
}

export async function getMerchantAssistantThread(merchant: Merchant, threadId: string): Promise<MerchantAgentThreadDetail | null> {
  await ensureMerchantAssistantSchema();

  const mainThread = await ensureMainAssistantThread(merchant);
  const threadRow = await getThreadRow(merchant.id, threadId);

  if (!threadRow) {
    return null;
  }

  if (threadRow.kind !== 'main') {
    if (threadId === mainThread.id) {
      return null;
    }

    return getMerchantAssistantThread(merchant, mainThread.id);
  }

  const messages = await listThreadMessages(threadRow.id);
  const summary = mapThreadSummary(
    threadRow,
    messages.length > 0 ? truncate(messages[messages.length - 1].content, 84) : 'Talk to your store assistant',
  );

  return {
    ...summary,
    messages,
    linkedMission: null,
  };
}

export async function deleteMerchantAssistantMessage(input: {
  merchant: Merchant
  threadId: string
  messageId: string
}) {
  await ensureMerchantAssistantSchema();

  const thread = await getThreadRow(input.merchant.id, input.threadId);
  if (!thread) {
    throw new Error('Assistant thread not found');
  }

  const { data: message, error: messageError } = await supabaseAdmin
    .from('merchant_agent_messages')
    .select('id, role, message_type')
    .eq('thread_id', thread.id)
    .eq('id', input.messageId)
    .maybeSingle();

  if (messageError) {
    throw messageError;
  }

  if (!message) {
    throw new Error('Assistant message not found');
  }

  if (message.role !== 'assistant') {
    throw new Error('Only assistant-generated messages can be deleted');
  }

  const { error: deleteError } = await supabaseAdmin
    .from('merchant_agent_messages')
    .delete()
    .eq('thread_id', thread.id)
    .eq('id', input.messageId);

  if (deleteError) {
    throw deleteError;
  }

  await syncThreadAfterMessageMutation(thread.id);
  return getMerchantAssistantThread(input.merchant, thread.kind === 'main' ? thread.id : (await ensureMainAssistantThread(input.merchant)).id);
}

export async function deleteMerchantAssistantTask(input: {
  merchant: Merchant
  threadId: string
}) {
  await ensureMerchantAssistantSchema();

  const thread = await getThreadRow(input.merchant.id, input.threadId);
  if (!thread || thread.kind === 'main') {
    throw new Error('Assistant thread not found');
  }

  const parentThreadId = thread.parent_thread_id || null;
  const { error: deleteThreadError } = await supabaseAdmin
    .from('merchant_agent_threads')
    .delete()
    .eq('merchant_id', input.merchant.id)
    .eq('id', thread.id);

  if (deleteThreadError) {
    throw deleteThreadError;
  }

  return {
    deletedThreadId: thread.id,
    parentThreadId,
  };
}

export async function sendMerchantAssistantMessage(input: {
  merchant: Merchant
  threadId: string
  message: string
  canManageMissions?: boolean
  routeContext?: string | null
  actionPayload?: Record<string, unknown> | null
  requestUrl: string
  cookieHeader?: string | null
}) {
  await ensureMerchantAssistantSchema();
  void input.canManageMissions;

  const requestedThread = await getThreadRow(input.merchant.id, input.threadId);
  const mainThread = await ensureMainAssistantThread(input.merchant);
  const activeThread = requestedThread?.kind === 'main' ? requestedThread : mainThread;

  await appendAssistantMessage({
    threadId: activeThread.id,
    role: 'user',
    messageType: 'chat',
    content: input.message,
    metadata: input.actionPayload || null,
  });

  try {
    const currentMessages = await listThreadMessages(activeThread.id);
    const payload = await fetchDirectAssistantResponse({
      requestUrl: input.requestUrl,
      merchantId: input.merchant.id,
      cookieHeader: input.cookieHeader,
      message: input.message,
      history: currentMessages.slice(0, -1),
      routeContext: input.routeContext,
      actionPayload: input.actionPayload,
    });

    const priorityLines = (payload.priority_cards || []).map((card) => `- ${card.title}: ${card.description || card.suggested_prompt}`);
    const assistantContent = [
      payload.content || '',
      priorityLines.length > 0 ? ['', '### What needs attention', ...priorityLines].join('\n') : '',
    ].filter(Boolean).join('\n');

    await appendAssistantMessage({
      threadId: activeThread.id,
      role: 'assistant',
      messageType: 'chat',
      content: assistantContent || 'Done.',
      actions: buildDirectActions(payload),
      metadata: {
        priorityCards: payload.priority_cards || [],
        actionCard: payload.action_card || null,
      },
    });

    return {
      focusThreadId: activeThread.id,
      navigateTo: payload.navigate_to || null,
    };
  } catch (error) {
    logger.error('Failed to process merchant assistant message:', {
      merchantId: input.merchant.id,
      threadId: activeThread.id,
      error,
    });

    try {
      await appendAssistantMessage({
        threadId: activeThread.id,
        role: 'assistant',
        messageType: 'error',
        content: 'I hit a problem before I could finish that turn. Your message is saved here, so you can retry without retyping it.',
      });
    } catch (appendError) {
      logger.error('Failed to append merchant assistant error message:', {
        merchantId: input.merchant.id,
        threadId: activeThread.id,
        error: appendError,
      });
      throw error;
    }

    return {
      focusThreadId: activeThread.id,
      navigateTo: null,
    };
  }
}

export async function applyAssistantThreadApproval() {
  throw new Error('Mission approvals are no longer available');
}

export async function appendAssistantTaskUpdateByPlanId(_: {
  planId: string
  content: string
  messageType: MerchantAgentMessage['messageType']
  status?: string | null
  actions?: MerchantAgentMessageAction[]
  metadata?: Record<string, unknown> | null
}) {
  void _;
  return;
}

export async function syncAssistantTaskThreadStatusByPlanId(_: string) {
  void _;
  return;
}
