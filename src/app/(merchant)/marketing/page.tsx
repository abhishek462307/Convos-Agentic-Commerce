"use client"

import React, { useCallback, useEffect, useState } from 'react';
import { 
  Rocket, 
  Plus, 
  Mail, 
  MessageSquare, 
  Zap, 
  ArrowRight,
  BarChart3,
  TrendingUp,
  MousePointer2,
  Users,
  ChevronRight,
  Clock,
  Brain,
  Target,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMerchant } from '@/hooks/use-merchant';
import { getMarketingCampaigns, createMarketingCampaign, getMarketingSegments, getNewsletterSubscribers } from './actions';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

const channels = [
  {
    title: 'Campaigns',
    description: 'Create and manage multi-channel marketing campaigns.',
    icon: Rocket,
    href: '/marketing/campaigns',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'hover:border-purple-500/50'
  },
  {
    title: 'Email Marketing',
    description: 'Design and send newsletters to your customers.',
    icon: Mail,
    href: '/marketing/email',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'hover:border-purple-400/50'
  },
  {
    title: 'WhatsApp Marketing',
    description: 'Broadcast messages and automated alerts via WhatsApp.',
    icon: MessageSquare,
    href: '/marketing/whatsapp',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'hover:border-emerald-500/50'
  },
  {
    title: 'Automations',
    description: 'Set up abandoned cart recovery and welcome flows.',
    icon: Zap,
    href: '/marketing/automations',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'hover:border-yellow-500/50'
  },
  {
    title: 'Ad Attribution',
    description: 'Track conversion sources from Meta, Google, and more.',
    icon: Target,
    href: '/marketing/attribution',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'hover:border-blue-500/50'
  }
];

export default function MarketingPage() {
  const { merchant } = useMerchant();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newSegment, setNewSegment] = useState('');

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const [campaignsData, segmentsData, subscribersData] = await Promise.all([
        getMarketingCampaigns(merchant.id),
        getMarketingSegments(merchant.id),
        getNewsletterSubscribers(merchant.id)
      ]);
      setCampaigns(campaignsData);
      setSegments(segmentsData);
      setSubscribers(subscribersData);
    } catch (error) {
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

  const totalReach = campaigns.reduce((acc, c) => acc + (c.stats?.reach || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.stats?.revenue || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'running').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Marketing</h1>
          <p className="page-desc">Coordinate campaigns, channels, segments, and automated growth loops.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analytics">
            <Button variant="outline" className="h-9 border-border rounded-md hover:bg-muted/50 transition-colors px-4 font-medium">
              View Analytics
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create New Campaign</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Launch a new marketing initiative across your channels.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Campaign Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Summer Blast 2024" 
                    className="bg-secondary/20 border-border h-10" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel" className="text-xs font-medium text-muted-foreground">Primary Channel</Label>
                  <Select onValueChange={setNewChannel} value={newChannel}>
                    <SelectTrigger className="bg-secondary/20 border-border h-10">
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
                    <SelectTrigger className="bg-secondary/20 border-border h-10">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {segments.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.customer_count})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 border-border" disabled={isCreating}>Cancel</Button>
                <Button 
                  className="bg-purple-500 hover:bg-purple-500/90 h-10 px-6 font-bold" 
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard title="Total Audience" value={subscribers.length.toLocaleString()} icon={Users} trend="+12" trendColor="text-emerald-500" />
        <StatCard title="Total Reach" value={totalReach.toLocaleString()} icon={MousePointer2} trend="+0.8%" trendColor="text-emerald-500" />
        <StatCard title="Conv. Value" value={`$${totalRevenue.toLocaleString()}`} icon={TrendingUp} trend="+12.1%" trendColor="text-emerald-500" trendUp={true} />
        <StatCard title="Active Campaigns" value={activeCampaigns.toString()} icon={Target} trend="Live" trendColor="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {channels.map((channel, i) => (
          <motion.div
            key={channel.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={channel.href}>
              <Card className={`group h-full border border-border bg-background transition-all ${channel.borderColor} cursor-pointer`}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-xl ${channel.bgColor} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                      <channel.icon className={`w-6 h-6 ${channel.color}`} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Explore <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{channel.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{channel.description}</p>
                  
                  <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <span className="text-sm font-bold">
                          {campaigns.filter(c => c.type === (channel.title.toLowerCase().includes('email') ? 'email' : channel.title.toLowerCase().includes('whatsapp') ? 'whatsapp' : channel.title.toLowerCase().includes('automations') ? 'automation' : '')).length} Flows
                        </span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Performance</span>
                        <span className="text-sm font-bold text-emerald-500">Good</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-border bg-background rounded-xl overflow-hidden shadow-xl shadow-purple-500/5">
          <CardHeader className="px-8 py-6 border-b border-border bg-secondary/25 flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xs font-medium">Live Intent Stream</CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium">Real-time autonomous marketing missions</p>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase font-bold text-purple-500 border-purple-500/20 bg-purple-500/10 animate-pulse">Scanning...</Badge>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {campaigns.slice(0, 3).map((campaign, i) => (
                <motion.div 
                  key={campaign.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col p-5 bg-white/[0.03] border border-border rounded-xl hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shadow-inner">
                        {campaign.type === 'email' ? <Mail className="w-5 h-5 text-purple-400" /> : campaign.type === 'whatsapp' ? <MessageSquare className="w-5 h-5 text-emerald-500" /> : <Zap className="w-5 h-5 text-yellow-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{campaign.type}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[9px] text-purple-500 font-bold uppercase tracking-widest">AI Optimization Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{campaign.stats?.conversion || 0}% Conv.</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 uppercase font-bold tracking-widest">${campaign.stats?.revenue || 0} ROI</p>
                    </div>
                  </div>
                  <div className="pl-14">
                    <div className="flex items-start gap-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 border-dashed">
                      <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        "Autonomous optimization active for target segment: {campaign.segment?.name || 'Global'}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {campaigns.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm font-medium border border-dashed border-border rounded-xl">
                  Launch a campaign to see the AI Intent Stream in action.
                </div>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground hover:text-purple-500 transition-colors">
              Open Comprehensive Intent Stream <ChevronRight className="w-3 h-3 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-background rounded-xl overflow-hidden">
          <CardHeader className="px-8 py-6 border-b border-border bg-secondary/25">
            <CardTitle className="text-xs font-medium">Growth Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">AI Suggestion</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Your WhatsApp messages have <span className="text-emerald-500 font-bold">3.2x higher</span> open rates than email. Move your recovery flows to WhatsApp.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-medium text-muted-foreground">Upcoming Opportunities</h4>
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-purple-500/10 transition-colors">
                    <Clock className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Valentine's Day Sale</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Recommended start: Feb 1st</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-purple-400/10 transition-colors">
                    <BarChart3 className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">VIP Segment Growth</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{segments.length} segments active</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendColor, trendUp = true }: any) {
  return (
    <Card className="border border-border bg-background hover:border-white/20 transition-all group rounded-xl overflow-hidden shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center bg-secondary/20 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-all">
            <Icon className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
          <div className={`flex items-center gap-1 ${trendColor} text-[11px] font-bold`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : null}
            {trend}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
