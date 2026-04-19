"use client"

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Download, 
  Users,
    MoreHorizontal,
    ShoppingBag,
    Loader2,
    Clock,
    Shield,
    AlertTriangle,
    CheckCircle,
    Flag,
    CreditCard,
    Activity,
    Brain,
    Target,
    Settings2,
    Mail
  } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger as ShadcnDialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import { getExperienceTier } from '@/lib/consumer/experience-tier';

function CustomersContent() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Risk Profile State
  const [consumerProfile, setConsumerProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [reportingRisk, setReportingRisk] = useState(false);
    const [riskReason, setRiskReason] = useState('');
    const [riskSeverity, setRiskSeverity] = useState('medium');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const { merchant } = useMerchant();
    const searchParams = useSearchParams();
    const emailParam = searchParams.get('email');
    const urlSearch = searchParams.get('search') || '';

    useEffect(() => {
      setSearchTerm(urlSearch);
    }, [urlSearch]);

  const handleViewProfile = useCallback(async (customer: any) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    setLoadingProfile(true);
    setConsumerProfile(null);

    try {
      const res = await fetch(`/api/merchant/customers/${encodeURIComponent(customer.email)}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setCustomerOrders(data.orders || []);
        setConsumerProfile(data.consumerProfile || null);
      }
    } catch {
    } finally {
      setLoadingOrders(false);
      setLoadingProfile(false);
    }
  }, []);

    const handleReportRisk = async () => {
    if (!selectedCustomer || !riskReason) return;

    try {
      setReportingRisk(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/consumers/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: selectedCustomer.email,
          reason: riskReason,
          severity: riskSeverity
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Risk report submitted');
        setRiskReason('');
        setRiskSeverity('medium');
        
        // Update local profile
        setConsumerProfile({
          ...consumerProfile,
          trust_score: data.trust_score,
          risk_level: data.risk_level,
          risk_flags: [...(consumerProfile?.risk_flags || []), riskReason]
        });
      } else {
        toast.error('Failed to submit report');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setReportingRisk(false);
    }
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(ITEMS_PER_PAGE),
        search: searchTerm,
      });
      const response = await fetch(`/api/merchant/customers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const customerList = data.items || [];
      setCustomers(customerList);
      setTotalCustomers(data.total || 0);
      setLoading(false);

      // Auto-open profile if email param matches
      if (emailParam) {
        const matchingCustomer = customerList.find((c: any) => c.email === emailParam);
        if (matchingCustomer) {
          handleViewProfile(matchingCustomer);
        }
      }
    };

    fetchCustomers();
    }, [currentPage, emailParam, handleViewProfile, searchTerm]);

  const filteredCustomers = customers;

    const totalPages = Math.max(1, Math.ceil(totalCustomers / ITEMS_PER_PAGE));
    const paginatedCustomers = filteredCustomers;

    const handleExportCSV = () => {
      const headers = ['Name', 'Email', 'Orders', 'Total Spent', 'First Order', 'Last Order', 'Registered'];
      const rows = filteredCustomers.map(c => [
        c.name,
        c.email,
        c.ordersCount,
        c.totalSpent,
        new Date(c.firstOrder).toLocaleDateString(),
        new Date(c.lastOrder).toLocaleDateString(),
        c.isRegistered ? 'Yes' : 'No'
      ]);
      const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredCustomers.length} customers`);
    };

    const handleSendMessage = (customer: any) => {
      window.location.href = `mailto:${customer.email}`;
    };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-4 pb-6 sm:px-6 lg:px-8">
      <header className="page-header flex-col gap-3 xl:flex-row xl:items-end mb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Directory</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">Customers</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button variant="outline" onClick={handleExportCSV} className="h-9 rounded-xl border-border/70 px-4 text-xs font-bold uppercase tracking-wider">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </header>

      <Card className="mb-4 overflow-hidden border-border/70 bg-card">
        <CardHeader className="border-b border-border/70 bg-card px-4 py-3 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input 
                placeholder="Search customers..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="h-10 rounded-xl border-border/70 bg-background pl-10 text-sm shadow-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary/35">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Customer</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Orders</TableHead>
                  <TableHead className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Last Order</TableHead>
                  <TableHead className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">LTV</TableHead>
                  <TableHead className="w-16 h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {paginatedCustomers.map((customer, idx) => (
                  <TableRow key={idx} className="group transition-colors hover:bg-muted/20">
                    <TableCell className="px-4 py-3" onClick={() => handleViewProfile(customer)}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/45 text-xs font-bold text-muted-foreground border border-border/50">
                          {customer.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground leading-tight">{customer.name}</span>
                            {customer.isRegistered && (
                              <Badge variant="secondary" className="rounded-full bg-secondary/50 border border-border/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight text-foreground">
                                Member
                              </Badge>
                            )}
                          </div>
                          <span className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-tight mt-1 block">{customer.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground" onClick={() => handleViewProfile(customer)}>
                      {customer.ordersCount} <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground ml-1">{customer.ordersCount === 1 ? 'order' : 'orders'}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground" onClick={() => handleViewProfile(customer)}>
                      {new Date(customer.lastOrder).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm font-bold text-foreground" onClick={() => handleViewProfile(customer)}>
                      {formatCurrency(customer.totalSpent, merchant?.currency, merchant?.locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/70">
                            <DropdownMenuItem onClick={() => handleViewProfile(customer)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendMessage(customer)} className="rounded-lg px-3 py-2 text-sm font-medium cursor-pointer">
                              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                              Send Email
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
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCustomers)}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCustomers)} of {totalCustomers}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="overflow-hidden rounded-[28px] border-border bg-popover p-0 shadow-2xl sm:max-w-[720px]">
          <DialogHeader className="border-b border-border px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-xl font-semibold text-foreground">
                {selectedCustomer?.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">{selectedCustomer?.name}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {selectedCustomer?.email}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="overview" className="w-full">
              <div className="border-b border-border bg-secondary/20 px-8 pt-1">
                    <TabsList className="h-auto bg-transparent p-0">
                      <TabsTrigger value="overview" className="border-0 border-b-2 border-transparent rounded-none px-0 py-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground">Overview</TabsTrigger>
                        <TabsTrigger value="intelligence" className="border-0 border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground">AI Insights</TabsTrigger>
                        <TabsTrigger value="risk" className="border-0 border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground">Trust & Risk</TabsTrigger>
                      <TabsTrigger value="history" className="border-0 border-b-2 border-transparent rounded-none px-4 py-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground">History</TabsTrigger>
                    </TabsList>

              </div>

              <ScrollArea className="h-[500px]">
                <div className="p-8">
                    <TabsContent value="overview" className="mt-0 space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-border bg-secondary/20 p-6">
                          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <p className="text-xs font-medium">Transactions</p>
                          </div>
                          <p className="text-2xl font-semibold text-foreground">{selectedCustomer.ordersCount}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/20 p-6">
                          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5" />
                            <p className="text-xs font-medium">Lifetime Value</p>
                          </div>
                          <p className="text-2xl font-semibold text-foreground">{formatCurrency(selectedCustomer.totalSpent, merchant?.currency, merchant?.locale)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/20 p-6">
                          <div className="mb-3 flex items-center gap-2 text-muted-foreground">
                            <Activity className="w-3.5 h-3.5" />
                            <p className="text-xs font-medium">Active Since</p>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{new Date(selectedCustomer.firstOrder || selectedCustomer.lastOrder).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {selectedCustomer.isRegistered && (
                        <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-500">Registered Member</p>
                            <p className="text-xs text-muted-foreground mt-0.5">This customer has a verified account and access to member benefits.</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="intelligence" className="mt-0 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                          <CardHeader className="border-b border-border px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-muted-foreground" />
                                <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-5">
                            {consumerProfile?.intelligence?.memory?.length > 0 ? (
                              <div className="space-y-4">
                                {consumerProfile.intelligence.memory.map((m: any, i: number) => (
                                  <div key={i} className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">{m.memory_key.replace(/_/g, ' ')}</span>
                                    <p className="text-sm text-foreground font-medium">{m.memory_value}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 opacity-50">
                                <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                  <p className="text-xs font-medium">No preferences saved</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                          <CardHeader className="border-b border-border px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-muted-foreground" />
                                <CardTitle className="text-sm font-semibold">Shopping Goals</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="p-5">
                            {consumerProfile?.intelligence?.intents?.length > 0 ? (
                              <div className="space-y-4">
                                {consumerProfile.intelligence.intents.map((intent: any, i: number) => (
                                  <div key={i} className="rounded-2xl border border-border bg-secondary/25 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge variant="secondary" className="rounded-full bg-secondary text-[10px] capitalize text-foreground">{intent.intent_type}</Badge>
                                      <span className="text-[10px] text-muted-foreground">{new Date(intent.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">{intent.goal}</p>
                                    {Object.keys(intent.constraints || {}).length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {Object.entries(intent.constraints).map(([k, v]: [string, any]) => (
                                          <span key={k} className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                                            {k}: {v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 opacity-50">
                                <Target className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p className="text-xs font-medium">No active goals</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <CardHeader className="border-b border-border px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                              <CardTitle className="text-sm font-semibold">AI Settings</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">AI Mode</p>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${consumerProfile?.intelligence?.permissions?.autonomy_level === 'fully-autonomous' ? 'bg-emerald-500' : 'bg-purple-500'} animate-pulse`} />
                                <p className="text-sm font-semibold text-foreground">
                                  {consumerProfile?.intelligence?.permissions?.autonomy_level || 'Assisted'}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Spend Limit</p>
                              <p className="text-sm font-semibold text-foreground">
                                {consumerProfile?.intelligence?.permissions?.max_spend_limit ? formatCurrency(consumerProfile.intelligence.permissions.max_spend_limit, merchant?.currency, merchant?.locale) : 'Restricted'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Bargaining</p>
                              <p className="text-sm font-semibold text-foreground">Enabled</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>


                  <TabsContent value="risk" className="mt-0">
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/45">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">Risk & Credibility</h4>
                              <p className="text-xs text-muted-foreground">Trust score for this store only.</p>
                          </div>
                        </div>
                        {consumerProfile && (
                          <Badge 
                            variant="outline" 
                            className={`rounded-full border-none px-3 py-1 text-[10px] font-medium ${
                              consumerProfile.risk_level === 'low' ? 'bg-emerald-500/10 text-emerald-500' :
                              consumerProfile.risk_level === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                              'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {consumerProfile.risk_level} Risk
                          </Badge>
                        )}
                      </div>

                      {loadingProfile ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-500 opacity-50" />
                          <p className="text-xs font-medium text-muted-foreground">Analyzing profile...</p>
                        </div>
                      ) : consumerProfile ? (
                        <div className="space-y-8">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-muted-foreground">AI Confidence</span>
                                {(() => {
                                  const tier = getExperienceTier(consumerProfile.trust_score);
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Badge className={`text-sm font-black border-none ${tier.bgColor} ${tier.color}`}>
                                        {tier.confidenceLabel}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground font-medium">{tier.tierLabel}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="h-3 w-full overflow-hidden rounded-full bg-muted p-0.5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                    (() => {
                                      const tier = getExperienceTier(consumerProfile.trust_score);
                                      return tier.confidence === 'high' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                        tier.confidence === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                                        'bg-gradient-to-r from-red-500 to-rose-400';
                                    })()
                                  }`}
                                  style={{ width: `${consumerProfile.trust_score}%` }}
                                />
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">{getExperienceTier(consumerProfile.trust_score).description}</p>
                            </div>

                          {consumerProfile.risk_flags && consumerProfile.risk_flags.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-muted-foreground">Active Flags</p>
                              <div className="flex flex-wrap gap-2">
                                {consumerProfile.risk_flags.map((flag: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="border-red-500/20 bg-red-500/5 px-3 py-1 text-[10px] text-red-500">
                                    <AlertTriangle className="w-3 h-3 mr-2" /> {flag.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                            <div className="border-t border-border pt-6">
                              <Dialog>
                                <ShadcnDialogTrigger asChild>
                                  <Button variant="outline" className="h-11 w-full rounded-xl border-dashed text-sm font-medium shadow-sm">
                                    <Flag className="w-3.5 h-3.5 mr-2" /> Report Risk Issue
                                  </Button>
                                </ShadcnDialogTrigger>
                              <DialogContent className="rounded-3xl border-border bg-popover sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Report Risk Issue</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <Select value={riskReason} onValueChange={setRiskReason}>
                                      <SelectTrigger className="border-border bg-background">
                                        <SelectValue placeholder="Select issue type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="payment_dispute">Payment Dispute / Chargeback</SelectItem>
                                        <SelectItem value="fraud_suspicion">Suspicious Activity / Fraud</SelectItem>
                                        <SelectItem value="abusive_behavior">Abusive Behavior</SelectItem>
                                        <SelectItem value="excessive_returns">Excessive Returns</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Severity</Label>
                                    <Select value={riskSeverity} onValueChange={setRiskSeverity}>
                                      <SelectTrigger className="border-border bg-background">
                                        <SelectValue placeholder="Select severity" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">Low (Watchlist)</SelectItem>
                                        <SelectItem value="medium">Medium (Review Required)</SelectItem>
                                        <SelectItem value="high">High (Blocklist)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setRiskReason('')}>Cancel</Button>
                                  <Button 
                                    onClick={handleReportRisk} 
                                    disabled={!riskReason || reportingRisk}
                                    className="bg-red-500 hover:bg-red-500/90 text-white"
                                  >
                                    {reportingRisk ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          <p>No risk profile data available.</p>
                          <p className="text-xs mt-1 opacity-50">This customer has no flagged history.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-0">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> Recent Activity
                      </h4>
                      <Badge variant="secondary" className="rounded-full bg-secondary text-[10px] text-foreground">Last 10 Orders</Badge>
                    </div>

                    {loadingOrders ? (
                      <div className="py-20 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500 opacity-50" />
                      </div>
                    ) : customerOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-secondary/20 py-20 text-center">
                        <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground">No orders yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerOrders.map((order) => (
                          <Link key={order.id} href={`/orders/${order.id}`} className="group block">
                            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/15 p-5 transition-colors group-hover:bg-secondary/30">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-semibold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                                  <Badge variant="outline" className="rounded-full px-2 text-[10px] capitalize">{order.status}</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                              </div>
                              <span className="text-sm font-semibold text-foreground">{formatCurrency(order.total_amount, merchant?.currency, merchant?.locale)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading directory...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
