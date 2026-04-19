"use client"

import React, { useState, useEffect, use, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { 
  ArrowLeft, 
  ChevronRight,
  CheckCircle2, 
  Phone, 
  MapPin, 
  CreditCard,
  Loader2,
  Banknote,
  Wallet,
  Globe,
  ChevronDown,
  User,
  Mail,
  ShoppingBag,
  Shield,
  Tag,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { CheckoutSkeleton } from '@/components/StoreSkeletons';
import { getTemplateById } from '@/lib/store-templates';
import { INDIAN_STATES, ALL_COUNTRIES, type FormErrors, type PaymentMethods, type TaxSettings } from '@/lib/checkout-utils';
import { getStorefrontRoot, getStorefrontPath } from '@/lib/storefront/navigation';

function CheckoutContent({ subdomain }: { subdomain: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'US'
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedPayment, setSelectedPayment] = useState<string>('cod');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<{code: string, name: string}[]>([]);
  const [selectedShippingRateId, setSelectedShippingRateId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [saveAddressConsent, setSaveAddressConsent] = useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';
  const orderId = searchParams.get('order_id');

  const currentHost = typeof window !== 'undefined' ? window.location.host : undefined;
  const storePath = getStorefrontRoot(subdomain, currentHost);

  useEffect(() => {
    const existing = localStorage.getItem(`session_${subdomain}`);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const generated = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(`session_${subdomain}`, generated);
    setSessionId(generated);
  }, [subdomain]);

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
    const initializeAuth = async () => {
      const saved = localStorage.getItem(`store_auth_${subdomain}`);
      const consumerEmail = localStorage.getItem(`consumer_email_${subdomain}`);
      
      if (!saved) {
        if (consumerEmail) {
          setFormData(prev => ({
            ...prev,
            email: consumerEmail
          }));
          setAuthLoading(false);
          return;
        }
        router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}?redirect=checkout`);
        setAuthLoading(false);
        return;
      }

      try {
        const session = JSON.parse(saved);
        let resolvedUser = session.user;

        if (session.access_token && session.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

          if (error || !data.session) {
            localStorage.removeItem(`store_auth_${subdomain}`);
            router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}?redirect=checkout`);
            setAuthLoading(false);
            return;
          }

          resolvedUser = session.user || data.session.user;
          localStorage.setItem(`store_auth_${subdomain}`, JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: resolvedUser,
          }));
        }

        setUser(resolvedUser);
        setFormData(prev => ({
          ...prev,
          name: resolvedUser?.name || '',
          email: resolvedUser?.email || '',
          phone: resolvedUser?.phone || ''
        }));
        await fetchSavedAddresses();
      } catch {
        localStorage.removeItem(`store_auth_${subdomain}`);
        router.push(`${getStorefrontPath(subdomain, '/login', window.location.host)}?redirect=checkout`);
      }

      setAuthLoading(false);
    };

    initializeAuth();
  }, [subdomain, router, fetchSavedAddresses]);

  const fetchData = useCallback(async () => {
    const { data: merchantData } = await supabase
      .from('merchants')
      .select('*, shipping_settings, tax_settings, branding_settings')
      .eq('subdomain', subdomain)
      .single();
    
    if (merchantData) {
      setMerchant(merchantData);
      
      const shippingZones = merchantData.shipping_settings?.zones || [];
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
      
      const methods = merchantData.payment_methods as PaymentMethods || {
        cod: { enabled: true },
        stripe: { enabled: false, secret_key: null, publishable_key: null },
        razorpay: { enabled: false, key_id: null, key_secret: null },
        paypal: { enabled: false, client_id: null, client_secret: null }
      };
      setPaymentMethods(methods);

      if (methods.cod?.enabled) {
        setSelectedPayment('cod');
      } else if (methods.stripe?.enabled) {
        setSelectedPayment('stripe');
      } else if (methods.razorpay?.enabled) {
        setSelectedPayment('razorpay');
      } else if (methods.paypal?.enabled) {
        setSelectedPayment('paypal');
      }
      
      if (!isSuccess) {
        const savedCart = localStorage.getItem(`cart_${subdomain}`);
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch {
            // cart parse failed — skip
          }
        }
      }
    }
  }, [isSuccess, subdomain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isSuccess && orderId) {
      const provider = searchParams.get('provider');
      if (provider === 'paypal') {
        const paypalOrderId = searchParams.get('token');
        if (!paypalOrderId) {
          toast.error('PayPal session token missing. Please try again.');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
        setLoading(true);
        fetch('/api/orders/verify-paypal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, paypalOrderId }),
        })
          .then(res => {
            if (!res.ok) throw new Error('PayPal capture failed');
            localStorage.removeItem(`cart_${subdomain}`);
            setCart([]);
            setStep(4);
          })
          .catch(() => {
            toast.error('Payment verification failed. Please contact support.');
          })
          .finally(() => setLoading(false));
        return;
      }
      localStorage.removeItem(`cart_${subdomain}`);
      setCart([]);
      setStep(4);
    } else if (isCanceled && orderId) {
      toast.error("Payment was canceled. You can try again.");
    }
  }, [isSuccess, isCanceled, orderId, subdomain, searchParams]);

  const subtotal = cart.reduce((acc, i) => acc + ((i.bargainedPrice || i.price) * i.quantity), 0);
  const originalSubtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const bargainSavings = originalSubtotal - subtotal;
  
  const nonBargainedSubtotal = cart.reduce((acc, i) => {
    if (!i.bargainedPrice) {
      return acc + (i.price * i.quantity);
    }
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

  let shipping = 0;
  let shippingRateName = '';
  let availableRates: { id: string; name: string; price: number }[] = [];
  const shippingSettings = merchant?.shipping_settings || { zones: [] };
  
  if (shippingSettings.zones?.length > 0) {
    const matchingZone = shippingSettings.zones.find((zone: any) => 
      zone.countries?.includes(formData.country)
    );
    
    const zone = matchingZone || shippingSettings.zones.find((zone: any) => 
      !zone.countries?.length || zone.name?.toLowerCase().includes('rest of world') || zone.name?.toLowerCase().includes('default')
    );

    if (zone && zone.rates?.length > 0) {
      availableRates = zone.rates;
      const selectedRate = selectedShippingRateId 
        ? zone.rates.find((r: any) => r.id === selectedShippingRateId) 
        : zone.rates[0];
      if (selectedRate) {
        shipping = selectedRate.price;
        shippingRateName = selectedRate.name;
      } else {
        shipping = zone.rates[0].price;
        shippingRateName = zone.rates[0].name;
      }
    }
  }

  let tax = 0;
  let taxRate = 0;
  let taxName = 'Tax';
  const taxSettings: TaxSettings = merchant?.tax_settings || { enabled: false, default_rate: 0, include_in_price: false, country_rates: [] };
  
  if (taxSettings.enabled) {
    const countryRate = taxSettings.country_rates?.find(c => c.country_code === formData.country);
    if (countryRate) {
      taxRate = countryRate.rate;
      taxName = countryRate.tax_name || 'Tax';
    } else {
      taxRate = taxSettings.default_rate || 0;
    }
    
    if (taxRate > 0) {
      const taxableSubtotal = Math.max(0, subtotal - discountAmount);
      if (taxSettings.include_in_price) {
        tax = taxableSubtotal - (taxableSubtotal / (1 + taxRate / 100));
      } else {
        tax = taxableSubtotal * (taxRate / 100);
      }
    }
  }

  const total = taxSettings.include_in_price
    ? (subtotal - discountAmount + shipping)
    : (subtotal - discountAmount + shipping + tax);

  const branding = merchant?.branding_settings || { logo_url: null, primary_color: '#008060' };
  const primaryColor = branding.primary_color || '#008060';

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--ring', primaryColor);
    }
    const templateId = branding.template_id || 'minimal-light';
    const template = getTemplateById(templateId);
    const colors = template?.colors || { background: '#f6f6f7', card_background: '#ffffff', text_primary: '#202223', text_secondary: '#6d7175', border: '#e3e3e3' };
    document.documentElement.style.setProperty('--store-bg', colors.background);
    document.documentElement.style.setProperty('--store-card-bg', colors.card_background);
    document.documentElement.style.setProperty('--store-text', colors.text_primary);
    document.documentElement.style.setProperty('--store-text-muted', colors.text_secondary);
    document.documentElement.style.setProperty('--store-border', colors.border);
  }, [primaryColor, branding.template_id]);

  const validateStep1 = () => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'Required';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid';
    if (!formData.phone.trim()) errors.phone = 'Required';
    if (!formData.address.trim()) errors.address = 'Required';
    if (!formData.city.trim()) errors.city = 'Required';
    if (!formData.country) errors.country = 'Required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueToSummary = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    const convoId = localStorage.getItem(`convo_${merchant?.id}`);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          cart,
          customerInfo: formData,
          conversationId: convoId,
          paymentMethod: selectedPayment,
          discountId: appliedDiscount?.id || null,
          sessionId: sessionId,
          shippingRateId: selectedShippingRateId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');

      if (selectedPayment === 'cod') {
        localStorage.removeItem(`cart_${subdomain}`);
        setCart([]);
        setStep(4);
        toast.success("Order placed!");
      } else if (data.razorpay) {
        const openRazorpay = () => {
          const options = {
            key: data.key_id,
            amount: data.amount,
            currency: data.currency,
            name: data.name,
            order_id: data.razorpay_order_id,
            prefill: data.prefill,
            handler: async (response: any) => {
              try {
                const verifyRes = await fetch('/api/orders/verify-razorpay', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: data.orderId,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                if (!verifyRes.ok) {
                  const err = await verifyRes.json();
                  throw new Error(err.error || 'Payment verification failed');
                }
                localStorage.removeItem(`cart_${subdomain}`);
                setCart([]);
                setStep(4);
                toast.success('Payment successful!');
              } catch (verifyError: any) {
                toast.error(verifyError.message || 'Payment verification failed');
              }
              setLoading(false);
            },
            modal: {
              ondismiss: () => setLoading(false),
            },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };

        if ((window as any).Razorpay) {
          openRazorpay();
          return;
        }

        const existingScript = document.getElementById('razorpay-checkout-js');
        if (existingScript) {
          existingScript.addEventListener('load', openRazorpay, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          script.onload = null;
          script.onerror = null;
          openRazorpay();
        };
        script.onerror = () => {
          script.onload = null;
          script.onerror = null;
          script.remove();
          toast.error('Failed to load payment gateway');
          setLoading(false);
        };
        document.body.appendChild(script);
        return;
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setLoading(false);
    }
  };

  const getEnabledPaymentMethods = () => {
    if (!paymentMethods) return [];
    const methods = [];
    if (paymentMethods.cod?.enabled) methods.push({ key: 'cod', name: 'Cash on Delivery', icon: Banknote, description: 'Pay when you receive your order' });
    if (paymentMethods.stripe?.enabled) {
      methods.push({ key: 'stripe', name: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, American Express' });
    }
    if (paymentMethods.razorpay?.enabled) {
      methods.push({ key: 'razorpay', name: 'Razorpay', icon: Wallet, description: 'UPI, Cards, Wallets, Net Banking' });
    }
    if (paymentMethods.paypal?.enabled) {
      methods.push({ key: 'paypal', name: 'PayPal', icon: Globe, description: 'Pay with your PayPal account' });
    }
    return methods;
  };

  if (authLoading) return <CheckoutSkeleton />;

  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="mb-12 relative">
          <CheckCircle2 className="w-24 h-24 text-black" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-white rounded-full p-1"
          >
            <Sparkles className="w-6 h-6 text-black fill-black" />
          </motion.div>
        </div>
        <h1 className="text-[32px] md:text-[48px] font-black mb-4 uppercase tracking-tight" style={{ color: 'var(--store-text)' }}>Order Placed</h1>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-16 opacity-30">
          Order #{(orderId || '').slice(0, 8).toUpperCase()} received
        </p>
        <Button asChild className="h-20 px-12 text-white font-black text-[13px] uppercase tracking-[0.3em] transition-all hover:opacity-90 active:scale-[0.98] rounded-none" style={{ background: 'var(--primary)' }}>
          <Link href={storePath}>Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: 'var(--store-text)' }}>
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-[0.5px] border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-12 h-16 md:h-24 flex items-center justify-between">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : router.back()} 
            className="flex items-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline text-[11px] font-black uppercase tracking-[0.2em]">{step > 1 ? 'Back to Info' : 'Back to Cart'}</span>
          </button>
          
          <Link href={storePath} className="flex items-center gap-2">
            <span className="text-[14px] md:text-[18px] font-black uppercase tracking-[0.3em]">
              {merchant?.store_name || subdomain}
            </span>
          </Link>

          <div className="w-10 md:w-32 flex justify-end">
            <Shield className="w-5 h-5 opacity-20" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-12 py-12 md:py-24 lg:flex lg:gap-32">
        {/* Left: Forms */}
        <div className="flex-1 max-w-2xl">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-24">
              {/* Contact section */}
              <section>
                <div className="flex items-center gap-3 mb-12">
                  <span className="h-[0.5px] w-8" style={{ background: 'var(--primary)' }} />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Contact</h2>
                </div>
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Full Name</Label>
                      <input 
                        className={`w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none transition-colors ${formErrors.name ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`}
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Email Address</Label>
                      <input 
                        className={`w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none transition-colors ${formErrors.email ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Phone Number</Label>
                    <input 
                        className={`w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none transition-colors ${formErrors.phone ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </section>

              {/* Shipping section */}
              <section>
                <div className="flex items-center gap-3 mb-12">
                  <span className="h-[0.5px] w-8" style={{ background: 'var(--primary)' }} />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Shipping</h2>
                </div>
                <div className="space-y-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Street Address</Label>
                    <input 
                        className={`w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none transition-colors ${formErrors.address ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">City</Label>
                      <input 
                        className={`w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none transition-colors ${formErrors.city ? 'border-red-500' : 'border-gray-100 focus:border-black'}`}
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">ZIP / PIN Code</Label>
                      <input 
                        className="w-full bg-transparent border-b-[0.5px] py-4 text-[15px] font-black uppercase tracking-tight outline-none border-gray-100 focus:border-primary transition-colors"
                        value={formData.pincode}
                        onChange={e => setFormData({...formData, pincode: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Country</Label>
                    <div className="relative border-b border-gray-100">
                      <select 
                        className="w-full bg-transparent py-4 text-[15px] font-black uppercase tracking-tight outline-none appearance-none cursor-pointer"
                        value={formData.country}
                        onChange={e => setFormData({...formData, country: e.target.value})}
                      >
                        {availableCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </section>

              <button 
                onClick={handleContinueToSummary}
                className="w-full h-20 text-white font-black text-[13px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'var(--primary)' }}
              >
                Continue to Payment
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-24">
              <section>
                <div className="flex items-center gap-3 mb-12">
                  <span className="h-[0.5px] w-8" style={{ background: 'var(--primary)' }} />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Review</h2>
                </div>
                <div className="space-y-8">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex gap-8 border-b border-gray-50 pb-8 last:border-0">
                      <div className="w-20 md:w-24 aspect-[3/4] bg-gray-50 flex-shrink-0 relative border-[0.5px] border-gray-100 overflow-hidden">
                        {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-cover" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <p className="text-[15px] font-black uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em] mt-2">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-[16px] font-black">{formatCurrency((item.bargainedPrice || item.price) * item.quantity, merchant?.currency, merchant?.locale)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-12">
                  <span className="h-[0.5px] w-8" style={{ background: 'var(--primary)' }} />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30">Payment</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {getEnabledPaymentMethods().map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setSelectedPayment(method.key)}
                      className={`p-8 border-[0.5px] text-left transition-all ${selectedPayment === method.key ? 'text-white' : 'border-gray-100'}`}
                      style={selectedPayment === method.key ? { borderColor: 'var(--primary)', background: 'var(--primary)' } : undefined}
                    >
                      <p className="text-[12px] font-black uppercase tracking-[0.2em] mb-2">{method.name}</p>
                      <p className={`text-[10px] uppercase tracking-tighter leading-relaxed ${selectedPayment === method.key ? 'opacity-40' : 'text-gray-300'}`}>{method.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              <button 
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-20 text-white font-black text-[13px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-20"
                style={{ background: 'var(--primary)' }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {selectedPayment === 'cod' ? 'Complete Order' : selectedPayment === 'razorpay' ? `Pay ${formatCurrency(total, merchant?.currency, merchant?.locale)} via Razorpay` : selectedPayment === 'paypal' ? `Pay with PayPal` : `Pay ${formatCurrency(total, merchant?.currency, merchant?.locale)}`}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        {/* Right: Summary sticky */}
        <div className="hidden lg:block w-[450px]">
          <div className="sticky top-32 space-y-12">
            <div className="p-10 md:p-12 border-[0.5px] border-gray-100 bg-white">
              <h2 className="text-[12px] font-black uppercase tracking-[0.4em] mb-12 opacity-30">Summary</h2>
              <div className="space-y-6">
                <div className="flex justify-between text-[13px] font-black uppercase tracking-tight">
                  <span className="text-gray-200">Subtotal</span>
                  <span>{formatCurrency(subtotal, merchant?.currency, merchant?.locale)}</span>
                </div>
                {bargainSavings > 0 && (
                  <div className="flex justify-between text-[13px] font-black uppercase tracking-tight text-primary">
                    <span>Bargain Savings</span>
                    <span>-{formatCurrency(bargainSavings, merchant?.currency, merchant?.locale)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-black uppercase tracking-tight">
                  <span className="text-gray-200">Shipping</span>
                  <span className="text-primary">{shipping === 0 ? 'FREE' : formatCurrency(shipping, merchant?.currency, merchant?.locale)}</span>
                </div>
                {tax > 0 && !taxSettings.include_in_price && (
                  <div className="flex justify-between text-[13px] font-black uppercase tracking-tight">
                    <span className="text-gray-200">{taxName} ({taxRate}%)</span>
                    <span>{formatCurrency(tax, merchant?.currency, merchant?.locale)}</span>
                  </div>
                )}
                {tax > 0 && taxSettings.include_in_price && (
                  <div className="flex justify-between text-[13px] font-black uppercase tracking-tight text-emerald-600">
                    <span className="text-gray-400">Includes {taxName}</span>
                    <span>{formatCurrency(tax, merchant?.currency, merchant?.locale)}</span>
                  </div>
                )}
                <div className="pt-8 border-t border-gray-50 flex justify-between items-baseline">
                  <span className="text-[20px] font-black uppercase tracking-tight">Total</span>
                  <span className="text-[32px] font-black">{formatCurrency(total, merchant?.currency, merchant?.locale)}</span>
                </div>
                {taxSettings.enabled && (
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.1em] mt-4">
                    {taxSettings.include_in_price 
                      ? `All prices include ${taxName} at ${taxRate}%`
                      : `${taxName} calculated at ${taxRate}% for ${availableCountries.find(c => c.code === formData.country)?.name || formData.country}`
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="p-10 md:p-12 border-[0.5px] border-gray-100">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-30">Shipping To</h3>
              <p className="text-[13px] font-black uppercase tracking-tight leading-loose">
                {formData.name}<br />
                {formData.address}<br />
                {formData.city}, {formData.pincode}<br />
                {availableCountries.find(c => c.code === formData.country)?.name}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    }>
      <CheckoutContent subdomain={resolvedParams.subdomain} />
    </Suspense>
  );
}
