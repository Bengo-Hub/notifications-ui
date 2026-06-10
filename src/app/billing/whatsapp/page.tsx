'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { Button, Card, CardContent, Badge } from '@/components/ui/base';
import {
    MessageCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertCircle,
    Zap,
} from 'lucide-react';
import {
    whatsappKeys,
    useWhatsAppPlans,
    useWhatsAppSubscription,
    useCancelWhatsApp,
} from '@/hooks/use-whatsapp';
import { whatsappApi, type WhatsAppPlan } from '@/lib/api/whatsapp';

const STATUS_CONFIG = {
    active: { label: 'Active', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: XCircle },
    expired: { label: 'Expired', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: Clock },
    trial: { label: 'Trial', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Zap },
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function PlanCard({ plan, current, onSubscribe }: { plan: WhatsAppPlan; current?: boolean; onSubscribe: (plan: WhatsAppPlan) => void }) {
    const isUnlimited = plan.messages_per_month === 0;
    return (
        <Card className={`overflow-hidden transition-all ${current ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}>
            {current && (
                <div className="bg-green-500 text-white text-center text-xs py-1 font-semibold tracking-wider uppercase">
                    Current Plan
                </div>
            )}
            <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">WhatsApp Business</p>
                    </div>
                </div>
            </div>
            <CardContent className="p-6 space-y-4">
                <div className="text-center">
                    <span className="text-4xl font-bold">KES {plan.price_monthly.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm ml-1">/ month</span>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{isUnlimited ? 'Unlimited messages/month' : `${plan.messages_per_month.toLocaleString()} messages/month`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>WhatsApp Business API</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>Template messaging</span>
                    </div>
                    {isUnlimited && (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="font-medium">No quota limits</span>
                        </div>
                    )}
                </div>
                <Button
                    variant={current ? 'outline' : 'primary'}
                    className="w-full"
                    onClick={() => onSubscribe(plan)}
                    disabled={current}
                >
                    {current ? 'Current Plan' : 'Subscribe'}
                </Button>
            </CardContent>
        </Card>
    );
}

export default function WhatsAppBillingPage() {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();

    const { data: plansData, isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = useWhatsAppPlans();
    const { data: subData, isLoading: subLoading } = useWhatsAppSubscription();
    const cancelMutation = useCancelWhatsApp();

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [intentId, setIntentId] = useState('');
    const [initiateUrl, setInitiateUrl] = useState('');
    const [pendingAmount, setPendingAmount] = useState(0);
    const [isInitiating, setIsInitiating] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const plans = plansData?.data ?? [];
    const subscription = subData?.subscription ?? null;
    const activePlanId = subscription?.status === 'active' ? subscription.plan.id : null;

    const handleSubscribe = async (plan: WhatsAppPlan) => {
        setIsInitiating(true);
        try {
            const result = await whatsappApi.subscribe({
                plan_id: plan.id,
                return_url: `${window.location.origin}/billing/whatsapp?status=success`,
            });
            if (result.initiate_url && result.intent_id) {
                setPendingAmount(plan.price_monthly);
                setIntentId(result.intent_id);
                setInitiateUrl(result.initiate_url);
                setPaymentOpen(true);
            } else if (result.authorization_url) {
                window.location.href = result.authorization_url;
            }
        } catch (err) {
            console.error('Failed to initiate subscription', err);
        } finally {
            setIsInitiating(false);
        }
    };

    const handleCancel = async () => {
        try {
            await cancelMutation.mutateAsync();
            setShowCancelConfirm(false);
        } catch (err) {
            console.error('Failed to cancel subscription', err);
        }
    };

    const statusCfg = subscription ? STATUS_CONFIG[subscription.status] : null;

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
                    referenceType="whatsapp_subscription"
                    customerEmail={user?.email}
                    onPaymentConfirmed={() => {
                        setPaymentOpen(false);
                        queryClient.invalidateQueries({ queryKey: whatsappKeys.subscription() });
                    }}
                    onPaymentFailed={() => setPaymentOpen(false)}
                />
            )}

            <div className="p-6 max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">WhatsApp Subscription</h1>
                    <p className="text-muted-foreground mt-1">Manage your WhatsApp Business messaging plan.</p>
                </div>

                {/* Current subscription card */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border bg-green-500/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <MessageCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Current Subscription</h3>
                                    <p className="text-xs text-muted-foreground">WhatsApp Business API access</p>
                                </div>
                            </div>
                            {statusCfg && (
                                <Badge className={`${statusCfg.color} rounded-full font-semibold px-3 py-1 text-[10px] uppercase tracking-wider`}>
                                    {statusCfg.label}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <CardContent className="p-6">
                        {subLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading subscription...</span>
                            </div>
                        ) : subscription ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Plan</p>
                                        <p className="font-semibold">{subscription.plan.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Messages Used</p>
                                        <p className="font-semibold">
                                            {subscription.messages_used.toLocaleString()}
                                            {subscription.plan.messages_per_month > 0 && (
                                                <span className="text-muted-foreground font-normal"> / {subscription.plan.messages_per_month.toLocaleString()}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Started</p>
                                        <p className="font-semibold">{formatDate(subscription.started_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Expires</p>
                                        <p className="font-semibold">{formatDate(subscription.expires_at)}</p>
                                    </div>
                                </div>
                                {subscription.status === 'active' && (
                                    <div className="pt-2">
                                        {showCancelConfirm ? (
                                            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-200 dark:border-red-900">
                                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                <span className="text-sm flex-1">Cancel subscription? You&apos;ll retain access until {formatDate(subscription.expires_at)}.</span>
                                                <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
                                                    {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                                </Button>
                                                <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>Keep</Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" onClick={() => setShowCancelConfirm(true)} className="text-red-600 border-red-200 hover:bg-red-500/10">
                                                Cancel Subscription
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <AlertCircle className="h-4 w-4" />
                                <span>No active WhatsApp subscription. Choose a plan below to get started.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Plan comparison */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Available Plans</h2>
                    {plansLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading plans...</span>
                        </div>
                    ) : plansError ? (
                        <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                            <p className="text-sm text-destructive">Failed to load plans.</p>
                            <button onClick={() => refetchPlans()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            No plans available at the moment.
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    current={plan.id === activePlanId}
                                    onSubscribe={handleSubscribe}
                                />
                            ))}
                        </div>
                    )}
                    {isInitiating && (
                        <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Initiating payment...</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
