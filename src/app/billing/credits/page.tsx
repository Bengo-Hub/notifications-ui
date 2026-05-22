'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { billingApi } from '@/lib/api/billing';
import { billingKeys, useCreditBalance, useCreditTransactions } from '@/hooks/use-billing';
import { useAuthStore } from '@/store/auth';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
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

const ACTION_LABELS: Record<string, string> = {
    TOPUP: 'Top-up',
    DEDUCTION: 'Usage',
    REFUND: 'Refund',
    ADJUSTMENT: 'Adjustment',
};

const ACTION_COLORS: Record<string, string> = {
    TOPUP: 'bg-green-500/10 text-green-600 dark:text-green-400',
    DEDUCTION: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    REFUND: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    ADJUSTMENT: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

function formatRelativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function CreditsPage() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();

    const [topUpAmount, setTopUpAmount] = useState<string>('');
    const [selectedType, setSelectedType] = useState<'SMS' | 'WHATSAPP'>('SMS');
    const [isInitiating, setIsInitiating] = useState(false);

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [intentId, setIntentId] = useState('');
    const [initiateUrl, setInitiateUrl] = useState('');
    const [pendingAmount, setPendingAmount] = useState(0);

    const { data: smsBalance, isLoading: smsLoading } = useCreditBalance('SMS');
    const { data: whatsappBalance, isLoading: whatsappLoading } = useCreditBalance('WHATSAPP');
    const { data: txData, isLoading: txLoading } = useCreditTransactions({ limit: 10 });

    const transactions = txData?.data ?? [];

    const handleTopUp = async () => {
        if (!topUpAmount || isNaN(Number(topUpAmount))) return;

        setIsInitiating(true);
        try {
            const result = await billingApi.initiateTopUp({
                credit_type: selectedType,
                amount: Number(topUpAmount),
                return_url: `${window.location.origin}/billing/credits?status=success`,
            });

            if (result.initiate_url && result.intent_id) {
                setPendingAmount(Number(topUpAmount));
                setIntentId(result.intent_id);
                setInitiateUrl(result.initiate_url);
                setPaymentOpen(true);
            } else if (result.authorization_url) {
                window.location.href = result.authorization_url;
            }
        } catch (err) {
            console.error('Failed to initiate top-up', err);
        } finally {
            setIsInitiating(false);
        }
    };

    const getStatusColor = (balance: number) => {
        if (balance <= 0) return 'text-destructive';
        if (balance < 50) return 'text-orange-500';
        return 'text-green-500';
    };

    return (
        <>
            {paymentOpen && intentId && (
                <TreasuryPaymentModal
                    open={paymentOpen}
                    onOpenChange={setPaymentOpen}
                    paymentIntentId={intentId}
                    tenantSlug={user?.tenantSlug ?? ''}
                    initiateUrl={initiateUrl}
                    amount={pendingAmount}
                    currency="KES"
                    referenceType="topup"
                    customerEmail={user?.email}
                    onPaymentConfirmed={() => {
                        setPaymentOpen(false);
                        setTopUpAmount('');
                        queryClient.invalidateQueries({ queryKey: billingKeys.balance('SMS') });
                        queryClient.invalidateQueries({ queryKey: billingKeys.balance('WHATSAPP') });
                        queryClient.invalidateQueries({ queryKey: ['billing', 'transactions'] });
                    }}
                    onPaymentFailed={() => {
                        setPaymentOpen(false);
                    }}
                />
            )}

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
                                    onClick={() => { setSelectedType('WHATSAPP'); setTopUpAmount(''); }}
                                >
                                    Buy WhatsApp Units
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
                                <h3 className="text-xl font-bold mb-2">Buy Extra Units</h3>
                                <p className="text-sm text-muted-foreground">
                                    Top up <span className="font-semibold">{selectedType}</span> credits. Added instantly upon payment.
                                </p>
                                <div className="flex gap-2 mt-3">
                                    {(['SMS', 'WHATSAPP'] as const).map((t) => (
                                        <Button
                                            key={t}
                                            size="sm"
                                            variant={selectedType === t ? 'primary' : 'outline'}
                                            onClick={() => setSelectedType(t)}
                                        >
                                            {t}
                                        </Button>
                                    ))}
                                </div>
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
                                        <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txLoading ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground italic">
                                                No transactions yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                                                <td className="py-4 px-6">
                                                    <span className="text-sm font-medium text-foreground">{formatRelativeTime(tx.created_at)}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <Badge className={`${ACTION_COLORS[tx.action] ?? ''} border-none font-semibold text-[10px]`}>
                                                        {tx.type}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-sm text-muted-foreground">
                                                        {tx.description || ACTION_LABELS[tx.action] || tx.action}
                                                        {tx.reference_id && (
                                                            <span className="ml-1 text-xs text-muted-foreground/60 font-mono">
                                                                ref: {tx.reference_id.slice(0, 8)}…
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className={`text-sm font-semibold ${tx.action === 'TOPUP' || tx.action === 'REFUND' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                                        {tx.action === 'TOPUP' || tx.action === 'REFUND' ? '+' : '-'} {tx.amount.toLocaleString()} Units
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className="text-sm text-muted-foreground">{tx.new_balance.toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
}
