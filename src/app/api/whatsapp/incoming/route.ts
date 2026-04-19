import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { baileysSend, baileysSendInteractive } from '@/lib/baileys-client'
import { sendOtpEmail } from './otp'
import logger from '@/lib/logger'

const BAILEYS_API_SECRET = process.env.BAILEYS_API_SECRET

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-api-secret')
    if (!BAILEYS_API_SECRET || secret !== BAILEYS_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, merchantId, from, pushName, text, buttonResponseId, buttonResponseText, messageId, timestamp } = body

      if (type !== 'message' || !merchantId || !from) {
        return NextResponse.json({ ok: true })
      }

      const messageText = text || buttonResponseText || ''

      const { data: merchant } = await supabaseAdmin
        .from('merchants')
        .select('id, subdomain, store_name, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, currency')
        .eq('id', merchantId)
        .single()

      if (!merchant) {
        return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
      }

      const { data: waConfig } = await supabaseAdmin
        .from('whatsapp_configs')
        .select('commerce_settings')
        .eq('merchant_id', merchantId)
        .single()

      const commerceSettings = waConfig?.commerce_settings || {}
      const cartEnabled = commerceSettings.cart_enabled !== false
      const checkoutEnabled = commerceSettings.checkout_enabled !== false
      const requireEmailVerification = commerceSettings.require_email_verification !== false
      const welcomeMessage = commerceSettings.welcome_message || null
      const otpMessageTemplate = commerceSettings.otp_message_template || null
      const offlineMessage = commerceSettings.offline_message || null

      if (!messageText && !buttonResponseId) {
        await baileysSend(merchantId, from, "I can only read text messages for now. Could you type your request instead?")
        return NextResponse.json({ ok: true })
      }

    let { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('phone_number', from)
      .single()

      if (!session) {
        const { data: newSession, error: insertErr } = await supabaseAdmin
          .from('whatsapp_sessions')
          .insert({
            merchant_id: merchantId,
            phone_number: from,
            session_id: `wa_${merchantId}_${from}_${Date.now()}`,
            cart: [],
            auth_state: 'unauthenticated'
          })
          .select()
          .single()
        if (insertErr || !newSession) {
          logger.error('Failed to create whatsapp session:', insertErr)
          return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
        }
        session = newSession
      }

      await supabaseAdmin.from('conversation_messages').insert({
        merchant_id: merchantId,
        conversation_id: session.id,
        sender_type: 'customer',
        sender_id: from,
        message: messageText,
        channel: 'whatsapp',
        metadata: { pushName, messageId, timestamp, buttonResponseId }
      })

      const authState = session.auth_state || 'unauthenticated'
      const inputText = messageText.trim()
      const lowerInput = inputText.toLowerCase()

      // 1. EXIT/RESET COMMAND (Fixes state locking)
      if (['exit', 'cancel', 'reset', 'stop'].includes(lowerInput) && authState !== 'unauthenticated') {
        await supabaseAdmin
          .from('whatsapp_sessions')
          .update({ auth_state: 'unauthenticated', otp_code: null, updated_at: new Date().toISOString() })
          .eq('id', session.id)
        
        await baileysSend(merchantId, from, "Understood. I've cancelled the current process. How else can I help you today?")
        return NextResponse.json({ ok: true })
      }

      // 2. TIMEOUT LOGIC (Reset if no activity for 15 mins)
      const lastUpdate = new Date(session.updated_at || session.created_at).getTime()
      const isTimedOut = (Date.now() - lastUpdate) > 15 * 60 * 1000
      
      if (isTimedOut && authState !== 'unauthenticated') {
        await supabaseAdmin
          .from('whatsapp_sessions')
          .update({ auth_state: 'unauthenticated', otp_code: null, updated_at: new Date().toISOString() })
          .eq('id', session.id)
        // Continue normally as unauthenticated
      }

      if (authState === 'awaiting_email') {
        return handleEmailInput(merchant, session, from, inputText, otpMessageTemplate)
      }
      if (authState === 'awaiting_otp') {
        return handleOtpInput(merchant, session, from, inputText)
      }

      const aiMessage = resolveButtonAction(inputText, buttonResponseId, buttonResponseText)

      if (aiMessage.startsWith('checkout_') || aiMessage === 'checkout') {
        if (!checkoutEnabled) {
          await baileysSend(merchantId, from, "Checkout is not available right now. Please contact us directly to place your order.")
          return NextResponse.json({ ok: true })
        }
        if (requireEmailVerification && !session.email_verified) {
        await supabaseAdmin
          .from('whatsapp_sessions')
          .update({ auth_state: 'awaiting_email', updated_at: new Date().toISOString() })
          .eq('id', session.id)

        await baileysSend(merchantId, from, `To checkout, I need your email for the receipt and order confirmation.\n\nPlease type your email address:`)
        return NextResponse.json({ ok: true })
      }
      return handleCheckout(merchant, session, from)
    }

    return handleAIChat(merchant, session, from, aiMessage, pushName)
  } catch (error: any) {
    logger.error('WhatsApp incoming error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function resolveButtonAction(text: string, buttonId?: string, buttonText?: string): string {
  const id = buttonId || text
  if (id.startsWith('add_')) return `Add product ${id.replace('add_', '')} to my cart`
  if (id.startsWith('info_')) return `Tell me more about product ${id.replace('info_', '')}`
  if (id.startsWith('buy_')) return `I want to buy product ${id.replace('buy_', '')} right now, take me to checkout`
  if (id.startsWith('checkout')) return 'checkout'
  if (id.startsWith('cart_view')) return 'Show me my cart'
  if (id.startsWith('browse_')) return `Show me ${buttonText || id.replace('browse_', '')} products`
  if (id.startsWith('suggest_')) return buttonText || text
  return text
}

async function handleEmailInput(merchant: any, session: any, from: string, email: string, otpTemplate?: string | null) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = email.match(emailRegex)

  if (!match) {
    await baileysSend(merchant.id, from, `That doesn't look like a valid email. Please enter your email address:`)
    return NextResponse.json({ ok: true })
  }

  const cleanEmail = match[0].toLowerCase()
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('whatsapp_sessions')
    .update({
      email: cleanEmail,
      otp_code: otp,
      otp_expires_at: expiresAt,
      auth_state: 'awaiting_otp',
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id)

  const smtpConfig = merchant.smtp_enabled ? {
    smtp_enabled: merchant.smtp_enabled,
    smtp_host: merchant.smtp_host,
    smtp_port: merchant.smtp_port,
    smtp_user: merchant.smtp_user,
    smtp_password: merchant.smtp_password,
    smtp_from_email: merchant.smtp_from_email,
    smtp_from_name: merchant.smtp_from_name || merchant.store_name,
  } : undefined

    await sendOtpEmail(cleanEmail, otp, merchant.store_name || 'Store', smtpConfig)

    const otpMsg = otpTemplate
      ? otpTemplate.replace('{store_name}', merchant.store_name || 'Store').replace('{otp}', otp)
      : `A 6-digit verification code has been sent to *${cleanEmail}*\n\nPlease check your inbox and enter the code here:`

    await baileysSend(merchant.id, from, otpMsg)
  return NextResponse.json({ ok: true })
}

async function handleOtpInput(merchant: any, session: any, from: string, otp: string) {
  const cleanOtp = otp.replace(/\s/g, '')

  if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
    await baileysSend(merchant.id, from, `Please enter the 6-digit code we sent to your email:`)
    return NextResponse.json({ ok: true })
  }

  if (session.otp_expires_at && new Date(session.otp_expires_at) < new Date()) {
    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({ auth_state: 'awaiting_email', otp_code: null, otp_expires_at: null, updated_at: new Date().toISOString() })
      .eq('id', session.id)
    await baileysSend(merchant.id, from, `That code has expired. Please enter your email again:`)
    return NextResponse.json({ ok: true })
  }

  if (session.otp_code !== cleanOtp) {
    await baileysSend(merchant.id, from, `Wrong code. Please try again:`)
    return NextResponse.json({ ok: true })
  }

  await supabaseAdmin
    .from('whatsapp_sessions')
    .update({
      email_verified: true,
      otp_code: null,
      otp_expires_at: null,
      auth_state: 'authenticated',
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id)

  session.email_verified = true
  session.auth_state = 'authenticated'

  await baileysSend(merchant.id, from, `Email verified! *${session.email}*`)

  const cart = session.cart || []
  if (cart.length > 0) {
    return handleCheckout(merchant, { ...session, email_verified: true }, from)
  }

  await baileysSendInteractive(merchant.id, from, {
    type: 'buttons',
    body: `You're all set! What would you like to do?`,
    buttons: [
      { text: 'Browse Products', id: 'browse_all' },
      { text: 'View Cart', id: 'cart_view' }
    ]
  })
  return NextResponse.json({ ok: true })
}

async function handleCheckout(merchant: any, session: any, from: string) {
    const cart = session.cart || []
    if (cart.length === 0) {
      await baileysSend(merchant.id, from, `Your cart is empty! Browse some products first.`)
      return NextResponse.json({ ok: true })
    }
  
    const { data: recentMessages } = await supabaseAdmin
      .from('conversation_messages')
      .select('sender_type, message')
      .eq('conversation_id', session.id)
      .order('created_at', { ascending: false })
      .limit(20)
  
    const history = (recentMessages || []).reverse().map((m: any) => ({
      sender: m.sender_type === 'customer' ? 'user' : 'assistant',
      text: m.message
    }))
  
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const res = await fetch(`${appUrl}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate a payment link for my cart',
          subdomain: merchant.subdomain,
          cart,
          sessionId: session.session_id,
          email: session.email,
          history
        })
      })

    const responseText = await res.text()
    const { metadata, text: replyText } = parseAIResponse(responseText)

    const paymentAction = metadata.cartActions?.find((a: any) => a.type === 'payment_link_generated')
    if (paymentAction?.paymentUrl) {
      await baileysSend(merchant.id, from, `${replyText}\n\nPay here: ${paymentAction.paymentUrl}`)
      return NextResponse.json({ ok: true })
    }

    const currency = merchant.currency || 'USD'
    const total = cart.reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0)
    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(total)

    await baileysSend(merchant.id, from, `${replyText || `Your total is ${formatted}`}\n\nUse the link below when it's generated, or tell me to "generate payment link".`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Checkout error:', error)
    await baileysSend(merchant.id, from, `Something went wrong generating your payment link. Please try again.`)
    return NextResponse.json({ ok: true })
  }
}

async function handleAIChat(merchant: any, session: any, from: string, userMessage: string, pushName: string) {
  const { data: recentMessages } = await supabaseAdmin
    .from('conversation_messages')
    .select('sender_type, message')
    .eq('conversation_id', session.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const history = (recentMessages || []).reverse().map((m: any) => ({
    sender: m.sender_type === 'customer' ? 'user' : 'assistant',
    text: m.message
  }))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${appUrl}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        subdomain: merchant.subdomain,
        cart: session.cart || [],
        sessionId: session.session_id,
        email: session.email_verified ? session.email : undefined,
        history
      })
    })

    const responseText = await res.text()
    const { metadata, text: replyText } = parseAIResponse(responseText)

    await supabaseAdmin.from('conversation_messages').insert({
      merchant_id: merchant.id,
      conversation_id: session.id,
      sender_type: 'ai',
      sender_id: 'system',
      message: replyText,
      channel: 'whatsapp',
      metadata
    })

    if (metadata.cartActions?.length > 0) {
      await processCartActions(merchant.id, session, metadata.cartActions)
    }

    const paymentAction = metadata.cartActions?.find((a: any) => a.type === 'payment_link_generated')
    if (paymentAction?.paymentUrl) {
      await baileysSend(merchant.id, from, `${replyText}\n\nPay here: ${paymentAction.paymentUrl}`)
      return NextResponse.json({ ok: true })
    }

    if (metadata.products?.length > 0) {
      if (replyText) {
          await baileysSend(merchant.id, from, replyText)
          await delay(1500)
        }

      for (const product of metadata.products.slice(0, 5)) {
        const currency = merchant.currency || 'USD'
        const price = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(product.price)
        const desc = product.description?.slice(0, 200) || ''
        const stock = product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'

        await baileysSendInteractive(merchant.id, from, {
          type: 'product_card',
          body: `*${product.name}*\n${price}\n\n${desc}`,
          footer: stock,
          buttons: [
            { text: 'Add to Cart', id: `add_${product.id}` },
            { text: 'Tell me more', id: `info_${product.id}` },
            { text: 'Buy Now', id: `buy_${product.id}` }
          ]
        })
        await delay(2000)
      }

      if (metadata.suggestionButtons?.length > 0) {
        await baileysSendInteractive(merchant.id, from, {
          type: 'buttons',
          body: 'What else can I help with?',
          buttons: metadata.suggestionButtons.slice(0, 3).map((s: any, i: number) => ({
            text: typeof s === 'string' ? s.slice(0, 20) : (s.label || s.text || '').slice(0, 20),
            id: `suggest_${i}`
          }))
        })
      }

      return NextResponse.json({ ok: true })
    }

    await baileysSend(merchant.id, from, replyText || "I'm here to help! Try asking about our products.")

    if (metadata.suggestionButtons?.length > 0) {
      await delay(1000)
      await baileysSendInteractive(merchant.id, from, {
        type: 'buttons',
        body: 'Quick options:',
        buttons: metadata.suggestionButtons.slice(0, 3).map((s: any, i: number) => ({
          text: typeof s === 'string' ? s.slice(0, 20) : (s.label || s.text || '').slice(0, 20),
          id: `suggest_${i}`
        }))
      })
    }

      const updatedCart = session.cart || []
      if (metadata.cartActions?.some((a: any) => a.type === 'add_to_cart') && updatedCart.length > 0) {
      await delay(1000)
      await baileysSendInteractive(merchant.id, from, {
        type: 'buttons',
        body: `Cart: ${updatedCart.length} item${updatedCart.length > 1 ? 's' : ''}`,
        buttons: [
          { text: 'Checkout', id: 'checkout' },
          { text: 'View Cart', id: 'cart_view' },
          { text: 'Keep Shopping', id: 'browse_all' }
        ]
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('AI chat error:', error)
    await baileysSend(merchant.id, from, "Sorry, something went wrong. Please try again!")
    return NextResponse.json({ ok: true })
  }
}

async function processCartActions(merchantId: string, session: any, cartActions: any[]) {
  let cart = [...(session.cart || [])]

  for (const action of cartActions) {
    if (action.type === 'add_to_cart' && action.product) {
      const existing = cart.findIndex((item: any) => item.id === action.product.id)
      if (existing >= 0) {
        cart[existing].quantity = (cart[existing].quantity || 1) + (action.quantity || 1)
      } else {
        cart.push({
          id: action.product.id,
          name: action.product.name,
          price: action.bargainedPrice || action.product.price,
          quantity: action.quantity || 1,
          image: action.product.images?.[0]
        })
      }
    } else if (action.type === 'remove_from_cart' && action.productId) {
      cart = cart.filter((item: any) => item.id !== action.productId)
    } else if (action.type === 'update_quantity' && action.productId) {
      const idx = cart.findIndex((item: any) => item.id === action.productId)
      if (idx >= 0) {
        cart[idx].quantity = action.quantity || 1
      }
    } else if (action.type === 'clear_cart') {
      cart = []
    }
  }

  await supabaseAdmin
    .from('whatsapp_sessions')
    .update({ cart, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  session.cart = cart
}

function parseAIResponse(responseText: string): { metadata: any; text: string } {
  const lines = responseText.split('\n')
  let metadata: any = {}
  const textLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('METADATA:')) {
      try {
        metadata = JSON.parse(line.replace('METADATA:', ''))
      } catch {}
    } else {
      textLines.push(line)
    }
  }

  return { metadata, text: textLines.join('\n').trim() }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
