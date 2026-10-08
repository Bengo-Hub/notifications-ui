'use client';

// The app's one confirm step, in place of the browser's confirm() and prompt(): same look as every
// other modal, a clear primary action, and an optional text field (a rejection reason, say).
//
//   const { confirm, dialog } = useConfirm();
//   const { ok } = await confirm({ title: 'Delete it?', confirmLabel: 'Delete', tone: 'destructive' });
//   ...render {dialog} once in the component.

import { Button } from '@/components/ui/base';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'destructive';
    /** Ask for text too; with required, the confirm button waits for it. */
    input?: { label: string; placeholder?: string; required?: boolean };
}

export interface ConfirmResult {
    ok: boolean;
    value: string;
}

type Pending = { opts: ConfirmOptions; resolve: (r: ConfirmResult) => void };

export function useConfirm() {
    const [pending, setPending] = useState<Pending | null>(null);
    const [value, setValue] = useState('');

    const confirm = useCallback(
        (opts: ConfirmOptions) =>
            new Promise<ConfirmResult>((resolve) => {
                setValue('');
                setPending({ opts, resolve });
            }),
        [],
    );

    const finish = (ok: boolean) => {
        pending?.resolve({ ok, value: value.trim() });
        setPending(null);
    };

    const opts = pending?.opts;
    const blocked = !!opts?.input?.required && value.trim() === '';
    const dialog = opts ? (
        <Modal open onClose={() => finish(false)} title={opts.title} description={opts.description} className="w-full max-w-md shadow-xl">
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!blocked) finish(true);
                }}
            >
                {opts.input && (
                    <label className="block space-y-1.5 text-sm">
                        <span className="font-medium">{opts.input.label}</span>
                        <textarea
                            autoFocus
                            rows={3}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={opts.input.placeholder}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </label>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => finish(false)}>
                        {opts.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        autoFocus={!opts.input}
                        disabled={blocked}
                        className={cn(opts.tone === 'destructive' && 'bg-destructive text-white hover:bg-destructive/90')}
                    >
                        {opts.confirmLabel ?? 'Confirm'}
                    </Button>
                </div>
            </form>
        </Modal>
    ) : null;

    return { confirm, dialog };
}
