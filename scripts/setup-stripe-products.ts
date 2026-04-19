import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-expect-error - Ignore API version mismatch across environments
    apiVersion: '2026-02-25.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_IDS = {
  starter: '0d0d37a7-5bad-41d1-ac95-a5be286a1209',
  pro: 'c9637f9d-b4f3-4a18-9cc4-51a8dbce08ac',
};

interface RegionalPrice {
  countryCode: string;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

const STARTER_PRICES: RegionalPrice[] = [
  { countryCode: 'US', currency: 'usd', monthlyPrice: 2900, yearlyPrice: 29000 },
  { countryCode: 'IN', currency: 'inr', monthlyPrice: 99900, yearlyPrice: 999000 },
  { countryCode: 'GB', currency: 'gbp', monthlyPrice: 2400, yearlyPrice: 24000 },
  { countryCode: 'EU', currency: 'eur', monthlyPrice: 2700, yearlyPrice: 27000 },
  { countryCode: 'AU', currency: 'aud', monthlyPrice: 4500, yearlyPrice: 45000 },
  { countryCode: 'CA', currency: 'cad', monthlyPrice: 3900, yearlyPrice: 39000 },
];

const PRO_PRICES: RegionalPrice[] = [
  { countryCode: 'US', currency: 'usd', monthlyPrice: 7900, yearlyPrice: 79000 },
  { countryCode: 'IN', currency: 'inr', monthlyPrice: 299900, yearlyPrice: 2999000 },
  { countryCode: 'GB', currency: 'gbp', monthlyPrice: 6400, yearlyPrice: 64000 },
  { countryCode: 'EU', currency: 'eur', monthlyPrice: 7200, yearlyPrice: 72000 },
  { countryCode: 'AU', currency: 'aud', monthlyPrice: 11900, yearlyPrice: 119000 },
  { countryCode: 'CA', currency: 'cad', monthlyPrice: 9900, yearlyPrice: 99000 },
];

async function createProduct(name: string, description: string): Promise<Stripe.Product> {
  const product = await stripe.products.create({
    name,
    description,
  });
  console.log(`Created product: ${product.name} (${product.id})`);
  return product;
}

async function createPrices(
  productId: string,
  planId: string,
  prices: RegionalPrice[]
): Promise<void> {
  for (const price of prices) {
    const monthlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: price.monthlyPrice,
      currency: price.currency,
      recurring: { interval: 'month' },
      metadata: {
        plan_id: planId,
        country_code: price.countryCode,
        billing_cycle: 'monthly',
      },
    });

    const yearlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: price.yearlyPrice,
      currency: price.currency,
      recurring: { interval: 'year' },
      metadata: {
        plan_id: planId,
        country_code: price.countryCode,
        billing_cycle: 'yearly',
      },
    });

    console.log(
      `Created prices for ${price.countryCode}: Monthly=${monthlyPrice.id}, Yearly=${yearlyPrice.id}`
    );

    const { error } = await supabase
      .from('plan_prices')
      .update({
        stripe_monthly_price_id: monthlyPrice.id,
        stripe_yearly_price_id: yearlyPrice.id,
      })
      .eq('plan_id', planId)
      .eq('country_code', price.countryCode);

    if (error) {
      console.error(`Failed to update plan_prices for ${price.countryCode}:`, error);
    } else {
      console.log(`Updated plan_prices for ${price.countryCode}`);
    }
  }
}

async function updatePlanStripeProductId(planId: string, stripeProductId: string): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ stripe_product_id: stripeProductId })
    .eq('id', planId);

  if (error) {
    console.error(`Failed to update plan with Stripe product ID:`, error);
  }
}

async function main() {
  console.log('Setting up Stripe products and prices...\n');

  const starterProduct = await createProduct(
    'Starter Plan',
    'For growing businesses - 100 products, 500 orders/month, custom domain'
  );
  await updatePlanStripeProductId(PLAN_IDS.starter, starterProduct.id);
  await createPrices(starterProduct.id, PLAN_IDS.starter, STARTER_PRICES);

  console.log('\n');

  const proProduct = await createProduct(
    'Pro Plan',
    'For scaling brands - Unlimited products, 2000 orders/month, AI chat, abandoned cart recovery'
  );
  await updatePlanStripeProductId(PLAN_IDS.pro, proProduct.id);
  await createPrices(proProduct.id, PLAN_IDS.pro, PRO_PRICES);

  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
