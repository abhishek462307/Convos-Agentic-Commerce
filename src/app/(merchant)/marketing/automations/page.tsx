"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Zap, 
  Plus, 
  ArrowRight, 
  Mail, 
  MessageSquare, 
  ShoppingBag, 
  UserPlus, 
  Gift, 
  RefreshCcw,
  Settings2,
  TrendingUp,
  Target,
  MousePointer2,
  Bot,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useMerchant } from '@/hooks/use-merchant';
import { getMarketingAutomations, updateAutomationStatus, createMarketingAutomation } from '../actions';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

const iconMap: any = {
  cart_abandoned: ShoppingBag,
  new_subscriber: UserPlus,
  order_completed: Gift,
  reengagement: RefreshCcw,
  price_drop: TrendingUp,
  shipping_update: MessageSquare
};

export default function AutomationsPage() {
  const { merchant } = useMerchant();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
    const [newName, setNewName] = useState('');
    const [newTrigger, setNewTrigger] = useState('');
    const [newMessage, setNewMessage] = useState('');

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const data = await getMarketingAutomations(merchant.id);
      setAutomations(data);
    } catch (error) {
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      const newActive = currentStatus !== 'active';
      await updateAutomationStatus(id, newActive);
      toast.success(`Automation ${newActive ? 'enabled' : 'paused'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreate = async () => {
    if (!merchant || !newName || !newTrigger) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      await createMarketingAutomation({
        merchant_id: merchant.id,
        name: newName,
        trigger_type: newTrigger,
        status: 'active'
      });
      toast.success('Automation flow created');
      setIsCreateOpen(false);
      fetchData();
      // Reset form
      setNewName('');
      setNewTrigger('');
    } catch (error) {
      toast.error('Failed to create flow');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold border-border bg-secondary/20 text-yellow-500">Automations</Badge>
            <span className="text-xs font-medium text-muted-foreground">Agentic Flows</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Automations</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-all px-5 font-semibold">
            History
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-6 font-bold shadow-lg shadow-yellow-500/20">
                <Plus className="w-4 h-4 mr-2" /> Create Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-foreground">Create Automation Flow</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Set up a trigger-based marketing sequence.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Flow Name</Label>
                  <Input 
                    id="name" 
                    placeholder="VIP Welcome Sequence" 
                    className="bg-secondary/20 border-border h-10" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trigger" className="text-xs font-medium text-muted-foreground">Trigger Event</Label>
                  <Select onValueChange={setNewTrigger} value={newTrigger}>
                    <SelectTrigger className="bg-secondary/20 border-border h-10">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="cart_abandoned">Cart Abandoned</SelectItem>
                        <SelectItem value="new_subscriber">New Newsletter Subscriber</SelectItem>
                        <SelectItem value="order_completed">Order Completed</SelectItem>
                        <SelectItem value="reengagement">Inactive for 30 Days</SelectItem>
                        <SelectItem value="price_drop">Price Drop Alert</SelectItem>
                        <SelectItem value="shipping_update">Shipping Update</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">WhatsApp Message Template</Label>
                    <Textarea 
                        id="message" 
                        placeholder="Hey {{name}}, we noticed you left something in your cart!" 
                        className="bg-secondary/20 border-border min-h-[100px]" 
                        value={newMessage}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                      />
                    <p className="text-[10px] text-muted-foreground">Use {"{{name}}"} for customer name.</p>
                  </div>
                </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 border-border" disabled={isCreating}>Cancel</Button>
                <Button 
                  className="bg-yellow-500 hover:bg-yellow-400 text-black h-10 px-6 font-bold" 
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Start Automation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <StatCard title="Automated Revenue" value="$2,580" icon={TrendingUp} trend="+15.3%" trendColor="text-emerald-500" />
        <StatCard title="Avg. Conversion" value="11.8%" icon={Target} trend="+2.4%" trendColor="text-emerald-500" />
        <StatCard title="Active Flows" value={automations.filter(a => a.status === 'active').length.toString()} icon={Zap} trend="Stable" trendColor="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-12">
        {automations.map((flow, i) => {
          const Icon = iconMap[flow.trigger_type] || Zap;
          const isActive = flow.status === 'active';
          
          return (
            <motion.div
              key={flow.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`border border-border bg-background hover:border-white/20 transition-all group overflow-hidden ${!isActive ? 'opacity-70' : ''}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="p-8 flex-1">
                      <div className="flex items-start gap-6">
                        <div className={`w-14 h-14 rounded-2xl ${isActive ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-muted border-border'} border flex items-center justify-center shrink-0`}>
                          <Icon className={`w-7 h-7 ${isActive ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-foreground">{flow.name}</h3>
                            <Badge variant="outline" className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${isActive ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-muted-foreground border-border bg-secondary/20'}`}>
                              {isActive ? 'Running' : 'Paused'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mb-4">
                            Triggered by: <span className="font-bold uppercase tracking-tighter text-[10px] bg-secondary/20 px-2 py-0.5 rounded border border-border">{flow.trigger_type.replace(/_/g, ' ')}</span>
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-secondary/20 border border-border px-2 py-1 rounded-md">
                                <Mail className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
                              </div>
                              <div className="flex items-center gap-1 bg-secondary/20 border border-border px-2 py-1 rounded-md">
                                <MessageSquare className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">WhatsApp</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-secondary/25 border-l border-border md:w-80 p-8 flex flex-col justify-center space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                          <p className="text-lg font-bold">{flow.stats?.revenue || '$0'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Conv.</p>
                          <p className="text-lg font-bold">{flow.stats?.conversion || '0%'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={isActive} 
                            onCheckedChange={() => handleToggle(flow.id, flow.status)}
                          />
                          <span className="text-xs font-bold text-muted-foreground">{isActive ? 'Active' : 'Enable'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary/30">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-secondary/30">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border bg-background rounded-2xl overflow-hidden bg-grid-white/[0.02]">
          <CardContent className="p-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                <Bot className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-foreground">Autonomous Optimization</h3>
                  <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[9px] uppercase font-bold">Beta</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Let the AI agent automatically adjust send times, subject lines, and discount amounts based on real-time customer behavior to maximize recovery.
                </p>
                <Button className="bg-purple-500 hover:bg-purple-500/90 text-white rounded-lg px-6 font-bold shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-4 h-4 mr-2" /> Enable AI Pilot
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-background rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="px-8 py-6 border-b border-border bg-secondary/25">
            <CardTitle className="text-xs font-medium text-muted-foreground">Next Step Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-xl hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Upsell Flow</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Recommended for you</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all" />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/20 border border-border rounded-xl hover:border-white/20 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center group-hover:bg-purple-400/10 transition-colors">
                  <MousePointer2 className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">VIP Segment Alert</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Growth Opportunity</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendColor }: any) {
  return (
    <Card className="border border-border bg-background hover:border-white/20 transition-all group rounded-xl overflow-hidden shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="w-9 h-9 rounded-lg border border-border flex items-center justify-center bg-secondary/20 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all">
            <Icon className="w-4 h-4 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
          <div className={`flex items-center gap-1 ${trendColor} text-[11px] font-bold`}>
            {trend}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
