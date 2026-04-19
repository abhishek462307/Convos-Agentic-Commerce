"use client"

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2,
  Edit2,
  ShoppingBag,
  Package,
  Download,
  Upload,
  CheckSquare,
  X,
  ChevronDown,
  Copy,
  Archive,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';

function ProductsContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [, setCategories] = useState<any[]>([]);
  const [, setCollections] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const { merchant } = useMerchant();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Please sign in again to continue.');
    }
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const handleExport = async () => {
    if (!merchant) return;
    window.location.href = `/api/export?merchantId=${merchant.id}&type=products`;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !merchant) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('merchantId', merchant.id);
    formData.append('type', 'products');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/import', {
        method: 'POST',
        headers,
        body: formData
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }
      if (result.success) {
        toast.success(`Imported ${result.imported} products successfully${result.errors > 0 ? ` (${result.errors} errors)` : ''}`);
        fetchData();
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fetchData = useCallback(async () => {
    const response = await fetch('/api/merchant/products', {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok) {
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setCollections(data.collections || []);
    }
  }, []);

  useEffect(() => {
    if (merchant?.id) {
      fetchData();
    }
  }, [merchant?.id, fetchData]);

  const handleDelete = async (id: string) => {
    if (!merchant) return;
    if (confirm('Are you sure you want to delete this product?')) {
      const response = await fetch(`/api/merchant/products?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        toast.error('Failed to delete product');
      } else {
        toast.success('Product deleted');
        fetchData();
      }
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkAction = async (action: string, updateData?: any) => {
    if (!merchant) {
      toast.error('Merchant context unavailable');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    try {
      const response = await fetch('/api/merchant/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          productIds: selectedProducts,
          updateData
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success(result.message);
      setSelectedProducts([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed');
    }
  };

  const handleBulkStockUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const input = window.prompt(`Set stock quantity for ${selectedProducts.length} selected products:`);
    if (input === null) return;

    const stockQuantity = Number(input.trim());
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      toast.error('Enter a valid whole number for stock quantity');
      return;
    }

    await handleBulkAction('update_stock', { stock_quantity: stockQuantity });
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.categories?.name && p.categories.name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const activeProducts = products.filter(p => p.status === 'active').length;
  const draftProducts = products.filter(p => p.status === 'draft').length;
  const lowStockProducts = products.filter(p => p.track_quantity && (p.stock_quantity || 0) <= 5).length;

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-4 pb-6 sm:px-6 lg:px-8">
      <header className="page-header flex-col gap-3 xl:flex-row xl:items-end mb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Catalog</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">Products</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-xl border-border/70 px-3 text-xs font-semibold uppercase tracking-wider">
                <Download className="mr-2 h-3.5 w-3.5" />
                Actions
                <ChevronDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="rounded-lg px-3 py-2 text-sm font-medium">
                <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="rounded-lg px-3 py-2 text-sm font-medium">
                <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/products/new">
            <Button className="h-9 rounded-xl px-4 text-xs font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          title="Total"
          value={products.length.toString()}
          detail="Catalog items"
          icon={Package}
        />
        <StatCard
          title="Live"
          value={activeProducts.toString()}
          detail="Visible"
          icon={ShoppingBag}
        />
        <StatCard
          title="Drafts"
          value={draftProducts.toString()}
          detail="Preparing"
          icon={Edit2}
        />
        <StatCard
          title="Low Stock"
          value={lowStockProducts.toString()}
          detail="Check inventory"
          icon={AlertCircle}
          color={lowStockProducts > 0 ? "text-amber-500" : undefined}
        />
      </div>

      <Card className="mb-4 overflow-hidden border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 bg-card px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="h-10 rounded-xl border-border/70 pl-10 bg-background text-sm"
                />
              </div>
              
              <AnimatePresence>
                {selectedProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-2"
                  >
                    <Separator orientation="vertical" className="h-5 mx-0.5 bg-border/70" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
                      {selectedProducts.length} selected
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-8 rounded-lg px-2.5 text-[10px] font-bold uppercase tracking-wider">
                          Bulk actions
                          <ChevronDown className="ml-1.5 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44 rounded-xl border-border/70">
                        <DropdownMenuItem onClick={() => handleBulkAction('activate')} className="rounded-lg px-3 py-2 text-sm font-medium">
                          <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                          Set as Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkAction('archive')} className="rounded-lg px-3 py-2 text-sm font-medium">
                          <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleBulkStockUpdate} className="rounded-lg px-3 py-2 text-sm font-medium">
                          <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                          Update Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem 
                          onClick={() => handleBulkAction('delete')} 
                          className="rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedProducts([])}
                      className="h-8 w-8 rounded-full p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={`h-8 rounded-lg border-border/70 px-3 text-[10px] font-bold uppercase tracking-wider ${search || statusFilter !== 'all' ? 'bg-secondary/50 border-foreground/30' : ''}`}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                <X className="mr-1.5 h-3 w-3 text-muted-foreground" />
                Reset
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 px-3 text-[10px] font-bold uppercase tracking-wider">
                    {statusFilter === 'all' ? 'Status' : statusFilter}
                    <ChevronDown className="ml-1.5 h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')} className="rounded-lg px-3 py-2 text-sm font-medium">All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')} className="rounded-lg px-3 py-2 text-sm font-medium">Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('draft')} className="rounded-lg px-3 py-2 text-sm font-medium">Draft</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('archived')} className="rounded-lg px-3 py-2 text-sm font-medium">Archived</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                <th className="px-4 py-3 w-12">
                  <Checkbox 
                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedProducts(paginatedProducts.map(p => p.id));
                      else setSelectedProducts([]);
                    }}
                    className="h-4 w-4 rounded border-border/70 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                </th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Product</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Stock</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Price</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Category</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">No products found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`group transition-colors hover:bg-muted/20 ${selectedProducts.includes(product.id) ? 'bg-secondary/15' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Checkbox 
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                          className="h-4 w-4 rounded border-border/70 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-secondary/30">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground leading-tight">{product.name}</p>
                            <p className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-tight mt-1">
                              {product.sku || 'No SKU'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge 
                          variant="outline" 
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight ${
                            product.status === 'active' 
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' 
                              : product.status === 'draft'
                              ? 'border-amber-500/20 bg-amber-500/5 text-amber-600'
                              : 'border-border bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-sm font-medium ${
                          product.track_quantity && (product.stock_quantity || 0) <= 5 
                            ? 'text-amber-500' 
                            : 'text-foreground'
                        }`}>
                          {product.track_quantity ? product.stock_quantity : '∞'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">
                            {formatCurrency(product.price, merchant?.currency, merchant?.locale)}
                          </span>
                          {product.compare_at_price && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              {formatCurrency(product.compare_at_price, merchant?.currency, merchant?.locale)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[120px] block">
                          {product.categories?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/70">
                            <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                                <Link href={`/products/${product.id}`}>
                                  <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                  Edit
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product.id)}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </CardContent>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-colors ${
                        currentPage === pageNum 
                          ? 'bg-foreground text-background' 
                          : 'text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>


    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<MerchantPageSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</p>
            <p className={`mt-1.5 text-xl font-semibold tracking-tight ${color || 'text-foreground'}`}>{value}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/50">
            <Icon className={`h-3.5 w-3.5 ${color || 'text-foreground'}`} />
          </div>
        </div>
        <div className="mt-2">
          <p className="text-[10px] text-muted-foreground truncate">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
