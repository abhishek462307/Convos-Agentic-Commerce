"use client"

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Download, 
  ShoppingBag,
  MoreHorizontal,
  Clock,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  Circle,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Plus
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { toast } from 'sonner';

const ORDER_STATUSES = [
  { value: 'all', label: 'All Orders', color: 'bg-secondary text-muted-foreground border-border', icon: ShoppingBag },
  { value: 'pending', label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  { value: 'processing', label: 'Processing', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20', icon: Package },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: PackageCheck },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  { value: 'payment_failed', label: 'Payment Failed', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  { value: 'refunded', label: 'Refunded', color: 'bg-secondary text-muted-foreground border-border', icon: Circle },
];

function OrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;
  const { merchant } = useMerchant();

  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    setSearchTerm(querySearch);
    setCurrentPage(1);
  }, [searchParams]);

  const fetchOrders = useCallback(async () => {
    if (!merchant?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(ordersPerPage),
      status: statusFilter,
    });

    const normalizedSearch = searchTerm.trim();
    if (normalizedSearch) {
      params.set('search', normalizedSearch);
    }

    const response = await fetch(`/api/merchant/orders?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setOrders([]);
      setTotalOrders(0);
      setStatusCounts({});
      setError(payload.error || 'Failed to load orders');
      setLoading(false);
      return;
    }

    const data = await response.json();
    setOrders(data.items || []);
    setTotalOrders(data.total || 0);
    setStatusCounts(data.statusCounts || {});
    setLoading(false);
  }, [currentPage, merchant?.id, ordersPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch('/api/orders/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ orderId, status: 'cancelled' }),
      });

      if (!response.ok) throw new Error('Failed to cancel order');
      await fetchOrders();
      toast.success('Order cancelled');
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const paginatedOrders = orders;

  const handleExport = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Customer', 'Email', 'Status', 'Total', 'Payment Method', 'Date'];
    const rows = orders.map(order => [
      order.id,
      order.customer_info?.name || '',
      order.customer_info?.email || '',
      order.status,
      order.total_amount,
      order.payment_method || '',
      new Date(order.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-4 pb-6 sm:px-6 lg:px-8">
      <header className="page-header flex-col gap-3 xl:flex-row xl:items-end mb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Transactions</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">Orders</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button 
            className="h-9 rounded-xl px-4 text-xs font-bold uppercase tracking-wider shadow-sm" 
            onClick={() => window.location.href = '/orders/manual/create'}
          >
            <Plus className="mr-2 h-4 w-4" /> 
            Create Order
          </Button>
          <Button variant="outline" className="h-9 rounded-xl border-border/70 px-4 text-xs font-bold uppercase tracking-wider shadow-sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> 
            Export
          </Button>
        </div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {ORDER_STATUSES.map((status) => {
          const Icon = status.icon || ShoppingBag;
          const isActive = statusFilter === status.value;
          const count = statusCounts[status.value] || 0;

          return (
            <button
              key={status.value}
              type="button"
              onClick={() => {
                setStatusFilter(status.value);
                setCurrentPage(1);
              }}
              className={`rounded-[24px] border p-4 text-left transition-all ${
                isActive
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'border-border/70 bg-card hover:-translate-y-0.5 hover:bg-secondary/30 hover:shadow-[0_12px_30px_rgba(15,23,42,0.05)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {status.label}
                  </p>
                  <p className={`mt-3 text-[28px] font-semibold tracking-tight ${isActive ? 'text-background' : 'text-foreground'}`}>
                    {count}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  isActive ? 'bg-background/10 text-background' : 'bg-secondary text-foreground'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <Badge
                  variant="outline"
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight ${
                    isActive ? 'border-background/20 bg-background/10 text-background/80' : status.color
                  }`}
                >
                  {isActive ? 'Viewing' : 'Filter'}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="mb-4 overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="border-b border-border/70 bg-card px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input 
                placeholder="Search orders..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="h-10 rounded-xl border-border/70 bg-background pl-10 text-sm shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl border-border/70 px-3 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> 
                    {statusFilter === 'all' ? 'All Statuses' : statusFilter}
                    <ChevronDown className="ml-2 h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70">
                  {ORDER_STATUSES.map((status) => (
                    <DropdownMenuItem key={status.value} onClick={() => { setStatusFilter(status.value); setCurrentPage(1); }} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto no-scrollbar">
          {error ? (
            <div className="py-24 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-foreground font-bold text-lg">Couldn&apos;t load orders</p>
              <p className="text-muted-foreground text-sm mt-2">{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-32 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-bold text-lg">No orders found</p>
              <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Order</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Customer</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                  <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Amount</TableHead>
                  <TableHead className="w-16 h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {paginatedOrders.map((order) => (
                  <TableRow key={order.id} className="group transition-colors hover:bg-muted/20">
                    <TableCell className="px-4 py-3">
                      <Link href={`/orders/${order.id}`} className="font-mono text-sm font-bold text-foreground hover:underline decoration-border/50 underline-offset-4">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground leading-tight">{order.customer_info?.name || 'Guest'}</span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mt-1">{order.customer_info?.email || ''}</span>
                        {order.metadata?.source === 'ucp_agent' && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Badge variant="secondary" className="rounded-full bg-secondary/50 border border-border/50 px-1.5 py-0 text-[9px] font-bold uppercase tracking-tight text-foreground">
                              AI Agent
                            </Badge>
                            {order.metadata?.negotiated === 'true' && (
                              <Badge variant="secondary" className="rounded-full bg-secondary/50 border border-border/50 px-1.5 py-0 text-[9px] font-bold uppercase tracking-tight text-foreground">
                                Negotiated
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      {(() => {
                        const statusConfig = ORDER_STATUSES.find(s => s.value === order.status) || ORDER_STATUSES[1];
                        return (
                          <Badge variant="outline" className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm font-bold text-foreground">
                      {formatCurrency(order.total_amount, merchant?.currency, merchant?.locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/70">
                          <DropdownMenuItem asChild className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                            <Link href={`/orders/${order.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem 
                            className="rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                            disabled={order.status === 'cancelled' || order.status === 'refunded'}
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            Cancel Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {Math.min(((currentPage - 1) * ordersPerPage) + 1, totalOrders)}-{Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

export default function OrdersPage() {
  return (
    <Suspense fallback={<MerchantPageSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}
