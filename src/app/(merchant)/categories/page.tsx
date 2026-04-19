"use client"

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Loader2,
  Trash2,
  Edit2,
  Layout,
  Tag,
  ChevronRight,
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    image_url: ''
  });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const { merchant } = useMerchant();

  useEffect(() => {
    if (merchant?.id) {
      fetchCategories();
    }
  }, [merchant?.id]);

  const fetchCategories = async () => {
    setLoading(true);
    const response = await fetch('/api/merchant/categories', {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok) setCategories(data.items || []);
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!merchant || !newCategory.name) return;
    setSaving(true);
    
    const response = await fetch('/api/merchant/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newCategory),
    });

    if (response.ok) {
      setIsAddOpen(false);
      setNewCategory({ name: '', slug: '', image_url: '' });
      fetchCategories();
      toast.success('Category created');
    } else {
      toast.error('Failed to create category');
    }
    setSaving(false);
  };

  const handleUpdateCategory = async () => {
    if (!merchant || !editingCategory) return;
    setSaving(true);

    const response = await fetch('/api/merchant/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(editingCategory),
    });

    if (response.ok) {
      setIsEditOpen(false);
      setEditingCategory(null);
      fetchCategories();
      toast.success('Category updated');
    } else {
      toast.error('Failed to update category');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will unassign this category from all products.')) {
      const response = await fetch(`/api/merchant/categories?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchCategories();
        toast.success('Category deleted');
      } else {
        toast.error('Failed to delete category');
      }
    }
  };

  const allFilteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(allFilteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = allFilteredCategories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-desc">Organize products into cleaner catalog groups and navigation paths.</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="h-9 rounded-md px-4"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </header>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative group max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input 
            placeholder="Search taxonomy..." 
            className="pl-10 h-9 bg-background border-border rounded-md focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Syncing taxonomy...</p>
        </div>
      ) : allFilteredCategories.length === 0 ? (
        <div className="py-32 text-center">
          <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
            <Layout className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-bold text-lg">No categories yet</p>
          <p className="text-muted-foreground text-sm mt-2">Structure your catalog with logical groupings.</p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-8 h-9 px-4 rounded-md">Create Category</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedCategories.map((category) => (
              <Card key={category.id} className="group bg-card border-border rounded-xl overflow-hidden transition-colors duration-300 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center overflow-hidden transition-all">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Tag className="w-6 h-6 text-muted-foreground transition-colors" />
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem 
                          className="text-sm font-medium py-2 cursor-pointer gap-2 hover:bg-secondary/30"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-sm font-medium py-2 cursor-pointer gap-2 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight transition-colors">{category.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-muted/40 text-[11px] px-2 py-0.5 rounded-full border-border">
                          {category.products?.[0]?.count || 0} Products
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono opacity-60">/{category.slug}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, allFilteredCategories.length)} of {allFilteredCategories.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
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
                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-white/5 bg-secondary/25">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">New Category</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
              Organize your products by type.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Identifier Name</Label>
              <Input 
                placeholder="e.g. Bedding" 
                value={newCategory.name}
                onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold text-lg"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">URL Slug (Optional)</Label>
              <Input 
                placeholder="bedding" 
                value={newCategory.slug}
                onChange={e => setNewCategory({...newCategory, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="h-11 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-mono text-sm"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Visual Asset</Label>
              <div className="border border-dashed border-border rounded-2xl p-2 bg-secondary/20 hover:bg-white/[0.08] transition-all">
                <ImageUpload 
                  value={newCategory.image_url}
                  onChange={(url) => setNewCategory({...newCategory, image_url: url})}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-secondary/25 border-t border-white/5 flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-12 px-6 font-bold hover:bg-secondary/30">Abort</Button>
            <Button 
              onClick={handleAddCategory} 
              disabled={saving} 
              className="h-12 bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-8 font-bold shadow-lg shadow-purple-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-white/5 bg-secondary/25">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">Edit Category</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-2">
              Update category details and assets.
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Identifier Name</Label>
                <Input 
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                  className="h-12 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-bold text-lg"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">URL Slug</Label>
                <Input 
                  value={editingCategory.slug}
                  onChange={e => setEditingCategory({...editingCategory, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  className="h-11 bg-secondary/20 border-border focus:ring-1 focus:ring-purple-500 font-mono text-sm"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Visual Asset</Label>
                <div className="border border-dashed border-border rounded-2xl p-2 bg-secondary/20 hover:bg-white/[0.08] transition-all">
                  <ImageUpload 
                    value={editingCategory.image_url}
                    onChange={(url) => setEditingCategory({...editingCategory, image_url: url})}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-8 bg-secondary/25 border-t border-white/5 flex items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="h-12 px-6 font-bold hover:bg-secondary/30">Abort</Button>
            <Button 
              onClick={handleUpdateCategory} 
              disabled={saving} 
              className="h-12 bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-8 font-bold shadow-lg shadow-purple-500/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
