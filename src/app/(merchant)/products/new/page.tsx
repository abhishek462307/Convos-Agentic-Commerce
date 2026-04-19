"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Loader2,
  Save,
  Package,
  Plus,
  Trash2,
  Truck,
  Handshake,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { motion } from 'framer-motion';
import { ImageUpload } from '@/components/ImageUpload';
import { formatCurrency } from '@/lib/utils';
import { calculateSalePricing, clampDiscountPercent } from '@/lib/product-pricing';

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock_quantity: number | null;
  options: Record<string, string>;
  image_url: string;
  is_active: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const { merchant } = useMerchant();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    compare_at_price: null as number | null,
    sku: '',
    badge: '',
    image_url: '',
    category_id: null as string | null,
    type: 'physical' as 'physical' | 'digital' | 'service',
    status: 'active' as 'active' | 'draft' | 'archived',
    track_quantity: true,
    stock_quantity: null as number | null,
    digital_file_url: '',
    bargain_enabled: false,
    bargain_min_price: null as number | null,
    requires_shipping: true,
    weight: null as number | null,
    weight_unit: 'kg',
    length: null as number | null,
    width: null as number | null,
    height: null as number | null,
    dimension_unit: 'cm',
  });

  const [pricingInputs, setPricingInputs] = useState({ listPrice: '', discountPercent: '' });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      const response = await fetch('/api/merchant/products', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories || []);
      }
      setLoading(false);
    }
    if (merchant) {
      fetchCategories();
    }
  }, [merchant]);

  const currencySymbol = merchant?.currency === 'INR' ? '₹' : merchant?.currency === 'EUR' ? '€' : merchant?.currency === 'GBP' ? '£' : '$';
  const activeDiscountPercent = clampDiscountPercent(Number(pricingInputs.discountPercent || 0));
  const activeListPrice = Number(pricingInputs.listPrice || 0);

  const updatePricing = (field: 'listPrice' | 'discountPercent', value: string) => {
    const nextInputs = { ...pricingInputs, [field]: value };
    const pricing = calculateSalePricing(
      Number(nextInputs.listPrice || 0),
      Number(nextInputs.discountPercent || 0)
    );

    setPricingInputs(nextInputs);
    setProduct(p => ({
      ...p,
      price: pricing.price,
      compare_at_price: pricing.compareAtPrice,
    }));
  };

  const handleCreateProduct = async () => {
    if (!merchant) return;
    
    if (!product.name.trim()) {
      toast.error('Product title is required');
      return;
    }
    if (!pricingInputs.listPrice || Number(pricingInputs.listPrice) < 0) {
      toast.error('Valid price is required');
      return;
    }
    
    setSaving(true);

    try {
      const response = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product: {
            ...product,
            stock_quantity: product.track_quantity ? product.stock_quantity : null,
            digital_file_url: product.type === 'digital' ? product.digital_file_url : null,
          },
          variants: variants.map(v => ({
            name: v.name,
            sku: v.sku || null,
            price: v.price,
            stock_quantity: v.stock_quantity,
            options: v.options,
            image_url: v.image_url,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const data = await response.json();
      toast.success('Product created successfully');
      router.push(`/products/${data.product.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = () => {
    const newVariant: Variant = {
      id: Math.random().toString(36).substring(7),
      name: 'New Variant',
      sku: '',
      price: null,
      stock_quantity: null,
      options: {},
      image_url: '',
      is_active: true,
    };
    setEditingVariant(newVariant);
    setIsVariantDialogOpen(true);
  };

  const handleSaveVariant = () => {
    if (!editingVariant) return;
    const exists = variants.find(v => v.id === editingVariant.id);
    if (exists) {
      setVariants(variants.map(v => v.id === editingVariant.id ? editingVariant : v));
    } else {
      setVariants([...variants, editingVariant]);
    }
    setIsVariantDialogOpen(false);
  };

  if (loading) return null;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/products" className="group inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85 transition-colors hover:text-foreground">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> 
          Back to Catalog
        </Link>
      </div>

      <header className="page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm mb-4">
            <Plus className="h-3.5 w-3.5" />
            New Offering
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Create Product</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Launch a new product into your catalog. Define pricing, inventory, and AI bargaining rules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          <Button variant="ghost" className="h-11 rounded-2xl px-6 font-semibold tracking-tight text-muted-foreground hover:text-foreground transition-all" onClick={() => router.back()}>
            Discard
          </Button>
          <Button 
            onClick={handleCreateProduct} 
            disabled={saving}
            className="h-11 rounded-2xl px-7 font-semibold tracking-tight shadow-md hover:opacity-90 transition-all"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish product
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Base Configuration */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Product Details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">The primary identity and messaging for this product.</p>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Product Title</Label>
                <Input 
                  value={product.name}
                  onChange={e => setProduct({ ...product, name: e.target.value })}
                  placeholder="e.g., Midnight Runner Jacket"
                  className="h-12 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-lg font-semibold tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                <Textarea 
                  value={product.description}
                  onChange={e => setProduct({ ...product, description: e.target.value })}
                  placeholder="Tell your customers about this item..."
                  className="min-h-[150px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-sm font-medium leading-relaxed"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Price ({merchant?.currency || 'USD'})</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{currencySymbol}</span>
                    <Input 
                      type="number"
                      value={pricingInputs.listPrice}
                      onChange={e => updatePricing('listPrice', e.target.value)}
                      placeholder="0.00"
                      className="h-12 bg-secondary/20 border-border/70 pl-10 focus:ring-1 focus:ring-primary rounded-xl text-lg font-semibold font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Discount %</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      value={pricingInputs.discountPercent}
                      onChange={e => updatePricing('discountPercent', e.target.value)}
                      className="h-12 bg-secondary/20 border-border/70 pr-10 focus:ring-1 focus:ring-primary rounded-xl text-lg font-mono font-semibold"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Customer Pays</Label>
                  <div className="h-12 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 flex flex-col justify-center">
                    <span className="text-lg font-bold text-emerald-600 font-mono">
                      {formatCurrency(product.price || 0, merchant?.currency, merchant?.locale)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {activeDiscountPercent > 0 && activeListPrice > 0
                        ? `${activeDiscountPercent}% off applied`
                        : 'No discount applied'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">SKU</Label>
                  <Input 
                    value={product.sku}
                    onChange={e => setProduct({ ...product, sku: e.target.value })}
                    className="h-12 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-sm font-semibold font-mono"
                    placeholder="SKU-001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Cluster */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Main Visual</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">The face of your product. High-quality imagery converts better.</p>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
              <div className="max-w-sm">
                <div className="aspect-square rounded-[24px] overflow-hidden border border-dashed border-border/70 bg-secondary/10">
                  <ImageUpload 
                    value={product.image_url}
                    onChange={(url) => setProduct({ ...product, image_url: url })}
                    className="h-full w-full"
                  />
                </div>
                <p className="mt-4 text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wider">Upload primary image</p>
              </div>
            </CardContent>
          </Card>

          {/* Bargain Settings */}
          {merchant?.bargain_mode_enabled && (
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Handshake className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight">AI Price Negotiation</CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">Enable and configure AI bargaining thresholds.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between p-5 bg-secondary/15 rounded-2xl border border-border/70">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-foreground">Enable Bargaining</Label>
                    <p className="text-[11px] text-muted-foreground font-medium">Allow customers to bargain via AI chat.</p>
                  </div>
                  <Switch 
                    checked={product.bargain_enabled}
                    onCheckedChange={(checked) => setProduct({ ...product, bargain_enabled: checked })}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {product.bargain_enabled && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="p-5 bg-card border border-border/70 rounded-2xl flex items-start gap-4 shadow-sm">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        Define the absolute <span className="text-foreground font-semibold">Floor Price</span>. The AI will strategically offer values between your List Price and this floor.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 opacity-60">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Current List Price</Label>
                        <div className="h-11 bg-secondary/10 border border-border/70 rounded-xl flex items-center px-4 font-semibold font-mono text-muted-foreground">
                          {formatCurrency(product.price || 0, merchant?.currency, merchant?.locale)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Minimum Floor Price *</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{currencySymbol}</span>
                          <Input 
                            type="number"
                            value={product.bargain_min_price ?? ''}
                            onChange={e => setProduct({ ...product, bargain_min_price: e.target.value ? parseFloat(e.target.value) : null })}
                            className="h-11 bg-secondary/20 border-border/70 pl-10 focus:ring-1 focus:ring-amber-500 rounded-xl text-lg font-semibold font-mono text-amber-600"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Variant Clusters */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <div className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Variants</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Sizes, colors, or styles.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddVariant} className="h-9 rounded-xl border-border/70 px-4 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-secondary/40">
                  <Plus className="mr-2 h-3.5 w-3.5" /> Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
              {variants.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/70 rounded-2xl bg-secondary/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">No variants added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map(variant => (
                    <div 
                      key={variant.id} 
                      className="flex items-center justify-between p-4 bg-secondary/15 border border-border/70 rounded-[20px] group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-card">
                          {variant.image_url ? (
                            <img src={variant.image_url} alt={variant.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{variant.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">
                            {variant.price ? formatCurrency(variant.price, merchant?.currency) : 'Base Price'} • {variant.stock_quantity ?? '∞'} stock
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingVariant(variant); setIsVariantDialogOpen(true); }} className="h-9 w-9 rounded-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setVariants(variants.filter(v => v.id !== variant.id))} className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50/50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Visibility Node */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Default Status</Label>
                <Select value={product.status} onValueChange={(v: any) => setProduct({ ...product, status: v })}>
                  <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl shadow-xl">
                    <SelectItem value="active" className="font-semibold text-emerald-600">Active</SelectItem>
                    <SelectItem value="draft" className="font-semibold text-amber-600">Draft</SelectItem>
                    <SelectItem value="archived" className="font-semibold text-muted-foreground">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Offering Type</Label>
                <Select value={product.type} onValueChange={(v: any) => setProduct({ ...product, type: v })}>
                  <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl shadow-xl">
                    <SelectItem value="physical" className="font-semibold">Physical Product</SelectItem>
                    <SelectItem value="digital" className="font-semibold">Digital Asset</SelectItem>
                    <SelectItem value="service" className="font-semibold">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {product.type === 'digital' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 pt-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Asset Delivery URL</Label>
                  <Input 
                    value={product.digital_file_url}
                    onChange={e => setProduct({ ...product, digital_file_url: e.target.value })}
                    placeholder="https://..."
                    className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-[11px]"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Node */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Stock Control</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Track Quantity</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Automatic stock management.</p>
                </div>
                <Switch 
                  checked={product.track_quantity}
                  onCheckedChange={(v) => setProduct({ ...product, track_quantity: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {product.track_quantity && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3.5 border-t border-border/40 pt-5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Opening Stock</Label>
                  <Input 
                    type="number"
                    value={product.stock_quantity ?? ''}
                    onChange={e => setProduct({ ...product, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    className="h-12 bg-secondary/15 border-border/70 rounded-xl text-center text-xl font-bold font-mono"
                    placeholder="0"
                  />
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Node */}
          {product.type === 'physical' && (
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold tracking-tight">Shipping Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">Requires Shipping</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Capture address at checkout.</p>
                  </div>
                  <Switch
                    checked={product.requires_shipping}
                    onCheckedChange={(v) => setProduct({ ...product, requires_shipping: v })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {product.requires_shipping && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 border-t border-border/40 pt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Weight</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={product.weight ?? ''}
                          onChange={e => setProduct({ ...product, weight: e.target.value ? parseFloat(e.target.value) : null })}
                          className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Unit</Label>
                        <Select value={product.weight_unit} onValueChange={v => setProduct({ ...product, weight_unit: v })}>
                          <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/70">
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categorization */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Organization</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Category</Label>
                <Select 
                  value={product.category_id || 'none'} 
                  onValueChange={value => setProduct({ ...product, category_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl shadow-xl">
                    <SelectItem value="none" className="font-semibold italic opacity-60">Uncategorized</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="font-semibold">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Visual Badge</Label>
                <Input 
                  value={product.badge}
                  onChange={e => setProduct({ ...product, badge: e.target.value })}
                  className="h-10 bg-secondary/15 border-border/70 rounded-xl font-bold text-xs uppercase tracking-widest"
                  placeholder="NEW, TOP RATED"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border/70 p-0 overflow-hidden rounded-[24px]">
          <DialogHeader className="p-6 border-b border-border/70 bg-secondary/10">
            <DialogTitle className="text-lg font-semibold tracking-tight">Configure Variant</DialogTitle>
          </DialogHeader>
          {editingVariant && (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Name</Label>
                <Input 
                  value={editingVariant.name}
                  onChange={e => setEditingVariant({ ...editingVariant, name: e.target.value })}
                  className="h-10 bg-secondary/10 border-border/70 rounded-xl font-semibold text-sm"
                  placeholder="e.g., Size M / Red"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Price</Label>
                  <Input 
                    type="number"
                    value={editingVariant.price ?? ''}
                    onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value ? parseFloat(e.target.value) : null })}
                    className="h-10 bg-secondary/10 border-border/70 rounded-xl font-semibold font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Stock</Label>
                  <Input 
                    type="number"
                    value={editingVariant.stock_quantity ?? ''}
                    onChange={e => setEditingVariant({ ...editingVariant, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    className="h-10 bg-secondary/10 border-border/70 rounded-xl font-semibold font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-6 border-t border-border/70 bg-secondary/5 flex gap-3">
            <Button variant="ghost" onClick={() => setIsVariantDialogOpen(false)} className="h-10 flex-1 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveVariant} className="h-10 flex-1 rounded-xl">
              Add variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
