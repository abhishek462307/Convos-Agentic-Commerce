"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Loader2,
  Save,
  MapPin,
  Building2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  is_active: boolean;
  is_default: boolean;
}

export default function LocationsSettingsPage() {
  const { merchant, loading: merchantLoading } = useMerchant();
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'US',
    pincode: '',
    is_default: false,
  });

  useEffect(() => {
    if (merchant?.id) {
      fetchLocations();
    }
  }, [merchant]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/locations', {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load locations: ${errorText || response.statusText}`);
      }
      const data = await response.json();
      if (data.locations) {
        setLocations(data.locations);
      }
    } catch (err: any) {
      console.error('Failed to fetch locations:', err);
      toast.error(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/inventory/locations/${editingId}` : '/api/inventory/locations';
      const method = editingId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save location');
      }

      toast.success(editingId ? 'Location updated' : 'Location created');
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'US',
        pincode: '',
        is_default: false,
      });
      setEditingId(null);
      setShowAddForm(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const response = await fetch(`/api/inventory/locations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      toast.success('Location deleted');
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEdit = (location: InventoryLocation) => {
    setEditingId(location.id);
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || 'US',
      pincode: location.pincode || '',
      is_default: location.is_default,
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: 'US',
      pincode: '',
      is_default: false,
    });
    setShowAddForm(false);
  };

  if (merchantLoading || loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-5 pb-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/settings/shipping" className="group inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/85 transition-colors hover:text-foreground">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> 
          Back to Shipping Settings
        </Link>
      </div>

      <header className="page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/85 shadow-sm mb-4">
            <Building2 className="h-3.5 w-3.5" />
            Inventory Management
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Inventory Locations</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Manage your warehouse, retail stores, or fulfillment centers. Stock levels can be tracked per location.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 xl:justify-end">
          {!showAddForm && (
            <Button 
              onClick={() => setShowAddForm(true)}
              className="h-11 rounded-2xl px-6"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Location
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Locations List */}
        <div className="lg:col-span-2 space-y-4">
          {locations.length === 0 && !showAddForm && (
            <Card className="border-border/70">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No locations yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Add your first inventory location to track stock across multiple warehouses or stores.
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Location
                </Button>
              </CardContent>
            </Card>
          )}

          {locations.map((location) => (
            <Card 
              key={location.id} 
              className={`border-border/70 overflow-hidden transition-all ${location.is_default ? 'border-primary/50 bg-primary/5' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${location.is_default ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{location.name}</h3>
                        {location.is_default && (
                          <Badge variant="default" className="rounded-full text-[10px]">
                            <Check className="h-3 w-3 mr-1" /> Default
                          </Badge>
                        )}
                        {!location.is_active && (
                          <Badge variant="outline" className="rounded-full text-[10px]">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[location.address, location.city, location.state, location.country].filter(Boolean).join(', ')}
                      </p>
                      {location.pincode && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PIN: {location.pincode}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEdit(location)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(location.id)}
                      className="text-muted-foreground hover:text-red-500"
                      aria-label={`Delete ${location.name || 'location'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Form */}
        <div className="lg:col-span-1">
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="border-border/70 sticky top-6">
                  <CardHeader className="border-b border-border/70">
                    <CardTitle className="text-base">
                      {editingId ? 'Edit Location' : 'New Location'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Location Name *</Label>
                      <Input 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Main Warehouse"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Address</Label>
                      <Input 
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Business Street"
                        className="h-11"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">City</Label>
                        <Input 
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          placeholder="New York"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">State</Label>
                        <Input 
                          value={formData.state}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          placeholder="NY"
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">Country</Label>
                        <select 
                          value={formData.country}
                          onChange={e => setFormData({ ...formData, country: e.target.value })}
                          className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
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
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.14em]">PIN / ZIP</Label>
                        <Input 
                          value={formData.pincode}
                          onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                          placeholder="10001"
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl">
                      <div>
                        <Label className="text-sm font-medium">Default Location</Label>
                        <p className="text-xs text-muted-foreground">Use as primary fulfillment center</p>
                      </div>
                      <Switch 
                        checked={formData.is_default}
                        onCheckedChange={checked => setFormData({ ...formData, is_default: checked })}
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={cancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleSave}
                        disabled={saving || !formData.name.trim()}
                      >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {editingId ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {!showAddForm && (
            <Card className="border-border/70 bg-secondary/10">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">About Multi-location</h3>
                <p className="text-sm text-muted-foreground">
                  Track inventory across multiple warehouses, retail stores, or fulfillment centers. 
                  Each product can have stock distributed across locations.
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>• Default location is used for online orders</p>
                  <p>• Stock levels are tracked per location</p>
                  <p>• Transfer inventory between locations</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
