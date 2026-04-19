"use client"

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Send, 
  Users, 
  MousePointer2, 
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { getMarketingCampaigns, createMarketingCampaign, getMarketingSegments, getNewsletterSubscribers, sendEmailCampaign, getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../actions';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

// HTML escaping helper to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// URL validation and sanitization helper to prevent javascript:, data: URIs and attribute injection
function sanitizeUrl(url: string): string | false {
  if (!url) return false;
  
  // Reject URLs containing HTML-sensitive characters that could break out of href
  if (/["'<>]/.test(url)) return false;
  
  const trimmed = url.trim();
  
  // Explicitly reject dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return false;
  
  try {
    const parsed = new URL(trimmed, 'http://example.com');
    const protocol = parsed.protocol.toLowerCase();
    
    // Only allow safe protocols
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      // Return the properly formatted URL
      return parsed.toString();
    }
    return false;
  } catch {
    // For relative URLs, ensure they start with / or encode them
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    // Encode relative paths to prevent injection
    return '/' + encodeURIComponent(trimmed);
  }
}

export default function EmailMarketingPage() {
  const { merchant } = useMerchant();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Derived Summary Stats
  const summaryStats = useMemo(() => {
    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    const totalOpenRate = sentCampaigns.reduce((acc, c) => acc + (Number(c.stats?.open_rate) || 0), 0);
    const totalClickRate = sentCampaigns.reduce((acc, c) => acc + (Number(c.stats?.click_rate) || 0), 0);
    
    return {
      subscribers: subscribers.length,
      avgOpenRate: sentCampaigns.length > 0 ? (totalOpenRate / sentCampaigns.length).toFixed(1) + '%' : '0%',
      avgClickRate: sentCampaigns.length > 0 ? (totalClickRate / sentCampaigns.length).toFixed(1) + '%' : '0%'
    };
  }, [campaigns, subscribers]);

  // Campaign Form State
  const [newName, setNewName] = useState('');
  const [newSegment, setNewSegment] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  // Template Form State
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    preview_text: '',
    headline: '',
    body_text: '',
    cta_text: '',
    cta_url: ''
  });

  const allFilteredCampaigns = useMemo(() => {
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.segment?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaigns, searchTerm]);

  const totalPages = Math.ceil(allFilteredCampaigns.length / ITEMS_PER_PAGE);
  const paginatedCampaigns = useMemo(() => {
    return allFilteredCampaigns.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [allFilteredCampaigns, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const [campaignsData, segmentsData, subscribersData, templatesData] = await Promise.all([
        getMarketingCampaigns(merchant.id),
        getMarketingSegments(merchant.id),
        getNewsletterSubscribers(merchant.id),
        getEmailTemplates(merchant.id)
      ]);
      // Filter for email campaigns
      setCampaigns(campaignsData.filter(c => c.type === 'email'));
      setSegments(segmentsData);
      setSubscribers(subscribersData);
      setTemplates(templatesData);
    } catch (error) {
      toast.error('Failed to load email marketing data');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!merchant || !newName || !newSegment || !newTemplate) {
      toast.error('Please fill in all fields');
      return;
    }

    const selectedTemplate = templates.find(t => t.id === newTemplate);
    if (!selectedTemplate) {
      toast.error('Please select a valid template');
      return;
    }

    setIsCreating(true);
    try {
      await createMarketingCampaign({
        merchant_id: merchant.id,
        name: newName,
        type: 'email',
        segment_id: newSegment,
        status: 'draft',
        template_id: selectedTemplate.id,
        content: {
          subject: selectedTemplate.subject,
          previewText: selectedTemplate.preview_text,
          headline: selectedTemplate.headline,
          bodyText: selectedTemplate.body_text,
          ctaText: selectedTemplate.cta_text,
          ctaUrl: selectedTemplate.cta_url
        },
        stats: { reach: 0, open_rate: 0, click_rate: 0 }
      });
      toast.success('Email campaign created');
      setIsCreateOpen(false);
      fetchData();
      // Reset form
      setNewName('');
      setNewSegment('');
      setNewTemplate('');
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!merchant) return;
    setIsSending(id);
    try {
      await sendEmailCampaign(id, merchant.id);
      toast.success('Campaign sent successfully');
      fetchData();
    } catch {
      toast.error('Failed to send campaign');
    } finally {
      setIsSending(null);
    }
  };

  const openTemplateModal = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name || '',
        subject: template.subject || '',
        preview_text: template.preview_text || '',
        headline: template.headline || '',
        body_text: template.body_text || '',
        cta_text: template.cta_text || '',
        cta_url: template.cta_url || ''
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        subject: '',
        preview_text: '',
        headline: '',
        body_text: '',
        cta_text: '',
        cta_url: ''
      });
    }
    setIsTemplateOpen(true);
  };

  const handleTemplateSave = async () => {
    if (!merchant || !templateForm.name || !templateForm.subject || !templateForm.headline || !templateForm.body_text) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsTemplateSaving(true);
    const safeHeadline = escapeHtml(templateForm.headline || '');
    const safeBodyText = escapeHtml(templateForm.body_text || '');
    const safeCtaText = escapeHtml(templateForm.cta_text || '');
    const ctaUrl = templateForm.cta_url || '#';
    const sanitizedCtaUrl = sanitizeUrl(ctaUrl);
    // HTML-escape the URL for safe interpolation into href attribute
    const safeCtaHref = sanitizedCtaUrl !== false ? escapeHtml(sanitizedCtaUrl) : '#';
    const ctaButton = safeCtaHref !== '#' 
      ? `<a href="${safeCtaHref}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">${safeCtaText}</a>`
      : '';
    const contentHtml = `
      <h1>${safeHeadline}</h1>
      <p>${safeBodyText}</p>
      ${ctaButton}
    `;
    try {
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, {
          name: templateForm.name,
          subject: templateForm.subject,
          preview_text: templateForm.preview_text,
          content: contentHtml,
          merchant_id: merchant.id,
          headline: templateForm.headline,
          body_text: templateForm.body_text,
          cta_text: templateForm.cta_text,
          cta_url: templateForm.cta_url
        });
        toast.success('Template updated');
      } else {
        await createEmailTemplate({
          name: templateForm.name,
          subject: templateForm.subject,
          preview_text: templateForm.preview_text,
          content: contentHtml,
          merchant_id: merchant.id,
          headline: templateForm.headline,
          body_text: templateForm.body_text,
          cta_text: templateForm.cta_text,
          cta_url: templateForm.cta_url
        });
        toast.success('Template created');
      }
      setIsTemplateOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const handleTemplateDelete = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteEmailTemplate(templateId);
      toast.success('Template deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  if (loading) {
    return <MerchantPageSkeleton />;
  }

    return (
      <>
      <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Email Marketing</h1>
          <p className="page-desc">Create campaigns, manage templates, and monitor subscriber engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketing/segments">
            <Button variant="outline" className="h-9 rounded-md px-4 font-medium">
              Manage Lists
            </Button>
          </Link>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" /> Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Email Campaign</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Design and send a beautiful email to your audience.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Campaign Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Monthly Newsletter - Feb" 
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
                    <Label htmlFor="template" className="text-xs font-medium text-muted-foreground">Choose Template</Label>
                    <Select onValueChange={setNewTemplate} value={newTemplate}>
                      <SelectTrigger className="bg-background border-border h-10">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {templates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                        {templates.length === 0 && (
                          <SelectItem value="none" disabled>No templates yet</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {templates.length === 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-fit px-2 text-xs text-muted-foreground"
                        onClick={() => openTemplateModal()}
                      >
                        Create a template to continue
                      </Button>
                    )}
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
                  Design Email
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Subscribers" value={summaryStats.subscribers.toString()} icon={Users} trend="+12" trendColor="text-emerald-500" />
        <StatCard title="Avg. Open Rate" value={summaryStats.avgOpenRate} icon={Eye} trend="+1.2%" trendColor="text-emerald-500" />
        <StatCard title="Avg. Click Rate" value={summaryStats.avgClickRate} icon={MousePointer2} trend="-0.2%" trendColor="text-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-tight">Recent Campaigns</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-9 h-9 w-48 bg-background border-border rounded-md" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-md px-3">
                  <Filter className="w-3.5 h-3.5 mr-2" /> Filter
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-xl bg-background overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Campaign Name</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted-foreground">Engagement</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="group hover:bg-muted/40 transition-colors cursor-pointer">
                        <td className="px-6 py-5">
                          <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {campaign.segment?.name || 'All Audience'} • {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge 
                            variant="outline" 
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              campaign.status === 'sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              campaign.status === 'scheduled' ? 'border-border bg-muted text-foreground' :
                              'border-border bg-muted text-muted-foreground'
                            }`}
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs font-semibold">{campaign.stats?.open_rate || 0}%</p>
                              <p className="text-[11px] text-muted-foreground">Open</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{campaign.stats?.click_rate || 0}%</p>
                              <p className="text-[11px] text-muted-foreground">Click</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-popover border-border p-1">
                                <DropdownMenuItem 
                                  className="text-sm rounded-md cursor-pointer flex items-center gap-2"
                                  onClick={() => handleSendNow(campaign.id)}
                                  disabled={isSending === campaign.id || campaign.status === 'sent'}
                                >
                                  <Send className={`w-3.5 h-3.5 ${isSending === campaign.id ? 'animate-pulse' : ''}`} /> 
                                  {isSending === campaign.id ? 'Sending...' : 'Send Now'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-sm rounded-md cursor-pointer flex items-center gap-2">
                                  <BarChart3 className="w-3.5 h-3.5" /> View Analytics
                                </DropdownMenuItem>
                              <DropdownMenuItem className="text-sm rounded-md cursor-pointer flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" /> Preview Email
                              </DropdownMenuItem>
                              <div className="h-px bg-border my-1" />
                              <DropdownMenuItem className="text-sm rounded-md text-red-600 focus:text-red-600 cursor-pointer">
                                Delete Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {allFilteredCampaigns.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm font-medium">
                          No email campaigns found. Start reaching your customers today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, allFilteredCampaigns.length)} of {allFilteredCampaigns.length}
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
            </div>
          </div>
        </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight">Email Templates</h2>
                <Button
                  variant="outline"
                  className="h-9 rounded-md border-dashed"
                  onClick={() => openTemplateModal()}
                >
                  <Plus className="w-4 h-4 mr-2" /> New Template
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {templates.map((template, i) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="group rounded-xl border border-border bg-card transition-colors hover:bg-muted/30 overflow-hidden shadow-sm">
                      <CardContent className="p-4 flex gap-4 items-start">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted shrink-0">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{template.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{template.subject}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.body_text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            onClick={() => openTemplateModal(template)}
                          >
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            onClick={() => handleTemplateDelete(template.id)}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {templates.length === 0 && (
                  <Card className="border-border bg-background rounded-xl">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      No templates yet. Create your first template to start campaigns.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

          <Card className="rounded-xl border border-border bg-card overflow-hidden">
            <CardHeader className="px-6 pt-6 pb-2 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Check</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3 items-start rounded-lg border border-border bg-muted/40 p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">SPF & DKIM Valid</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Verified domain</p>
                </div>
              </div>
              <div className="flex gap-3 items-start rounded-lg border border-border bg-muted/40 p-3">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">GDPR Ready</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">One-click unsubscribe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>

      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Email Template' : 'New Email Template'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Define the core content used for campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Template Name</Label>
              <Input
                className="bg-background border-border h-10"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Holiday Promo"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
              <Input
                className="bg-background border-border h-10"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                placeholder="Your exclusive offer inside"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Preview Text</Label>
              <Input
                className="bg-background border-border h-10"
                value={templateForm.preview_text}
                onChange={(e) => setTemplateForm({ ...templateForm, preview_text: e.target.value })}
                placeholder="Limited time savings"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Headline</Label>
              <Input
                className="bg-background border-border h-10"
                value={templateForm.headline}
                onChange={(e) => setTemplateForm({ ...templateForm, headline: e.target.value })}
                placeholder="Fresh drops just landed"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Body</Label>
              <Textarea
                className="bg-background border-border min-h-[120px]"
                value={templateForm.body_text}
                onChange={(e) => setTemplateForm({ ...templateForm, body_text: e.target.value })}
                placeholder="Introduce the offer, highlight benefits, and create urgency."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground">CTA Text</Label>
                <Input
                  className="bg-background border-border h-10"
                  value={templateForm.cta_text}
                  onChange={(e) => setTemplateForm({ ...templateForm, cta_text: e.target.value })}
                  placeholder="Shop Now"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-medium text-muted-foreground">CTA URL</Label>
                <Input
                  className="bg-background border-border h-10"
                  value={templateForm.cta_url}
                  onChange={(e) => setTemplateForm({ ...templateForm, cta_url: e.target.value })}
                  placeholder="https://yourstore.com"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateOpen(false)} className="h-9 rounded-md" disabled={isTemplateSaving}>Cancel</Button>
            <Button className="h-9 rounded-md px-4 font-medium" onClick={handleTemplateSave} disabled={isTemplateSaving}>
              {isTemplateSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
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
