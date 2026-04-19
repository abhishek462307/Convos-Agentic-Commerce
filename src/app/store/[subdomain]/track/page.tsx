"use client"

import React, { useState, use } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import StorefrontShell from '../StorefrontShell';
import { useStoreData } from '@/providers/storefront';

interface OrderInfo {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
  shipped_at?: string;
  delivered_at?: string;
  customer_info: {
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  currency: string;
  store_name: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Order Placed', color: '#b98900', bgColor: '#fff5cc', icon: Clock },
  confirmed: { label: 'Confirmed', color: '#1e88e5', bgColor: '#e3f2fd', icon: CheckCircle2 },
  processing: { label: 'Processing', color: '#7c3aed', bgColor: '#ede9fe', icon: Package },
  shipped: { label: 'Shipped', color: '#0891b2', bgColor: '#cffafe', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: '#059669', bgColor: '#d1fae5', icon: Truck },
  delivered: { label: 'Delivered', color: '#008060', bgColor: '#e3f1df', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: '#d82c0d', bgColor: '#ffd2cc', icon: AlertCircle },
  refunded: { label: 'Refunded', color: '#6d7175', bgColor: '#f1f1f1', icon: AlertCircle },
};

function TrackingContent({ subdomain }: { subdomain: string }) {
  const { merchant, loading } = useStoreData();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearched(true);

    try {
      const response = await fetch(`/api/orders/track?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Order not found');
      }

      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to find order');
      setOrder(null);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIndex = (status: string) => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    return statuses.indexOf(status);
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-32" style={{ color: 'var(--store-text)' }}>
      <div className="flex flex-col">
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-[0.5px] w-12" style={{ background: 'var(--store-text)', opacity: 0.2 }} />
            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">
              Services
            </p>
          </div>

          <h1 className="text-[40px] md:text-[72px] font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Track Order
          </h1>
          <p className="text-[16px] md:text-[18px] opacity-40 font-medium uppercase tracking-tighter max-w-xl">
            Enter your order identification details below to receive a real-time status update on your shipment.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr,400px] gap-20">
          <div className="space-y-12">
            <form onSubmit={handleTrack} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Order Identification</label>
                <input
                  placeholder="E.G. 993E716F"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-transparent border-b py-4 text-[20px] font-black uppercase tracking-tight placeholder:opacity-10 focus:outline-none focus:border-primary transition-colors"
                  style={{ borderColor: 'var(--store-text)' }}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Email Address (Verification)</label>
                <input
                  type="email"
                  placeholder="EMAIL@EXAMPLE.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b py-4 text-[20px] font-black uppercase tracking-tight placeholder:opacity-10 focus:outline-none focus:border-primary transition-colors"
                  style={{ borderColor: 'var(--store-text)' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSearching}
                className="w-full h-20 text-white flex items-center justify-center gap-4 text-[13px] font-black uppercase tracking-[0.3em] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-20 rounded-2xl shadow-xl"
                style={{ background: 'var(--primary)' }}
              >
                {isSearching ? 'Searching Registry...' : (
                  <>
                    <Search className="w-5 h-5" />
                    Retrieve Order Status
                  </>
                )}
              </button>
            </form>

            {error && searched && (
              <div className="p-8 border-[0.5px] bg-black/5 flex items-start gap-4 rounded-2xl" style={{ borderColor: 'var(--store-border)' }}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-[12px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {order && (
            <div className="space-y-12">
              <div className="space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-xl border-[0.5px]" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">Order Reference</p>
                    <p className="text-[24px] font-black uppercase tracking-tight">#{order.id.slice(0, 8)}</p>
                  </div>
                  <div className="px-4 py-2 border text-[10px] font-black uppercase tracking-[0.2em] rounded-lg" style={{ borderColor: 'var(--store-text)', opacity: 0.5 }}>
                    {statusConfig[order.status]?.label || order.status}
                  </div>
                </div>

                <div className="pt-8 border-t" style={{ borderColor: 'var(--store-border)' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-4">Tracking History</p>
                  <div className="space-y-6">
                    {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((status, index) => {
                      const currentIndex = getStatusIndex(order.status);
                      const isActive = index <= currentIndex;
                      return (
                        <div key={status} className="flex items-center gap-6">
                          <div className={`w-3 h-3 border-[0.5px] rounded-full ${isActive ? 'bg-current' : 'opacity-10'}`} style={{ borderColor: 'var(--store-text)' }} />
                          <p className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-10'}`}>
                            {statusConfig[status]?.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {order.tracking_number && (
                  <div className="pt-8 border-t" style={{ borderColor: 'var(--store-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-4">Shipping Intelligence</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[13px] font-black uppercase tracking-tight">{order.carrier || 'Standard'}</p>
                        <p className="text-[11px] font-black uppercase tracking-widest opacity-30 mt-1">{order.tracking_number}</p>
                      </div>
                      {order.estimated_delivery && (
                        <p className="text-[11px] font-black uppercase tracking-widest">
                          EST. DELIVERY: {new Date(order.estimated_delivery).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  return (
    <StorefrontShell subdomain={subdomain}>
      <TrackingContent subdomain={subdomain} />
    </StorefrontShell>
  );
}
