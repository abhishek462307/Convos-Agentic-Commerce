export function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 99.99);
}

export function calculateSalePricing(listPrice: number, discountPercent: number) {
  const safeListPrice = Number.isFinite(listPrice) ? Math.max(listPrice, 0) : 0;
  const safeDiscountPercent = clampDiscountPercent(discountPercent);
  const finalPrice = Number((safeListPrice * (1 - safeDiscountPercent / 100)).toFixed(2));

  return {
    price: finalPrice,
    compareAtPrice: safeDiscountPercent > 0 ? Number(safeListPrice.toFixed(2)) : null,
    discountPercent: safeDiscountPercent,
  };
}

export function deriveListPrice(price: number | null | undefined, compareAtPrice: number | null | undefined): number {
  if (Number.isFinite(compareAtPrice) && Number.isFinite(price) && Number(compareAtPrice) > Number(price)) {
    return Number(compareAtPrice);
  }

  return Number.isFinite(price) ? Number(price) : 0;
}

export function deriveDiscountPercent(price: number | null | undefined, compareAtPrice: number | null | undefined): number {
  if (!Number.isFinite(price) || !Number.isFinite(compareAtPrice)) return 0;
  if (Number(compareAtPrice) <= Number(price) || Number(compareAtPrice) <= 0) return 0;

  return Number((((Number(compareAtPrice) - Number(price)) / Number(compareAtPrice)) * 100).toFixed(2));
}
