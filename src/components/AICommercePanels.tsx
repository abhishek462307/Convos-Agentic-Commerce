"use client"

import React from 'react';
import { AlertCircle, CheckCircle2, Filter, RefreshCw, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type {
  ActiveFilter,
  CheckoutConfidence,
  PreferenceSummary,
  ProductComparison,
  RecoveryState,
  RefinementOption,
  VariantPrompt,
} from '@/types';

type Actionable = string | { label: string; action: string };

function getActionLabel(action: Actionable) {
  return typeof action === 'string' ? action : action.label;
}

function getActionValue(action: Actionable) {
  return typeof action === 'string' ? action : action.action;
}

function ActionChip({
  action,
  onAction,
  compact = false,
}: {
  action: Actionable;
  onAction?: (value: string, label: string) => void;
  compact?: boolean;
}) {
  const label = getActionLabel(action);
  const value = getActionValue(action);

  return (
    <button
      type="button"
      className={`font-semibold rounded-full border transition-all hover:border-primary/40 hover:text-primary ${
        compact ? 'h-10 px-4 text-[12px] shadow-[0_8px_24px_rgba(15,23,42,0.06)]' : 'h-8 px-3 text-[11px]'
      }`}
      style={{
        borderColor: 'var(--store-border)',
        background: compact ? 'color-mix(in srgb, var(--store-card-bg) 88%, white)' : 'var(--store-card-bg)',
        color: 'var(--store-text)',
      }}
      onClick={() => onAction?.(value, label)}
    >
      {label}
    </button>
  );
}

export function CheckoutConfidenceCard({
  confidence,
  merchant,
  compact = false,
}: {
  confidence: CheckoutConfidence;
  merchant?: { currency?: string; locale?: string } | null;
  compact?: boolean;
}) {
  const currency = confidence.currency || merchant?.currency;
  const locale = merchant?.locale;
  const amountClass = compact ? 'text-[11px]' : 'text-[12px]';

  return (
    <div className="rounded-[24px] border p-4 space-y-3" style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
          <ShieldCheck className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--store-text)' }}>Before you checkout</p>
          <p className="text-[11px]" style={{ color: 'var(--store-text-muted)' }}>Estimated payable with shipping, taxes, and payment context.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['Subtotal', confidence.subtotal],
          ['Shipping', confidence.estimatedShipping],
          ['Tax', confidence.estimatedTax],
          ['Estimated total', confidence.estimatedTotal],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl px-3 py-2 border" style={{ borderColor: 'var(--store-border)' }}>
            <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--store-text-muted)' }}>{label}</p>
            <p className={`${amountClass} font-semibold mt-1`} style={{ color: 'var(--store-text)' }}>
              {formatCurrency(Number(value), currency, locale)}
            </p>
          </div>
        ))}
      </div>

      {(confidence.couponImpact || confidence.bargainSavings) && (
        <div className="flex flex-wrap gap-2">
          {typeof confidence.couponImpact === 'number' && confidence.couponImpact > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, #16a34a 14%, transparent)', color: '#166534' }}>
              Coupon savings: {formatCurrency(confidence.couponImpact, currency, locale)}
            </span>
          )}
          {typeof confidence.bargainSavings === 'number' && confidence.bargainSavings > 0 && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
              Bargain savings: {formatCurrency(confidence.bargainSavings, currency, locale)}
            </span>
          )}
        </div>
      )}

      {confidence.paymentMethods?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'var(--store-text-muted)' }}>Payment methods</p>
          <div className="flex flex-wrap gap-2">
            {confidence.paymentMethods.map((method) => (
              <span key={method} className="text-[11px] font-medium px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--store-border)', color: 'var(--store-text)' }}>
                {method}
              </span>
            ))}
          </div>
        </div>
      )}

      {confidence.returnSummary && (
        <div className="rounded-2xl px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--store-bg) 72%, white)' }}>
          <p className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--store-text-muted)' }}>Returns</p>
          <p className="text-[11px] leading-5" style={{ color: 'var(--store-text)' }}>{confidence.returnSummary}</p>
        </div>
      )}

      {confidence.assumptions?.length > 0 && (
        <div className="space-y-1">
          {confidence.assumptions.map((assumption) => (
            <div key={assumption} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--store-text-muted)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{assumption}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparisonCard({
  comparison,
  merchant,
  compact = false,
}: {
  comparison: ProductComparison;
  merchant?: { currency?: string; locale?: string } | null;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[24px] border p-4 space-y-4" style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
          <Scale className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--store-text)' }}>Comparison</p>
          <p className="text-[11px]" style={{ color: 'var(--store-text-muted)' }}>{comparison.verdict}</p>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
        {comparison.products.map((product) => (
          <div key={product.id} className="rounded-2xl border p-3 space-y-2" style={{ borderColor: 'var(--store-border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold" style={{ color: 'var(--store-text)' }}>{product.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--store-text-muted)' }}>
                  {formatCurrency(product.price, merchant?.currency, merchant?.locale)}
                  {product.compare_at_price && product.compare_at_price > product.price ? ` · was ${formatCurrency(product.compare_at_price, merchant?.currency, merchant?.locale)}` : ''}
                </p>
              </div>
              {product.stock_status && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--store-bg) 80%, white)', color: 'var(--store-text-muted)' }}>
                  {product.stock_status}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!!product.variant_count && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full border" style={{ borderColor: 'var(--store-border)', color: 'var(--store-text-muted)' }}>
                  {product.variant_count} variants
                </span>
              )}
              {typeof product.rating === 'number' && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full border" style={{ borderColor: 'var(--store-border)', color: 'var(--store-text-muted)' }}>
                  {product.rating.toFixed(1)}★ {product.review_count ? `(${product.review_count})` : ''}
                </span>
              )}
            </div>

            {product.ai_reason && (
              <p className="text-[11px] leading-5" style={{ color: 'var(--store-text)' }}>{product.ai_reason}</p>
            )}
            {product.ai_tradeoff && (
              <p className="text-[11px] leading-5" style={{ color: 'var(--store-text-muted)' }}>Tradeoff: {product.ai_tradeoff}</p>
            )}
            {product.review_summary && (
              <p className="text-[11px] leading-5" style={{ color: 'var(--store-text-muted)' }}>Reviews: {product.review_summary}</p>
            )}
            {product.popularity_reason && (
              <p className="text-[11px] leading-5" style={{ color: 'var(--store-text-muted)' }}>Popularity: {product.popularity_reason}</p>
            )}
          </div>
        ))}
      </div>

      {comparison.bestFor?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'var(--store-text-muted)' }}>Best for</p>
          <div className="flex flex-wrap gap-2">
            {comparison.bestFor.map((item) => (
              <span key={item} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {comparison.tradeoffs?.length > 0 && (
        <div className="space-y-1">
          {comparison.tradeoffs.map((tradeoff) => (
            <div key={tradeoff} className="flex items-start gap-2 text-[11px]" style={{ color: 'var(--store-text-muted)' }}>
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{tradeoff}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AICommerceMetaBlocks({
  metadata,
  merchant,
  compact = false,
  onAction,
  hideFilters,
  hideRefinements,
}: {
  metadata?: {
    checkoutConfidence?: CheckoutConfidence;
    comparison?: ProductComparison;
    activePreferences?: PreferenceSummary[];
    refinementOptions?: RefinementOption[];
    activeFilters?: ActiveFilter[];
    variantPrompt?: VariantPrompt;
    recoveryState?: RecoveryState;
  } | null;
  merchant?: { currency?: string; locale?: string } | null;
  compact?: boolean;
  onAction?: (value: string, label: string) => void;
  hideFilters?: boolean;
  hideRefinements?: boolean;
}) {
  if (!metadata) return null;

  const hasContent =
    metadata.checkoutConfidence ||
    metadata.comparison ||
    (!hideRefinements && metadata.refinementOptions?.length) ||
    (!hideFilters && metadata.activeFilters?.length) ||
    metadata.variantPrompt ||
    metadata.recoveryState;

  if (!hasContent) return null;

  const compactShellClass = compact ? 'rounded-[18px] p-2.5' : 'rounded-[22px] p-3';
  const compactTextClass = compact ? 'text-[11px]' : 'text-[12px]';
  const showCompactSearchCard = compact && ((!hideFilters && metadata.activeFilters?.length) || (!hideRefinements && metadata.refinementOptions?.length));

  return (
    <div className="space-y-3">
      {metadata.checkoutConfidence && <CheckoutConfidenceCard confidence={metadata.checkoutConfidence} merchant={merchant} compact={compact} />}
      {metadata.comparison && <ComparisonCard comparison={metadata.comparison} merchant={merchant} compact={compact} />}

      {showCompactSearchCard ? (
        <div
          className="rounded-[26px] border px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
          style={{ borderColor: 'var(--store-border)', background: 'color-mix(in srgb, var(--store-card-bg) 86%, white)' }}
        >
          {metadata.activeFilters?.length && !hideFilters ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in srgb, #ff4d6d 12%, white)' }}
                >
                  <Filter className="w-4 h-4" style={{ color: '#ff4d6d' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--store-text-muted)' }}>Applied</p>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--store-text)' }}>Current filters</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {metadata.activeFilters.map((filter) => (
                  <span
                    key={`${filter.key}-${filter.value}`}
                    className="text-[12px] font-semibold px-3.5 py-2 rounded-full border shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                    style={{
                      borderColor: 'color-mix(in srgb, #ff4d6d 18%, var(--store-border))',
                      color: 'var(--store-text)',
                      background: 'color-mix(in srgb, #ff4d6d 6%, white)',
                    }}
                  >
                    {filter.label}: {filter.value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {metadata.refinementOptions?.length && !hideRefinements ? (
            <div
              className={(metadata.activeFilters?.length && !hideFilters) ? 'mt-4 pt-4 border-t' : ''}
              style={(metadata.activeFilters?.length && !hideFilters) ? { borderColor: 'var(--store-border)' } : undefined}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--store-text-muted)' }}>Try next</p>
              <p className="text-[15px] font-semibold mb-3" style={{ color: 'var(--store-text)' }}>Refine this search</p>
              <div className="flex flex-wrap gap-2.5">
                {metadata.refinementOptions.map((option) => (
                  <ActionChip
                    key={`${option.type || 'refine'}-${option.label}`}
                    action={{ label: option.label, action: option.action }}
                    onAction={onAction}
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (metadata.activeFilters?.length && !hideFilters) ? (
        <div className={`${compactShellClass} border`} style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <p className={`${compactTextClass} font-semibold`} style={{ color: 'var(--store-text)' }}>Current filters</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {metadata.activeFilters.map((filter) => (
              <span key={`${filter.key}-${filter.value}`} className="text-[11px] font-medium px-2.5 py-1 rounded-full border" style={{ borderColor: 'var(--store-border)', color: 'var(--store-text)' }}>
                {filter.label}: {filter.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!showCompactSearchCard && metadata.refinementOptions?.length && !hideRefinements ? (
        <div className={`${compactShellClass} border`} style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}>
          <p className={`${compactTextClass} font-semibold mb-2`} style={{ color: 'var(--store-text)' }}>Refine this search</p>
          <div className="flex flex-wrap gap-2">
            {metadata.refinementOptions.map((option) => (
              <ActionChip key={`${option.type || 'refine'}-${option.label}`} action={{ label: option.label, action: option.action }} onAction={onAction} compact={compact} />
            ))}
          </div>
        </div>
      ) : null}

      {metadata.variantPrompt ? (
        <div className={`${compactShellClass} border`} style={{ borderColor: 'var(--store-border)', background: 'var(--store-card-bg)' }}>
          <p className={`${compactTextClass} font-semibold`} style={{ color: 'var(--store-text)' }}>Choose an option for {metadata.variantPrompt.productName}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.variantPrompt.options.map((option) => (
              <ActionChip key={option.id} action={{ label: option.label, action: `choose ${option.label}` }} onAction={onAction} compact={compact} />
            ))}
          </div>
        </div>
      ) : null}

      {metadata.recoveryState ? (
        <div className={`${compactShellClass} border`} style={{ borderColor: 'color-mix(in srgb, #f59e0b 35%, var(--store-border))', background: 'var(--store-card-bg)' }}>
          <div className="flex items-start gap-2">
            {metadata.recoveryState.type === 'retry' ? (
              <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#d97706' }} />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#d97706' }} />
            )}
            <div className="min-w-0">
              <p className={`${compactTextClass} font-semibold`} style={{ color: 'var(--store-text)' }}>Need a recovery path</p>
              <p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--store-text-muted)' }}>{metadata.recoveryState.message}</p>
            </div>
          </div>
          {metadata.recoveryState.actions?.length ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {metadata.recoveryState.actions.map((action, index) => (
                <ActionChip key={`${getActionValue(action)}-${index}`} action={action} onAction={onAction} compact={compact} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
