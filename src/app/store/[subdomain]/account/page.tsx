"use client"

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Loader2, 
  Package, 
  LogOut, 
  ChevronRight, 
  Mail, 
  Phone, 
  User, 
  X, 
  MapPin, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Star, 
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { AccountSkeleton } from '@/components/StoreSkeletons';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import StorefrontShell from '../StorefrontShell';
import { useStoreData, useStoreCart, useStoreSession } from '@/providers/storefront';
import { getStorefrontPath } from '@/lib/storefront/navigation';

function AccountContent({ subdomain }: { subdomain: string }) {
  const router = useRouter();
  const { merchant, loading: dataLoading } = useStoreData();
  const { cart, updateQuantity, removeFromCart } = useStoreCart();
  const { currentUser: user, logout } = useStoreSession();

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reviewingItem, setReviewingItem] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async (merchantId: string, userEmail: string) => {
    setLoadingOrders(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(id, name, price, image_url))')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    const filteredOrders = (ordersData || []).filter(order => {
      const orderEmail = order.customer_info?.email?.toLowerCase();
      return orderEmail === userEmail.toLowerCase();
    });
    
    const enrichedOrders = filteredOrders.map(order => ({
      ...order,
      order_items: order.order_items?.map((item: any) => ({
        ...item,
        product_name: item.products?.name || 'Product',
        product_image: item.products?.image_url || null,
        unit_price: item.price_at_purchase || item.products?.price || 0,
        total_price: (item.price_at_purchase || item.products?.price || 0) * item.quantity
      }))
    }));
    
    setOrders(enrichedOrders);
    setLoadingOrders(false);
  }, []);

  useEffect(() => {
    if (merchant && user?.email) {
      fetchOrders(merchant.id, user.email);
    } else if (!dataLoading && !user) {
      router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}?redirect=account`);
    }
  }, [merchant, user, dataLoading, fetchOrders, router, subdomain]);

  const handleLogout = () => {
    logout();
    router.push(getStorefrontPath(subdomain, '/', window.location.host));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'delivered': return 'bg-emerald-50 text-emerald-600';
      case 'processing': case 'shipped': return 'bg-blue-50 text-blue-600';
      case 'cancelled': case 'refunded': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'delivered': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'processing': return <Clock className="w-3.5 h-3.5" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5" />;
      default: return <Package className="w-3.5 h-3.5" />;
    }
  };

  const copyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
    toast.success('Order ID copied!');
  };

  if (dataLoading) return <AccountSkeleton />;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 py-12 md:py-24" style={{ color: 'var(--store-text)' }}>
      <div className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <span className="h-[0.5px] w-12" style={{ background: 'var(--store-text)', opacity: 0.2 }} />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">
            Registry
          </p>
        </div>

        <h1 className="text-[40px] md:text-[72px] font-black uppercase tracking-tighter leading-[0.9] mb-12">
          My Account
        </h1>
        <p className="text-[16px] md:text-[18px] opacity-40 font-medium uppercase tracking-tighter max-w-xl">
          Access your order history, manage your profile details, and track your active shipments in real-time.
        </p>
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12"
        >
          {/* Profile Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="rounded-3xl border p-8 shadow-sm" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
              <div className="flex items-center gap-6 mb-10">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-black border"
                  style={{ color: 'var(--primary)', borderColor: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-black uppercase tracking-tight truncate">{user?.name || 'Customer'}</h2>
                  <p className="text-[12px] font-medium opacity-40 truncate">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'var(--store-bg)' }}>
                  <Mail className="w-4 h-4 opacity-20" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Email</p>
                    <p className="text-[13px] font-bold truncate">{user?.email}</p>
                  </div>
                </div>
                {user?.phone && (
                  <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'var(--store-bg)' }}>
                    <Phone className="w-4 h-4 opacity-20" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Phone</p>
                      <p className="text-[13px] font-bold">{user?.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="w-full mt-8 h-12 rounded-xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          </div>

          {/* Order History */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border p-8 shadow-sm" style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <Package className="w-6 h-6 opacity-20" />
                  <h3 className="text-[18px] font-black uppercase tracking-tight">My Orders</h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30 px-3 py-1 rounded-full border" style={{ borderColor: 'var(--store-border)' }}>
                  {orders.length} Total
                </span>
              </div>

              {loadingOrders ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-dashed" style={{ borderColor: 'var(--store-border)' }}>
                  <ShoppingBag className="w-10 h-10 opacity-10 mx-auto mb-4" />
                  <p className="text-[13px] font-black uppercase tracking-widest opacity-30">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <button 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="w-full p-6 rounded-2xl border text-left transition-all hover:shadow-md group"
                      style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-[16px] font-black">
                              {formatCurrency(order.total_amount, merchant?.currency, merchant?.locale)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-20 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: 'var(--store-border)', opacity: 0.4 }}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <p className="text-[11px] font-black uppercase tracking-widest">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">
                          {order.order_items?.length} items
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Order Detail Modal Placeholder */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border shadow-2xl p-8"
              style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-[24px] font-black uppercase tracking-tight mb-2">Order Details</h3>
                  <p className="text-[11px] font-black uppercase tracking-widest opacity-30">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:opacity-50 transition-opacity">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-6 rounded-2xl border" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIcon(selectedOrder.status)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Current Status</p>
                        <p className="text-[16px] font-black uppercase">{selectedOrder.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Date</p>
                      <p className="text-[14px] font-bold">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30">Items</h4>
                  {selectedOrder.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-6 p-4 rounded-2xl border" style={{ borderColor: 'var(--store-border)' }}>
                      <div className="w-16 h-20 relative rounded-lg overflow-hidden shrink-0">
                        {item.product_image ? (
                          <Image src={item.product_image} alt={item.product_name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                            <Package className="w-6 h-6 opacity-10" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h5 className="font-black uppercase tracking-tight text-[14px] truncate">{item.product_name}</h5>
                        <p className="text-[11px] font-bold opacity-30 mt-1">
                          {item.quantity} x {formatCurrency(item.unit_price, merchant?.currency, merchant?.locale)}
                        </p>
                      </div>
                      <div className="flex flex-col justify-center text-right">
                        <p className="font-black text-[14px]">{formatCurrency(item.total_price, merchant?.currency, merchant?.locale)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t" style={{ borderColor: 'var(--store-border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] font-black uppercase tracking-widest opacity-30">Total Amount</span>
                    <span className="text-[24px] font-black">{formatCurrency(selectedOrder.total_amount, merchant?.currency, merchant?.locale)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StoreAccountPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  return (
    <StorefrontShell subdomain={subdomain}>
      <AccountContent subdomain={subdomain} />
    </StorefrontShell>
  );
}
