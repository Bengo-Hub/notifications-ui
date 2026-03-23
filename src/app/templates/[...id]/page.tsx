'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { templateKeys } from '@/hooks/use-templates';
import { NotificationTemplate, templatesApi } from '@/lib/api/templates';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Code, Eye, Info, Mail, MessageSquare, Monitor, Save, Send, Smartphone, Zap } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';


export default function TemplateEditorPage() {
    // Catch-all: [...id] gives us an array, e.g. ['auth', 'welcome'] for /templates/auth/welcome
    const params = useParams() as { id: string[] };
    const templateId = Array.isArray(params.id) ? params.id.join('/') : params.id;
    const searchParams = useSearchParams();
    const channelParam = searchParams.get('channel') ?? 'email';

    const router = useRouter();
    const queryClient = useQueryClient();
    const isNew = templateId === 'new';

    const [template, setTemplate] = useState<Partial<NotificationTemplate>>({
        name: '',
        type: channelParam as 'email' | 'sms' | 'push',
        subject: '',
        content: '',
    });
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview-html' | 'preview-visual'>('edit');

    useEffect(() => {
        if (!isNew) {
            loadTemplate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    const loadTemplate = async () => {
        try {
            setLoading(true);
            const channel = channelParam;
            const data = await templatesApi.get(templateId, channel);
            setTemplate({
                id: data.id,
                name: data.id,
                type: data.channel as 'email' | 'sms' | 'push',
                content: data.content ?? '',
            });
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
            setTemplate((prev) => ({ ...prev, id: templateId, name: templateId }));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            if (isNew) {
                toast.error('Creating new templates is not supported via API. Edit an existing template.');
                return;
            }
            const channel = template.type ?? 'email';
            await templatesApi.update(templateId, channel, {
                content: template.content ?? '',
                subject: template.subject,
            });
            toast.success('Template updated successfully');
            queryClient.invalidateQueries({ queryKey: templateKeys.all() });
            router.push('/templates');
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const [testSending, setTestSending] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');
    const handleTestSend = async () => {
        const channel = template.type ?? 'email';
        const to = testRecipient.trim() || (channel === 'email' ? 'test@example.com' : '+254700000000');
        try {
            setTestSending(true);
            await templatesApi.testSend(templateId, channel, [to], {
                name: 'Test User',
                org_name: 'Test Org',
            });
            toast.success('Test notification queued for delivery');
            queryClient.invalidateQueries({ queryKey: templateKeys.all() });
        } catch (error) {
            console.error('Test send failed:', error);
            toast.error('Test send failed');
        } finally {
            setTestSending(false);
        }
    };

    // Extract variables used in the template content (e.g. {{ .name }}, {{ or .brand_name "fallback" }})
    const templateVariables = useMemo(() => {
        const content = template.content ?? '';
        const varSet = new Set<string>();
        // Match {{ .var_name }} and {{ or .var_name "..." }}
        const regex = /\{\{\s*(?:or\s+)?\.(\w+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            varSet.add(match[1]);
        }
        return Array.from(varSet).sort();
    }, [template.content]);

    // Replace Go template variables and directives with sample values
    const processGoTemplate = (raw: string, data: Record<string, string>) => {
        let html = raw;
        for (const [key, value] of Object.entries(data)) {
            html = html.replace(new RegExp(`\\{\\{\\s*or\\s+\\\\?${key.replace('.', '\\.')}\\s+"[^"]*"\\s*\\}\\}`, 'g'), value);
            html = html.replace(new RegExp(`\\{\\{\\s*\\\\?${key.replace('.', '\\.')}\\s*\\}\\}`, 'g'), value);
        }
        html = html.replace(/\{\{\s*(?:if|end|else|define|template|range|with|block)\b[^}]*\}\}/g, '');
        html = html.replace(/\{\{\s*or\s+\.[^\s]+\s+"([^"]*)"\s*\}\}/g, '$1');
        return html;
    };

    const sampleData: Record<string, string> = {
        '.name': 'John Doe',
        '.user_name': 'John Doe',
        '.org_name': 'Acme Corp',
        '.brand_name': 'CodeVertex',
        '.brand': 'CodeVertex',
        '.brand_primary_color': '#0F766E',
        '.brand_secondary_color': '#134E4A',
        '.brand_logo_url': '',
        '.brand_email': 'hello@codevertex.com',
        '.brand_phone': '+254 700 000 000',
        '.action_url': '#',
        '.getting_started_link': '#',
        '.invoice_number': 'INV-2026-001',
        '.amount': 'KES 5,000.00',
        '.due_date': '2026-04-15',
        '.invoice_link': '#',
        '.payment_link': '#',
        '.order_id': 'ORD-12345',
        '.sent_at': new Date().toLocaleString(),
    };

    // Build visual preview — wrap content fragment in email base template
    const previewHtml = useMemo(() => {
        const contentHtml = processGoTemplate(template.content ?? '', sampleData);

        // Email base template with branding
        const baseTemplate = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { --primary: ${sampleData['.brand_primary_color']}; --secondary: ${sampleData['.brand_secondary_color']}; }
  body { font-family: Arial, sans-serif; background:#f6f9fc; color:#111827; margin:0; padding:0; }
  .container { max-width:600px; margin:0 auto; background:#ffffff; }
  .header { background: var(--primary); color:#ffffff; padding:16px 24px; display:flex; align-items:center; }
  .brand-logo { height:32px; width:auto; margin-right:12px; }
  .brand-name { font-size:18px; font-weight:700; }
  .content { padding:24px; }
  .footer { background:#f3f4f6; color:#4b5563; padding:16px 24px; font-size:12px; }
  .muted { color:#6b7280; }
  a.button { background: var(--primary); color:#ffffff !important; text-decoration:none; padding:10px 16px; border-radius:6px; display:inline-block; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand-name">${sampleData['.brand_name']}</div>
  </div>
  <div class="content">
    {{CONTENT}}
  </div>
  <div class="footer">
    <div>${sampleData['.brand_name']}</div>
    <div class="muted">Email: ${sampleData['.brand_email']} | Phone: ${sampleData['.brand_phone']}</div>
  </div>
</div>
</body>
</html>`;

        if (template.type === 'email') {
            return baseTemplate.replace('{{CONTENT}}', contentHtml);
        }
        return contentHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template.content, template.type]);

    if (loading) return <div className="p-12 text-center text-muted-foreground">Loading editor...</div>;

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
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
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-accent/30 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === 'edit' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Code className="h-4 w-4 inline mr-2" />
                            Edit
                        </button>
                        <button
                            onClick={() => setActiveTab('preview-html')}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === 'preview-html' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Eye className="h-4 w-4 inline mr-2" />
                            HTML
                        </button>
                        <button
                            onClick={() => setActiveTab('preview-visual')}
                            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === 'preview-visual' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Monitor className="h-4 w-4 inline mr-2" />
                            Visual
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isNew && (
                            <>
                                <input
                                    type="text"
                                    placeholder={template.type === 'email' ? 'test@example.com' : 'Recipient'}
                                    value={testRecipient}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestRecipient(e.target.value)}
                                    className="w-48 bg-accent/20 border border-border rounded-lg py-1.5 px-3 text-sm"
                                />
                                <Button onClick={handleTestSend} disabled={testSending} variant="outline" className="gap-2">
                                    <Send className="h-4 w-4" />
                                    {testSending ? 'Sending...' : 'Test Send'}
                                </Button>
                            </>
                        )}
                        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="space-y-6 pt-6">
                            {activeTab === 'edit' && (
                                <>
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
                                            <div className="grid grid-cols-4 gap-2">
                                                {['email', 'sms', 'push', 'whatsapp'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setTemplate({ ...template, type: type as 'email' | 'sms' | 'push' })}
                                                        className={cn(
                                                            "flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition-all capitalize",
                                                            template.type === type ? "bg-primary/10 border-primary text-primary" : "bg-accent/10 border-border text-muted-foreground hover:border-muted"
                                                        )}
                                                    >
                                                        {type === 'email' && <Mail className="h-3 w-3" />}
                                                        {type === 'sms' && <MessageSquare className="h-3 w-3" />}
                                                        {type === 'push' && <Smartphone className="h-3 w-3" />}
                                                        {type === 'whatsapp' && <MessageSquare className="h-3 w-3" />}
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
                                            <Badge variant="default">{template.type === 'email' ? 'HTML' : 'Plain Text'}</Badge>
                                        </div>
                                        <textarea
                                            value={template.content}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTemplate({ ...template, content: e.target.value })}
                                            rows={15}
                                            placeholder="Type your template content here..."
                                            className="w-full bg-accent/10 border-border rounded-lg p-4 font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[400px]"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'preview-html' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold secondary-foreground">HTML Source</label>
                                        <Badge variant="outline">Read-only</Badge>
                                    </div>
                                    <pre className="w-full bg-accent/10 border border-border rounded-lg p-4 font-mono text-xs overflow-auto min-h-[400px] max-h-[600px] whitespace-pre-wrap">
                                        {template.content}
                                    </pre>
                                </div>
                            )}

                            {activeTab === 'preview-visual' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold secondary-foreground">Visual Preview</label>
                                        <Badge variant="outline">Sample data</Badge>
                                    </div>
                                    <div className="border border-border rounded-lg overflow-hidden bg-white min-h-[400px]">
                                        <iframe
                                            srcDoc={previewHtml}
                                            className="w-full min-h-[500px] border-0"
                                            sandbox="allow-same-origin"
                                            title="Template preview"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {templateVariables.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <h3 className="font-bold">Template Variables</h3>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Detected from template content</p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {templateVariables.map((name) => (
                                        <div key={name} className="p-4 hover:bg-accent/5 transition-colors cursor-pointer group">
                                            <code className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                {`{{ .${name} }}`}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Info className="h-4 w-4 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold">Visual Preview</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Use the &quot;Visual&quot; tab to see your email template rendered with sample data. Go template directives are stripped and variables replaced with sample values.
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
