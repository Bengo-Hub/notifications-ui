'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button, Card, CardContent, Badge } from '@/components/ui/base';
import {
  MessageSquare,
  MessageCircle,
  History,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface CreditBalance {
  tenant_id: string;
  type: string;
  balance: number;
}

interface TopUpResult {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  authorization_url?: string;
}

export default function CreditsPage() {
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [isInitiating, setIsInitiating] = useState(false);

  const { data: smsBalance, isLoading: smsLoading } = useQuery({
    queryKey: ['credit-balance', 'SMS'],
    queryFn: () => apiClient.get<CreditBalance>('/api/v1/billing/balance?type=SMS'),
  });

  const { data: whatsappBalance, isLoading: whatsappLoading } = useQuery({
    queryKey: ['credit-balance', 'WHATSAPP'],
    queryFn: () => apiClient.get<CreditBalance>('/api/v1/billing/balance?type=WHATSAPP'),
  });

  const handleTopUp = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount))) return;

    setIsInitiating(true);
    try {
      const result = await apiClient.post<TopUpResult>('/api/v1/billing/initiate', {
        credit_type: selectedType,
        amount: Number(topUpAmount),
        return_url: `${window.location.origin}/billing/credits?status=success`,
      });

      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (err) {
      console.error('Failed to initiate top-up', err);
      setIsInitiating(false);
    }
  };

  const getStatusColor = (balance: number) => {
    if (balance <= 0) return 'text-destructive';
    if (balance < 50) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and top up your messaging units.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SMS Credits */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">SMS Credits</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Transactional & Bulk</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-semibold px-3 py-1 text-[10px]">ACTIVE</Badge>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Available Units</p>
              <span className={`text-5xl font-bold ${getStatusColor(smsBalance?.balance || 0)}`}>
                {smsLoading ? '...' : (smsBalance?.balance || 0).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Standard Rate</span>
                <span className="font-medium text-foreground">KES 1.00 / SMS</span>
              </div>
              <div className="p-3 rounded-xl bg-accent/50 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4" /> Auto-topup is disabled
                </div>
                <Button variant="ghost" className="text-xs text-primary font-semibold h-auto p-0 hover:bg-transparent">ENABLE</Button>
              </div>
              <Button
                className="w-full h-12 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm mt-2"
                onClick={() => { setSelectedType('SMS'); setTopUpAmount(''); }}
              >
                Buy SMS Units
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Credits */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border bg-green-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">WhatsApp Credits</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Template & Session</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10 font-semibold px-3 py-1 text-[10px]">ACTIVE</Badge>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Available Units</p>
              <span className={`text-5xl font-bold ${getStatusColor(whatsappBalance?.balance || 0)}`}>
                {whatsappLoading ? '...' : (whatsappBalance?.balance || 0).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Standard Rate</span>
                <span className="font-medium text-foreground">KES 2.00 / Msg</span>
              </div>
              <div className="p-3 rounded-xl bg-accent/50 border border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Verification active
                </div>
                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[10px]">META OK</Badge>
              </div>
              <Button
                className="w-full h-12 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm mt-2"
                onClick={() => window.location.href = 'https://pricing.codevertexitsolutions.com/plans'}
              >
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top-up Form */}
      <Card className="border-primary/20 bg-accent/30">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold mb-2">Buy Extra SMS Units</h3>
              <p className="text-sm text-muted-foreground">Choose an amount to top up. Credits are added instantly upon payment verification.</p>
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium uppercase text-xs tracking-wider">KES</div>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 1000)"
                  className="w-full h-14 rounded-xl bg-card border border-border pl-14 pr-5 text-lg font-semibold outline-none focus:ring-2 ring-primary/20 focus:border-primary/40 transition-all text-foreground"
                />
              </div>
              <Button
                className="h-14 px-8 rounded-xl font-semibold text-lg shadow-sm"
                disabled={isInitiating || !topUpAmount}
                onClick={handleTopUp}
              >
                {isInitiating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm & Pay'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Recent Activity
          </h2>
          <Button variant="ghost" className="text-sm text-muted-foreground hover:text-primary">
            View All <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-accent/30 transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-foreground">Just now</span>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none font-semibold text-[10px]">SMS</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">Campaign: Summer Sale 2026</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-semibold text-destructive">- 450 Units</span>
                  </td>
                </tr>
                <tr className="border-b border-border hover:bg-accent/30 transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-foreground">2 hours ago</span>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-semibold text-[10px]">TOP-UP</Badge>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-muted-foreground">M-Pesa payment ref: RKI82...</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">+ 1,000 Units</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
