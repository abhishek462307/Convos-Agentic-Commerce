"use client"

import React, { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ImageUpload } from '@/components/ImageUpload';
import { formatCurrency } from '@/lib/utils';
import { calculateSalePricing, clampDiscountPercent, deriveDiscountPercent, deriveListPrice } from '@/lib/product-pricing';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Loader2,
  X,
  Save,
  Package,
  Layers,
    Eye,
    Truck,
    Zap
  } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

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

interface ProductImage {
  id: string;
  url: string;
  alt_text: string;
  position: number;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { merchant } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  
  const [productType, setProductType] = useState<'physical' | 'digital' | 'service'>('physical');
  const [trackQuantity, setTrackQuantity] = useState(true);
  const [digitalFileUrl, setDigitalFileUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [pricingInputs, setPricingInputs] = useState({ listPrice: '', discountPercent: '' });

  const storeBargainEnabled = merchant?.bargain_mode_enabled ?? false;
  const currencySymbol = merchant?.currency === 'INR' ? '₹' : merchant?.currency === 'EUR' ? '€' : merchant?.currency === 'GBP' ? '£' : '$';
  const activeDiscountPercent = clampDiscountPercent(Number(pricingInputs.discountPercent || 0));
  const activeListPrice = Number(pricingInputs.listPrice || 0);
  const saleSavings = product?.compare_at_price && product?.price && product.compare_at_price > product.price
    ? product.compare_at_price - product.price
    : 0;

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/merchant/products/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      setLoading(false);
      return;
    }

    const data = await response.json();
    const productData = data.product;
    if (productData) {
      setProduct(productData);
      setProductType(productData.type || 'physical');
      setTrackQuantity(productData.track_quantity ?? true);
      setDigitalFileUrl(productData.digital_file_url || '');
      setStatus(productData.status || 'active');
      const listPrice = deriveListPrice(productData.price, productData.compare_at_price);
      const discountPercent = deriveDiscountPercent(productData.price, productData.compare_at_price);
      setPricingInputs({
        listPrice: listPrice ? String(listPrice) : '',
        discountPercent: discountPercent > 0 ? String(discountPercent) : '',
      });
    }
    setVariants(data.variants || []);
    setImages(data.images || []);
    setCategories(data.categories || []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (merchant) {
      fetchProduct();
    }
  }, [fetchProduct, merchant]);

  const handleSaveProduct = async () => {
    if (!product) return;

    if (!product.name?.trim()) {
      toast.error('Product title is required');
      return;
    }
    
    if (!pricingInputs.listPrice || Number(pricingInputs.listPrice) < 0) {
      toast.error('Valid price is required');
      return;
    }

    if (Number(pricingInputs.discountPercent || 0) >= 100) {
      toast.error('Discount must be less than 100%');
      return;
    }

    if (productType === 'digital' && !digitalFileUrl?.trim()) {
      toast.error('Digital file URL is required');
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/merchant/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        product: {
          ...product,
          type: productType,
          track_quantity: trackQuantity,
          digital_file_url: productType === 'digital' ? digitalFileUrl : null,
          status,
        },
      }),
    });

    if (!response.ok) {
      toast.error('Failed to save product');
    } else {
      toast.success('Product updated successfully');
    }
    setSaving(false);
  };

  const updatePricing = (field: 'listPrice' | 'discountPercent', value: string) => {
    const nextInputs = { ...pricingInputs, [field]: value };
    const pricing = calculateSalePricing(
      Number(nextInputs.listPrice || 0),
      Number(nextInputs.discountPercent || 0)
    );

    setPricingInputs(nextInputs);
    setProduct((current: any) => current ? {
      ...current,
      price: pricing.price,
      compare_at_price: pricing.compareAtPrice,
    } : current);
  };

  const handleAddImage = async (url: string) => {
    const response = await fetch(`/api/merchant/products/${id}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url }),
    });
    const data = await response.json();

    if (response.ok && data.image) {
      setImages([...images, data.image]);
      toast.success('Image added');
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    await fetch(`/api/merchant/products/${id}/images?imageId=${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setImages(images.filter(img => img.id !== imageId));
    toast.success('Image removed');
  };

  const handleAddVariant = async () => {
    const response = await fetch(`/api/merchant/products/${id}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: 'New Variant',
        sku: '',
        price: null,
        stock_quantity: null,
        options: {},
        image_url: '',
        is_active: true,
      }),
    });
    const data = await response.json();

    if (response.ok && data.variant) {
      setVariants([...variants, data.variant]);
      setEditingVariant(data.variant);
      setIsVariantDialogOpen(true);
    }
  };

  const handleSaveVariant = async () => {
    if (!editingVariant) return;

    const response = await fetch(`/api/merchant/products/${id}/variants`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editingVariant),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error('Failed to save variant');
    } else {
      setVariants(variants.map(v => v.id === editingVariant.id ? data.variant : v));
      setIsVariantDialogOpen(false);
      toast.success('Variant saved');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    await fetch(`/api/merchant/products/${id}/variants?variantId=${variantId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setVariants(variants.filter(v => v.id !== variantId));
    toast.success('Variant deleted');
  };

  const bargainDiscount = product?.bargain_min_price && product?.price 
    ? Math.round(((product.price - product.bargain_min_price) / product.price) * 100)
    : merchant?.ai_max_discount_percentage || 0;

  const handleBargainDiscountChange = (discount: number) => {
    if (!product?.price) return;
    const floorPrice = product.price * (1 - discount / 100);
    setProduct({ ...product, bargain_min_price: floorPrice });
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <h2 className="text-lg font-bold">Product not found</h2>
          <p className="text-sm text-muted-foreground">The product you are looking for does not exist or has been deleted.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/products">Back to Catalog</Link>
        </Button>
      </div>
    );
  }

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
            <Package className="h-3.5 w-3.5" />
            Product Management
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{product.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Refine the product core, adjust AI bargaining floors, or update inventory for this SKU.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          <Button variant="outline" className="h-11 rounded-2xl border-border/70 bg-card px-6 font-semibold tracking-tight shadow-sm hover:bg-secondary/40 transition-all" asChild>
            <a href={`/store/preview/product/${product.id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2.5 h-4 w-4" /> Preview
            </a>
          </Button>
          <Button 
            onClick={handleSaveProduct} 
            disabled={saving}
            className="h-11 rounded-2xl px-7 font-semibold tracking-tight shadow-md hover:opacity-90 transition-all"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Base Configuration */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Product Details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">The primary identity and messaging for this product across your store.</p>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Product Title</Label>
                <Input 
                  value={product.name || ''}
                  onChange={e => setProduct({ ...product, name: e.target.value })}
                  className="h-12 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-lg font-semibold tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Description</Label>
                <Textarea 
                  value={product.description || ''}
                  onChange={e => setProduct({ ...product, description: e.target.value })}
                  className="min-h-[150px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-sm font-medium leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">
                  SEO Meta Description
                  <span className="ml-2 text-[9px] font-medium text-muted-foreground/60 normal-case tracking-normal">
                    ({(product.meta_description || '').length}/160 characters)
                  </span>
                </Label>
                <Textarea 
                  value={product.meta_description || ''}
                  onChange={e => setProduct({ ...product, meta_description: e.target.value.slice(0, 160) })}
                  placeholder="Brief description for search engines (max 160 characters)"
                  className="min-h-[80px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-sm font-medium leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  This description appears in search results. If left blank, the first 160 characters of the product description will be used.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Price ({merchant?.currency || 'USD'})</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currencySymbol}</span>
                    <Input 
                      type="number"
                      value={pricingInputs.listPrice}
                      onChange={e => updatePricing('listPrice', e.target.value)}
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">%</span>
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
                        ? `${activeDiscountPercent}% off, saving ${formatCurrency(saleSavings, merchant?.currency, merchant?.locale)}`
                        : 'No discount applied'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">SKU</Label>
                  <Input 
                    value={product.sku || ''}
                    onChange={e => setProduct({ ...product, sku: e.target.value })}
                    className="h-12 bg-secondary/20 border-border/70 focus:ring-1 focus:ring-primary rounded-xl text-sm font-semibold font-mono"
                    placeholder="PROTOCOL-X-001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Matrix */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Images</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Product visuals. The first image will be used as the primary display.</p>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {images.map((image, index) => (
                  <motion.div key={image.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative group aspect-square rounded-[22px] overflow-hidden border border-border/70 bg-secondary/20 shadow-sm">
                    <img src={image.url} alt={image.alt_text || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveImage(image.id)}
                        className="text-white hover:text-red-400 hover:bg-white/10 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border-none shadow-lg">Primary</Badge>
                    )}
                  </motion.div>
                ))}
                <div className="aspect-square">
                  <ImageUpload 
                    onChange={handleAddImage}
                    className="h-full rounded-[22px] border-dashed border-border/70 hover:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Delegation */}
          {storeBargainEnabled && (
            <Card className="overflow-hidden border-border/70 bg-card rounded-[24px] shadow-sm">
              <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border/70">
                    <Zap className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight">Agent Delegation</CardTitle>
                    <CardDescription className="text-[13px] leading-relaxed text-muted-foreground mt-0.5">Delegate closing power to the AI.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10 transition-all shadow-sm">
                  <div>
                    <p className="text-[14px] font-bold text-foreground">Auto-Negotiation</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 font-medium leading-tight">Close deals without manual approval.</p>
                  </div>
                  <Switch 
                    checked={product.bargain_enabled || false}
                    onCheckedChange={(checked) => setProduct({ ...product, bargain_enabled: checked })}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                  {product.bargain_enabled && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Max Autonomous Discount</Label>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                              <Input 
                                type="number"
                                value={bargainDiscount}
                                onChange={e => handleBargainDiscountChange(parseFloat(e.target.value) || 0)}
                                className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4 pr-8 focus:ring-1 focus:ring-emerald-500"
                                max={100}
                                placeholder="0"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground/60">%</span>
                            </div>
                            <Badge variant="outline" className="h-11 px-3.5 bg-background border-border/70 rounded-[12px] text-[11px] font-bold">
                              Floor: {100 - (bargainDiscount || 0)}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Bargaining Personality</Label>
                        <Select
                          value={product.bargain_ai_personality || 'friendly'}
                          onValueChange={(val) => setProduct({ ...product, bargain_ai_personality: val })}
                        >
                          <SelectTrigger className="h-11 bg-secondary/20 border-border/70 text-[14.5px] rounded-[12px] px-4">
                            <SelectValue placeholder="Select personality" />
                          </SelectTrigger>
                          <SelectContent className="rounded-[16px] border-border/70 bg-popover shadow-xl">
                            <SelectItem value="friendly">Friendly - High Engagement</SelectItem>
                            <SelectItem value="balanced">Balanced - Optimized Margin</SelectItem>
                            <SelectItem value="tough">Tough - Premium Brand</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Visibility & Safety</Label>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-[13.5px] font-bold text-foreground">Assistant Visibility</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium leading-tight">Show active work to storefront visitors.</p>
                            </div>
                            <Switch 
                              checked={product.ai_mission_visibility_enabled ?? true} 
                              onCheckedChange={(val) => setProduct({ ...product, ai_mission_visibility_enabled: val })}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-[13.5px] font-bold text-foreground">Bargain Mode</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium leading-tight">Allow direct haggling in chat sessions for this product.</p>
                            </div>
                            <Switch 
                              checked={product.bargain_enabled || false}
                              onCheckedChange={(checked) => setProduct({ ...product, bargain_enabled: checked })}
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
                  <p className="mt-1 text-sm text-muted-foreground">Define different sizes, colors, or versions of this product.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddVariant} className="h-9 rounded-xl border-border/70 px-4 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-secondary/40">
                  <Plus className="mr-2 h-3.5 w-3.5" /> Add Variant
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
              {variants.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/70 rounded-2xl bg-secondary/5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50">
                    <Layers className="h-5 w-5 text-muted-foreground opacity-60" />
                  </div>
                  <p className="mt-4 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">No variations defined</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map(variant => (
                    <div 
                      key={variant.id} 
                      className="flex items-center justify-between p-4 bg-secondary/15 border border-border/70 rounded-[20px] group hover:border-foreground/20 transition-all cursor-pointer"
                      onClick={() => {
                        setEditingVariant(variant);
                        setIsVariantDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm group-hover:border-primary/30 transition-all">
                          {variant.image_url ? (
                            <img src={variant.image_url} alt={`${variant.name} preview`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground tracking-tight">{variant.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {variant.sku && <Badge variant="outline" className="text-[9px] font-bold bg-card border-border/70 uppercase tracking-tight py-0">SKU: {variant.sku}</Badge>}
                            {Object.entries(variant.options || {}).map(([key, value]) => (
                              <Badge key={key} className="bg-primary/10 text-primary hover:bg-primary/15 border-none text-[9px] font-bold uppercase tracking-tight px-2 py-0">
                                {key}: {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground font-mono">
                            {variant.price !== null ? formatCurrency(variant.price, merchant?.currency, merchant?.locale) : 'BASE'}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                            {variant.stock_quantity !== null ? `${variant.stock_quantity} in stock` : 'Unlimited'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVariant(variant.id);
                          }}
                          className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/5 opacity-0 group-hover:opacity-100 transition-all"
                        >
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
          {/* Status node */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Product Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl overflow-hidden shadow-xl">
                    <SelectItem value="active" className="font-semibold text-emerald-600 focus:text-emerald-700">Active</SelectItem>
                    <SelectItem value="draft" className="font-semibold text-amber-600 focus:text-amber-700">Draft</SelectItem>
                    <SelectItem value="archived" className="font-semibold text-muted-foreground">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground px-0.5">Draft products are hidden from customers.</p>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Product Type</Label>
                <Select value={productType} onValueChange={(v: any) => setProductType(v)}>
                  <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl overflow-hidden shadow-xl">
                    <SelectItem value="physical" className="font-semibold">Physical Product</SelectItem>
                    <SelectItem value="digital" className="font-semibold">Digital Download</SelectItem>
                    <SelectItem value="service" className="font-semibold">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {productType === 'digital' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 pt-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Download Asset URL</Label>
                  <Input 
                    value={digitalFileUrl}
                    onChange={e => setDigitalFileUrl(e.target.value)}
                    placeholder="https://cloud.store/file.zip"
                    className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-[11px] font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground px-0.5">Secure link sent after purchase.</p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Node */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Stock & Fulfillment</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Track Stock</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Automatic decrement on sale.</p>
                </div>
                <Switch 
                  checked={trackQuantity}
                  onCheckedChange={setTrackQuantity}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              {trackQuantity && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3.5 border-t border-border/40 pt-5">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Current Quantity</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number"
                      value={product.stock_quantity ?? ''}
                      onChange={e => setProduct({ ...product, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                      className="h-12 w-24 bg-secondary/15 border-border/70 rounded-xl text-center text-xl font-bold font-mono focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-foreground">Available units</p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-relaxed">System will block checkout at 0 unless track is off.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Node */}
          {(productType === 'physical') && (
            <Card className="overflow-hidden border-border/70 bg-card">
              <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold tracking-tight">Shipping Weight & Size</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">Requires Shipping</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Capture address at checkout.</p>
                  </div>
                  <Switch
                    checked={product.requires_shipping ?? true}
                    onCheckedChange={(v) => setProduct({ ...product, requires_shipping: v })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {(product.requires_shipping ?? true) && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 border-t border-border/40 pt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Weight</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={product.weight ?? ''}
                          onChange={e => setProduct({ ...product, weight: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="0.500"
                          className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono font-medium text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Unit</Label>
                        <Select value={product.weight_unit || 'kg'} onValueChange={v => setProduct({ ...product, weight_unit: v })}>
                          <SelectTrigger className="h-10 bg-secondary/15 border-border/70 rounded-xl font-semibold text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/70 rounded-xl overflow-hidden">
                            <SelectItem value="kg" className="font-semibold">kg</SelectItem>
                            <SelectItem value="lb" className="font-semibold">lb</SelectItem>
                            <SelectItem value="g" className="font-semibold">g</SelectItem>
                            <SelectItem value="oz" className="font-semibold">oz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85">Dimensions (L × W × H)</Label>
                        <Select value={product.dimension_unit || 'cm'} onValueChange={v => setProduct({ ...product, dimension_unit: v })}>
                          <SelectTrigger className="h-6 w-16 bg-secondary/15 border-none rounded-lg text-[9px] font-bold uppercase tracking-wider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border/70 rounded-lg overflow-hidden min-w-[60px]">
                            <SelectItem value="cm" className="text-[10px] font-bold uppercase">cm</SelectItem>
                            <SelectItem value="in" className="text-[10px] font-bold uppercase">in</SelectItem>
                            <SelectItem value="mm" className="text-[10px] font-bold uppercase">mm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        <Input
                          type="number"
                          step="0.1"
                          value={product.length ?? ''}
                          onChange={e => setProduct({ ...product, length: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="L"
                          className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-center text-xs font-medium"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={product.width ?? ''}
                          onChange={e => setProduct({ ...product, width: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="W"
                          className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-center text-xs font-medium"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={product.height ?? ''}
                          onChange={e => setProduct({ ...product, height: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="H"
                          className="h-10 bg-secondary/15 border-border/70 rounded-xl font-mono text-center text-xs font-medium"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Organization node */}
          <Card className="overflow-hidden border-border/70 bg-card">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Categorization</CardTitle>
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
                  <SelectContent className="bg-popover border-border/70 rounded-xl overflow-hidden shadow-xl">
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
                  value={product.badge || ''}
                  onChange={e => setProduct({ ...product, badge: e.target.value })}
                  className="h-10 bg-secondary/15 border-border/70 rounded-xl font-bold text-xs uppercase tracking-widest placeholder:font-normal placeholder:tracking-normal"
                  placeholder="NEW, TRENDING, ELITE"
                />
                <p className="text-[10px] text-muted-foreground px-0.5">Small floating label on the product card.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
        <DialogContent className="sm:max-w-md bg-popover border-border/70 p-0 overflow-hidden rounded-[24px] shadow-2xl">
          <DialogHeader className="p-6 border-b border-border/70 bg-secondary/10">
            <DialogTitle className="text-lg font-semibold tracking-tight">Configure Variant</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Adjust individual pricing and stock for this variation.</p>
          </DialogHeader>
          {editingVariant && (
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Name</Label>
                <Input 
                  value={editingVariant.name}
                  onChange={e => setEditingVariant({ ...editingVariant, name: e.target.value })}
                  className="h-10 bg-secondary/10 border-border/70 rounded-xl font-semibold text-sm"
                  placeholder="e.g., XL / Carbon Black"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Price</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">{currencySymbol}</span>
                      <Input 
                        type="number"
                        value={editingVariant.price ?? ''}
                        onChange={e => setEditingVariant({ ...editingVariant, price: e.target.value ? parseFloat(e.target.value) : null })}
                        className="h-10 bg-secondary/10 border-border/70 rounded-xl pl-8 font-semibold font-mono text-sm"
                        placeholder="Inherit"
                      />
                    </div>
                  </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Stock</Label>
                  <Input 
                    type="number"
                    value={editingVariant.stock_quantity ?? ''}
                    onChange={e => setEditingVariant({ ...editingVariant, stock_quantity: e.target.value ? parseInt(e.target.value) : null })}
                    className="h-10 bg-secondary/10 border-border/70 rounded-xl font-semibold font-mono text-sm"
                    placeholder="∞"
                  />
                </div>
              </div>
              <div className="space-y-3 pt-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">Variant Identity Image</Label>
                {editingVariant.image_url ? (
                  <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-border/70 bg-secondary/10 shadow-sm">
                    <img src={editingVariant.image_url} alt={`${editingVariant.name || 'Variant'} image`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setEditingVariant({ ...editingVariant, image_url: '' })}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <ImageUpload 
                    onChange={(url: string) => setEditingVariant({ ...editingVariant, image_url: url })}
                    className="h-32 w-32 rounded-2xl border-dashed border-border/70"
                  />
                )}
              </div>
            </div>
          )}
          <DialogFooter className="p-6 border-t border-border/70 bg-secondary/5 flex gap-3">
            <Button variant="ghost" onClick={() => setIsVariantDialogOpen(false)} className="h-10 flex-1 rounded-xl border-border/70 font-semibold text-xs transition-all hover:bg-secondary/40">
              Cancel
            </Button>
            <Button onClick={handleSaveVariant} className="h-10 flex-1 rounded-xl font-semibold text-xs shadow-md shadow-primary/10 transition-all active:scale-[0.98]">
              Commit changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
