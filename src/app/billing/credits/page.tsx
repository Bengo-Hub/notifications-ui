'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button, Card, CardContent, CardHeader, Badge } from '@/components/ui/base';
import { 
  MessageSquare, 
  MessageCircle, 
  Plus, 
  History, 
  TrendingUp, 
  AlertCircle,
  CreditCard,
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

  const { data: smsBalance, isLoading: smsLoading, refetch: refetchSms } = useQuery({
    queryKey: ['credit-balance', 'SMS'],
    queryFn: () => apiClient.get<CreditBalance>('/api/v1/billing/balance?type=SMS'),
  });

  const { data: whatsappBalance, isLoading: whatsappLoading, refetch: refetchWhatsapp } = useQuery({
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
        <h1 className="text-3xl font-black tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and top up your messaging units.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SMS Credits */}
        <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black">SMS Credits</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Transactional & Bulk</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-blue-200 text-blue-600 bg-blue-50 font-black px-3 py-1 text-[10px]">ACTIVE</Badge>
            </div>
          </div>
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Available Units</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-6xl font-black ${getStatusColor(smsBalance?.balance || 0)}`}>
                  {smsLoading ? '...' : (smsBalance?.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center text-sm font-medium">
                 <span className="text-muted-foreground">Standard Rate</span>
                 <span>KES 1.00 / SMS</span>
               </div>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <AlertCircle className="h-4 w-4" /> Auto-topup is disabled
                  </div>
                  <Button variant="ghost" className="text-xs text-primary font-black h-auto p-0 hover:bg-transparent">ENABLE</Button>
               </div>
               <Button 
                className="w-full h-14 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 mt-4"
                onClick={() => { setSelectedType('SMS'); setTopUpAmount(''); }}
              >
                Buy SMS Units
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Credits */}
        <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-green-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-2xl">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black">WhatsApp Credits</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Template & Session</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-full border-green-200 text-green-600 bg-green-50 font-black px-3 py-1 text-[10px]">ACTIVE</Badge>
            </div>
          </div>
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-1">Available Units</p>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-6xl font-black ${getStatusColor(whatsappBalance?.balance || 0)}`}>
                  {whatsappLoading ? '...' : (whatsappBalance?.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center text-sm font-medium">
                 <span className="text-muted-foreground">Standard Rate</span>
                 <span>KES 2.00 / Msg</span>
               </div>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Verification active
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-none font-black text-[10px]">META OK</Badge>
               </div>
               <Button 
                className="w-full h-14 rounded-2xl font-black text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 mt-4"
                onClick={() => window.location.href = 'https://pricing.codevertexitsolutions.com/plans'}
              >
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top-up Form for SMS */}
      <Card className="rounded-[2.5rem] border-primary/20 bg-slate-50 dark:bg-slate-900 shadow-xl shadow-primary/5">
        <CardContent className="p-10">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-1">
              <h3 className="text-2xl font-black mb-2">Buy Extra SMS Units</h3>
              <p className="text-sm text-muted-foreground">Choose an amount to top up. Credits are added instantly upon payment verification.</p>
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase text-xs tracking-widest">KES</div>
                <input 
                  type="number" 
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount (e.g. 1000)"
                  className="w-full h-16 rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 pl-16 pr-6 text-xl font-black outline-none focus:ring-2 ring-primary/20 transition-all text-slate-900 dark:text-white"
                />
              </div>
              <Button 
                className="h-16 px-10 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={isInitiating || !topUpAmount}
                onClick={handleTopUp}
              >
                {isInitiating ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Confirm & Pay'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black flex items-center gap-3">
             <History className="h-6 w-6 text-primary" /> Recent Activity
          </h2>
          <Button variant="ghost" className="text-sm font-bold text-muted-foreground hover:text-primary">
            View All <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-5 px-8 text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="py-5 px-8 text-xs font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="py-5 px-8 text-xs font-black uppercase tracking-widest text-slate-400">Description</th>
                  <th className="py-5 px-8 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <td className="py-5 px-8">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Just now</span>
                  </td>
                  <td className="py-5 px-8">
                    <Badge className="bg-blue-500/10 text-blue-600 border-none font-black text-[10px]">SMS</Badge>
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-sm font-medium text-slate-500">Campaign: Summer Sale 2026</span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <span className="text-sm font-black text-destructive">- 450 Units</span>
                  </td>
                </tr>
                <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                  <td className="py-5 px-8">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">2 hours ago</span>
                  </td>
                  <td className="py-5 px-8">
                    <Badge className="bg-green-500/10 text-green-600 border-none font-black text-[10px]">TOP-UP</Badge>
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-sm font-medium text-slate-500">M-Pesa payment ref: RKI82...</span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <span className="text-sm font-black text-green-600">+ 1,000 Units</span>
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
