"use client"

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Loader2,
  Trash2,
  Edit2,
  Image as ImageIcon,
  ChevronRight,
  Layers
} from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: ''
  });
  const [saving, setSaving] = useState(false);
  const { merchant } = useMerchant();

  useEffect(() => {
    if (merchant?.id) {
      fetchCollections();
    }
  }, [merchant?.id]);

  const fetchCollections = async () => {
    setLoading(true);
    const response = await fetch('/api/merchant/collections', {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      setCollections([]);
    } else {
      setCollections(data.items || []);
    }
    setLoading(false);
  };

  const handleAddCollection = async () => {
    if (!merchant || !newCollection.name) return;
    setSaving(true);

    const response = await fetch('/api/merchant/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newCollection),
    });

    if (response.ok) {
      setIsAddOpen(false);
      setNewCollection({ name: '', slug: '', description: '', image_url: '' });
      fetchCollections();
      toast.success('Collection curated');
    } else {
      toast.error('Failed to curate collection');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      const response = await fetch(`/api/merchant/collections?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchCollections();
        toast.success('Collection deleted');
      } else {
        toast.error('Failed to delete');
      }
    }
  };

  const filteredCollections = collections.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-desc">Curate grouped product experiences for themes, launches, and edits.</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="h-9 rounded-md px-4"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Collection
        </Button>
      </header>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative group max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input 
            placeholder="Search curations..." 
            className="pl-10 h-9 bg-background border-border rounded-md focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Syncing curations...</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="py-32 text-center">
          <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
            <Layers className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-bold text-lg">No collections curated</p>
          <p className="text-muted-foreground text-sm mt-2">Curate groups of products for seasonal launches or themes.</p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-8 h-9 px-4 rounded-md">Create Collection</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCollections.map((collection) => (
            <Card key={collection.id} className="group bg-card border-border rounded-xl overflow-hidden transition-colors duration-300 shadow-sm">
              <div className="aspect-[2/1] relative overflow-hidden bg-muted/40">
                {collection.image_url ? (
                  <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-background/90 text-foreground border-border text-[11px] px-2 py-0.5 rounded-full">
                      {collection.product_collections?.[0]?.count || 0} Assets
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-white transition-colors">{collection.name}</h3>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                    {collection.description || 'No strategy description provided for this collection.'}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem className="text-sm font-medium py-2 cursor-pointer gap-2 hover:bg-secondary/30">
                        <Edit2 className="w-3.5 h-3.5" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-sm font-medium py-2 cursor-pointer gap-2 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleDelete(collection.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-6 flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-50">/{collection.slug}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-white/5 bg-secondary/25">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">New Collection</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
              Curate a specialized product set for your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Curation Name</Label>
              <Input 
                placeholder="e.g. Summer Essentials" 
                value={newCollection.name}
                onChange={e => setNewCollection({...newCollection, name: e.target.value})}
                className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold text-lg"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Hero Asset</Label>
              <div className="border border-dashed border-border rounded-2xl p-2 bg-secondary/20 hover:bg-white/[0.08] transition-all">
                <ImageUpload 
                  value={newCollection.image_url}
                  onChange={(url) => setNewCollection({...newCollection, image_url: url})}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Strategic Description</Label>
              <textarea 
                className="flex min-h-[100px] w-full rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 placeholder:text-muted-foreground/30 transition-all"
                value={newCollection.description}
                onChange={e => setNewCollection({...newCollection, description: e.target.value})}
                placeholder="Describe the objective of this curation..."
              />
            </div>
          </div>
          <DialogFooter className="p-8 bg-secondary/25 border-t border-white/5 flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-12 px-6 font-bold hover:bg-secondary/30">Abort</Button>
            <Button 
              onClick={handleAddCollection} 
              disabled={saving} 
              className="h-12 bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-8 font-bold shadow-lg shadow-purple-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deploy Curation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
