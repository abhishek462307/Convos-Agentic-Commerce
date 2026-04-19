import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthUser, getMerchantAccess } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testEmail, merchantId } = await request.json();

    if (!merchantId || !testEmail) {
      return NextResponse.json({ error: 'Missing merchantId or test email' }, { status: 400 });
    }

    const access = await getMerchantAccess(user.id, merchantId, 'settings');
    if (!access.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
    }

    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_enabled')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant?.smtp_enabled || !merchant.smtp_host || !merchant.smtp_from_email) {
      return NextResponse.json({ error: 'Missing SMTP configuration' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: merchant.smtp_host,
      port: merchant.smtp_port || 587,
      secure: merchant.smtp_port === 465,
      auth: {
        user: merchant.smtp_user,
        pass: merchant.smtp_password,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${merchant.smtp_from_name || 'Test'}" <${merchant.smtp_from_email}>`,
      to: testEmail,
      subject: 'SMTP Test Email - Configuration Successful',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f6f7;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="background: #008060; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 18px;">SMTP Configuration Test</h1>
            </div>
            <div style="padding: 32px; text-align: center;">
              <div style="width: 64px; height: 64px; background: #e3f1df; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✓</span>
              </div>
              <h2 style="margin: 0 0 8px; color: #202223; font-size: 20px;">Success!</h2>
              <p style="margin: 0; color: #6d7175; font-size: 14px;">
                Your SMTP settings are configured correctly.<br>
                Emails will now be sent from your custom domain.
              </p>
            </div>
            <div style="background: #f6f6f7; padding: 16px; text-align: center;">
              <p style="margin: 0; color: #6d7175; font-size: 12px;">
                Sent from ${merchant.smtp_host}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logger.info('Test email sent:', { messageId: info.messageId, response: info.response, accepted: info.accepted, rejected: info.rejected });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    logger.error('SMTP test error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Failed to send test email' 
    }, { status: 500 });
  }
}
