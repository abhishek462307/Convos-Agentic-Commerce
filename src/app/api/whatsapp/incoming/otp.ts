import nodemailer from 'nodemailer'

interface SmtpConfig {
  smtp_enabled?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  smtp_from_email?: string
  smtp_from_name?: string
}

export async function sendOtpEmail(email: string, otp: string, storeName: string, merchantSmtp?: SmtpConfig) {
  const smtp = merchantSmtp?.smtp_enabled && merchantSmtp.smtp_host
    ? merchantSmtp
    : {
        smtp_enabled: true,
        smtp_host: process.env.PLATFORM_SMTP_HOST,
        smtp_port: parseInt(process.env.PLATFORM_SMTP_PORT || '465', 10),
        smtp_user: process.env.PLATFORM_SMTP_USER,
        smtp_password: process.env.PLATFORM_SMTP_PASSWORD,
        smtp_from_email: process.env.PLATFORM_SMTP_FROM_EMAIL || process.env.PLATFORM_SMTP_USER,
        smtp_from_name: storeName || 'Open Commerce',
      }

  if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_password) {
    throw new Error('No SMTP configured for OTP email')
  }

  const transporter = nodemailer.createTransport({
    host: smtp.smtp_host,
    port: smtp.smtp_port || 465,
    secure: smtp.smtp_port === 465,
    auth: {
      user: smtp.smtp_user,
      pass: smtp.smtp_password,
    },
  })

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">${storeName}</h2>
      <p style="margin: 0 0 24px; color: #666; font-size: 14px;">WhatsApp Verification Code</p>
      <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111;">${otp}</span>
      </div>
      <p style="margin: 0; color: #666; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `

  await transporter.sendMail({
    from: `"${smtp.smtp_from_name || storeName}" <${smtp.smtp_from_email}>`,
    to: email,
    subject: `${otp} is your ${storeName} verification code`,
    html,
  })
}
