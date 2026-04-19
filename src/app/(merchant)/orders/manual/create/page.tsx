"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Loader2,
  Save,
  ShoppingBag,
  Search,
  Mail,
  User,
  Package} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number | null;
  image_url?: string;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    stock_quantity: number | null;
  }>;
}

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
}

export default function CreateManualOrderPage() {
  const router = useRouter();
  const { merchant, loading: merchantLoading } = useMerchant();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<NonNullable<Product['variants']>[0] | null>(null);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'US',
  });
  
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [status, setStatus] = useState<'draft' | 'pending'>('pending');

  useEffect(() => {
    if (merchant?.id) {
      fetchProducts();
    }
  }, [merchant?.id]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/merchant/products?merchantId=${merchant?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch products: HTTP ${response.status}`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    if (!selectedProduct) return;
    
    const item: OrderItem = {
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedVariant?.price ?? selectedProduct.price,
      quantity: 1,
      variant_id: selectedVariant?.id,
      variant_name: selectedVariant?.name,
    };
    
    setItems([...items, item]);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setShowProductPicker(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map((item, i) => 
      i === index ? { ...item, quantity } : item
    ));
  };

  const updateItemPrice = (index: number, price: number) => {
    if (price < 0) return;
    setItems(items.map((item, i) => 
      i === index ? { ...item, price } : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal + shippingAmount + taxAmount - discountAmount);

  const handleSave = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast.error('Customer name and email are required');
      return;
    }
    
    if (items.length === 0) {
      toast.error('At least one item is required');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerInfo,
          items,
          shippingAmount,
          taxAmount,
          discountAmount,
          notes,
          status,
          sendEmail,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      toast.success(`Order ${data.order.orderNumber} created successfully`);
      router.push('/orders');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  if (merchantLoading) {
    return <MerchantPageSkeleton />;
  }

  const currencySymbol = merchant?.currency === 'INR' ? '₹' : merchant?.currency === 'EUR' ? '€' : merchant?.currency === 'GBP' ? '£' : '$';

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/orders" className="group inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85 transition-colors hover:text-foreground">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> 
          Back to Orders
        </Link>
      </div>

      <header className="page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm mb-4">
            <ShoppingBag className="h-3.5 w-3.5" />
            Manual Order
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Create Order</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Create a manual order for phone, email, or in-person sales. Payment can be collected later via payment link.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">Save as</span>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'pending')}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-xs font-semibold"
            >
              <option value="pending">Pending Order</option>
              <option value="draft">Draft (No inventory deducted)</option>
            </select>
          </div>
          <Button 
            variant="outline" 
            className="h-11 rounded-2xl border-border/70 px-6"
            onClick={() => router.push('/orders')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="h-11 rounded-2xl px-7"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Create Order
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Customer Information */}
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Full Name *</Label>
                  <Input 
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Email *</Label>
                  <Input 
                    type="email"
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="john@example.com"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Phone</Label>
                  <Input 
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="+1 234 567 890"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Country</Label>
                  <select 
                    value={customerInfo.country}
                    onChange={e => setCustomerInfo({ ...customerInfo, country: e.target.value })}
                    className="h-12 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IN">India</option>
                    <option value="AU">Australia</option>
                    <option value="JP">Japan</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">UAE</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Street Address</Label>
                <Input 
                  value={customerInfo.address}
                  onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  placeholder="123 Main Street, Apt 4B"
                  className="h-12"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">City</Label>
                  <Input 
                    value={customerInfo.city}
                    onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                    placeholder="New York"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">State / Province</Label>
                  <Input 
                    value={customerInfo.state}
                    onChange={e => setCustomerInfo({ ...customerInfo, state: e.target.value })}
                    placeholder="NY"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">ZIP / PIN Code</Label>
                  <Input 
                    value={customerInfo.pincode}
                    onChange={e => setCustomerInfo({ ...customerInfo, pincode: e.target.value })}
                    placeholder="10001"
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Order Items
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowProductPicker(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No items added yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowProductPicker(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add First Item
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 lg:p-6 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Qty:</span>
                          <Input 
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="h-9 w-20 text-center"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Price:</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{currencySymbol}</span>
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={e => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                              className="h-9 w-28 pl-7"
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="font-semibold">{formatCurrency(item.price * item.quantity, merchant?.currency, merchant?.locale)}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Order Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-6 lg:p-8">
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes about this order (not visible to customer)"
                className="w-full min-h-[100px] rounded-xl border border-border/70 bg-background p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4">
          <Card className="sticky top-6 overflow-hidden border-border/70">
            <CardHeader className="border-b border-border/70 bg-card px-5 py-4 lg:px-6">
              <CardTitle className="text-base font-semibold tracking-tight">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                  <span className="font-semibold">{formatCurrency(subtotal, merchant?.currency, merchant?.locale)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Shipping</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{currencySymbol}</span>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingAmount}
                      onChange={e => setShippingAmount(parseFloat(e.target.value) || 0)}
                      className="h-8 w-24 text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Tax</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{currencySymbol}</span>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxAmount}
                      onChange={e => setTaxAmount(parseFloat(e.target.value) || 0)}
                      className="h-8 w-24 text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">- {currencySymbol}</span>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="h-8 w-24 text-right"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-3xl font-bold">{formatCurrency(total, merchant?.currency, merchant?.locale)}</span>
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Send confirmation email</span>
                  </div>
                  <Switch 
                    checked={sendEmail} 
                    onCheckedChange={setSendEmail}
                  />
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> {status === 'draft' 
                      ? 'Draft orders do not deduct inventory. Convert to pending to reserve stock.' 
                      : 'This order will deduct inventory from your stock levels.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Picker Dialog */}
      <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            <div className="grid gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    if (!product.variants || product.variants.length === 0) {
                      setSelectedVariant(null);
                    }
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    selectedProduct?.id === product.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/70 hover:border-primary/50'
                  }`}
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(product.price, merchant?.currency, merchant?.locale)}
                      {product.stock_quantity !== null && ` • ${product.stock_quantity} in stock`}
                    </p>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </button>
              ))}
            </div>
            
            {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Select Variant</h4>
                <div className="grid gap-2">
                  {selectedProduct.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        selectedVariant?.id === variant.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border/70 hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(variant.price, merchant?.currency, merchant?.locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setShowProductPicker(false);
              setSelectedProduct(null);
              setSelectedVariant(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={!selectedProduct || ((selectedProduct.variants?.length ?? 0) > 0 && !selectedVariant)}
            >
              Add to Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
