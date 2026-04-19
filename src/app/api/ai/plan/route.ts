import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser } from '@/lib/api-auth';
import logger from '@/lib/logger';

async function getMerchantByUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('merchants')
    .select('id, user_id')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const merchant = await getMerchantByUser(authUser.id);
    if (!merchant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { intentId } = await req.json();

    const { data: intent, error: intentError } = await supabaseAdmin
      .from('customer_intents')
      .select('*, agent_plans(*)')
      .eq('id', intentId)
      .eq('merchant_id', merchant.id)
      .single();

    if (intentError || !intent) {
      return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    const plan = intent.agent_plans?.[0];
    if (!plan) {
      return NextResponse.json({ error: 'No plan found for this intent' }, { status: 400 });
    }

    if (plan.status === 'completed') {
      return NextResponse.json({ message: 'Plan already completed' });
    }

    const currentStep = plan.current_step;
    const steps = plan.steps || [];
    const nextStep = currentStep + 1;
    
    let newStatus = 'in_progress';
    if (nextStep >= steps.length) {
      newStatus = 'completed';
    }

    await supabaseAdmin
      .from('agent_plans')
      .update({
        current_step: nextStep,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id);

    logger.info(`[Agent Loop] Intent ${intentId}: Advanced to step ${nextStep} (${steps[currentStep]})`);

    return NextResponse.json({
      success: true,
      advancedTo: nextStep,
      status: newStatus,
      stepExecuted: steps[currentStep]
    });

  } catch (error: any) {
    logger.error('Agent Planner Loop Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const merchant = await getMerchantByUser(authUser.id);
  if (!merchant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: activePlans } = await supabaseAdmin
    .from('agent_plans')
    .select('*, customer_intents!inner(*)')
    .eq('customer_intents.merchant_id', merchant.id)
    .eq('status', 'in_progress');

  return NextResponse.json(activePlans || []);
}
