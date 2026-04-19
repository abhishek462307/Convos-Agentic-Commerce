"use client"

import React, { useState } from 'react';
import { 
  FileSpreadsheet,
  Download,
  Users,
  Package,
  DollarSign,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMerchant } from '@/hooks/use-merchant';

const REPORTS = [
  {
    id: 'sales',
    name: 'Transaction Payload',
    description: 'Complete sales data including autonomous orders, revenue streams, and settlement nodes.',
    icon: DollarSign,
    type: 'orders',
    color: 'bg-purple-500/10',
    iconColor: 'text-purple-500'
  },
  {
    id: 'products',
    name: 'Catalog Inventory',
    description: 'Full product metadata catalog with dynamic pricing, stock capacity, and classification.',
    icon: Package,
    type: 'products',
    color: 'bg-purple-400/10',
    iconColor: 'text-purple-400'
  },
  {
    id: 'customers',
    name: 'Identity Ledger',
    description: 'Encrypted customer directory with transaction history, LTV metrics, and interaction nodes.',
    icon: Users,
    type: 'customers',
    color: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500'
  }
];

export default function ReportsPage() {
  const { merchant } = useMerchant();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string, reportId: string) => {
    if (!merchant) return;
    setDownloading(reportId);

    try {
      window.location.href = `/api/export?merchantId=${merchant.id}&type=${type}`;
      toast.success('System report export initialized');
    } catch {
      toast.error('Failed to export system report');
    }

    setTimeout(() => setDownloading(null), 1000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-5 lg:px-6 font-sans selection:bg-foreground selection:text-background">
      <header className="page-header flex-col md:flex-row md:items-center">
        <div>
          <h1 className="page-title">System Reports</h1>
          <p className="page-desc">Export operational and commerce data in clean report formats.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 mb-12">
        {REPORTS.map(report => (
          <Card key={report.id} className="border-border bg-card transition-colors group rounded-xl overflow-hidden shadow-sm">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl ${report.color} flex items-center justify-center border border-border group-hover:scale-105 transition-transform`}>
                    <report.icon className={`w-8 h-8 ${report.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{report.name}</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1 max-w-xl">{report.description}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleDownload(report.type, report.id)}
                  disabled={downloading === report.id}
                  className="h-9 px-4 rounded-md font-medium"
                >
                  {downloading === report.id ? (
                    <span className="flex items-center gap-2">Synthesizing...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download CSV
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5 text-purple-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Standardized CSV</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">All payloads are exported in RFC 4180 compliant CSV format, synchronized for Excel and BI tools.</p>
        </div>
        <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Encrypted Access</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">Customer data nodes are extracted via secure tunnels. Identity protection is enforced during export.</p>
        </div>
        <div className="p-8 bg-muted/30 border border-border rounded-3xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Real-time Sync</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">Report snapshots include the latest transactions up to the millisecond of extraction.</p>
        </div>
      </div>

      <div className="mt-20 p-8 border border-dashed border-border rounded-3xl flex items-start gap-6 bg-muted/20">
        <Info className="w-6 h-6 text-muted-foreground shrink-0 mt-1" />
        <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Technical Note</p>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                Large catalog extractions may take several seconds to synthesize. Please maintain the stream connection until the system provides the download payload. For automated API access to these reports, connect via the <a href="https://docs.convos.com" target="_blank" rel="noreferrer" className="text-purple-500 hover:underline">Developer Documentation</a>.
              </p>
        </div>
      </div>
    </div>
  );
}
