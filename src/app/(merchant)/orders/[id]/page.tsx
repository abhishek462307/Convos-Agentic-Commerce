"use client"

import React, { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Phone, 
  MapPin,
  ExternalLink,
  Printer,
  Circle,
  PackageCheck,
  XCircle,
  FileText,
  Send,
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { AIConfidenceBadge } from '@/components/ai-confidence-badge';
import { ExperienceTierBadge } from '@/components/experience-tier-badge';
import { AIDecisionLog } from '@/components/ai-decision-log';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from '@/lib/utils';
import { useMerchant } from '@/hooks/use-merchant';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-secondary/25 text-purple-500 border-purple-500/20', icon: Clock },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  { value: 'processing', label: 'Processing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Package },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: Truck },
  { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: PackageCheck },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  { value: 'payment_failed', label: 'Payment Failed', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  { value: 'refunded', label: 'Refunded', color: 'bg-secondary/20 text-muted-foreground border-border', icon: Circle },
];

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { merchant } = useMerchant();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  
  const [fulfillmentModalOpen, setFulfillmentModalOpen] = useState(false);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>({});
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelResult, setLabelResult] = useState<any>(null);
  const [consumerProfile, setConsumerProfile] = useState<any>(null);
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const response = await fetch(`/api/merchant/orders/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      const orderData = data.order;

      setOrder(orderData);
      setOrderItems(data.orderItems || []);
      if (data.labelResult) {
        setLabelResult(data.labelResult);
      }
      setConsumerProfile(data.consumerProfile || null);
      setDecisionLogs(data.decisionLogs || []);
      setLoading(false);

      if (orderData?.merchant_id) {
         try {
           const { data: sessionData } = await supabase.auth.getSession();
           const token = sessionData.session?.access_token;
           const response = await fetch(`/api/shipping?merchantId=${orderData.merchant_id}`, {
             headers: token ? { Authorization: `Bearer ${token}` } : {},
           });
           const data = await response.json();
          setCarriers(data.carriers?.filter((c: any) => c.isEnabled) || []);
          setConfigs(data.configs || {});
        } catch (_err) {
        }
      }
    };

    fetchOrderDetails();
  }, [id]);

  const getPackageDetails = useCallback(() => {
    // Sum weight of all order items using product weight fields
    let totalWeight = 0;
    let weightUnit = 'kg';
    let maxLength = 0, maxWidth = 0, maxHeight = 0;
    let dimUnit = 'cm';

    for (const item of orderItems) {
      const p = item.products;
      if (!p) continue;
      const qty = item.quantity || 1;
      const w = parseFloat(p.weight) || 0;
      totalWeight += w * qty;
      if (p.weight_unit) weightUnit = p.weight_unit;
      if (p.dimension_unit) dimUnit = p.dimension_unit;
      if (parseFloat(p.length) > maxLength) maxLength = parseFloat(p.length) || 0;
      if (parseFloat(p.width) > maxWidth) maxWidth = parseFloat(p.width) || 0;
      if (parseFloat(p.height) > maxHeight) maxHeight = parseFloat(p.height) || 0;
    }

    // Fall back to 0.5kg / 10x8x4cm if no product data
    return {
      weight: totalWeight > 0 ? totalWeight : 0.5,
      weightUnit,
      length: maxLength > 0 ? maxLength : 10,
      width: maxWidth > 0 ? maxWidth : 8,
      height: maxHeight > 0 ? maxHeight : 4,
      dimensionUnit: dimUnit,
    };
  }, [orderItems]);

  const fetchRatesForOrder = useCallback(async () => {
    if (!selectedCarrier || !order || !merchant) return;
    setFetchingRates(true);
    setAvailableRates([]);
    setSelectedRate(null);

    try {
      const fromAddr = configs[selectedCarrier]?.settings?.fromAddress || merchant.business_address;
      if (!fromAddr) {
        toast.error('Source address not configured for this carrier');
        setFetchingRates(false);
        return;
      }

      const toAddr = {
        name: order.customer_info.name,
        street1: order.customer_info.address,
        city: order.customer_info.city,
        state: order.customer_info.state,
        postalCode: order.customer_info.pincode,
        country: order.customer_info.country,
        phone: order.customer_info.phone,
      };

       const { data: rateSession } = await supabase.auth.getSession();
       const rateToken = rateSession.session?.access_token;
       const response = await fetch('/api/shipping', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             ...(rateToken ? { Authorization: `Bearer ${rateToken}` } : {}),
           },
           body: JSON.stringify({
             action: 'getRates',
             merchantId: order.merchant_id,
             from: fromAddr,
             to: toAddr,
             packages: [getPackageDetails()],
           }),
         });

      const result = await response.json();
      const carrierRates = result.rates?.filter((r: any) => r.carrierId === selectedCarrier) || [];
      setAvailableRates(carrierRates);
      if (carrierRates.length === 0) {
        toast.warning('No rates found for this carrier and address combination');
      }
    } catch (err) {
      toast.error('Failed to fetch shipping rates');
    } finally {
      setFetchingRates(false);
    }
  }, [configs, getPackageDetails, merchant, order, selectedCarrier]);

  useEffect(() => {
    if (selectedCarrier) {
      fetchRatesForOrder();
    }
  }, [fetchRatesForOrder, selectedCarrier]);

  const handleCreateLabel = async () => {
    if (!selectedRate || !order || !merchant) return;
    setCreatingLabel(true);

    try {
      const fromAddr = configs[selectedCarrier]?.settings?.fromAddress || merchant.business_address;
      const toAddr = {
        name: order.customer_info.name,
        street1: order.customer_info.address,
        city: order.customer_info.city,
        state: order.customer_info.state,
        postalCode: order.customer_info.pincode,
        country: order.customer_info.country,
        phone: order.customer_info.phone,
      };

      const { data: labelSession } = await supabase.auth.getSession();
      const labelToken = labelSession.session?.access_token;
      const response = await fetch('/api/shipping', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             ...(labelToken ? { Authorization: `Bearer ${labelToken}` } : {}),
           },
           body: JSON.stringify({
             action: 'createLabel',
             merchantId: order.merchant_id,
             carrierId: selectedCarrier,
             orderId: order.id,
             from: fromAddr,
             to: toAddr,
             packageDetails: getPackageDetails(),
             serviceCode: selectedRate.serviceCode,
             serviceCarrierName: selectedRate.carrierId,
             serviceName: selectedRate.serviceName,
             ratePrice: selectedRate.price,
             rateCurrency: selectedRate.currency,
           }),
         });

      const result = await response.json();
      if (result.label) {
        setLabelResult(result.label);
        setFulfillmentModalOpen(false);
        toast.success('Shipping label generated successfully');
        
        await updateStatus(
          'shipped', 
          result.label.trackingNumber, 
          result.label.trackingUrl
        );
      } else {
        toast.error(result.error || 'Failed to generate label');
      }
    } catch (err) {
      toast.error('Failed to create shipping label');
    } finally {
      setCreatingLabel(false);
    }
  };

const updateStatus = async (newStatus: string, trackingNumber?: string, trackingUrl?: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ orderId: id, status: newStatus, trackingNumber, trackingUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setOrder((prev: any) => ({
        ...prev,
        status: newStatus,
        ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
        ...(trackingUrl ? { tracking_url: trackingUrl } : {}),
      }));
      toast.success(`Order marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleRefund = async () => {
    if (!window.confirm('Are you sure you want to refund this order? This will also attempt to refund the payment via the gateway.')) {
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/orders/refund', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ orderId: id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process refund');

      setOrder({ ...order, status: 'refunded' });
      toast.success('Order refunded successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentLink = async () => {
    setPaymentLinkLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/orders/payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ orderId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      setOrder((prev: any) => ({ ...prev, payment_link_url: data.paymentLink }));
      toast.success(`Payment link created: ${data.paymentLink}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  const showPaymentLinkButton = order && 
    (order.status === 'pending' || order.status === 'draft') && 
    order.payment_status !== 'paid' &&
    !order.payment_link_url;

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ orderId: id, sendEmail: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${id.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully');
      setInvoiceModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!order?.customer_info?.email) {
      toast.error('Customer email not available');
      return;
    }

    setInvoiceLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ orderId: id, sendEmail: true }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invoice');
      }

      toast.success('Invoice sent to customer email');
      setInvoiceModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto py-32 text-center">
        <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
          <XCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Order not found</h2>
        <Button asChild className="mt-6 bg-white text-black hover:bg-white/90">
          <Link href="/orders">Back to directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/orders" className="group inline-flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to directory
        </Link>
      </div>

      <header className="page-header mb-8 flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-border/70 bg-card font-black text-foreground shadow-sm">
            #{order.id.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              {(() => {
                const statusConfig = ORDER_STATUSES.find(s => s.value === order.status) || ORDER_STATUSES[0];
                return (
                  <Badge variant="outline" className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusConfig.color}`}>
                    {statusConfig.label}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{new Date(order.created_at).toLocaleString()} • Operational Snapshot</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {showPaymentLinkButton && (
            <Button
              variant="outline"
              className="h-10 rounded-2xl border-border/70 px-4 font-semibold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={handleCreatePaymentLink}
              disabled={paymentLinkLoading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Create Payment Link
            </Button>
          )}
          {order?.payment_link_url && (
            <Button
              variant="outline"
              className="h-10 rounded-2xl border-border/70 px-4 font-semibold"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(order.payment_link_url);
                  toast.success('Payment link copied to clipboard');
                } catch (err) {
                  toast.error('Failed to copy payment link. Please copy manually.');
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Copy Payment Link
            </Button>
          )}
          <Button variant="outline" className="h-10 rounded-2xl border-border/70 px-4 font-semibold" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" className="h-10 rounded-2xl border-border/70 px-4 font-semibold" onClick={() => setInvoiceModalOpen(true)}>
            <FileText className="mr-2 h-4 w-4" /> Invoice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 rounded-2xl px-5 font-bold shadow-sm transition-all active:scale-95">
                Update status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border w-56">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {ORDER_STATUSES.filter(s => !['cancelled', 'refunded'].includes(s.value)).map((status) => {
                const Icon = status.icon;
                return (
                  <DropdownMenuItem 
                    key={status.value}
                    onClick={() => updateStatus(status.value)}
                    className={`text-sm font-medium py-3 cursor-pointer gap-3 hover:bg-secondary/30 ${order.status === status.value ? 'bg-secondary/25' : ''}`}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {status.label}
                    {order.status === status.value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-sm font-bold py-3 cursor-pointer gap-3 text-red-500 hover:bg-red-500/10" 
                onClick={() => updateStatus('cancelled')}
                disabled={order.status === 'cancelled' || order.status === 'refunded'}
              >
                <XCircle className="w-4 h-4" /> Cancel order
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-sm font-bold py-3 cursor-pointer gap-3 text-red-500 hover:bg-red-500/10" 
                onClick={handleRefund}
                disabled={order.status === 'refunded'}
              >
                <Circle className="w-4 h-4" /> Issue refund
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          {/* Order Items */}
          <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6 bg-card">
              <CardTitle className="text-base font-semibold tracking-tight">Transaction payload</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/70">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-5 lg:p-6 group hover:bg-secondary/25 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[20px] border border-border/70 bg-secondary/20 overflow-hidden flex items-center justify-center group-hover:border-foreground/20 transition-all shadow-sm">
                        {item.products?.image_url ? (
                          <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-7 h-7 text-muted-foreground opacity-30" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.products?.name || 'Unknown Product'}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Quantity: {item.quantity} units</p>
                      </div>
                    </div>
                    <p className="text-base font-semibold tracking-tight text-foreground">
                        {formatCurrency(Number(item.price_at_purchase) * item.quantity, merchant?.currency, merchant?.locale)}
                      </p>
                  </div>
                ))}
              </div>
              <div className="bg-secondary/25 p-5 lg:p-6 space-y-3.5 border-t border-border/70">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.14em]">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(order.subtotal || orderItems.reduce((sum, item) => sum + (Number(item.price_at_purchase) * item.quantity), 0), merchant?.currency, merchant?.locale)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.14em]">
                    <span className="text-muted-foreground">Shipping {order.customer_info?.shipping_applied?.rate_name ? `(${order.customer_info.shipping_applied.rate_name})` : ''}</span>
                    <span className="text-foreground">{formatCurrency(order.shipping_amount || order.customer_info?.shipping_applied?.amount || 0, merchant?.currency, merchant?.locale)}</span>
                  </div>
                  {(order.tax_amount > 0 || order.customer_info?.tax_applied?.amount > 0) && (
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.14em]">
                      <span className="text-muted-foreground">Tax {order.customer_info?.tax_applied?.name ? `(${order.customer_info.tax_applied.name} ${order.customer_info.tax_applied.rate}%)` : ''}</span>
                      <span className="text-foreground">{formatCurrency(order.tax_amount || order.customer_info?.tax_applied?.amount || 0, merchant?.currency, merchant?.locale)}</span>
                    </div>
                  )}
                  <Separator className="bg-border/70 !my-5" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] font-bold tracking-[0.16em] text-foreground uppercase">Grand total</span>
                    <span className="text-[24px] font-bold text-foreground tracking-tight">
                      {formatCurrency(order.total_amount, merchant?.currency, merchant?.locale)}
                    </span>
                  </div>
                </div>
            </CardContent>
          </Card>

          {/* Fulfillment Card */}
          <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6 bg-card flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Logistics pipeline</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1">Fulfillment status and shipping label settings.</CardDescription>
                </div>
              {!labelResult && order.status !== 'cancelled' && order.status !== 'refunded' && (
                <Button 
                  onClick={() => setFulfillmentModalOpen(true)}
                  className="h-9 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold px-5"
                >
                  <Truck className="w-4 h-4 mr-2" /> Generate label
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 lg:p-6">
              {(labelResult || order.tracking_number || order.status === 'shipped' || order.status === 'delivered') ? (
                <div className="space-y-5">
                  {(order.tracking_number || order.status === 'shipped' || order.status === 'delivered') && (
                    <div className="flex items-center gap-5 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-[20px]">
                      <div className="w-12 h-12 rounded-[18px] bg-emerald-500/10 flex items-center justify-center">
                        <PackageCheck className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Stream fulfillment active</p>
                        {order.tracking_number && (
                          <p className="text-xs text-muted-foreground mt-1 font-medium">Tracking: <span className="text-foreground font-mono font-bold select-all bg-secondary/30 px-1.5 py-0.5 rounded">{order.tracking_number}</span></p>
                        )}
                      </div>
                      {order.tracking_url && (
                        <Button variant="outline" size="sm" asChild className="h-9 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-semibold rounded-xl px-4">
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                            Trace stream <ExternalLink className="w-3.5 h-3.5 ml-2" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                    {labelResult && (
                      <div className="p-5 bg-secondary/25 border border-border/70 rounded-[20px] space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Carrier backbone</span>
                          <span className="text-xs font-bold text-foreground uppercase tracking-tight">{labelResult.carrier_name || labelResult.carrier || labelResult.carrierId}</span>
                        </div>
                        <Separator className="bg-border/70" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Label document</span>
                            {(labelResult.label_url || labelResult.labelUrl) ? (
                              <Button variant="outline" size="sm" asChild className="h-9 rounded-xl border-border/70 hover:bg-secondary font-semibold px-4">
                                <a href={labelResult.label_url || labelResult.labelUrl} target="_blank" rel="noopener noreferrer">
                                  <Printer className="w-4 h-4 mr-2" /> View full label
                                </a>
                              </Button>
                            ) : labelResult.label_data || labelResult.labelData ? (
                              <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/70 hover:bg-secondary font-semibold px-4" onClick={() => {
                                const b64 = labelResult.label_data || labelResult.labelData;
                                const binary = atob(b64);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                const blob = new Blob([bytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              }}>
                                <Download className="w-4 h-4 mr-2" /> Download label
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">Label pending</span>
                            )}
                          </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-16 bg-secondary/15 border border-dashed border-border/70 rounded-[20px] group hover:border-foreground/20 transition-all">
                  <div className="w-14 h-14 bg-secondary/30 rounded-[18px] flex items-center justify-center mx-auto mb-5 border border-border/70 group-hover:scale-105 transition-transform">
                    <Truck className="w-7 h-7 text-muted-foreground opacity-30" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Awaiting logistics execution</p>
                  <p className="text-xs text-muted-foreground mt-2 max-w-[240px] mx-auto leading-relaxed">Initialize a shipping label to activate the fulfillment stream.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6 bg-card">
              <CardTitle className="text-base font-semibold tracking-tight">Timeline log</CardTitle>
            </CardHeader>
            <CardContent className="p-5 lg:p-6">
              {(() => {
                const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered'];
                const currentIdx = STATUS_ORDER.indexOf(order.status);
                const isTerminal = ['cancelled', 'refunded', 'payment_failed'].includes(order.status);

                type TimelineStep = { icon: any; title: string; description: string; date: string; active: boolean };
                const steps: TimelineStep[] = [];

                steps.push({
                  icon: CheckCircle2,
                  title: 'Order placed',
                  description: 'Order was placed via autonomous conversation flow.',
                  date: new Date(order.created_at).toLocaleString(),
                  active: true,
                });

                if (currentIdx >= 1 || isTerminal) {
                  steps.push({
                    icon: CheckCircle,
                    title: 'Payment confirmed',
                    description: 'Financial transaction processed and verified.',
                    date: new Date(order.created_at).toLocaleString(),
                    active: !isTerminal || order.status === 'refunded',
                  });
                }

                if (currentIdx >= 2) {
                  steps.push({
                    icon: Package,
                    title: 'Processing',
                    description: 'Order is being prepared for shipment.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: true,
                  });
                }

                if (currentIdx >= 3) {
                  steps.push({
                    icon: Truck,
                    title: 'Shipped',
                    description: order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Order handed over to courier.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: true,
                  });
                }

                if (currentIdx >= 4) {
                  steps.push({
                    icon: PackageCheck,
                    title: 'Delivered',
                    description: 'Order successfully delivered to the customer.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: true,
                  });
                }

                if (order.status === 'cancelled') {
                  steps.push({
                    icon: XCircle,
                    title: 'Order cancelled',
                    description: 'This order was cancelled.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: false,
                  });
                }

                if (order.status === 'payment_failed') {
                  steps.push({
                    icon: AlertTriangle,
                    title: 'Payment failed',
                    description: 'The payment could not be processed.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: false,
                  });
                }

                if (order.status === 'refunded') {
                  steps.push({
                    icon: Circle,
                    title: 'Refunded',
                    description: 'Payment was refunded to the customer.',
                    date: new Date(order.updated_at || order.created_at).toLocaleString(),
                    active: false,
                  });
                }

                return (
                  <div className="space-y-6">
                    {steps.map((step, i) => (
                      <TimelineItem
                        key={i}
                        icon={step.icon}
                        title={step.title}
                        date={step.date}
                        description={step.description}
                        isLast={i === steps.length - 1}
                        active={step.active}
                      />
                    ))}
                  </div>
                );
              })()}
            </CardContent>
            </Card>

            {decisionLogs.length > 0 && (
              <AIDecisionLog logs={decisionLogs} merchantId={order?.merchant_id} />
            )}
          </div>

          <div className="lg:col-span-4 space-y-5">
              {/* Customer Card */}
            <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
              <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6 bg-card">
                <CardTitle className="text-base font-semibold tracking-tight">Shopper profile</CardTitle>
              </CardHeader>
              <CardContent className="p-5 lg:p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-secondary/30 border border-border/70 flex items-center justify-center text-lg font-bold text-muted-foreground shadow-inner">
                      {order.customer_info?.name?.[0]?.toUpperCase() || 'G'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground tracking-tight truncate">{order.customer_info?.name || 'Guest Customer'}</p>
                      <Link href={`/customers?email=${order.customer_info?.email}`} className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.16em] hover:text-foreground transition-colors flex items-center mt-1.5 group">
                        Analyze identity <ExternalLink className="w-3 h-3 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                {consumerProfile && (
                  <>
                    <Separator className="bg-border/70" />
                    <div className="grid grid-cols-2 gap-3">
                      <AIConfidenceBadge trustScore={consumerProfile.trust_score} />
                      <ExperienceTierBadge riskLevel={consumerProfile.risk_level || 'low'} />
                    </div>
                  </>
                )}
              
              <Separator className="bg-border/70" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-[14px] bg-secondary/30 border border-border/70 flex items-center justify-center group-hover:border-foreground/20 transition-colors shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.16em] mb-0.5">Contact node</p>
                    <span className="text-sm font-semibold text-foreground truncate block">{order.customer_info?.email || 'Stream hidden'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-[14px] bg-secondary/30 border border-border/70 flex items-center justify-center group-hover:border-foreground/20 transition-colors shrink-0">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.16em] mb-0.5">Voice line</p>
                    <span className="text-sm font-semibold text-foreground">{order.customer_info?.phone || 'No voice signal'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
            <CardHeader className="border-b border-border/70 px-5 py-4 lg:px-6 bg-card">
              <CardTitle className="text-base font-semibold tracking-tight">Destination map</CardTitle>
            </CardHeader>
            <CardContent className="p-5 lg:p-6">
              <div className="flex gap-4 group">
                <div className="w-10 h-10 rounded-[14px] bg-secondary/30 border border-border/70 flex items-center justify-center shrink-0 group-hover:border-foreground/20 transition-colors">
                  <MapPin className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground leading-relaxed">
                  {order.customer_info?.address ? (
                    <div className="space-y-1">
                      <p className="font-semibold">{order.customer_info.address}</p>
                      {(order.customer_info.city || order.customer_info.state || order.customer_info.pincode) && (
                        <p className="text-muted-foreground">
                          {order.customer_info.city}
                          {order.customer_info.city && order.customer_info.state && ', '}
                          {order.customer_info.state}
                          {(order.customer_info.city || order.customer_info.state) && order.customer_info.pincode && ' - '}
                          {order.customer_info.pincode}
                        </p>
                      )}
                      {order.customer_info.country && (
                        <p className="text-muted-foreground uppercase text-[11px] font-bold tracking-[0.14em] mt-1">{order.customer_info.country === 'IN' ? 'India' : order.customer_info.country}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic font-medium">Identity-only interaction</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/70 p-0 overflow-hidden shadow-2xl rounded-[24px]">
          <DialogHeader className="p-6 border-b border-border/70 bg-card">
            <DialogTitle className="text-lg font-semibold tracking-tight">System invoice</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Generate and deploy financial documents for order #{order?.id?.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="p-5 bg-secondary/25 rounded-[20px] border border-border/70 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Invoice ID</span>
                  <span className="text-xs font-bold text-foreground font-mono uppercase">INV-{order?.id?.slice(0, 8).toUpperCase()}</span>
                </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Settlement</span>
                <span className="text-sm font-bold text-foreground tracking-tight">{formatCurrency(order?.total_amount, merchant?.currency, merchant?.locale)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recipient</span>
                <span className="text-xs font-semibold text-muted-foreground truncate max-w-[180px]">{order?.customer_info?.email || 'Hidden'}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 flex gap-2.5 sm:justify-between">
            <Button
              variant="outline"
              onClick={handleDownloadInvoice}
              disabled={invoiceLoading}
              className="flex-1 h-10 border-border/70 font-semibold hover:bg-secondary transition-all rounded-xl"
            >
              {invoiceLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Fetch PDF
            </Button>
            <Button
              onClick={handleSendInvoiceEmail}
              disabled={invoiceLoading || !order?.customer_info?.email}
              className="flex-1 h-10 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-xl"
            >
              {invoiceLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Deploy via email
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

          <Dialog open={fulfillmentModalOpen} onOpenChange={setFulfillmentModalOpen}>
            <DialogContent className="sm:max-w-xl bg-card border-border/70 p-0 overflow-hidden shadow-2xl rounded-[24px]">
              <DialogHeader className="p-6 border-b border-border/70 bg-card">
                <DialogTitle className="text-lg font-semibold tracking-tight">Shipping settings</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Select a carrier stream to initialize the fulfillment pipeline.
                </DialogDescription>
              </DialogHeader>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Integrated backbones</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {carriers.map((carrier) => (
                    <button
                      key={carrier.id}
                      onClick={() => setSelectedCarrier(carrier.id)}
                      className={`flex items-center gap-3.5 p-3.5 border rounded-[20px] text-left transition-all group ${
                        selectedCarrier === carrier.id 
                          ? 'border-foreground bg-secondary' 
                          : 'border-border/70 bg-secondary/15 hover:border-foreground/20'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-border/70 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                        {carrier.logo ? (
                          <img src={carrier.logo} alt={carrier.name} className="w-full h-full object-contain" />
                        ) : (
                          <Truck className="w-4.5 h-4.5 text-muted-foreground opacity-30" />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{carrier.name}</span>
                    </button>
                  ))}
                    {carriers.length === 0 && (
                      <div className="col-span-2 p-8 text-center border border-dashed border-border/70 rounded-[20px] bg-secondary/15">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Zero active backbones</p>
                        <Link href="/settings/shipping" className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.14em] hover:text-foreground underline mt-3 inline-block">
                          Configure shipping in settings
                        </Link>
                      </div>
                    )}
                </div>
              </div>

              {selectedCarrier && (
                <div className="space-y-3.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available streams</Label>
                  {fetchingRates ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-secondary/15 rounded-[20px] border border-border/70">
                      <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Synthesizing live rates...</span>
                    </div>
                  ) : availableRates.length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {availableRates.map((rate, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedRate(rate)}
                          className={`w-full flex items-center justify-between p-4 border rounded-[18px] transition-all group ${
                            selectedRate === rate 
                              ? 'border-foreground bg-secondary' 
                              : 'border-border/70 bg-secondary/15 hover:border-foreground/20'
                          }`}
                        >
                          <div className="text-left min-w-0 flex-1 pr-4">
                            <p className="text-sm font-semibold text-foreground tracking-tight truncate">{rate.serviceName}</p>
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{rate.deliveryEstimate || 'Standard throughput'}</p>
                          </div>
                          <span className="text-base font-bold text-foreground tracking-tight whitespace-nowrap">
                            {formatCurrency(rate.price, rate.currency, merchant?.locale)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-border/70 rounded-[20px] bg-secondary/15">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em] opacity-60">Zero available streams for this node</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button 
                variant="outline" 
                onClick={() => setFulfillmentModalOpen(false)}
                className="h-10 px-6 border-border/70 font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                disabled={!selectedRate || creatingLabel}
                onClick={handleCreateLabel}
                className="h-10 px-8 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-[0.12em] text-[11px] rounded-xl ml-auto"
              >
                {creatingLabel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finalizing...
                  </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 mr-2" /> Buy label
                    </>
                  )}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
}

function TimelineItem({ icon: Icon, title, date, description, isLast, active }: any) {
  return (
    <div className="flex gap-5 group">
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
          active ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' : 'bg-secondary/20 border-border/70 text-muted-foreground'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px h-full bg-border/70 my-2 rounded-full" />}
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-sm font-semibold tracking-tight ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</p>
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full uppercase tracking-wider">{date}</span>
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
