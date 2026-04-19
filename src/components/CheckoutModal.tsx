"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  ChevronRight,
  CheckCircle2, 
  MapPin, 
  CreditCard,
  Loader2,
  Banknote,
  ChevronDown,
  Tag,
  X,
  Zap,
  Shield,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStorefrontPath } from '@/lib/storefront/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { INDIAN_STATES, ALL_COUNTRIES, type FormErrors } from '@/lib/checkout-utils';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  cart: any[];
  setCart: (cart: any[]) => void;
  merchant: any;
  user: any;
  sessionId: string | null;
  prefilledInfo?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
  };
  prefilledPayment?: string;
}

export function CheckoutModal({ isOpen, onClose, subdomain, cart, setCart, merchant, user, sessionId, prefilledInfo, prefilledPayment }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: user?.phone || prefilledInfo?.phone || '',
    name: user?.name || prefilledInfo?.name || '',
    email: user?.email || '',
    address: prefilledInfo?.address || '',
    city: prefilledInfo?.city || '',
    state: '',
    pincode: prefilledInfo?.pincode || '',
    country: 'US'
  });
  const [selectedPayment, setSelectedPayment] = useState<string>(prefilledPayment || 'cod');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<{code: string, name: string}[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [saveAddressConsent, setSaveAddressConsent] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);

  useEffect(() => {
    if (prefilledInfo) {
      setFormData(prev => ({
        ...prev,
        ...prefilledInfo,
        email: user?.email || prev.email
      }));
    }
  }, [prefilledInfo, user]);

  useEffect(() => {
    if (prefilledPayment) {
      setSelectedPayment(prefilledPayment);
    }
  }, [prefilledPayment]);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const response = await fetch('/api/store/saved-addresses', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      const addresses = Array.isArray(data.addresses) ? data.addresses : [];

      setSavedAddresses(addresses);
      setShowSavedAddresses(addresses.length > 0);
      setIsFirstTimeUser(Boolean(data.isFirstTime ?? addresses.length === 0));
    } catch {}
  }, [subdomain]);

  useEffect(() => {
    if (isOpen && (user?.email || formData.email)) {
      fetchSavedAddresses();
    }
  }, [isOpen, user?.email, formData.email, fetchSavedAddresses]);

  useEffect(() => {
    if (merchant) {
      const shippingZones = merchant.shipping_settings?.zones || [];
      const countryCodes = new Set<string>();
      
      shippingZones.forEach((zone: any) => {
        if (zone.countries && Array.isArray(zone.countries)) {
          zone.countries.forEach((code: string) => countryCodes.add(code));
        }
      });

      const countries = Array.from(countryCodes)
        .map(code => ({ code, name: ALL_COUNTRIES[code] || code }))
        .filter(c => c.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableCountries(countries);
      
      if (countries.length > 0) {
        setFormData(prev => (
          countryCodes.has(prev.country)
            ? prev
            : { ...prev, country: countries[0].code }
        ));
      }
    }
  }, [merchant]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;

  const validateStep1 = () => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!validateEmail(formData.email)) errors.email = 'Invalid email';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    else if (!validatePhone(formData.phone)) errors.phone = 'Invalid phone';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (formData.country === 'IN' && !formData.state.trim()) errors.state = 'State is required';
    if (!formData.country) errors.country = 'Country is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUseSavedAddress = (addr: any) => {
    setFormData({
      ...formData,
      name: addr.name || formData.name,
      phone: addr.phone || formData.phone,
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      country: addr.country || 'US'
    });
    setShowSavedAddresses(false);
    toast.success('Address applied');
  };

  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const hasBargainedItems = cart.some((item: any) => item.bargainedPrice);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone
      }));
    }
  }, [user]);

  const subtotal = cart.reduce((acc, i) => acc + ((i.bargainedPrice || i.price) * i.quantity), 0);
  
  const nonBargainedSubtotal = cart.reduce((acc, i) => {
    if (!i.bargainedPrice) return acc + (i.price * i.quantity);
    return acc;
  }, 0);

  let discountAmount = 0;
  if (appliedDiscount) {
    const amountToDiscount = appliedDiscount.excludeBargainedItems ? nonBargainedSubtotal : subtotal;
    if (appliedDiscount.type === 'percentage') {
      discountAmount = amountToDiscount * (appliedDiscount.value / 100);
    } else {
      discountAmount = Math.min(appliedDiscount.value, amountToDiscount);
    }
  }

  useEffect(() => {
    if (hasBargainedItems && appliedDiscount && appliedDiscount.excludeBargainedItems && discountAmount <= 0) {
      setAppliedDiscount(null);
      setDiscountCode('');
      toast.error('Discount codes cannot be applied to bargained items.');
    }
  }, [hasBargainedItems, appliedDiscount, discountAmount]);

  const computeShipping = () => {
    const shippingSettings = merchant?.shipping_settings;
    if (!shippingSettings?.zones || !formData.country) return 0;
    const zone = shippingSettings.zones.find((z: any) => 
      z.countries?.includes(formData.country)
    );
    if (!zone || !zone.rates || zone.rates.length === 0) return 0;
    return zone.rates[0].price || 0;
  };

  const computeTax = (amount: number) => {
    const taxSettings = merchant?.tax_settings;
    if (!taxSettings?.enabled) return 0;
    const countryRate = taxSettings.country_rates?.find((c: any) => c.country_code === formData.country);
    const rate = countryRate?.rate || taxSettings.default_rate || 0;
    if (rate <= 0) return 0;
    return amount * (rate / 100);
  };

  const shipping = computeShipping();
  const tax = computeTax(subtotal - discountAmount);
  const total = subtotal - discountAmount + shipping + tax;

  const paymentMethodsConfig = React.useMemo(() => merchant?.payment_methods || {}, [merchant?.payment_methods]);
  const availableGateways = React.useMemo(() => [
    { id: 'cod', name: 'Cash on Delivery', icon: Banknote, desc: 'Pay when your order arrives', enabled: paymentMethodsConfig.cod?.enabled !== false },
    { id: 'stripe', name: 'Digital Payment', icon: CreditCard, desc: 'Secure payment via Stripe', enabled: paymentMethodsConfig.stripe?.enabled },
    { id: 'razorpay', name: 'UPI / Cards / Netbanking', icon: Zap, desc: 'Secure payment via Razorpay', enabled: paymentMethodsConfig.razorpay?.enabled }
  ].filter(g => g.enabled), [paymentMethodsConfig]);

  useEffect(() => {
    if (availableGateways.length > 0 && !availableGateways.find(g => g.id === selectedPayment)) {
      setSelectedPayment(availableGateways[0].id);
    }
  }, [availableGateways, selectedPayment]);

  const handleApplyDiscount = async () => {
    if (!discountCode) return;
    setApplyingDiscount(true);
    try {
      const response = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: discountCode, 
          subdomain, 
          orderAmount: subtotal,
          eligibleAmount: nonBargainedSubtotal
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAppliedDiscount({
          ...data.discount,
          excludeBargainedItems: data.excludeBargainedItems
        });
        toast.success('Discount applied!');
      } else {
        toast.error(data.error || 'Invalid discount code');
      }
    } catch {
      toast.error('Failed to apply discount');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          cart,
          customerInfo: formData,
          paymentMethod: selectedPayment,
          discountId: appliedDiscount?.id || null,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Checkout failed');

      if (selectedPayment === 'cod') {
        localStorage.removeItem(`cart_${subdomain}`);
        setCart([]);
        setStep(4);
        toast.success("Order placed successfully!");
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Payment gateway error: No redirect URL provided');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl max-h-[90vh] flex flex-col"
        style={{ 
          background: 'var(--store-card-bg)',
        }}
      >
        <div className="mx-auto w-full max-w-2xl overflow-y-auto scrollbar-hide">
          <DialogHeader className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--store-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {step > 1 && step < 4 && (
                  <button onClick={() => setStep(step - 1)} className="hover:opacity-70 transition-opacity">
                    <ArrowLeft className="w-5 h-5" style={{ color: 'var(--store-text)' }} />
                  </button>
                )}
                <DialogTitle className="text-xl font-bold" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>
                  {step === 1 ? 'Shipping Details' : step === 2 ? 'Order Review' : step === 3 ? 'Payment Method' : 'Order Success'}
                </DialogTitle>
              </div>
                <div className="flex items-center gap-3">
                  {step < 4 && (
                    <div 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
                      style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--store-text-muted)' }}>Step {step}/3</span>
                    </div>
                  )}
                  <DialogClose asChild>

                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <X className="w-5 h-5" style={{ color: 'var(--store-text-muted)' }} />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide min-h-[40vh]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="space-y-6"
                >
                  {showSavedAddresses && savedAddresses.length > 0 && (
                    <div className="p-4 rounded-2xl border bg-zinc-50/50" style={{ borderColor: 'var(--store-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-primary" style={{ color: 'var(--primary)' }} />
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--store-text)' }}>Saved Addresses</span>
                        </div>
                        <button onClick={() => setShowSavedAddresses(false)} className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase">Hide</button>
                      </div>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-hide">
                        {savedAddresses.map((addr, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleUseSavedAddress(addr)}
                            className="w-full flex items-start gap-3 p-3 rounded-xl border bg-white text-left transition-all hover:border-primary group"
                            style={{ borderColor: 'var(--store-border)' }}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                              <MapPin className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold truncate" style={{ color: 'var(--store-text)' }}>{addr.name}</p>
                              <p className="text-[11px] truncate" style={{ color: 'var(--store-text-muted)' }}>{addr.address}</p>
                              <p className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--primary)' }}>{addr.city}, {addr.country}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-300 mt-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>Full Name</Label>
                        <Input 
                          value={formData.name} 
                          onChange={e => {
                            setFormData({...formData, name: e.target.value});
                            if (formErrors.name) setFormErrors({...formErrors, name: undefined});
                          }} 
                          className={cn("h-12 border transition-all", formErrors.name && "border-red-500")}
                          style={{ background: 'var(--store-bg)', borderColor: formErrors.name ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          placeholder="John Doe" 
                        />
                        {formErrors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>Email</Label>
                        <Input 
                          value={formData.email} 
                          onChange={e => {
                            setFormData({...formData, email: e.target.value});
                            if (formErrors.email) setFormErrors({...formErrors, email: undefined});
                          }} 
                          className={cn("h-12 border transition-all", formErrors.email && "border-red-500")}
                          style={{ background: 'var(--store-bg)', borderColor: formErrors.email ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          placeholder="john@example.com" 
                        />
                        {formErrors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>Phone</Label>
                        <Input 
                          value={formData.phone} 
                          onChange={e => {
                            setFormData({...formData, phone: e.target.value});
                            if (formErrors.phone) setFormErrors({...formErrors, phone: undefined});
                          }} 
                          className={cn("h-12 border transition-all", formErrors.phone && "border-red-500")}
                          style={{ background: 'var(--store-bg)', borderColor: formErrors.phone ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          placeholder="+1..." 
                        />
                        {formErrors.phone && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.phone}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>Country</Label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCountryPicker(!showCountryPicker)}
                            className={cn(
                              "w-full h-12 border rounded-xl text-sm font-bold text-left px-4 flex items-center justify-between transition-all",
                              formErrors.country ? "border-red-500" : "border-zinc-200"
                            )}
                            style={{ background: 'var(--store-bg)', borderColor: formErrors.country ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          >
                            <span className="truncate">{ALL_COUNTRIES[formData.country] || formData.country || 'Select country'}</span>
                            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showCountryPicker ? "rotate-180" : "")} />
                          </button>
                          
                          <AnimatePresence>
                            {showCountryPicker && (
                              <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowCountryPicker(false)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-xl z-[70] max-h-48 overflow-y-auto scrollbar-hide"
                                    style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
                                  >
                                    {availableCountries.map((c) => (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          setFormData({...formData, country: c.code, state: c.code === 'IN' ? '' : formData.state});
                                          setShowCountryPicker(false);
                                          if (formErrors.country) setFormErrors({...formErrors, country: undefined});
                                        }}
                                        className="w-full px-4 py-3 text-left hover:opacity-80 text-sm font-bold flex items-center justify-between border-b last:border-0"
                                        style={{ color: 'var(--store-text)', borderColor: 'var(--store-border)' }}
                                      >
                                        <span>{c.name}</span>
                                        {formData.country === c.code && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                      </button>
                                    ))}
                                  </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {formErrors.country && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.country}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>Street Address</Label>
                      <Input 
                        value={formData.address} 
                        onChange={e => {
                          setFormData({...formData, address: e.target.value});
                          if (formErrors.address) setFormErrors({...formErrors, address: undefined});
                        }} 
                        className={cn("h-12 border transition-all", formErrors.address && "border-red-500")}
                        style={{ background: 'var(--store-bg)', borderColor: formErrors.address ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                        placeholder="123 Main St" 
                      />
                      {formErrors.address && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>City</Label>
                        <Input 
                          value={formData.city} 
                          onChange={e => {
                            setFormData({...formData, city: e.target.value});
                            if (formErrors.city) setFormErrors({...formErrors, city: undefined});
                          }} 
                          className={cn("h-12 border transition-all", formErrors.city && "border-red-500")}
                          style={{ background: 'var(--store-bg)', borderColor: formErrors.city ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          placeholder="City" 
                        />
                        {formErrors.city && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.city}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>ZIP / PIN</Label>
                        <Input 
                          value={formData.pincode} 
                          onChange={e => setFormData({...formData, pincode: e.target.value})} 
                          className="h-12 border transition-all" 
                          style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          placeholder="000000" 
                        />
                      </div>
                    </div>

                    {formData.country === 'IN' && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] ml-1" style={{ color: 'var(--store-text-muted)' }}>State</Label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowStatePicker(!showStatePicker)}
                            className={cn(
                              "w-full h-12 border rounded-xl text-sm font-bold text-left px-4 flex items-center justify-between transition-all",
                              formErrors.state ? "border-red-500" : "border-zinc-200"
                            )}
                            style={{ background: 'var(--store-bg)', borderColor: formErrors.state ? undefined : 'var(--store-border)', color: 'var(--store-text)', borderRadius: 'var(--card-radius-sm)' }}
                          >
                            <span className={cn("truncate", !formData.state && "text-zinc-400")}>{formData.state || 'Select state'}</span>
                            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showStatePicker ? "rotate-180" : "")} />
                          </button>
                          
                          <AnimatePresence>
                            {showStatePicker && (
                              <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowStatePicker(false)} />
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute bottom-full left-0 right-0 mb-2 border rounded-xl shadow-xl z-[70] max-h-48 overflow-y-auto scrollbar-hide"
                                    style={{ background: 'var(--store-card-bg)', borderColor: 'var(--store-border)' }}
                                  >
                                    {INDIAN_STATES.map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                          setFormData({...formData, state: s});
                                          setShowStatePicker(false);
                                          if (formErrors.state) setFormErrors({...formErrors, state: undefined});
                                        }}
                                        className="w-full px-4 py-3 text-left hover:opacity-80 text-sm font-bold flex items-center justify-between border-b last:border-0"
                                        style={{ color: 'var(--store-text)', borderColor: 'var(--store-border)' }}
                                      >
                                        <span>{s}</span>
                                        {formData.state === s && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                      </button>
                                    ))}
                                  </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        {formErrors.state && <p className="text-[10px] text-red-500 font-bold ml-1">{formErrors.state}</p>}
                      </div>
                    )}

                    {isFirstTimeUser && user && (
                      <div className="mt-4 pt-4 border-t border-zinc-100">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveAddressConsent}
                            onChange={(e) => setSaveAddressConsent(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-[12px] font-bold" style={{ color: 'var(--store-text)' }}>Save this address for future orders</p>
                            <p className="text-[10px]" style={{ color: 'var(--store-text-muted)' }}>We'll remember this address to make checkout faster next time.</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}


              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="space-y-6"
                >
                  <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1 scrollbar-hide">
                    {cart.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-2xl border"
                        style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative border" style={{ borderColor: 'var(--store-border)' }}>
                          <Image src={item.image_url || item.image || ''} alt="" fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: 'var(--store-text)' }}>{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ background: 'var(--store-card-bg)', color: 'var(--store-text-muted)' }}>Qty: {item.quantity}</span>
                              {item.bargainedPrice && (
                                <Badge className="border-none text-[8px] font-black uppercase tracking-widest px-1.5 py-0" style={{ backgroundColor: 'var(--highlight-color)', color: 'var(--primary)' }}>NEGOTIATED</Badge>
                              )}
                            </div>
                        </div>
                        <p className="font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency((item.bargainedPrice || item.price) * item.quantity, merchant?.currency)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)' }}>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--store-text-muted)' }}>Subtotal</span>
                        <span className="font-medium" style={{ color: 'var(--store-text)' }}>{formatCurrency(subtotal, merchant?.currency)}</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            Discount ({appliedDiscount.code})
                          </span>
                          <span className="font-bold">-{formatCurrency(discountAmount, merchant?.currency)}</span>
                        </div>
                      )}
                      {shipping > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--store-text-muted)' }}>Shipping</span>
                          <span className="font-medium" style={{ color: 'var(--store-text)' }}>{formatCurrency(shipping, merchant?.currency)}</span>
                        </div>
                      )}
                      {tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--store-text-muted)' }}>Tax</span>
                          <span className="font-medium" style={{ color: 'var(--store-text)' }}>{formatCurrency(tax, merchant?.currency)}</span>
                        </div>
                      )}
                      <div className="h-px border-t mt-2" style={{ borderColor: 'var(--store-border)' }} />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold" style={{ color: 'var(--store-text)' }}>Total Amount</span>
                      <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>
                        {formatCurrency(total, merchant?.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      value={discountCode} 
                      onChange={e => setDiscountCode(e.target.value.toUpperCase())} 
                      placeholder={hasBargainedItems && appliedDiscount?.excludeBargainedItems && discountAmount <= 0 ? "COUPONS DISABLED" : "COUPON CODE"} 
                      className="h-11 font-bold tracking-widest" 
                      style={{ background: 'var(--store-bg)', borderColor: 'var(--store-border)', color: 'var(--store-text)' }}
                      disabled={hasBargainedItems && appliedDiscount?.excludeBargainedItems && discountAmount <= 0}
                    />
                    <Button 
                      onClick={handleApplyDiscount} 
                      disabled={applyingDiscount || (hasBargainedItems && appliedDiscount?.excludeBargainedItems && discountAmount <= 0)} 
                      style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--card-radius-sm)' }}
                      className="h-12 px-6 font-bold"
                    >
                      {applyingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'APPLY'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="space-y-6"
                >
                  <div className="grid gap-3">
                    {availableGateways.map(method => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={cn(
                          "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300",
                          selectedPayment === method.id 
                            ? "border-primary shadow-sm" 
                            : "border-transparent hover:border-zinc-200"
                        )}
                        style={{ 
                          background: 'var(--store-bg)',
                          borderColor: selectedPayment === method.id ? 'var(--primary)' : 'var(--store-border)'
                        }}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                          selectedPayment === method.id ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
                        )}
                        style={{ 
                          backgroundColor: selectedPayment === method.id ? 'var(--primary)' : undefined
                        }}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-sm tracking-tight" style={{ color: 'var(--store-text)' }}>{method.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--store-text-muted)' }}>{method.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedPayment === method.id ? 'var(--primary)' : 'var(--store-border)' }}>
                          {selectedPayment === method.id && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                          )}
                        </div>
                      </button>
                    ))}
                    {availableGateways.length === 0 && (
                      <div className="p-8 text-center border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--store-border)' }}>
                        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                        <p className="text-sm font-bold" style={{ color: 'var(--store-text)' }}>No payment methods available</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--store-text-muted)' }}>Please contact the store owner to configure payment gateways.</p>
                      </div>
                    )}
                  </div>

                    <div className="p-4 rounded-xl border flex items-center gap-4" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                      <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
                      <p className="text-[11px] font-bold leading-tight uppercase tracking-widest text-emerald-700">All transactions are encrypted and secured via enterprise standards.</p>
                    </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div 
                  key="step4"
                  initial={{ scale: 0.9, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="flex flex-col items-center justify-center py-10 text-center h-full"
                >
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-black mb-3 tracking-tighter uppercase" style={{ color: 'var(--store-text)', fontFamily: 'var(--font-heading)' }}>Order Placed!</h2>
                  <p className="max-w-xs mx-auto mb-8 text-sm font-medium" style={{ color: 'var(--store-text-muted)' }}>Thank you for your purchase. Your order manifest has been generated and is ready for fulfillment.</p>
                  
                  <div className="flex flex-col gap-3 w-full max-w-sm">
                    <Button 
                      onClick={onClose} 
                      className="h-12 font-bold tracking-widest uppercase text-xs"
                      style={{ backgroundColor: 'var(--primary)', borderRadius: 'var(--card-radius)' }}
                    >
                      Continue Shopping
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => window.location.href = getStorefrontPath(subdomain, '/track', window.location.host)}
                      className="h-12 font-bold tracking-widest uppercase text-xs"
                      style={{ color: 'var(--store-text)', borderRadius: 'var(--card-radius)' }}
                    >
                      Track Order
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 4 && (
            <DialogFooter className="px-6 pb-10 pt-4 border-t" style={{ borderColor: 'var(--store-border)' }}>
                  <Button 
                    className="w-full h-14 text-base font-black shadow-xl"
                    style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: 'var(--card-radius)' }}
                    onClick={() => {
                      if (step === 1) {
                        if (validateStep1()) setStep(2);
                      } else if (step < 3) {
                        setStep(step + 1);
                      } else {
                        handleCheckout();
                      }
                    }}
                    disabled={loading}
                  >

                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <span className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                    {step === 3 ? (selectedPayment === 'cod' ? 'Place Order' : 'Pay Now') : 'Continue'}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
