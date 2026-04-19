"use client"

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Search,
  ExternalLink,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/table';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const LABEL_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  created: { label: 'Created', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Package },
  printed: { label: 'Printed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Printer },
  in_transit: { label: 'In Transit', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  exception: { label: 'Exception', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  voided: { label: 'Voided', color: 'bg-secondary/20 text-muted-foreground border-border', icon: Clock },
};

const PAGE_SIZE = 20;

export default function ShipmentsPage() {
  const { merchant } = useMerchant();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    created: 0,
  });

  const fetchShipments = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        status: statusFilter,
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/merchant/shipments?${params.toString()}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load shipments');
      }

      setShipments(payload.items || []);
      setTotal(payload.total || 0);
      setStats(payload.stats || { total: 0, inTransit: 0, delivered: 0, created: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shipments';
      setError(message);
      setShipments([]);
      setTotal(0);
      setStats({ total: 0, inTransit: 0, delivered: 0, created: 0 });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [merchant, page, statusFilter, search]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShipments();
    setRefreshing(false);
  };

  const handleVoidLabel = async (labelId: string) => {
    try {
      const response = await fetch('/api/merchant/shipments', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labelId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to void label');
      }
      toast.success('Label voided');
      await fetchShipments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to void label');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && shipments.length === 0) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-desc">{total} labels total across active carriers and recent fulfillment runs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 border-border rounded-md hover:bg-muted/50 transition-colors px-4 font-medium"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button asChild className="h-9 rounded-md px-4 font-medium">
            <Link href="/settings/shipping">
              <Truck className="w-4 h-4 mr-2" /> Manage Carriers
            </Link>
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Labels', value: total, icon: Package, color: 'text-purple-500' },
          { label: 'Created', value: stats.created, icon: Clock, color: 'text-blue-400' },
          { label: 'In Transit', value: stats.inTransit, icon: Truck, color: 'text-yellow-400' },
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card rounded-xl shadow-sm transition-colors">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-muted/40 border border-border flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracking number or carrier..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="h-10 pl-11 bg-background border-border text-sm font-medium"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'created', 'in_transit', 'delivered', 'exception', 'voided'].map(s => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`h-9 px-4 text-xs font-medium border-border rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-secondary text-foreground border-border'
                  : 'hover:bg-muted/50'
              }`}
            >
              {s === 'all' ? 'All' : (LABEL_STATUS_CONFIG[s]?.label || s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="border-b border-white/5 py-6 px-8 bg-secondary/25">
          <CardTitle className="text-base font-bold tracking-tight">Shipping Labels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-lg font-bold text-foreground mb-2">Couldn&apos;t load shipments</p>
              <p className="text-sm text-muted-foreground font-medium max-w-xs">
                {error}
              </p>
              <Button onClick={handleRefresh} className="mt-8 bg-purple-500 hover:bg-purple-500/90 text-white font-bold px-8 rounded-xl shadow-lg shadow-purple-500/20">
                Retry
              </Button>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-3xl bg-secondary/20 border border-border flex items-center justify-center mb-8">
                <Truck className="w-10 h-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-lg font-bold text-foreground mb-2">No shipments yet</p>
              <p className="text-sm text-muted-foreground font-medium max-w-xs">
                Generate shipping labels from the Orders page to see them here.
              </p>
              <Button asChild className="mt-8 bg-purple-500 hover:bg-purple-500/90 text-white font-bold px-8 rounded-xl shadow-lg shadow-purple-500/20">
                <Link href="/orders">View Orders</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground px-8 py-5">Tracking</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground py-5">Carrier / Service</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground py-5">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground py-5">Rate</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground py-5">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground py-5">Date</TableHead>
                  <TableHead className="py-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => {
                  const statusConfig = LABEL_STATUS_CONFIG[shipment.status] || LABEL_STATUS_CONFIG.created;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <TableRow key={shipment.id} className="border-white/5 hover:bg-secondary/25 transition-colors">
                      <TableCell className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm font-bold text-foreground select-all">
                            {shipment.tracking_number || '—'}
                          </span>
                          {shipment.order_id && (
                            <Link
                              href={`/orders/${shipment.order_id}`}
                              className="text-[10px] font-bold text-purple-500 hover:underline uppercase tracking-widest"
                            >
                              Order #{shipment.order_id?.slice(0, 8).toUpperCase()}
                            </Link>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <div>
                          <p className="text-sm font-bold text-foreground">{shipment.carrier_name || shipment.carrier_id}</p>
                          {shipment.service_name && (
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">{shipment.service_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6">
                        <p className="text-sm font-medium text-foreground">
                          {shipment.orders?.customer_info?.name || '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {shipment.to_address?.city}{shipment.to_address?.country ? `, ${shipment.to_address.country}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="py-6">
                        {shipment.rate_price != null ? (
                          <span className="text-sm font-bold font-mono text-foreground">
                            {formatCurrency(shipment.rate_price, shipment.rate_currency || 'USD', merchant?.locale)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-6">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 w-fit ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {new Date(shipment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </TableCell>
                      <TableCell className="py-6 pr-8">
                        <div className="flex items-center gap-2">
                          {shipment.label_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                              title="Download label"
                            >
                              <a href={shipment.label_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {shipment.tracking_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10"
                              title="Track shipment"
                            >
                              <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          {shipment.status === 'created' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVoidLabel(shipment.id)}
                              className="h-9 px-3 text-[11px] font-bold text-red-500 hover:bg-red-500/10 rounded-xl"
                            >
                              Void
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 bg-secondary/10 px-6 py-4 rounded-2xl border border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Showing {Math.min(page * PAGE_SIZE + 1, total)}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total} results
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Prev
            </Button>
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                const currentDisplayPage = page + 1;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentDisplayPage <= 3) pageNum = i + 1;
                else if (currentDisplayPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentDisplayPage - 2 + i;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum - 1)}
                    className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-colors ${
                      currentDisplayPage === pageNum 
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
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
