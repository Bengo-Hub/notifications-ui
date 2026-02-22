'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { NotificationTemplate, templatesApi } from '@/lib/api/templates';
import { cn } from '@/lib/utils';
import { ArrowLeft, Code, Eye, Info, Mail, MessageSquare, Plus, Save, Smartphone, Zap } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function TemplateEditorPage() {
    const { orgSlug, id } = useParams() as { orgSlug: string; id: string };
    const router = useRouter();
    const isNew = id === 'new';

    const [template, setTemplate] = useState<Partial<NotificationTemplate>>({
        name: '',
        type: 'email',
        subject: '',
        content: '',
        organizationId: orgSlug,
    });
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    useEffect(() => {
        if (!isNew) {
            loadTemplate();
        }
    }, [id]);

    const loadTemplate = async () => {
        try {
            setLoading(true);
            const data = await templatesApi.get(id);
            setTemplate(data);
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
            // Mock data for demo
            if (id === '1') {
                setTemplate({
                    id: '1',
                    name: 'Welcome Email',
                    type: 'email',
                    subject: 'Welcome to TruLoad, {{user_name}}!',
                    content: '<h1>Welcome!</h1><p>Hi {{user_name}}, we are glad to have you...</p>',
                    organizationId: orgSlug
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isNew) {
                await templatesApi.create(template);
                toast.success('Template created successfully');
            } else {
                await templatesApi.update(id, template);
                toast.success('Template updated successfully');
            }
            router.push(`/${orgSlug}/templates`);
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-muted-foreground">Loading editor...</div>;

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 w-[1px] bg-border mx-2"></div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isNew ? 'New Template' : `Edit: ${template.name}`}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-accent/30 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === 'edit' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Code className="h-4 w-4 inline mr-2" />
                            Edit
                        </button>
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === 'preview' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Eye className="h-4 w-4 inline mr-2" />
                            Preview
                        </button>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold secondary-foreground">Template Name</label>
                                    <input
                                        value={template.name}
                                        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                                        placeholder="e.g. Welcome Email"
                                        className="w-full bg-accent/20 border-border rounded-lg py-2 px-4 focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold secondary-foreground">Channel Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['email', 'sms', 'push'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setTemplate({ ...template, type: type as any })}
                                                className={cn(
                                                    "flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition-all capitalize",
                                                    template.type === type ? "bg-primary/10 border-primary text-primary" : "bg-accent/10 border-border text-muted-foreground hover:border-muted"
                                                )}
                                            >
                                                {type === 'email' && <Mail className="h-3 w-3" />}
                                                {type === 'sms' && <MessageSquare className="h-3 w-3" />}
                                                {type === 'push' && <Smartphone className="h-3 w-3" />}
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {template.type === 'email' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold secondary-foreground">Subject Line</label>
                                    <input
                                        value={template.subject}
                                        onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                                        placeholder="Enter email subject"
                                        className="w-full bg-accent/20 border-border rounded-lg py-2 px-4 focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold secondary-foreground">Content</label>
                                    <Badge variant="default">Markdown Support</Badge>
                                </div>
                                <textarea
                                    value={template.content}
                                    onChange={(e) => setTemplate({ ...template, content: e.target.value })}
                                    rows={15}
                                    placeholder="Type your template content here..."
                                    className="w-full bg-accent/10 border-border rounded-lg p-4 font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[400px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <h3 className="font-bold">Available Variables</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {[
                                    { name: 'user_name', desc: "Recipient's full name" },
                                    { name: 'org_name', desc: "Organization display name" },
                                    { name: 'date', desc: "Current date (ISO format)" },
                                    { name: 'action_url', desc: "CTA button link" },
                                ].map((v) => (
                                    <div key={v.name} className="p-4 hover:bg-accent/5 transition-colors cursor-pointer group">
                                        <div className="flex items-center justify-between">
                                            <code className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                {`{{${v.name}}}`}
                                            </code>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-2">{v.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Info className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold">Dynamic Preview</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        The preview tab on the top-right shows how your template will look with sample data replaced.
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
