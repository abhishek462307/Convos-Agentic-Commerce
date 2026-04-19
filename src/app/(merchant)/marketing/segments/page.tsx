"use client"

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ArrowRight,
  Target,
  BarChart3,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  Download,
  X,
  Check,
  Upload,
  Settings2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useMerchant } from '@/hooks/use-merchant';
import { 
  getMarketingSegments, 
  createMarketingSegment, 
  updateMarketingSegment, 
  deleteMarketingSegment,
  getSegmentCustomers,
  getAllCustomers,
  addCustomersToSegment,
  exportSegmentToCSV,
  importCustomersFromCSV,
  applyDynamicSegmentRules
} from '../actions';
import { toast } from 'sonner';
import { MerchantPageSkeleton } from '@/components/merchant/page-skeleton';

export default function SegmentsPage() {
  const { merchant } = useMerchant();
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isApplyingRules, setIsApplyingRules] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const SEGMENTS_PER_PAGE = 6;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSegment, setCurrentSegment] = useState<any>(null);
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [csvText, setCsvText] = useState('');
  const [rules, setRules] = useState<{ field: string; operator: string; value: string }[]>([
    { field: 'total_spent', operator: 'greater_than', value: '' }
  ]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'dynamic',
    description: ''
  });

  const allFilteredSegments = useMemo(() => {
    return segments.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [segments, searchTerm]);

  const totalPages = Math.ceil(allFilteredSegments.length / SEGMENTS_PER_PAGE);
  const paginatedSegments = useMemo(() => {
    return allFilteredSegments.slice(
      (currentPage - 1) * SEGMENTS_PER_PAGE,
      currentPage * SEGMENTS_PER_PAGE
    );
  }, [allFilteredSegments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalAudience = useMemo(() => 
    segments.reduce((acc, s) => acc + (s.customer_count || 0), 0),
  [segments]);

  const fetchData = useCallback(async () => {
    if (!merchant) return;
    try {
      const data = await getMarketingSegments(merchant.id);
      setSegments(data);
    } catch (error) {
      toast.error('Failed to load segments');
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!merchant || !formData.name || !formData.type) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsCreating(true);
    try {
      await createMarketingSegment({
        merchant_id: merchant.id,
        name: formData.name,
        type: formData.type as 'dynamic' | 'static',
        description: formData.description,
        customer_count: 0
      });
      toast.success('Segment created successfully');
      setIsCreateOpen(false);
      fetchData();
      setFormData({ name: '', type: 'dynamic', description: '' });
    } catch (error) {
      toast.error('Failed to create segment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!currentSegment || !formData.name) return;

    setIsUpdating(true);
    try {
      await updateMarketingSegment(currentSegment.id, {
        name: formData.name,
        type: formData.type as 'dynamic' | 'static',
        description: formData.description
      });
      toast.success('Segment updated successfully');
      setIsEditOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update segment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;

    try {
      await deleteMarketingSegment(id);
      toast.success('Segment deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete segment');
    }
  };

  const handleViewCustomers = async (segment: any) => {
    setCurrentSegment(segment);
    setIsViewOpen(true);
    setLoadingCustomers(true);
    try {
      const customers = await getSegmentCustomers(segment.id);
      setSegmentCustomers(customers);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const openAddCustomers = async () => {
    setIsAddOpen(true);
    setLoadingCustomers(true);
    try {
      if (merchant) {
        const customers = await getAllCustomers(merchant.id);
        setAllCustomers(customers);
      }
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleAddSelected = async () => {
    if (!currentSegment || selectedCustomerIds.length === 0) return;

    setIsAdding(true);
    try {
      await addCustomersToSegment(currentSegment.id, selectedCustomerIds);
      toast.success(`${selectedCustomerIds.length} customers added`);
      setIsAddOpen(false);
      setSelectedCustomerIds([]);
      handleViewCustomers(currentSegment);
      fetchData();
    } catch {
      toast.error('Failed to add customers');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const openEdit = (segment: any) => {
    setCurrentSegment(segment);
    setFormData({
      name: segment.name,
      type: segment.type,
      description: segment.description || ''
    });
    setIsEditOpen(true);
  };

  const filteredCustomers = allCustomers.filter(c => 
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // CSV Export
  const handleExportCSV = async (segment: any) => {
    try {
      const result = await exportSegmentToCSV(segment.id);
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${segment.name.replace(/\s+/g, '_')}_customers.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('CSV exported successfully');
      }
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // CSV Import
  const handleImportCSV = async () => {
    if (!merchant || !csvText.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setIsImporting(true);
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      
      const emailIndex = headers.findIndex(h => h === 'email');
      const nameIndex = headers.findIndex(h => h === 'name');
      const phoneIndex = headers.findIndex(h => h === 'phone');

      if (emailIndex === -1) {
        toast.error('CSV must have an "email" column');
        return;
      }

      const csvData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return {
          email: values[emailIndex],
          name: nameIndex !== -1 ? values[nameIndex] : undefined,
          phone: phoneIndex !== -1 ? values[phoneIndex] : undefined
        };
      }).filter(row => row.email);

      const result = await importCustomersFromCSV(merchant.id, currentSegment?.id || null, csvData);
      toast.success(`Imported ${result.imported} customers${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
      setIsImportOpen(false);
      setCsvText('');
      fetchData();
      if (currentSegment) {
        handleViewCustomers(currentSegment);
      }
    } catch {
      toast.error('Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  // Dynamic Rules
  const openRulesEditor = (segment: any) => {
    setCurrentSegment(segment);
    setRules(segment.rules || [{ field: 'total_spent', operator: 'greater_than', value: '' }]);
    setIsRulesOpen(true);
  };

  const addRule = () => {
    setRules([...rules, { field: 'total_spent', operator: 'greater_than', value: '' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, key: string, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [key]: value };
    setRules(newRules);
  };

  const handleApplyRules = async () => {
    if (!merchant || !currentSegment) return;

    const validRules = rules.filter(r => r.field && r.operator && (r.value || r.operator === 'is_null' || r.operator === 'is_not_null'));
    if (validRules.length === 0) {
      toast.error('Please add at least one valid rule');
      return;
    }

    setIsApplyingRules(true);
    try {
      const result = await applyDynamicSegmentRules(currentSegment.id, merchant.id, validRules);
      toast.success(`Segment updated: ${result.matchedCount} customers matched`);
      setIsRulesOpen(false);
      fetchData();
    } catch {
      toast.error('Failed to apply rules');
    } finally {
      setIsApplyingRules(false);
    }
  };

  const ruleFields = [
    { value: 'total_spent', label: 'Total Spent' },
    { value: 'total_orders', label: 'Total Orders' },
    { value: 'email', label: 'Email' },
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone' },
  ];

  const ruleOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'contains', label: 'Contains' },
    { value: 'is_null', label: 'Is Empty' },
    { value: 'is_not_null', label: 'Is Not Empty' },
  ];

  if (loading) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">Segments & Lists</h1>
          <p className="page-desc">Build audience groups for targeting, automation, and campaign delivery.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-9 rounded-md px-4 font-medium"
              onClick={() => { setCurrentSegment(null); setIsImportOpen(true); }}
            >
              <Upload className="w-4 h-4 mr-2" /> Import CSV
            </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-9 rounded-md px-4 font-medium">
                <Plus className="w-4 h-4 mr-2" /> Create Segment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-popover border-border">
              <DialogHeader>
                <DialogTitle>Create Audience Segment</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Target customers based on their behavior or attributes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Segment Name</Label>
                  <Input 
                    id="name" 
                    placeholder="High Spenders - 2024" 
                    className="bg-background border-border h-10" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type" className="text-xs font-medium text-muted-foreground">Segment Type</Label>
                  <Select onValueChange={(v) => setFormData({...formData, type: v})} defaultValue={formData.type}>
                    <SelectTrigger className="bg-background border-border h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="dynamic">Dynamic (Rule-based)</SelectItem>
                      <SelectItem value="static">Static (Manual List)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc" className="text-xs font-medium text-muted-foreground">Description</Label>
                  <Input 
                    id="desc" 
                    placeholder="Customers who spent over $500..." 
                    className="bg-background border-border h-10" 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
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
                  Create Segment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Audience</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{totalAudience.toLocaleString()}</p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Total customers across all segments
            </Badge>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Reachability</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">92%</p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Strong contact coverage across channels
            </Badge>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Segments Activity</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{segments.length}</p>
            <Badge variant="secondary" className="mt-3 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Total active audience lists
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight">Active Segments</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search segments..." 
                className="pl-9 h-9 w-64 bg-background border-border rounded-md" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-9 rounded-md">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {paginatedSegments.map((segment, i) => (
              <motion.div
                key={segment.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group rounded-xl border border-border bg-card transition-colors hover:bg-muted/30 cursor-pointer overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4" onClick={() => handleViewCustomers(segment)}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{segment.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">Updated {new Date(segment.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold tracking-tight">{segment.customer_count || 0}</p>
                        <p className="text-xs text-muted-foreground">customers</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{segment.type}</Badge>
                        {segment.description && (
                          <span className="max-w-[150px] truncate text-xs text-muted-foreground">{segment.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleViewCustomers(segment)}
                        >
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-popover border-border p-1 shadow-xl">
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer"
                                onClick={() => handleViewCustomers(segment)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-2" /> View Customers
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer"
                                onClick={() => handleExportCSV(segment)}
                              >
                                <Download className="w-3.5 h-3.5 mr-2" /> Export CSV
                              </DropdownMenuItem>
                              {segment.type === 'dynamic' && (
                                <DropdownMenuItem 
                                  className="text-sm rounded-md cursor-pointer"
                                  onClick={() => openRulesEditor(segment)}
                                >
                                  <Settings2 className="w-3.5 h-3.5 mr-2" /> Edit Rules
                                </DropdownMenuItem>
                              )}
                              <div className="h-px bg-border my-1" />
                              <DropdownMenuItem 
                                className="text-sm rounded-md cursor-pointer"
                                onClick={() => openEdit(segment)}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-sm rounded-md text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => handleDelete(segment.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Segment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button 
            variant="outline" 
            onClick={() => setIsCreateOpen(true)}
            className="flex h-48 flex-col gap-3 rounded-xl border-2 border-dashed border-border transition-colors hover:bg-muted/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-border">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Create New Segment</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on behavior or tags</p>
            </div>
          </Button>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-border/50 bg-muted/5 px-4 py-3 flex items-center justify-between rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Showing {(currentPage - 1) * SEGMENTS_PER_PAGE + 1}-{Math.min(currentPage * SEGMENTS_PER_PAGE, allFilteredSegments.length)} of {allFilteredSegments.length}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update your audience segment details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground">Segment Name</Label>
              <Input 
                id="edit-name" 
                className="bg-background border-border h-10" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type" className="text-xs font-medium text-muted-foreground">Segment Type</Label>
              <Select onValueChange={(v) => setFormData({...formData, type: v})} value={formData.type}>
                <SelectTrigger className="bg-background border-border h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="dynamic">Dynamic (Rule-based)</SelectItem>
                  <SelectItem value="static">Static (Manual List)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc" className="text-xs font-medium text-muted-foreground">Description</Label>
              <Input 
                id="edit-desc" 
                className="bg-background border-border h-10" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="h-9 rounded-md" disabled={isUpdating}>Cancel</Button>
            <Button 
              className="h-9 rounded-md px-4 font-medium" 
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customers Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-popover">
            <div>
              <DialogTitle>{currentSegment?.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {currentSegment?.customer_count} customers in this segment
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsViewOpen(false)} className="rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-background/40">
            {loadingCustomers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fetching customers...</p>
              </div>
            ) : segmentCustomers.length > 0 ? (
              <div className="space-y-3">
                {segmentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-foreground">
                        {customer.name?.charAt(0) || customer.email?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{customer.name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${parseFloat(customer.total_spent || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{customer.total_orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-semibold">No customers found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adding customers manually or adjusting rules.</p>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-border bg-popover flex justify-end gap-3">
              <Button 
                variant="outline" 
                className="h-9 rounded-md"
                onClick={() => currentSegment && handleExportCSV(currentSegment)}
              >
                Export CSV
              </Button>
            <Button 
              className="h-9 rounded-md px-4 font-medium"
              onClick={openAddCustomers}
            >
              Add Customers
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customers Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b border-border bg-popover">
            <DialogTitle>Add Customers to Segment</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Select customers to add to {currentSegment?.name}
            </DialogDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or email..." 
                className="pl-9 h-10 bg-background border-border rounded-md" 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-background/40">
            {loadingCustomers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div 
                    key={customer.id} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                      selectedCustomerIds.includes(customer.id) 
                        ? 'border-border bg-accent/70' 
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                    onClick={() => toggleCustomerSelection(customer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                        {customer.name?.charAt(0) || customer.email?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{customer.name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    {selectedCustomerIds.includes(customer.id) && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No customers matching search.</p>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-border bg-popover flex justify-between items-center">
            <p className="text-xs font-medium text-muted-foreground">
              {selectedCustomerIds.length} selected
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="h-9 rounded-md">Cancel</Button>
              <Button 
                className="h-9 rounded-md px-4 font-medium"
                disabled={isAdding || selectedCustomerIds.length === 0}
                onClick={handleAddSelected}
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Selected
              </Button>
            </div>
          </div>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="bg-popover border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Import Customers from CSV</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Paste CSV data with columns: name, email, phone (email required)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">CSV Data</Label>
                <textarea
                  className="h-48 w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder={`name,email,phone\nJohn Doe,john@example.com,+1234567890\nJane Smith,jane@example.com,`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>
              {currentSegment && (
                <p className="text-xs text-muted-foreground">
                  Customers will be added to: <span className="font-medium text-foreground">{currentSegment.name}</span>
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)} className="h-9 rounded-md">Cancel</Button>
              <Button 
                className="h-9 rounded-md px-4 font-medium"
                onClick={handleImportCSV}
                disabled={isImporting || !csvText.trim()}
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dynamic Rules Editor Dialog */}
        <Dialog open={isRulesOpen} onOpenChange={setIsRulesOpen}>
          <DialogContent className="bg-popover border-border sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Dynamic Segment Rules</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Define rules to automatically add matching customers to this segment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={rule.field} onValueChange={(v) => updateRule(index, 'field', v)}>
                    <SelectTrigger className="w-[140px] bg-background border-border h-10">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {ruleFields.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={rule.operator} onValueChange={(v) => updateRule(index, 'operator', v)}>
                    <SelectTrigger className="w-[140px] bg-background border-border h-10">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {ruleOperators.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rule.operator !== 'is_null' && rule.operator !== 'is_not_null' && (
                    <Input
                      className="flex-1 bg-background border-border h-10"
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(index, 'value', e.target.value)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 hover:bg-muted hover:text-red-600"
                    onClick={() => removeRule(index)}
                    disabled={rules.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full h-10 rounded-md border-dashed border-border"
                onClick={addRule}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Rule
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRulesOpen(false)} className="h-9 rounded-md">Cancel</Button>
              <Button 
                className="h-9 rounded-md px-4 font-medium"
                onClick={handleApplyRules}
                disabled={isApplyingRules}
              >
                {isApplyingRules ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Apply Rules
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
