"use client"

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Rocket, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  MessageSquare, 
  BarChart3,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Users,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useMerchant } from '@/hooks/use-merchant';
import { getMarketingCampaigns, createMarketingCampaign, getMarketingSegments } from '../actions';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function CampaignsPage() {
  const { merchant } = useMerchant();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Derived Summary Stats
  const summaryStats = useMemo(() => {
    const totalReach = campaigns.reduce((acc, c) => acc + (Number(c.stats?.reach) || 0), 0);
    const totalRevenue = campaigns.reduce((acc, c) => acc + (Number(c.stats?.revenue) || 0), 0);
    
    // Simple ROI calculation: (Total Revenue / (Assumed Cost per reach))
    // For demo, assuming $0.05 cost per reach if real spend is not available
    const estimatedCost = totalReach * 0.05 || 1;
    const activeROI = totalRevenue / estimatedCost;

    return {
      reach: totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}k` : totalReach,
      revenue: totalRevenue,
      roi: activeROI.toFixed(1) + 'x'
    };
  }, [campaigns]);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newSegment, setNewSegment] = useState('');

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const [campaignsData, segmentsData] = await Promise.all([
        getMarketingCampaigns(merchant.id),
        getMarketingSegments(merchant.id)
      ]);
      setCampaigns(campaignsData);
      setSegments(segmentsData);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!merchant || !newName || !newChannel || !newSegment) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      await createMarketingCampaign({
        merchant_id: merchant.id,
        name: newName,
        type: newChannel,
        segment_id: newSegment,
        status: 'scheduled',
        stats: { reach: 0, conversion: 0, revenue: 0 }
      });
      toast.success('Campaign created successfully');
      setIsCreateOpen(false);
      fetchData();
      // Reset form
      setNewName('');
      setNewChannel('');
      setNewSegment('');
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Marketing Campaigns</h1>
          <p className="page-desc">Plan, launch, and monitor multi-channel campaigns from one place.</p>
        </div>
          <div className="flex items-center gap-3">
            <Link href="/marketing/segments">
              <Button variant="outline" className="h-9 rounded-md px-4 font-medium">
                Segments
              </Button>
            </Link>
            <Button variant="outline" className="h-9 rounded-md px-4 font-medium">
              Archive
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>

            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-popover border-border">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Launch a new marketing initiative across your channels.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Campaign Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Summer Blast 2024" 
                    className="bg-background border-border h-10" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel" className="text-xs font-medium text-muted-foreground">Primary Channel</Label>
                  <Select onValueChange={setNewChannel} value={newChannel}>
                    <SelectTrigger className="bg-background border-border h-10">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="email">Email Marketing</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Broadcast</SelectItem>
                      <SelectItem value="multi">Multi-channel Flow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="segment" className="text-xs font-medium text-muted-foreground">Target Segment</Label>
                  <Select onValueChange={setNewSegment} value={newSegment}>
                    <SelectTrigger className="bg-background border-border h-10">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {segments.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.customer_count})</SelectItem>
                      ))}
                      {segments.length === 0 && (
                        <SelectItem value="none" disabled>No segments found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-9 rounded-md" disabled={isCreating}>Cancel</Button>
                <Button 
                  className="h-9 rounded-md px-4 font-medium" 
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <Card className="rounded-xl border border-border bg-card">
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Active ROI</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{summaryStats.roi}</p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Across all live campaigns
            </Badge>
          </div>
        </Card>
        <Card className="rounded-xl border border-border bg-card">
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Reach</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{summaryStats.reach}</p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Unique customers reached
            </Badge>
          </div>
        </Card>
        <Card className="rounded-xl border border-border bg-card">
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Attributed Sales</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: merchant?.currency || 'USD' 
              }).format(summaryStats.revenue)}
            </p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Total campaign revenue
            </Badge>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight">All Campaigns</h2>
            <div className="flex items-center gap-2">
              <Badge className="bg-secondary text-foreground border-border">All</Badge>
              <Badge variant="outline" className="border-border hover:bg-secondary/30 cursor-pointer">Email</Badge>
              <Badge variant="outline" className="border-border hover:bg-secondary/30 cursor-pointer">WhatsApp</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search campaigns..." className="pl-9 h-9 w-64 bg-background border-border rounded-md" />
            </div>
            <Button variant="outline" className="h-9 rounded-md">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Campaign</th>
                <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Channel</th>
                <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Reach</th>
                <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Performance</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign, i) => (
                <motion.tr 
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {campaign.segment?.name || 'All Audience'} • {new Date(campaign.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {campaign.type?.toLowerCase().includes('email') ? (
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : campaign.type?.toLowerCase().includes('whatsapp') ? (
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Rocket className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground capitalize">{campaign.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        campaign.status === 'active' || campaign.status === 'running' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        campaign.status === 'scheduled' ? 'border-border bg-muted text-foreground' :
                        'border-border bg-muted text-muted-foreground'
                      }`}
                    >
                      {campaign.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-foreground">{campaign.stats?.reach || 0}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs font-semibold">{campaign.stats?.conversion || 0}%</p>
                        <p className="text-[11px] text-muted-foreground">Conv.</p>
                      </div>
                      <div className="w-px h-6 bg-border" />
                      <div>
                        <p className="text-xs font-semibold">${campaign.stats?.revenue || 0}</p>
                        <p className="text-[11px] text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all">
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-popover border-border p-1">
                          <DropdownMenuItem className="text-sm rounded-md cursor-pointer">View Report</DropdownMenuItem>
                          <DropdownMenuItem className="text-sm rounded-md cursor-pointer">Edit Campaign</DropdownMenuItem>
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem className="text-sm rounded-md cursor-pointer">Duplicate</DropdownMenuItem>
                          <DropdownMenuItem className="text-sm rounded-md text-red-600 focus:text-red-600 cursor-pointer">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm font-medium">
                    No campaigns found. Create your first campaign to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
