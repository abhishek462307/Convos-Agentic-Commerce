"use client"

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Send, 
  CheckCheck,
  Smartphone,
  BarChart3,
  Clock,
  ShieldCheck,
  Zap,
  Bot,
  Loader2,
  Sparkles,
  Edit2,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useMerchant } from '@/hooks/use-merchant';
import { 
  getWhatsAppCampaigns, 
  createWhatsAppBroadcast,
  updateWhatsAppBroadcast,
  deleteWhatsAppBroadcast,
  getMarketingSegments, 
    sendWhatsAppBroadcastAction,
    getWhatsAppStats,
    sendWhatsAppTestMessage
  } from '../actions';

import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function WhatsAppMarketingPage() {
  const { merchant } = useMerchant();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeContacts: 0,
    readRate: '0.0',
    activeInquiries: 0,
    totalReplied: 0
  });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Form State
  const [newName, setNewName] = useState('');
  const [newSegment, setNewSegment] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Quick Send State
  const [quickPhone, setQuickPhone] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [isSendingQuick, setIsSendingQuick] = useState(false);

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSegment, setEditSegment] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const [campaignsData, segmentsData, statsData] = await Promise.all([
        getWhatsAppCampaigns(merchant.id),
        getMarketingSegments(merchant.id),
        getWhatsAppStats(merchant.id)
      ]);
      setBroadcasts(campaignsData);
      setSegments(segmentsData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load WhatsApp data');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!merchant || !newName || !newSegment || !newMessage) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      await createWhatsAppBroadcast({
        merchant_id: merchant.id,
        name: newName,
        segment_id: newSegment,
        message_template: newMessage,
        status: 'scheduled',
        stats: { sent: 0, read: 0, replied: 0 }
      });
      toast.success('Broadcast scheduled successfully');
      setIsCreateOpen(false);
      fetchData();
      // Reset form
      setNewName('');
      setNewSegment('');
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to schedule broadcast');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone || !newMessage) {
      toast.error('Please enter a phone number and message');
      return;
    }
    setIsSendingTest(true);
    try {
      const result = await sendWhatsAppTestMessage(testPhone, newMessage, merchant!.id);
      if (result?.isLive) {
        toast.success('Test message sent via WhatsApp');
      } else {
        toast.warning('WhatsApp not connected. Message logged only. Connect in Settings to send real messages.');
      }
    } catch {
      toast.error('Failed to send test message');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!merchant) return;
    setIsSending(id);
    try {
      const result = await sendWhatsAppBroadcastAction(id, merchant.id);
      if (result.isLive) {
        toast.success(`Broadcast sent to ${result.sentCount} recipients via WhatsApp`);
      } else {
        toast.success(`Broadcast processed (${result.sentCount} recipients). Connect WhatsApp in Settings to send real messages.`);
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start broadcast');
    } finally {
      setIsSending(null);
    }
  };

  const handleQuickSend = async () => {
    if (!quickPhone || !quickMessage) {
      toast.error('Please enter phone number and message');
      return;
    }
    
    // Basic phone validation
    const cleanPhone = quickPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSendingQuick(true);
    try {
      const result = await sendWhatsAppTestMessage(cleanPhone, quickMessage, merchant!.id);
      if (result?.isLive) {
        toast.success(`Message sent to ${cleanPhone}`);
      } else {
        toast.warning('WhatsApp not connected. Message logged only. Connect in Settings to send real messages.');
      }
      setQuickPhone('');
      setQuickMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSendingQuick(false);
    }
  };

  // AI Generate Broadcast from natural language
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to send');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp',
          merchantId: merchant?.id,
          campaignName: aiPrompt,
          tone: 'casual'
        })
      });

      const result = await response.json();
      
      if (result.success && result.content) {
        // Extract a short name from the prompt
        const words = aiPrompt.split(' ').slice(0, 4).join(' ');
        const generatedName = words.length > 30 ? words.substring(0, 30) + '...' : words;
        
        setNewName(generatedName.charAt(0).toUpperCase() + generatedName.slice(1));
        setNewMessage(result.content.message || aiPrompt);
        setAiPrompt('');
        toast.success('AI generated your broadcast content!');
      } else {
        toast.error('Failed to generate content');
      }
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit broadcast
  const openEditDialog = (broadcast: any) => {
    setEditingBroadcast(broadcast);
    setEditName(broadcast.name || '');
    setEditSegment(broadcast.segment_id || '');
    setEditMessage(broadcast.message_template || broadcast.message || '');
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingBroadcast || !editName || !editMessage) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsUpdating(true);
    try {
      await updateWhatsAppBroadcast(editingBroadcast.id, {
        name: editName,
        segment_id: editSegment,
        message_template: editMessage
      });
      toast.success('Broadcast updated');
      setIsEditOpen(false);
      setEditingBroadcast(null);
      fetchData();
    } catch {
      toast.error('Failed to update broadcast');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    
    try {
      await deleteWhatsAppBroadcast(broadcastId);
      toast.success('Broadcast deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete broadcast');
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => {
    if (activeTab === 'all') return true;
    if (activeTab === 'sent') return b.status === 'delivered' || b.status === 'completed';
    if (activeTab === 'scheduled') return b.status === 'scheduled';
    return true;
  });

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">WhatsApp Marketing</h1>
          <p className="page-desc">Run broadcasts, track replies, and manage conversational outreach.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/whatsapp">
            <Button variant="outline" className="h-9 rounded-md px-4 font-medium">
              Channel Settings
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" /> New Broadcast
              </Button>
            </DialogTrigger>
              <DialogContent className="bg-popover border-border sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>New WhatsApp Broadcast</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Describe your broadcast in plain language or fill in manually.
                  </DialogDescription>
                </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* AI Generation Section */}
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-xs font-medium text-muted-foreground">AI Generate</Label>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Describe what you want to send in simple words, and AI will create the broadcast for you.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. Tell customers about our 50% off weekend sale"
                          className="h-10 flex-1 bg-background border-border text-sm"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
                        />
                        <Button
                          variant="outline"
                          className="h-10 px-4"
                          onClick={handleAIGenerate}
                          disabled={isGenerating || !aiPrompt.trim()}
                        >
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-popover px-2 text-muted-foreground">Or fill manually</span>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Broadcast Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Weekend Flash Sale" 
                        className="bg-background border-border h-10" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                  <div className="grid gap-2">
                    <Label htmlFor="segment" className="text-xs font-medium text-muted-foreground">Target Audience</Label>
                    <Select onValueChange={setNewSegment} value={newSegment}>
                      <SelectTrigger className="bg-background border-border h-10">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {segments.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.customer_count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message" className="text-xs font-medium text-muted-foreground">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Hey! Check out our new collection..." 
                      className="bg-background border-border min-h-[120px]" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Label className="mb-2 block text-xs font-medium text-muted-foreground">Test this message</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Phone number (e.g. +1234567890)" 
                        className="bg-background border-border h-9 text-sm"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 rounded-md"
                        onClick={handleSendTest}
                        disabled={isSendingTest}
                      >
                        {isSendingTest ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                        Test
                      </Button>
                    </div>
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
                  Schedule Broadcast
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Active Contacts" value={stats.activeContacts.toLocaleString()} icon={Smartphone} trend="+84 this week" trendColor="text-emerald-500" />
        <StatCard title="Read Rate" value={`${stats.readRate}%`} icon={CheckCheck} trend="+2.1%" trendColor="text-emerald-500" />
        <StatCard title="Conv. via WhatsApp" value={`$${stats.totalReplied * 15}`} icon={Zap} trend="+18.4%" trendColor="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold tracking-tight">Broadcast History</h2>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-border bg-muted/30 p-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      onClick={() => setActiveTab('all')}
                    >
                      All
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'sent' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      onClick={() => setActiveTab('sent')}
                    >
                      Sent
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${activeTab === 'scheduled' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                      onClick={() => setActiveTab('scheduled')}
                    >
                      Scheduled
                    </Button>
                  </div>
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-9 h-9 w-32 bg-background border-border rounded-md text-sm transition-all focus:w-48" />
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-xl bg-background overflow-hidden">
                <div className="divide-y divide-border">
                  {filteredBroadcasts.map((broadcast) => (

                  <div key={broadcast.id} className="group flex flex-col justify-between p-6 transition-colors hover:bg-muted/40 cursor-pointer sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 shrink-0">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{broadcast.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(broadcast.created_at).toLocaleDateString()}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-muted-foreground">{broadcast.segment?.name || 'All Audience'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-8">
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-semibold">{broadcast.stats?.read || 0}%</p>
                          <p className="text-[11px] text-muted-foreground">Read</p>
                        </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold">{broadcast.stats?.replied || 0}</p>
                            <p className="text-[11px] text-muted-foreground">Replies</p>
                          </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          broadcast.status === 'delivered' || broadcast.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' :
                          broadcast.status === 'scheduled' ? 'border-border bg-muted text-foreground' :
                          'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {broadcast.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-popover border-border p-1">
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer flex items-center gap-2"
                                onClick={() => {
                                  setSelectedBroadcast(broadcast);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> View Detailed Stats
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer flex items-center gap-2"
                                onClick={() => openEditDialog(broadcast)}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Broadcast
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer flex items-center gap-2"
                                onClick={() => handleSendNow(broadcast.id)}
                                disabled={isSending === broadcast.id || broadcast.status === 'delivered'}
                              >
                                <Send className={`w-3.5 h-3.5 ${isSending === broadcast.id ? 'animate-pulse' : ''}`} /> 
                                {isSending === broadcast.id ? 'Sending...' : 'Send Now'}
                              </DropdownMenuItem>
                            <div className="h-px bg-border my-1" />
                            <DropdownMenuItem 
                              className="text-sm rounded-md text-red-600 focus:text-red-600 cursor-pointer flex items-center gap-2"
                              onClick={() => handleDelete(broadcast.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Broadcast
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                {broadcasts.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground text-sm font-medium">
                    No broadcasts yet. Reach out to your customers on WhatsApp.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Quick Send Card */}
          <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <CardHeader className="px-6 pt-6 pb-2 border-b border-border bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Send className="w-3 h-3" /> Quick Send
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">Send a message to any phone number instantly.</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone Number</Label>
                  <Input
                    placeholder="+1234567890"
                    className="bg-background border-border h-10 text-sm"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</Label>
                  <Textarea
                    placeholder="Hey! Just wanted to reach out..."
                    className="bg-background border-border min-h-[100px] text-sm resize-none"
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full h-10 rounded-md font-medium"
                  onClick={handleQuickSend}
                  disabled={isSendingQuick || !quickPhone || !quickMessage}
                >
                  {isSendingQuick ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <CardHeader className="px-6 pt-6 pb-2 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Sales Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-4 items-start mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Auto-replies are active</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">The AI agent is currently handling <span className="font-semibold text-foreground">{stats.activeInquiries} active</span> inquiries from your latest broadcast.</p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-10 rounded-md">
                Edit Agent Persona
              </Button>
            </CardContent>
          </Card>

            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Templates & Tools</h2>
              <div className="grid grid-cols-1 gap-3">
                <ToolCard 
                  title="Abandoned Cart" 
                  description="Send a reminder via WhatsApp" 
                  icon={Clock} 
                  active={true}
                  href="/marketing/automations"
                />
                <ToolCard 
                  title="Price Drop Alert" 
                  description="Notify customers when prices fall" 
                  icon={Zap} 
                  active={false}
                  href="/marketing/automations"
                />
                <ToolCard 
                  title="Shipping Updates" 
                  description="Automated tracking numbers" 
                  icon={ShieldCheck} 
                  active={true}
                  href="/marketing/automations"
                />
              </div>
            </div>

        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Broadcast Details</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              View stats and message for this broadcast.
            </DialogDescription>
          </DialogHeader>
          {selectedBroadcast && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="mb-1 text-xs text-muted-foreground">Sent</p>
                  <p className="text-xl font-semibold">{selectedBroadcast.sent_count || 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="mb-1 text-xs text-muted-foreground">Read</p>
                  <p className="text-xl font-semibold">{selectedBroadcast.stats?.read || 0}%</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="mb-1 text-xs text-muted-foreground">Replies</p>
                  <p className="text-xl font-semibold">{selectedBroadcast.stats?.replied || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Message Template</Label>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedBroadcast.message_template}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Target Audience</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {selectedBroadcast.segment?.name || 'All Audience'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="h-9 rounded-md">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Broadcast Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-popover border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Broadcast</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Update the broadcast details before sending.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Broadcast Name</Label>
                <Input 
                  placeholder="Weekend Flash Sale" 
                  className="bg-background border-border h-10" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Target Segment</Label>
                <Select onValueChange={setEditSegment} value={editSegment}>
                  <SelectTrigger className="bg-background border-border h-10">
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {segments.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.customer_count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Message</Label>
                <Textarea 
                  placeholder="Hey {{name}}, check out our latest deals!" 
                  className="bg-background border-border min-h-[120px]" 
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use {"{{name}}"} to personalize with customer name</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="h-9 rounded-md" disabled={isUpdating}>Cancel</Button>
              <Button 
                className="h-9 rounded-md px-4 font-medium"
                onClick={handleUpdate}
                disabled={isUpdating || !editName || !editMessage}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

function StatCard({ title, value, icon: Icon, trend, trendColor }: any) {
  return (
    <Card className="rounded-xl border border-border bg-card overflow-hidden">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{value}</h2>
        <Badge variant="secondary" className={`mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium ${trendColor}`}>
          {trend}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ToolCard({ title, description, icon: Icon, active, href }: any) {
  const content = (
    <Card className="group rounded-xl border border-border bg-card transition-colors hover:bg-muted/30 cursor-pointer overflow-hidden shadow-sm">
      <CardContent className="p-4 flex gap-4 items-center">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {active && (
          <Badge variant="secondary" className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">Active</Badge>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
