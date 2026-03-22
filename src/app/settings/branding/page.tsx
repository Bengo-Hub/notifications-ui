'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { settingsApi, TenantBranding } from '@/lib/api/settings';
import { Code, Image as ImageIcon, Info, Palette, RefreshCw, Save, Type, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function BrandingPage() {
    const [branding, setBranding] = useState<Partial<TenantBranding>>({
        primary_color: '#0ea5e9',
        secondary_color: '#64748b',
        font_family: 'Inter, sans-serif',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadBranding = useCallback(async () => {
        try {
            setLoading(true);
            const data = await settingsApi.getBranding();
            setBranding(data || branding);
        } catch (error) {
            console.error('Failed to load branding:', error);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadBranding();
    }, [loadBranding]);

    const handleSave = async () => {
        try {
            setSaving(true);
            await settingsApi.updateBranding(branding);
            toast.success('Branding updated successfully');
        } catch (error) {
            console.error('Failed to save branding:', error);
            toast.error('Failed to save branding');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground transition-all animate-pulse">Loading design system...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="border-b border-border/50 py-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-primary" />
                                <h3 className="font-bold text-sm uppercase tracking-tight">Visual Identity</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Organization Logo</label>
                                <div className="flex items-center gap-6 p-4 rounded-2xl bg-accent/10 border border-dashed border-border group hover:bg-accent/20 transition-all cursor-pointer">
                                    <div className="h-16 w-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm overflow-hidden">
                                        {branding.logo_url ? (
                                            <img src={branding.logo_url} alt="Logo" className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <ImageIcon className="h-6 w-6 text-muted-foreground opacity-30" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold">Upload new logo</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">SVG, PNG or JPG (max. 2MB)</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Palette className="h-3 w-3" /> Primary Color
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={branding.primary_color}
                                            onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                                            className="h-10 w-10 rounded-lg border-2 border-border p-0.5 bg-card cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={branding.primary_color}
                                            onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                                            className="flex-1 bg-accent/10 border-border rounded-lg px-3 text-xs font-mono uppercase focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Palette className="h-3 w-3" /> Secondary Color
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={branding.secondary_color}
                                            onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                                            className="h-10 w-10 rounded-lg border-2 border-border p-0.5 bg-card cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={branding.secondary_color}
                                            onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                                            className="flex-1 bg-accent/10 border-border rounded-lg px-3 text-xs font-mono uppercase focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Type className="h-3 w-3" /> Typography
                                </label>
                                <select
                                    value={branding.font_family}
                                    onChange={(e) => setBranding({ ...branding, font_family: e.target.value })}
                                    className="w-full bg-accent/10 border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="Inter, sans-serif">Inter (Standard)</option>
                                    <option value="'Geist Mono', monospace">Geist Mono (Developer)</option>
                                    <option value="'Outfit', sans-serif">Outfit (Premium)</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b border-border/50 py-4">
                            <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-primary" />
                                <h3 className="font-bold text-sm uppercase tracking-tight">Advanced CSS</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-xs text-muted-foreground mb-4">Inject custom styles into the notification templates.</p>
                            <textarea
                                value={branding.custom_css}
                                onChange={(e) => setBranding({ ...branding, custom_css: e.target.value })}
                                placeholder=".notification-card { border-radius: 20px; }"
                                rows={5}
                                className="w-full bg-accent/10 border-border rounded-lg p-3 font-mono text-xs focus:ring-1 focus:ring-primary outline-none resize-none"
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="sticky top-8 overflow-hidden">
                        <CardHeader className="bg-accent/5 py-4 flex flex-row items-center justify-between">
                            <h3 className="font-bold text-sm">Live Preview</h3>
                            <Badge variant="outline" className="text-[10px] uppercase">Branding View</Badge>
                        </CardHeader>
                        <CardContent className="p-12 flex flex-col items-center justify-center bg-accent/20">
                            {/* Email Preview Mockup */}
                            <div className="w-full bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50 max-w-sm">
                                <div className="h-2 w-full" style={{ backgroundColor: branding.primary_color }} />
                                <div className="p-8 space-y-6">
                                    <div className="h-10 w-10 bg-accent/50 rounded-lg flex items-center justify-center overflow-hidden">
                                        {branding.logo_url ? <img src={branding.logo_url} alt="Logo preview" /> : <div className="h-full w-full bg-primary/20" />}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-3/4 bg-accent/30 rounded" />
                                        <div className="h-3 w-full bg-accent/20 rounded" />
                                        <div className="h-3 w-5/6 bg-accent/20 rounded" />
                                    </div>
                                    <div className="pt-4">
                                        <div className="h-10 w-full rounded-xl shadow-lg" style={{ backgroundColor: branding.primary_color, boxShadow: `0 8px 24px -8px ${branding.primary_color}` }} />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-muted-foreground mt-8 text-center italic">
                                Changes will be applied instantly to all generated templates.
                            </p>
                        </CardContent>
                        <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-card">
                            <Button variant="outline" size="sm" className="gap-2" onClick={loadBranding}>
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reset
                            </Button>
                            <Button size="sm" disabled={saving} className="gap-2 px-8 shadow-lg shadow-primary/10" onClick={handleSave}>
                                <Save className="h-3.5 w-3.5" />
                                {saving ? 'Saving...' : 'Publish Branding'}
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Info className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold uppercase tracking-tight">Theme Sync</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        The primary color chosen here will also be used in the User Hub and for all transactional SMS and Web Push notifications.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
