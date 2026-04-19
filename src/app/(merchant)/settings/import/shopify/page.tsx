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
  Zap,
  Search,
  CheckSquare,
  Square,
  ImageIcon
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

interface ShopifyProduct {
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
  variants: Array<{
    id: number;
    title: string;
    price: number;
    sku: string;
    inventory_quantity: number | null;
  }>;
  options: Array<{ name: string; values: string[] }>;
  tags: string[];
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

export default function ShopifyImportPage() {
  const { merchant, loading } = useMerchant();
  const [shopifyStore, setShopifyStore] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  
  const [importMethod, setImportMethod] = useState<'public' | 'api'>('public');
  const [step, setStep] = useState<'connect' | 'select' | 'importing'>('connect');
  
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
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
    if (!(merchant as any)?.shopify_config) return;
    const config = (merchant as any).shopify_config;
    setShopifyStore(config.store_url || '');
    setAccessToken(config.access_token || '');
    if (config.access_token) {
      setImportMethod('api');
    }
  }, [merchant]);

  const getCleanStoreUrl = () => {
    let cleanStoreUrl = shopifyStore
      .replace('https://', '')
      .replace('http://', '')
      .replace(/\/$/, '')
      .trim();

    if (!cleanStoreUrl.includes('.')) {
      cleanStoreUrl = `${cleanStoreUrl}.myshopify.com`;
    }
    return cleanStoreUrl;
  };

  const handleConnect = async () => {
    if (!shopifyStore) {
      toast.error('Please enter your Shopify store URL');
      return;
    }

    if (importMethod === 'api' && !accessToken) {
      toast.error('Please enter your Shopify Admin API access token');
      return;
    }

    const cleanStoreUrl = getCleanStoreUrl();

    setProgress({
      status: 'connecting',
      message: 'Connecting to Shopify...',
      totalProducts: 0,
      importedProducts: 0,
      failedProducts: 0,
      errors: []
    });

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/import/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          shopifyStore: cleanStoreUrl,
          accessToken: importMethod === 'api' ? accessToken : undefined,
          method: importMethod,
          action: 'connect'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Shopify');
      }

      await fetch('/api/merchant/settings/update', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            shopify_config: {
              store_url: cleanStoreUrl,
              access_token: importMethod === 'api' ? accessToken : null,
              method: importMethod,
              connected_at: new Date().toISOString()
            }
          }
        }),
      });

      setProgress({
        status: 'idle',
        message: `Connected! Found products in your Shopify store.`,
        totalProducts: data.productCount || 0,
        importedProducts: 0,
        failedProducts: 0,
        errors: []
      });

      toast.success(`Connected to Shopify!`);
      
      await fetchProducts();
      
    } catch (error: any) {
      setProgress({
        status: 'error',
        message: error.message || 'Failed to connect to Shopify',
        totalProducts: 0,
        importedProducts: 0,
        failedProducts: 0,
        errors: [error.message]
      });
      toast.error(error.message || 'Failed to connect');
    }
  };

  const fetchProducts = async () => {
    const cleanStoreUrl = getCleanStoreUrl();
    
    setFetchingProducts(true);
    setProgress(prev => ({
      ...prev,
      status: 'fetching',
      message: 'Fetching products from Shopify...'
    }));

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/import/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          shopifyStore: cleanStoreUrl,
          accessToken: importMethod === 'api' ? accessToken : undefined,
          method: importMethod,
          action: 'fetch_products'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products || []);
      setCategories(data.categories || []);
      setSelectedProducts(new Set(data.products?.map((p: ShopifyProduct) => p.id) || []));
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

    const cleanStoreUrl = getCleanStoreUrl();
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
      const response = await fetch('/api/import/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          merchantId: merchant!.id,
          shopifyStore: cleanStoreUrl,
          accessToken: importMethod === 'api' ? accessToken : undefined,
          method: importMethod,
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
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoryName: string) => {
    const categoryProducts = products.filter(p => p.product_type === categoryName);
    const allSelected = categoryProducts.every(p => selectedProducts.has(p.id));
    
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      categoryProducts.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id);
        } else {
          newSet.add(p.id);
        }
      });
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.product_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(p.product_type);
    
    return matchesSearch && matchesCategory;
  });

  if (loading || !merchant) {
    return <MerchantPageSkeleton />;
  }

  const progressPercent = progress.totalProducts > 0 
    ? Math.round((progress.importedProducts / progress.totalProducts) * 100) 
    : 0;

  return (
    <div className="max-w-[1200px] mx-auto py-8 px-8">
      <div className="flex items-center gap-4 mb-8">
          <Link href="/settings/import" className="p-2 hover:bg-secondary/30 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Import from Shopify</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {step === 'connect' && 'Connect your Shopify store to import products.'}
            {step === 'select' && `Select products to import (${selectedProducts.size} of ${products.length} selected)`}
            {step === 'importing' && 'Importing selected products...'}
          </p>
        </div>
      </div>

      {step === 'connect' && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-amber-500 mb-1">Imported products need to be updated</p>
                <p className="text-[12px] text-amber-600 dark:text-amber-200/60 leading-relaxed">
                  Products imported from Shopify may need some polishing for a better customer experience. 
                  After importing, please review and update product descriptions, images, and categories 
                  to ensure they work great with the AI shopping assistant.
                </p>
              </div>
            </div>
          </div>
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#96bf48]/10 flex items-center justify-center border border-[#96bf48]/20">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#96bf48">
                      <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zm-1.469-17.954c-.145-.041-.309-.087-.49-.138 0-.016.002-.031.002-.047 0-1.378-.762-1.988-1.668-1.988-.146 0-.295.013-.446.04l-.083-.161c-.321-.602-.744-.89-1.279-.89-1.991 0-2.951 2.487-3.249 3.756-.615.19-1.051.325-1.107.344-.346.107-.356.118-.401.446-.034.257-1.267 9.773-1.267 9.773l9.49 1.638.498-12.773zm-4.111-1.946c0 .029-.001.063-.001.094 0 .031.001.063.001.094-.418.129-.874.271-1.358.42.261-.999.75-1.488 1.177-1.677.077.283.18.664.18 1.069h.001zm.96-.727c.381.104.789.216 1.222.335-.212.883-.638 1.656-1.149 1.993-.072-.759-.179-1.615-.073-2.328zm.659-1.073c.116 0 .222.013.319.038-.757.356-1.57 1.255-1.913 3.047l-.963.298c.318-1.201 1.066-3.383 2.557-3.383z"/>
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight text-foreground">Connect Your Shopify Store</CardTitle>
                    <CardDescription className="text-[13px] text-muted-foreground mt-0.5">Import products using your store URL</CardDescription>
                  </div>
                </div>
                <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/70 shadow-sm">
                  <button
                    onClick={() => setImportMethod('public')}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] rounded-lg transition-all",
                      importMethod === 'public' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground/60 hover:text-foreground"
                    )}
                  >
                    Quick Import
                  </button>
                  <button
                    onClick={() => setImportMethod('api')}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] rounded-lg transition-all",
                      importMethod === 'api' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground/60 hover:text-foreground"
                    )}
                  >
                    Custom App
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className={cn(
                "grid grid-cols-1 gap-6",
                importMethod === 'api' ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"
              )}>
                <div className="space-y-2">
                  <Label htmlFor="shopify_store" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">
                    Shopify Store URL
                  </Label>
                  <Input 
                    id="shopify_store" 
                    placeholder="your-store.myshopify.com"
                    value={shopifyStore}
                    onChange={(e) => setShopifyStore(e.target.value)}
                    className="h-11 text-[14.5px] border-border/70 bg-secondary/20 text-foreground focus:ring-1 focus:ring-primary/20 rounded-[12px] px-4"
                  />
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    Enter your .myshopify.com URL or custom domain
                  </p>
                  {importMethod === 'public' && (
                    <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1.5 px-0.5">
                      <Zap className="w-3 h-3" />
                      No API key required. We'll fetch your public product catalog.
                    </p>
                  )}
                </div>
                
                {importMethod === 'api' && (
                  <div className="space-y-2">
                    <Label htmlFor="access_token" className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground/65 px-0.5">
                      Admin API Access Token
                    </Label>
                    <div className="relative">
                      <Input 
                        id="access_token" 
                        type={showToken ? 'text' : 'password'}
                        placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="h-11 text-[14.5px] border-border/70 bg-secondary/20 text-foreground focus:ring-1 focus:ring-primary/20 rounded-[12px] px-4 pr-20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-primary font-bold uppercase tracking-wider hover:underline"
                      >
                        {showToken ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleConnect}
                  disabled={progress.status === 'connecting' || progress.status === 'fetching'}
                  className="h-11 px-6 bg-[#96bf48] hover:bg-[#85ab3f] text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded-[14px] shadow-md transition-all active:scale-95"
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
                <div>
                  <p className="text-[13px] font-medium text-destructive">{progress.message}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {importMethod === 'api' && (
            <Card className="border-border shadow-sm rounded-lg overflow-hidden bg-card">
              <CardHeader className="border-b border-border py-4 px-6">
                <CardTitle className="text-[14px] font-semibold text-foreground">How to get your Shopify Access Token</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">1</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-foreground mb-1">Go to your Shopify Admin</p>
                      <p className="text-[12px] text-muted-foreground">Navigate to <strong>Settings → Apps and sales channels → Develop apps</strong></p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">2</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-foreground mb-1">Create a custom app</p>
                      <p className="text-[12px] text-muted-foreground">Click <strong>"Create an app"</strong> and give it a name</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[12px] font-bold text-primary">3</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-foreground mb-1">Configure Admin API scopes</p>
                      <p className="text-[12px] text-muted-foreground mb-2">Enable these permissions:</p>
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
                      <p className="text-[13px] font-medium text-foreground mb-1">Install and copy the token</p>
                      <p className="text-[12px] text-muted-foreground">Click <strong>"Install app"</strong> then copy the Admin API access token</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="h-8 text-[12px] border-border" asChild>
                      <a href="https://help.shopify.com/en/manual/apps/custom-apps" target="_blank" rel="noopener noreferrer">
                        Shopify Documentation <ExternalLink className="w-3 h-3 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-6">
          <Card className="border-border/70 bg-card rounded-[24px] overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-secondary/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-[17px] font-semibold tracking-tight text-foreground">Select Products to Import</CardTitle>
                    <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                      {selectedProducts.size} of {products.length} products selected
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('connect')}
                    className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] border-border/70 bg-background hover:bg-secondary/40 rounded-[12px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedProducts.size === 0}
                    className="h-9 px-5 bg-foreground text-background hover:bg-foreground/90 text-[11px] font-bold uppercase tracking-[0.12em] rounded-[12px] shadow-md transition-all active:scale-95"
                  >
                    Import {selectedProducts.size} Products
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
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
                            allSelected ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            {allSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : selectedCount > 0 ? (
                              <div className="w-4 h-4 border-2 border-primary rounded bg-primary/20" />
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
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-10 pl-10 text-[13.5px] border-border/70 bg-background text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAll}
                          className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] text-primary hover:bg-primary/10 rounded-[10px]"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={deselectAll}
                          className="h-9 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:bg-secondary/40 rounded-[10px]"
                        >
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
                            selectedProducts.has(product.id) ? "bg-primary/5" : "hover:bg-secondary/20"
                          )}
                        >
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
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
                              {product.variants_count > 1 && (
                                <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                  {product.variants_count} variants
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
                    <li className="flex items-center gap-2">• SKUs and inventory quantities</li>
                    <li className="flex items-center gap-2">• Product variants (size, color, etc.)</li>
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
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                      <RefreshCw className="w-10 h-10 text-primary animate-spin" />
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
                      <Button asChild className="h-12 bg-foreground text-background hover:bg-foreground/90 text-[11px] font-bold uppercase tracking-[0.12em] rounded-[16px] shadow-lg transition-all active:scale-95">
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
