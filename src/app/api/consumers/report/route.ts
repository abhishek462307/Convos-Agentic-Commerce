import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reason, severity, metadata } = body;

    if (!email || !reason) {
      return NextResponse.json({ error: 'Email and reason are required' }, { status: 400 });
    }

    // 1. Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify Merchant Status
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 403 });
    }

    // 3. Create Risk Report
    const { error: reportError } = await supabaseAdmin
      .from('consumer_risk_reports')
      .insert({
        reporter_merchant_id: merchant.id,
        consumer_email: email,
        reason,
        severity: severity || 'medium',
        metadata: metadata || {}
      });

    if (reportError) {
      logger.error('Error creating report:', reportError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
    const { data: existingCustomer } = await supabaseAdmin
      .from('store_customers')
      .select('id, metadata')
      .eq('merchant_id', merchant.id)
      .eq('email', email)
      .maybeSingle();

    const riskReport = {
      reason,
      severity: severity || 'medium',
      reported_at: new Date().toISOString(),
      metadata: metadata || {}
    };

    if (existingCustomer) {
      const customerMetadata = existingCustomer.metadata || {};
      const reports = Array.isArray(customerMetadata.risk_reports) ? customerMetadata.risk_reports : [];
      await supabaseAdmin
        .from('store_customers')
        .update({
          metadata: {
            ...customerMetadata,
            risk_reports: [riskReport, ...reports].slice(0, 20),
            latest_risk_report: riskReport,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id);
    } else {
      await supabaseAdmin.from('store_customers').insert({
        merchant_id: merchant.id,
        email,
        metadata: {
          risk_reports: [riskReport],
          latest_risk_report: riskReport,
        },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
