"use client"

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight,
  CheckCircle2,
  Store,
  Package,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

export default function ImportHubPage() {
  const { merchant, loading } = useMerchant();

  if (loading || !merchant) return <MerchantPageSkeleton />;

  const shopifyConfig = (merchant.shopify_config as Record<string, unknown> | undefined) || {};
  const wooConfig = (merchant.woocommerce_config as Record<string, unknown> | undefined) || {};
  const shopifyConnected = Boolean(shopifyConfig.connected_at);
  const wooConnected = Boolean(wooConfig.connected_at);

  const platforms = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Import products from your Shopify store using public catalog or Admin API.',
      href: '/settings/import/shopify',
      connected: shopifyConnected,
      connectedAt: shopifyConfig.connected_at as string | undefined,
      storeUrl: shopifyConfig.store_url as string | undefined,
      color: '#96bf48',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#96bf48">
          <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zm-1.469-17.954c-.145-.041-.309-.087-.49-.138 0-.016.002-.031.002-.047 0-1.378-.762-1.988-1.668-1.988-.146 0-.295.013-.446.04l-.083-.161c-.321-.602-.744-.89-1.279-.89-1.991 0-2.951 2.487-3.249 3.756-.615.19-1.051.325-1.107.344-.346.107-.356.118-.401.446-.034.257-1.267 9.773-1.267 9.773l9.49 1.638.498-12.773zm-4.111-1.946c0 .029-.001.063-.001.094 0 .031.001.063.001.094-.418.129-.874.271-1.358.42.261-.999.75-1.488 1.177-1.677.077.283.18.664.18 1.069h.001zm.96-.727c.381.104.789.216 1.222.335-.212.883-.638 1.656-1.149 1.993-.072-.759-.179-1.615-.073-2.328zm.659-1.073c.116 0 .222.013.319.038-.757.356-1.57 1.255-1.913 3.047l-.963.298c.318-1.201 1.066-3.383 2.557-3.383z"/>
        </svg>
      ),
      features: ['Quick Import (no API key)', 'Admin API (full access)', 'Product variants & categories', 'Inventory sync']
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'Import products from your WooCommerce store using REST API credentials.',
      href: '/settings/import/woocommerce',
      connected: wooConnected,
      connectedAt: wooConfig.connected_at as string | undefined,
      storeUrl: wooConfig.store_url as string | undefined,
      color: '#7f54b3',
      icon: (
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#7f54b3">
          <path d="M2.227 4.857A2.228 2.228 0 000 7.085v7.964c0 1.229.998 2.227 2.227 2.227h7.296l3.477 2.724-1.063-2.724h9.836A2.228 2.228 0 0024 15.049V7.085a2.228 2.228 0 00-2.227-2.228H2.227zM4.244 7.7c.37-.063.728.062.96.368.234.307.342.744.297 1.3l-.574 5.55c-.063.37-.2.65-.4.837-.2.188-.431.263-.693.228-.293-.044-.537-.234-.731-.567L1.14 11.746l-.553 5.025-.91.007.746-7.293c.056-.394.19-.675.4-.838.21-.162.443-.23.694-.196.293.043.537.228.731.55l1.96 3.54.556-4.37c.05-.295.175-.418.48-.47zm5.924.23c.688.025 1.216.288 1.587.785.386.516.568 1.231.543 2.145-.046 1.157-.36 2.1-.94 2.832-.55.695-1.176 1.018-1.877.97-.687-.025-1.216-.288-1.587-.786-.387-.516-.568-1.231-.544-2.145.046-1.157.36-2.1.94-2.832.55-.695 1.178-1.018 1.878-.97zm6.512 0c.688.025 1.216.288 1.587.785.386.516.568 1.231.543 2.145-.046 1.157-.36 2.1-.94 2.832-.55.695-1.176 1.018-1.877.97-.687-.025-1.216-.288-1.587-.786-.387-.516-.568-1.231-.544-2.145.046-1.157.36-2.1.94-2.832.55-.695 1.178-1.018 1.878-.97zM10.05 8.95c-.362.02-.7.263-.994.728-.28.446-.44 1.002-.462 1.662-.018.53.065.952.25 1.266.187.315.423.48.709.495.362-.02.7-.263.994-.728.281-.446.44-1.002.463-1.662.018-.53-.066-.952-.25-1.266-.188-.315-.425-.48-.71-.495zm6.512 0c-.362.02-.7.263-.994.728-.28.446-.44 1.002-.462 1.662-.018.53.065.952.25 1.266.187.315.423.48.709.495.362-.02.7-.263.994-.728.281-.446.44-1.002.463-1.662.018-.53-.066-.952-.25-1.266-.188-.315-.425-.48-.71-.495z"/>
        </svg>
      ),
      features: ['REST API integration', 'Variable products & attributes', 'Category mapping', 'Stock quantities']
    }
  ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] uppercase font-bold tracking-[0.12em] bg-card border-border/70 text-muted-foreground/85 shadow-sm">Migration</Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Inventory Import</span>
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Product Import</h2>
            <p className="text-[15px] text-muted-foreground mt-1 max-w-2xl">
              Migrate your product catalog from existing platforms into Convos from a calm control surface.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {platforms.map((platform) => (
          <Link key={platform.id} href={platform.href}>
            <Card className="group border-border/70 bg-card rounded-[24px] overflow-hidden hover:border-primary/20 transition-all duration-300 cursor-pointer h-full shadow-sm">
              <CardContent className="p-0">
                <div className="p-6 border-b border-border/50 bg-secondary/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center border border-border/50 shadow-sm"
                        style={{ backgroundColor: `${platform.color}15` }}
                      >
                        {platform.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[17px] font-bold tracking-tight">{platform.name}</h3>
                          {platform.connected && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-1 max-w-sm font-medium leading-relaxed">{platform.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                  </div>
                </div>

                <div className="p-6 bg-card">
                  {platform.connected && platform.storeUrl && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/20 rounded-xl border border-border/50">
                      <Store className="w-4 h-4 text-muted-foreground/60" />
                      <span className="text-[12px] font-bold text-muted-foreground truncate tracking-tight">{platform.storeUrl}</span>
                      {platform.connectedAt && (
                        <span className="text-[10px] font-bold text-muted-foreground/40 ml-auto flex items-center gap-1 shrink-0 uppercase tracking-tighter">
                          <Clock className="w-3 h-3" />
                          {new Date(platform.connectedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {platform.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: platform.color }} />
                        <span className="text-[11px] text-muted-foreground/80 font-bold uppercase tracking-tighter truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-border/70 bg-secondary/20 rounded-[24px] overflow-hidden shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border/70 shadow-sm">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold tracking-tight mb-1">CSV Import</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">
                You can also import products via CSV file directly from the{' '}
                <Link href="/products" className="text-primary hover:underline font-bold">Products page</Link>
                {' '}using the Import button.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
