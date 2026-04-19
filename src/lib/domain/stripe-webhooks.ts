import type Stripe from 'stripe';
import logger from '@/lib/logger';
import {
  finalizeProviderPaidOrder,
  markProviderPaymentFailed,
  markProviderRefundState,
} from '@/lib/domain/payment-finalization';

type SupabaseLike = {
  from: (table: string) => any
}

export function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceToPlan: Record<string, string> = {
    price_1Sr3OlCvDmWnHanP6758Zbrd: 'starter',
    price_1Sr3OlCvDmWnHanPVVqjsH9Y: 'starter',
    price_1Sr3OmCvDmWnHanPXD765UOt: 'pro',
    price_1Sr3OmCvDmWnHanPs87uf0dh: 'pro',
    price_1Sr3OnCvDmWnHanPAhoeRySr: 'enterprise',
    price_1Sr3OnCvDmWnHanPPE7mehut: 'enterprise',
  };

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && priceToPlan[priceId]) {
    return priceToPlan[priceId];
  }
  const metadataPlan = subscription.metadata?.plan_type;
  if (metadataPlan === 'professional') {
    return 'pro';
  }
  return metadataPlan || 'starter';
}

export function getBillingCycle(subscription: Stripe.Subscription): string {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  return interval === 'year' ? 'yearly' : 'monthly';
}

export async function processMerchantStripeEvent(input: {
  supabase: SupabaseLike
  merchant: any
  event: Stripe.Event
}) {
  const { supabase, merchant, event } = input;
  const eventObject = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = eventObject as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (!orderId) {
        throw new Error('Missing order_id in session metadata');
      }

      const finalization = await finalizeProviderPaidOrder({
        supabase,
        merchant,
        orderId,
        provider: 'stripe',
        customerEmailOverride: session.customer_details?.email || null,
        paymentDetails: {
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          stripe_customer_id: session.customer,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_details?.email,
          shipping_address: (session as any).shipping_details?.address,
          livemode: session.livemode,
          completed_at: new Date().toISOString(),
        },
      });

      if (!finalization.success) {
        throw new Error(finalization.error || 'Failed to finalize paid order');
      }

      if (finalization.alreadyFinalized || !finalization.context) {
        return { handled: true, orderId, finalized: false };
      }

      return { handled: true, orderId, finalized: true };
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = eventObject as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;
      if (!orderId) {
        return { handled: true, skipped: true };
      }

      const finalization = await finalizeProviderPaidOrder({
        supabase,
        merchant,
        orderId,
        provider: 'stripe',
        paymentDetails: {
          stripe_payment_intent: paymentIntent.id,
          payment_status: 'succeeded',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          livemode: paymentIntent.livemode,
          updated_at: new Date().toISOString(),
        },
      });

      if (!finalization.success) {
        logger.error(`[Webhook] Payment intent finalization failed for ${orderId}: ${finalization.error}`);
      }

      return { handled: true, orderId };
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = eventObject as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.order_id;
      if (!orderId) {
        return { handled: true, skipped: true };
      }

      await markProviderPaymentFailed({
        supabase,
        orderId,
        merchantId: merchant.id,
        paymentDetails: {
          stripe_payment_intent: paymentIntent.id,
          payment_status: 'failed',
          failure_message: paymentIntent.last_payment_error?.message,
          livemode: paymentIntent.livemode,
          updated_at: new Date().toISOString(),
        },
      });

      return { handled: true, orderId };
    }

    case 'charge.refunded': {
      const charge = eventObject as Stripe.Charge;
      const orderId = charge.metadata?.order_id;
      if (!orderId) {
        return { handled: true, skipped: true };
      }

      await markProviderRefundState({
        supabase,
        orderId,
        merchantId: merchant.id,
        status: charge.amount_refunded === charge.amount ? 'refunded' : 'partially_refunded',
        paymentDetails: {
          stripe_charge_id: charge.id,
          amount_refunded: charge.amount_refunded,
          refund_status: charge.refunded ? 'full' : 'partial',
          livemode: charge.livemode,
          updated_at: new Date().toISOString(),
        },
      });

      return { handled: true, orderId };
    }

    default:
      logger.info(`[Webhook] Unhandled event type: ${event.type}`);
      return { handled: false };
  }
}

export async function processPlatformStripeEvent(input: {
  supabase: SupabaseLike
  stripe: Stripe
  event: Stripe.Event
}) {
  const { supabase, stripe, event } = input;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const merchantId = subscription.metadata?.merchant_id;
      if (!merchantId) {
        return { handled: true, skipped: true };
      }

      const plan = getPlanFromSubscription(subscription);
      const billingCycle = getBillingCycle(subscription);
      const status = subscription.status;
      const isActive = status === 'active' || status === 'trialing';

      await supabase
        .from('merchant_subscriptions')
        .upsert({
          merchant_id: merchantId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          plan_type: plan,
          billing_cycle: billingCycle,
          status: isActive ? 'active' : status,
          current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'merchant_id' });

      await supabase
        .from('merchants')
        .update({
          plan: isActive ? plan : 'free',
        })
        .eq('id', merchantId);

      return { handled: true, merchantId, plan };
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const merchantId = subscription.metadata?.merchant_id;
      if (!merchantId) {
        return { handled: true, skipped: true };
      }

      await supabase
        .from('merchant_subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_id', merchantId);

      await supabase
        .from('merchants')
        .update({
          plan: 'free',
        })
        .eq('id', merchantId);

      return { handled: true, merchantId };
    }

    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string;
      if (!subscriptionId) {
        return { handled: true, skipped: true };
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const merchantId = subscription.metadata?.merchant_id;
      if (!merchantId) {
        return { handled: true, skipped: true };
      }

      const isSuccess = event.type === 'invoice.payment_succeeded';
      const status = isSuccess ? 'active' : 'past_due';
      const merchantUpdate: Record<string, any> = {};
      if (isSuccess) {
        merchantUpdate.plan = getPlanFromSubscription(subscription);
      }

      await supabase
        .from('merchant_subscriptions')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_id', merchantId);

      if (Object.keys(merchantUpdate).length > 0) {
        await supabase
          .from('merchants')
          .update(merchantUpdate)
          .eq('id', merchantId);
      }

      return { handled: true, merchantId, status };
    }

    default:
      logger.info(`[Platform Webhook] Unhandled: ${event.type}`);
      return { handled: false };
  }
}
