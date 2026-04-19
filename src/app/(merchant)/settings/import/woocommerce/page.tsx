"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Package,
  ArrowRight,
  Info,
  Search,
  CheckSquare,
  Square,
  ImageIcon,
  Eye,
  EyeOff
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { useMerchant } from '@/hooks/use-merchant';

type ImportStatus = 'idle' | 'connecting' | 'fetching' | 'importing' | 'completed' | 'error';

interface WooProduct {
  id: number;
  title: string;
  handle: string;
  description: string;
  product_type: string;
  vendor: string;
  image: string | null;
  images: string[];
  price: number;
  compare_at_price: number | null;
  variants_count: number;
  sku: string;
  stock_quantity: number | null;
  categories: string[];
  tags: string[];
  type: string;
  variations: number[];
  attributes: Array<{ id: number; name: string; options: string[] }>;
}

interface Category {
  name: string;
  count: number;
}

interface ImportProgress {
  status: ImportStatus;
  message: string;
  totalProducts: number;
  importedProducts: number;
  failedProducts: number;
  errors: string[];
}

export default function WooCommerceImportPage() {
  const { merchant, loading } = useMerchant();
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [step, setStep] = useState<'connect' | 'select' | 'importing'>('connect');

  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [, setFetchingProducts] = useState(false);

  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
    totalProducts: 0,
    importedProducts: 0,
    failedProducts: 0,
    errors: []
  });

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in again to continue.');
    }
    return { Authorization: `Bearer ${session.access_token}` };
  };

  useEffect(() => {
    if ((merchant as any)?.woocommerce_config) {
      setStoreUrl((merchant as any).woocommerce_config.store_url || '');
    }
  }, [merchant]);

  const handleConnect = async () => {
    if (!storeUrl) {
      toast.error('Please enter your WooCommerce store URL');
      return;
    }
    if (!consumerKey || !consumerSecret) {
      toast.error('Please enter your Consumer Key and Consumer Secret');
      return;
    }

    setProgress({
      status: 'connecting',
      message: 'Connecting to WooCommerce...',
      totalProducts: 0,
      importedProducts: 0,
      failedProducts: 0,
      errors: []
    });

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/import/woocommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          storeUrl,
          consumerKey,
          consumerSecret,
          action: 'connect'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to WooCommerce');
      }

      setProgress({
        status: 'idle',
        message: `Connected! Found ${data.productCount} products.`,
        totalProducts: data.productCount || 0,
        importedProducts: 0,
        failedProducts: 0,
        errors: []
      });

      toast.success('Connected to WooCommerce!');
      await fetchProducts();

    } catch (error: any) {
      setProgress({
        status: 'error',
        message: error.message || 'Failed to connect to WooCommerce',
        totalProducts: 0,
        importedProducts: 0,
        failedProducts: 0,
        errors: [error.message]
      });
      toast.error(error.message || 'Failed to connect');
    }
  };

  const fetchProducts = async () => {
    setFetchingProducts(true);
    setProgress(prev => ({
      ...prev,
      status: 'fetching',
      message: 'Fetching products from WooCommerce...'
    }));

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/import/woocommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          storeUrl,
          consumerKey,
          consumerSecret,
          action: 'fetch_products'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products || []);
      setCategories(data.categories || []);
      setSelectedProducts(new Set(data.products?.map((p: WooProduct) => p.id) || []));
      setStep('select');

      setProgress({
        status: 'idle',
        message: `Found ${data.products?.length || 0} products`,
        totalProducts: data.products?.length || 0,
        importedProducts: 0,
        failedProducts: 0,
        errors: []
      });

    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch products');
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: error.message
      }));
    } finally {
      setFetchingProducts(false);
    }
  };

  const handleImport = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product to import');
      return;
    }

    const productsToImport = products.filter(p => selectedProducts.has(p.id));

    setStep('importing');
    setProgress({
      status: 'importing',
      message: 'Starting import...',
      totalProducts: productsToImport.length,
      importedProducts: 0,
      failedProducts: 0,
      errors: []
    });

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/import/woocommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          storeUrl,
          consumerKey,
          consumerSecret,
          action: 'import',
          productsData: productsToImport
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Import failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to start import stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const update = JSON.parse(line);
            setProgress(prev => ({
              ...prev,
              status: update.status || prev.status,
              message: update.message || prev.message,
              totalProducts: update.total ?? prev.totalProducts,
              importedProducts: update.imported ?? prev.importedProducts,
              failedProducts: update.failed ?? prev.failedProducts,
              errors: update.errors || prev.errors
            }));
          } catch {}
        }
      }

      toast.success('Import completed!');
    } catch (error: any) {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: error.message || 'Import failed',
        errors: [...prev.errors, error.message]
      }));
      toast.error(error.message || 'Import failed');
    }
  };

  const toggleProduct = (id: number) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleCategory = (categoryName: string) => {
    const categoryProducts = products.filter(p => p.product_type === categoryName);
    const allSelected = categoryProducts.every(p => selectedProducts.has(p.id));

    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      categoryProducts.forEach(p => {
        if (allSelected) newSet.delete(p.id);
        else newSet.add(p.id);
      });
      return newSet;
    });
  };

  const selectAll = () => setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  const deselectAll = () => setSelectedProducts(new Set());

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(p.product_type);
    return matchesSearch && matchesCategory;
  });

  if (loading || !merchant) return <MerchantPageSkeleton />;

  const progressPercent = progress.totalProducts > 0
    ? Math.round((progress.importedProducts / progress.totalProducts) * 100)
    : 0;

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/settings/import" className="p-2 hover:bg-secondary/30 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7f54b3]/10 flex items-center justify-center border border-[#7f54b3]/20">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#7f54b3">
              <path d="M2.227 4.857A2.228 2.228 0 000 7.085v7.964c0 1.229.998 2.227 2.227 2.227h7.296l3.477 2.724-1.063-2.724h9.836A2.228 2.228 0 0024 15.049V7.085a2.228 2.228 0 00-2.227-2.228H2.227zM4.244 7.7c.37-.063.728.062.96.368.234.307.342.744.297 1.3l-.574 5.55c-.063.37-.2.65-.4.837-.2.188-.431.263-.693.228-.293-.044-.537-.234-.731-.567L1.14 11.746l-.553 5.025-.91.007.746-7.293c.056-.394.19-.675.4-.838.21-.162.443-.23.694-.196.293.043.537.228.731.55l1.96 3.54.556-4.37c.05-.295.175-.418.48-.47zm5.924.23c.688.025 1.216.288 1.587.785.386.516.568 1.231.543 2.145-.046 1.157-.36 2.1-.94 2.832-.55.695-1.176 1.018-1.877.97-.687-.025-1.216-.288-1.587-.786-.387-.516-.568-1.231-.544-2.145.046-1.157.36-2.1.94-2.832.55-.695-1.178-1.018 1.878-.97zm6.512 0c.688.025 1.216.288 1.587.785.386.516.568 1.231.543 2.145-.046 1.157-.36 2.1-.94 2.832-.55.695-1.176 1.018-1.877.97-.687-.025-1.216-.288-1.587-.786-.387-.516-.568-1.231-.544-2.145.046-1.157.36-2.1.94-2.832.55-.695-1.178-1.018 1.878-.97zM10.05 8.95c-.362.02-.7.263-.994.728-.28.446-.44 1.002-.462 1.662-.018.53.065.952.25 1.266.187.315.423.48.709.495.362-.02.7-.263.994-.728.281-.446.44-1.002.463-1.662.018-.53-.066-.952-.25-1.266-.188-.315-.425-.48-.71-.495zm6.512 0c-.362.02-.7.263-.994.728-.28.446-.44 1.002-.462 1.662-.018.53.065.952.25 1.266.187.315.423.48.709.495.362-.02.7-.263.994-.728.281-.446.44-1.002.463-1.662.018-.53-.066-.952-.25-1.266-.188-.315-.425-.48-.71-.495z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Import from WooCommerce</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {step === 'connect' && 'Connect your WooCommerce store to import products.'}
              {step === 'select' && `Select products to import (${selectedProducts.size}/${products.length} selected)`}
              {step === 'importing' && (progress.status === 'completed' ? 'Import completed' : 'Importing selected products...')}
            </p>
          </div>
        </div>
      </div>

      {step === 'connect' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[16px]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-amber-500 mb-1">Imported products need review</p>
                <p className="text-[12px] text-amber-600 dark:text-amber-400 leading-relaxed">
                  Products imported from WooCommerce may need some polishing for a better customer experience.
                  After importing, review and update product descriptions, images, and categories
                  to ensure they work great with the AI shopping assistant.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7f54b3]/10 flex items-center justify-center border border-[#7f54b3]/20">
                  <Key className="w-5 h-5 text-[#7f54b3]" />
                </div>
                <div>
                  <CardTitle className="text-[17px] font-semibold tracking-tight text-foreground">Connect Your WooCommerce Store</CardTitle>
                  <CardDescription className="text-[13px] text-muted-foreground mt-0.5">Enter your store URL and REST API credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="woo_store" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Store URL</Label>
                <Input
                  id="woo_store"
                  placeholder="https://your-store.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="h-11 text-[14.5px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-[#7f54b3]/20 rounded-[12px] px-4"
                />
                <p className="text-[11px] text-muted-foreground px-0.5">
                  Your WordPress site URL where WooCommerce is installed
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="consumer_key" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Consumer Key</Label>
                  <div className="relative">
                    <Input
                      id="consumer_key"
                      type={showKey ? 'text' : 'password'}
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={consumerKey}
                      onChange={(e) => setConsumerKey(e.target.value)}
                      className="h-11 text-[14.5px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-[#7f54b3]/20 rounded-[12px] px-4 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumer_secret" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">Consumer Secret</Label>
                  <div className="relative">
                    <Input
                      id="consumer_secret"
                      type={showSecret ? 'text' : 'password'}
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={consumerSecret}
                      onChange={(e) => setConsumerSecret(e.target.value)}
                      className="h-11 text-[14.5px] bg-secondary/20 border-border/70 focus:ring-1 focus:ring-[#7f54b3]/20 rounded-[12px] px-4 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={progress.status === 'connecting' || progress.status === 'fetching'}
                  className="h-11 px-6 bg-[#7f54b3] hover:bg-[#6b4799] text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-[14px] shadow-md transition-all active:scale-95"
                >
                  {progress.status === 'connecting' || progress.status === 'fetching' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {progress.status === 'connecting' ? 'Connecting...' : 'Fetching Products...'}
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Connect & Load Products
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {progress.status === 'error' && (
            <Card className="border-destructive/20 bg-destructive/10">
              <CardContent className="p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-[13px] font-medium text-destructive">{progress.message}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border py-4 px-6">
              <CardTitle className="text-[14px] font-semibold text-foreground">How to get your WooCommerce API Keys</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">1</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground mb-1">Go to your WordPress Admin</p>
                    <p className="text-[12px] text-muted-foreground">Navigate to <strong>WooCommerce &rarr; Settings &rarr; Advanced &rarr; REST API</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">2</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground mb-1">Create a new API Key</p>
                    <p className="text-[12px] text-muted-foreground">Click <strong>"Add Key"</strong>, give it a description, and set permissions to <strong>"Read"</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">3</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground mb-1">Copy your credentials</p>
                    <p className="text-[12px] text-muted-foreground mb-2">Copy both the <strong>Consumer Key</strong> (ck_...) and <strong>Consumer Secret</strong> (cs_...) immediately</p>
                    <div className="flex flex-wrap gap-2">
                      {['read_products', 'read_inventory'].map(scope => (
                        <Badge key={scope} variant="outline" className="bg-secondary text-foreground border-border text-[11px] font-mono">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">4</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground mb-1">Ensure HTTPS & Permalinks</p>
                    <p className="text-[12px] text-muted-foreground">Your store must use HTTPS and have permalinks enabled (not "Plain")</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-[12px] border-border" asChild>
                    <a href="https://woocommerce.com/document/woocommerce-rest-api/" target="_blank" rel="noopener noreferrer">
                      WooCommerce Documentation <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7f54b3]/10 flex items-center justify-center border border-[#7f54b3]/20">
                    <Package className="w-5 h-5 text-[#7f54b3]" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight text-foreground">Select Products to Import</CardTitle>
                    <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                      {selectedProducts.size} of {products.length} products selected
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('connect')} className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px]">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedProducts.size === 0}
                    className="h-9 px-5 bg-[#7f54b3] hover:bg-[#6b4799] text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-[12px] shadow-md transition-all active:scale-95"
                  >
                    Import {selectedProducts.size} Products
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row border-b border-border/70">
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/70 p-4 bg-secondary/10">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Categories</span>
                    <span className="text-[11px] font-bold text-muted-foreground/40">{categories.length}</span>
                  </div>
                  <div className="space-y-1">
                    {categories.map(cat => {
                      const categoryProducts = products.filter(p => p.product_type === cat.name);
                      const selectedCount = categoryProducts.filter(p => selectedProducts.has(p.id)).length;
                      const allSelected = selectedCount === categoryProducts.length;

                      return (
                        <button
                          key={cat.name}
                          onClick={() => toggleCategory(cat.name)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all",
                            allSelected ? "bg-[#7f54b3]/10 text-[#7f54b3]" : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            {allSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#7f54b3]" />
                            ) : selectedCount > 0 ? (
                              <div className="w-4 h-4 border-2 border-[#7f54b3] rounded bg-[#7f54b3]/20" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground/30" />
                            )}
                            <span className="text-[13px] font-medium truncate">{cat.name}</span>
                          </div>
                          <span className="text-[11px] font-bold opacity-60">{selectedCount}/{cat.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 bg-background">
                  <div className="p-4 border-b border-border/70 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-sm:w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-10 pl-10 text-[13.5px] bg-background border-border/70 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAll} className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7f54b3] hover:bg-[#7f54b3]/10 rounded-[10px]">
                          Select All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deselectAll} className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:bg-secondary/40 rounded-[10px]">
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto bg-card scrollbar-none">
                    <div className="grid grid-cols-1 divide-y divide-border/60">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => toggleProduct(product.id)}
                          className={cn(
                            "flex items-center gap-4 p-4 cursor-pointer transition-colors",
                            selectedProducts.has(product.id) ? "bg-[#7f54b3]/5" : "hover:bg-secondary/20"
                          )}
                        >
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                            className="data-[state=checked]:bg-[#7f54b3] data-[state=checked]:border-[#7f54b3] rounded-md"
                          />

                          <div className="w-14 h-14 rounded-xl border border-border/70 bg-secondary/30 overflow-hidden shrink-0 shadow-sm">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.title}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[14.5px] font-semibold text-foreground truncate tracking-tight">{product.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.12em] bg-secondary/50 border-border/70 text-muted-foreground/80 px-2 py-0.5 rounded-full">
                                {product.product_type}
                              </Badge>
                              {product.type === 'variable' && (
                                <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                  {product.variants_count} variants
                                </span>
                              )}
                              {product.sku && (
                                <span className="text-[10px] text-muted-foreground/40 font-mono">
                                  {product.sku}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[15px] font-bold text-foreground tracking-tight">
                              ${product.price.toFixed(2)}
                            </p>
                            {product.compare_at_price && product.compare_at_price > product.price && (
                              <p className="text-[11px] text-muted-foreground/40 line-through font-medium">
                                ${product.compare_at_price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredProducts.length === 0 && (
                      <div className="p-12 text-center">
                        <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-[13px] font-medium text-muted-foreground/60">No products found matching your search</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/30 flex items-center justify-center shrink-0 border border-border/70 shadow-sm">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-foreground mb-1 tracking-tight">What gets imported?</p>
                  <ul className="text-[13px] text-muted-foreground/80 space-y-1.5 font-medium">
                    <li className="flex items-center gap-2">• Product names, descriptions, and prices</li>
                    <li className="flex items-center gap-2">• Product images (primary image)</li>
                    <li className="flex items-center gap-2">• SKUs and stock quantities</li>
                    <li className="flex items-center gap-2">• Variable product variations (size, color, etc.)</li>
                    <li className="flex items-center gap-2">• Product categories will be created automatically</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'importing' && (
        <div className="space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardContent className="p-12">
              <div className="max-w-md mx-auto space-y-8">
                <div className="flex items-center justify-center">
                  {progress.status === 'importing' && (
                    <div className="w-20 h-20 rounded-full bg-[#7f54b3]/10 flex items-center justify-center border border-[#7f54b3]/20 shadow-inner">
                      <RefreshCw className="w-10 h-10 text-[#7f54b3] animate-spin" />
                    </div>
                  )}
                  {progress.status === 'completed' && (
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                  )}
                  {progress.status === 'error' && (
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-inner">
                      <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-[17px] font-bold text-foreground tracking-tight">{progress.message}</p>
                  <p className="text-[13px] text-muted-foreground font-medium opacity-70">Please keep this window open until finished</p>
                </div>

                {(progress.status === 'importing' || progress.status === 'completed') && progress.totalProducts > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80">
                      <span>{progress.importedProducts} of {progress.totalProducts} products</span>
                      <span className="text-foreground">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2.5 bg-secondary/50 rounded-full overflow-hidden" />
                  </div>
                )}

                {progress.status === 'completed' && (
                  <div className="flex items-center justify-center gap-6 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[13px] font-bold text-foreground">{progress.importedProducts} imported</span>
                    </div>
                    {progress.failedProducts > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-[13px] font-bold text-destructive">{progress.failedProducts} failed</span>
                      </div>
                    )}
                  </div>
                )}

                {progress.errors.length > 0 && (
                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-[16px] space-y-3">
                    <p className="text-[11px] font-bold text-destructive uppercase tracking-[0.12em] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Import Errors
                    </p>
                    <ul className="space-y-2">
                      {progress.errors.slice(0, 3).map((error, i) => (
                        <li key={i} className="text-[12px] text-destructive/80 font-medium leading-tight">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {progress.status === 'completed' && (
                  <div className="space-y-4">
                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-[20px] flex items-start gap-4">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[14px] font-bold text-amber-500 mb-1 tracking-tight">Products need review</p>
                        <p className="text-[12px] text-amber-600/80 leading-relaxed font-medium">
                          Your imported products may need some polishing. We recommend reviewing descriptions, images, and pricing to ensure they work great with the AI shopping assistant.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                      <Button asChild className="h-12 bg-[#7f54b3] hover:bg-[#6b4799] text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-[16px] shadow-lg transition-all active:scale-95">
                        <Link href="/products">
                          Review & Edit Products <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setStep('connect')}
                        className="h-11 border-border/70 text-[11px] font-bold uppercase tracking-[0.12em] rounded-[16px]"
                      >
                        Import More
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
