"use client"

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Tag, 
  ChevronRight, 
  Search,
  Loader2,
  Ticket
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    type: 'percentage',
    value: 0,
    min_order_amount: 0,
    usage_limit: null as number | null,
    ends_at: ''
  });
    const { merchant } = useMerchant();
  
    useEffect(() => {
      fetchDiscounts();
    }, []);
  
    const fetchDiscounts = async () => {
      const response = await fetch('/api/merchant/discounts', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) setDiscounts(data.items || []);
      setLoading(false);
    };

  const handleCreate = async () => {
    if (!newDiscount.code || newDiscount.value <= 0) {
      toast.error('Please enter a valid code and value');
      return;
    }

    const response = await fetch('/api/merchant/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newDiscount),
    });

    if (!response.ok) {
      toast.error('Failed to create discount');
    } else {
      toast.success('Discount created successfully');
      setIsCreateOpen(false);
      fetchDiscounts();
      setNewDiscount({
        code: '',
        type: 'percentage',
        value: 0,
        min_order_amount: 0,
        usage_limit: null,
        ends_at: ''
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;

    const response = await fetch(`/api/merchant/discounts?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      toast.error('Failed to delete discount');
    } else {
      toast.success('Discount deleted successfully');
      fetchDiscounts();
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredDiscounts = discounts.filter((discount) =>
    String(discount.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE);
  const paginatedDiscounts = filteredDiscounts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Discounts</h1>
          <p className="page-desc">Create and manage promotional codes, offers, and active discount rules.</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="h-9 rounded-md px-4"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Discount
        </Button>
      </header>

        <div className="grid grid-cols-1 gap-8">
          {loading ? (
          <div className="py-32 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm font-medium">Syncing active codes...</p>
          </div>
        ) : discounts.length === 0 ? (
          <div className="py-32 text-center">
            <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-bold text-lg">No discount codes</p>
            <p className="text-muted-foreground text-sm mt-2">Deploy your first promotional code to drive conversion.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-8 h-9 px-4 rounded-md">Create Discount</Button>
          </div>
        ) : (
          <Card className="border-border shadow-sm rounded-xl overflow-hidden bg-card">
            <CardHeader className="border-b border-border py-5 px-6 bg-muted/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full max-w-sm group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input 
                    placeholder="Filter by code..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-9 bg-background border-border rounded-md focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {paginatedDiscounts.map((discount) => {
                  const isActive = !discount.ends_at || new Date(discount.ends_at) > new Date();
                  const isExpired = discount.ends_at && new Date(discount.ends_at) < new Date();
                  const isLimitReached = discount.usage_limit && discount.used_count >= discount.usage_limit;

                  return (
                    <div key={discount.id} className="flex items-center justify-between p-6 hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                          isActive && !isLimitReached 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-500 shadow-lg shadow-purple-500/5' 
                            : 'bg-secondary/20 border-border text-muted-foreground opacity-50'
                        }`}>
                          <Tag className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-extrabold font-mono tracking-tight group-hover:text-purple-500 transition-colors">{discount.code}</p>
                            {isExpired && <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Expired</Badge>}
                            {isLimitReached && <Badge variant="outline" className="bg-amber-400/10 text-amber-400 border-amber-400/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Depleted</Badge>}
                            {isActive && !isLimitReached && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Active</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 font-medium">
                            {discount.type === 'percentage' ? `${discount.value}% reduction` : `${formatCurrency(discount.value, merchant?.currency, merchant?.locale)} fixed credit`}
                            {discount.min_order_amount > 0 && ` • Minimum ${formatCurrency(discount.min_order_amount, merchant?.currency, merchant?.locale)}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-12">
                        <div className="hidden lg:block text-right">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Utilization</p>
                          <p className="text-sm font-bold font-mono">
                            {discount.used_count} <span className="text-muted-foreground font-medium opacity-50">/ {discount.usage_limit || '∞'}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(discount.id)}
                            className="h-10 w-10 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-20" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            {totalPages > 1 && (
              <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDiscounts.length)} of {filteredDiscounts.length}
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
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-white/5 bg-secondary/25">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">Deploy Discount</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
              Generate a secure promotional code for your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Code Identifier</Label>
              <Input 
                placeholder="e.g. FLASH20" 
                value={newDiscount.code}
                onChange={(e) => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})}
                className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-mono font-bold text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Promotion Type</Label>
                <Select 
                  value={newDiscount.type}
                  onValueChange={(val) => setNewDiscount({...newDiscount, type: val})}
                >
                  <SelectTrigger className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Credit ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Value</Label>
                <div className="relative">
                  {newDiscount.type === 'fixed_amount' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono">$</span>}
                  <Input 
                    type="number"
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount({...newDiscount, value: parseFloat(e.target.value) || 0})}
                    className={`h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold font-mono ${newDiscount.type === 'fixed_amount' ? 'pl-8' : ''}`}
                  />
                  {newDiscount.type === 'percentage' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono">%</span>}
                </div>
              </div>
            </div>

            <Separator className="bg-secondary/20" />

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Minimum Threshold</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono">$</span>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newDiscount.min_order_amount}
                  onChange={(e) => setNewDiscount({...newDiscount, min_order_amount: parseFloat(e.target.value) || 0})}
                  className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 pl-8 font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Utilization Limit</Label>
                <Input 
                  type="number"
                  placeholder="∞"
                  value={newDiscount.usage_limit || ''}
                  onChange={(e) => setNewDiscount({...newDiscount, usage_limit: parseInt(e.target.value) || null})}
                  className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold font-mono"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Deactivation Date</Label>
                <Input 
                  type="date"
                  value={newDiscount.ends_at}
                  onChange={(e) => setNewDiscount({...newDiscount, ends_at: e.target.value})}
                  className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold uppercase text-[11px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-secondary/25 border-t border-white/5 flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 px-6 font-bold hover:bg-secondary/30">Abort</Button>
            <Button 
              onClick={handleCreate}
              className="h-12 bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-8 font-bold shadow-lg shadow-purple-500/20"
            >
              Deploy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
