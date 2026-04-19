import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: boolean;
}

export async function POST(request: Request) {
  try {
    const internalSecret = process.env.EMAIL_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET;
    const providedSecret = request.headers.get('x-internal-secret');
    if (!internalSecret || providedSecret !== internalSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html, merchantId, subdomain } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
    }

    let smtpConfig: SmtpConfig | null = null;

    if (merchantId || subdomain) {
      const query = supabaseAdmin
        .from('merchants')
        .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_enabled, store_name');
      
      if (merchantId) {
        query.eq('id', merchantId);
      } else if (subdomain) {
        query.eq('subdomain', subdomain);
      }

      const { data: merchant } = await query.single();

      if (merchant?.smtp_enabled && merchant?.smtp_host && merchant?.smtp_user && merchant?.smtp_password) {
        smtpConfig = {
          smtp_host: merchant.smtp_host,
          smtp_port: merchant.smtp_port || 587,
          smtp_user: merchant.smtp_user,
          smtp_password: merchant.smtp_password,
          smtp_from_email: merchant.smtp_from_email || merchant.smtp_user,
          smtp_from_name: merchant.smtp_from_name || merchant.store_name || 'Store',
          smtp_enabled: true
        };
      }
    }

    if (!smtpConfig) {
      const host = process.env.PLATFORM_SMTP_HOST;
      const user = process.env.PLATFORM_SMTP_USER;
      const password = process.env.PLATFORM_SMTP_PASSWORD;
      if (host && user && password) {
        smtpConfig = {
          smtp_host: host,
          smtp_port: parseInt(process.env.PLATFORM_SMTP_PORT || '587', 10),
          smtp_user: user,
          smtp_password: password,
          smtp_from_email: process.env.PLATFORM_SMTP_FROM_EMAIL || user,
          smtp_from_name: process.env.PLATFORM_SMTP_FROM_NAME || 'Open Commerce',
          smtp_enabled: true,
        };
      }
    }

    if (!smtpConfig) {
      logger.warn('No SMTP configuration found');
      return NextResponse.json({ 
        success: false, 
        error: 'No SMTP configured.' 
      }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtp_host,
      port: smtpConfig.smtp_port,
      secure: smtpConfig.smtp_port === 465,
      auth: {
        user: smtpConfig.smtp_user,
        pass: smtpConfig.smtp_password,
      },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.smtp_from_name}" <${smtpConfig.smtp_from_email}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('Email send error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Failed to send email' 
    }, { status: 500 });
  }
}
