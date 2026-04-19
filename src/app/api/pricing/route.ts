import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (plansError) {
    return NextResponse.json({ error: plansError.message }, { status: 500 });
  }

  const { data: prices, error: pricesError } = await supabase
    .from("plan_prices")
    .select("*")
    .eq("country_code", "US");

  if (pricesError) {
    return NextResponse.json({ error: pricesError.message }, { status: 500 });
  }

  const result = plans.map((plan) => {
    const price = prices.find((p) => p.plan_id === plan.id);
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      features: plan.features,
      limits: plan.limits,
      sort_order: plan.sort_order,
      monthly_price: price?.monthly_price ?? null,
      yearly_price: price?.yearly_price ?? null,
      stripe_product_id: plan.stripe_product_id,
    };
  });

  return NextResponse.json(result);
}
