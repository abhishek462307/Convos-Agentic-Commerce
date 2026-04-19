import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = rateLimit(`store-auth:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { action, subdomain, email, password, name, phone, country, token, otp } = await request.json();

    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, store_name, auth_settings')
      .eq('subdomain', subdomain)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const authSettings = merchant.auth_settings || { email_verification_required: true };
    const requireVerification = authSettings.email_verification_required !== false;

    if (action === 'signup') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const { data: existingCustomer } = await supabaseAdmin
          .from('store_customers')
          .select('id, is_verified, name, phone, country')
          .eq('merchant_id', merchant.id)
          .eq('email', email.toLowerCase())
          .single();

      if (existingCustomer?.is_verified) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: false,
        user_metadata: {
          name,
          role: 'store_customer',
          merchant_id: merchant.id
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(u => u.email === email.toLowerCase()) || null;

          if (existingUser) {
              const verificationToken = requireVerification ? crypto.randomBytes(32).toString('hex') : null;
              const expiresAt = requireVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

                if (existingCustomer) {
                  await supabaseAdmin
                    .from('store_customers')
                    .update({
                      user_id: existingUser.id,
                      name: name || existingCustomer.name,
                      phone: phone || existingCustomer.phone,
                      country: country || existingCustomer.country,
                      is_verified: !requireVerification,
                      verification_token: verificationToken,
                      verification_expires_at: expiresAt?.toISOString() || null,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', existingCustomer.id);
                } else {
                  await supabaseAdmin
                    .from('store_customers')
                    .insert({
                      merchant_id: merchant.id,
                      user_id: existingUser.id,
                      email: email.toLowerCase(),
                      name,
                      phone,
                      country,
                      is_verified: !requireVerification,
                      verification_token: verificationToken,
                      verification_expires_at: expiresAt?.toISOString() || null
                    });
                }

      if (requireVerification) {
          const otpCode = generateOTP();
          const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
          
          await supabaseAdmin
            .from('store_customers')
            .update({
              verification_otp: otpCode,
              verification_otp_expires_at: otpExpires.toISOString()
            })
            .eq('merchant_id', merchant.id)
            .eq('email', email.toLowerCase());
          
          await sendVerificationOTPEmail(email, otpCode, subdomain, merchant.store_name);
          return NextResponse.json({ 
            success: true, 
            message: 'Verification code sent. Please check your inbox.',
            requiresVerification: true,
            useOTP: true
          });
        } else {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true
          });
          return NextResponse.json({ 
            success: true, 
            message: 'Account created successfully! You can now log in.',
            requiresVerification: false
          });
        }
      }
          }
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }

      const verificationToken = requireVerification ? crypto.randomBytes(32).toString('hex') : null;
      const expiresAt = requireVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

      if (authUser?.user) {
        if (existingCustomer) {
          await supabaseAdmin
            .from('store_customers')
            .update({
              user_id: authUser.user.id,
              name,
              phone,
              country,
              is_verified: !requireVerification,
              verification_token: verificationToken,
              verification_expires_at: expiresAt?.toISOString() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCustomer.id);
        } else {
          await supabaseAdmin
            .from('store_customers')
            .insert({
              merchant_id: merchant.id,
              user_id: authUser.user.id,
              email: email.toLowerCase(),
              name,
              phone,
              country,
              is_verified: !requireVerification,
              verification_token: verificationToken,
              verification_expires_at: expiresAt?.toISOString() || null
            });
        }
      }

      if (requireVerification) {
          const otpCode = generateOTP();
          const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
          
          await supabaseAdmin
            .from('store_customers')
            .update({
              verification_otp: otpCode,
              verification_otp_expires_at: otpExpires.toISOString()
            })
            .eq('merchant_id', merchant.id)
            .eq('email', email.toLowerCase());
          
          await sendVerificationOTPEmail(email, otpCode, subdomain, merchant.store_name);
          return NextResponse.json({ 
            success: true, 
            message: 'Verification code sent. Please check your inbox.',
            requiresVerification: true,
            useOTP: true
          });
        } else {
          if (authUser?.user?.id) {
            await supabaseAdmin.auth.admin.updateUserById(authUser.user.id, {
              email_confirm: true
            });
          }
          return NextResponse.json({ 
            success: true, 
            message: 'Account created successfully! You can now log in.',
            requiresVerification: false
          });
        }
      }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const { data: customer } = await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('email', email.toLowerCase())
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      if (requireVerification && !customer.is_verified) {
          return NextResponse.json({ 
            error: 'Please verify your email before logging in',
            requiresVerification: true 
          }, { status: 401 });
        }

        if (!requireVerification && customer.user_id) {
          await supabaseAdmin.auth.admin.updateUserById(customer.user_id, {
            email_confirm: true
          });
        }

        const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: email.toLowerCase(),
          password
        });

        if (signInError) {
          logger.error('Sign in error:', signInError);
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

      return NextResponse.json({ 
        success: true, 
        session: {
          access_token: session.session?.access_token,
          refresh_token: session.session?.refresh_token,
          user: {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone
          }
        }
      });
    }

    if (action === 'verify_otp') {
        if (!email || !otp) {
          return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const { data: customer } = await supabaseAdmin
          .from('store_customers')
          .select('*')
          .eq('merchant_id', merchant.id)
          .eq('email', email.toLowerCase())
          .single();

        if (!customer) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 400 });
        }

        if (customer.verification_otp_expires_at && new Date(customer.verification_otp_expires_at) < new Date()) {
          return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
        }

        if (customer.verification_otp !== otp) {
          return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        await supabaseAdmin
          .from('store_customers')
          .update({
            is_verified: true,
            verification_otp: null,
            verification_otp_expires_at: null,
            verification_token: null,
            verification_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (customer.user_id) {
          await supabaseAdmin.auth.admin.updateUserById(customer.user_id, {
            email_confirm: true
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Email verified successfully! You can now log in.' 
        });
      }

    if (action === 'verify') {
      if (!token) {
        return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
      }

      const { data: customer } = await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('verification_token', token)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
      }

      if (customer.verification_expires_at && new Date(customer.verification_expires_at) < new Date()) {
        return NextResponse.json({ error: 'Verification token has expired. Please request a new one.' }, { status: 400 });
      }

      await supabaseAdmin
        .from('store_customers')
        .update({
          is_verified: true,
          verification_token: null,
          verification_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (customer.user_id) {
        await supabaseAdmin.auth.admin.updateUserById(customer.user_id, {
          email_confirm: true
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Email verified successfully! You can now log in.' 
      });
    }

    if (action === 'resend_verification') {
        if (!email) {
          return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { data: customer } = await supabaseAdmin
          .from('store_customers')
          .select('*')
          .eq('merchant_id', merchant.id)
          .eq('email', email.toLowerCase())
          .single();

        if (!customer) {
          return NextResponse.json({ success: true, message: 'If an account exists, a verification code has been sent.' });
        }

        if (customer.is_verified) {
          return NextResponse.json({ error: 'This email is already verified' }, { status: 400 });
        }

        const otpCode = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await supabaseAdmin
          .from('store_customers')
          .update({
            verification_otp: otpCode,
            verification_otp_expires_at: otpExpires.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        await sendVerificationOTPEmail(email, otpCode, subdomain, merchant.store_name);

        return NextResponse.json({ success: true, message: 'Verification code sent. Please check your inbox.' });
      }

    if (action === 'forgot_password') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const { data: customer } = await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('email', email.toLowerCase())
        .single();

      if (!customer) {
        return NextResponse.json({ success: true, message: 'If an account exists, a password reset email has been sent.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

      await supabaseAdmin
        .from('store_customers')
        .update({
          password_reset_token: resetToken,
          password_reset_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      await sendPasswordResetEmail(email, resetToken, subdomain, merchant.store_name);

      return NextResponse.json({ success: true, message: 'Password reset email sent. Please check your inbox.' });
    }

    if (action === 'reset_password') {
      if (!token || !password) {
        return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const { data: customer } = await supabaseAdmin
        .from('store_customers')
        .select('*')
        .eq('merchant_id', merchant.id)
        .eq('password_reset_token', token)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
      }

      if (customer.password_reset_expires_at && new Date(customer.password_reset_expires_at) < new Date()) {
        return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
      }

      if (customer.user_id) {
        await supabaseAdmin.auth.admin.updateUserById(customer.user_id, { password });
      }

      await supabaseAdmin
        .from('store_customers')
        .update({
          password_reset_token: null,
          password_reset_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      return NextResponse.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Store auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

async function sendPasswordResetEmail(email: string, token: string, subdomain: string, storeName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/${subdomain}/login?reset=${token}`;
  
  try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.EMAIL_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify({
          to: email,
          subdomain: subdomain,
          subject: `Reset your password - ${storeName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Reset your password</h1>
            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset your password at <strong>${storeName}</strong>. Click the button below to create a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #008060; color: white; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #6a6a6a; margin-top: 32px;">
              This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });
    const result = await response.json();
    if (!result.success) {
      logger.error('Failed to send password reset email:', result.error);
    }
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
  }
}

async function sendVerificationOTPEmail(email: string, otp: string, subdomain: string, storeName: string) {
  try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.EMAIL_INTERNAL_SECRET || process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify({
          to: email,
          subdomain: subdomain,
          subject: `Your verification code - ${storeName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px;">Verify your email</h1>
            <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6; margin-bottom: 24px;">
              Thanks for creating an account at <strong>${storeName}</strong>. Use the code below to verify your email address.
            </p>
            <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; margin: 0;">${otp}</p>
            </div>
            <p style="font-size: 14px; color: #6a6a6a; margin-top: 24px;">
              This code will expire in 10 minutes. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });
    const result = await response.json();
    if (!result.success) {
      logger.error('Failed to send verification OTP email:', result.error);
    }
  } catch (error) {
    logger.error('Failed to send verification OTP email:', error);
  }
}
