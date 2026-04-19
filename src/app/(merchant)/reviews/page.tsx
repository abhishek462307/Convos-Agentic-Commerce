"use client"

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
    MessageSquare,
    Loader2,
    Clock,
    User,
    Package
  } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';

export default function ReviewsPage() {
  const { merchant } = useMerchant();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    avgRating: '0'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchReviews = useCallback(async () => {
    if (!merchant) return;
    setLoading(true);
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: ITEMS_PER_PAGE.toString(),
      status: filter,
    });
    if (search.trim()) {
      params.set('search', search.trim());
    }

    const res = await fetch(`/api/merchant/reviews?${params.toString()}`, {
      credentials: 'include',
    });
    const data = await res.json();
    setReviews(data.items || []);
    setStats({
      total: data.stats?.total || 0,
      pending: data.stats?.pending || 0,
      approved: data.stats?.approved || 0,
      avgRating: String(data.stats?.avgRating || '0')
    });
    setLoading(false);
  }, [filter, merchant, search, currentPage]);

  useEffect(() => {
    if (merchant) fetchReviews();
  }, [fetchReviews, merchant]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const totalPages = Math.ceil(stats.total / ITEMS_PER_PAGE);

  const handleApprove = async (id: string, approve: boolean) => {
    const res = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_approved: approve })
    });
    if (res.ok) {
      setReviews(reviews.map(r => r.id === id ? { ...r, is_approved: approve } : r));
      toast.success(approve ? 'Review approved' : 'Review unapproved');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setReviews(reviews.filter(r => r.id !== id));
      toast.success('Review deleted');
    }
  };

  const filteredReviews = reviews;

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Reviews</h1>
          <p className="page-desc">Moderate customer feedback and keep product sentiment visible.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard title="Total Reviews" value={stats.total.toString()} icon={MessageSquare} />
        <StatCard title="Pending" value={stats.pending.toString()} icon={Clock} color="text-purple-500" />
        <StatCard title="Approved" value={stats.approved.toString()} icon={CheckCircle} color="text-emerald-500" />
        <StatCard title="Avg. Rating" value={stats.avgRating} icon={Star} color="text-yellow-400" />
      </div>

      <Card className="border-border shadow-sm rounded-xl overflow-hidden bg-card">
        <CardHeader className="border-b border-border py-5 px-6 bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input 
                placeholder="Search feedback content..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-9 bg-background border-border text-sm focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="h-9 w-40 bg-background border-border text-sm font-medium rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-32 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm font-medium">Syncing feedback...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-32 text-center">
              <div className="w-16 h-16 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
                <Star className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-bold text-lg">No reviews found</p>
              <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredReviews.map(review => (
                <div key={review.id} className="p-6 hover:bg-muted/40 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center flex-wrap gap-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star 
                              key={s} 
                              className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground opacity-30'}`} 
                            />
                          ))}
                        </div>
                          <Badge variant="outline" className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          review.is_approved 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }`}>
                          {review.is_approved ? 'Approved' : 'Pending Review'}
                        </Badge>
                        {review.is_verified && (
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/40 text-muted-foreground">
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div>
                        {review.title && (
                          <h3 className="text-base font-bold text-foreground mb-1 tracking-tight">{review.title}</h3>
                        )}
                        {review.content && (
                          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{review.content}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-xs font-bold text-foreground">{review.customer_name || review.customer_email || 'Anonymous'}</span>
                        </div>
                        <span className="text-border text-xs">|</span>
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground transition-colors">{review.products?.name || 'Unknown Product'}</span>
                        </div>
                        <span className="text-border text-xs">|</span>
                        <span className="text-xs font-medium text-muted-foreground font-mono">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {review.is_approved ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(review.id, false)}
                          className="h-9 px-4 text-xs font-bold border-border hover:bg-accent hover:text-accent-foreground transition-all rounded-lg"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Unapprove
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(review.id, true)}
                          className="h-9 px-4 text-xs font-bold border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Approve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(review.id)}
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, stats.total)} of {stats.total}
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
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="border-border bg-background hover:border-white/20 transition-all group rounded-xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center bg-secondary/20">
            <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
      </CardContent>
    </Card>
  );
}
