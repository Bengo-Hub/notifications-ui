'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useAssignRole, useAssignments, usePermissions, useRevokeRole, useRoles, useTenantUsers } from '@/hooks/use-rbac';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Loader2, Shield, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function UsersAndRolesPage() {
    const { data: roles = [], isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();
    const { data: permissions = [], isLoading: permsLoading } = usePermissions();
    const { data: assignments = [], isLoading: assignmentsLoading, isError: assignmentsError, refetch: refetchAssignments } = useAssignments();
    const { data: tenantUsers = [], isLoading: usersLoading } = useTenantUsers();
    const assignRole = useAssignRole();
    const revokeRole = useRevokeRole();

    const [userId, setUserId] = useState('');
    const [roleId, setRoleId] = useState('');

    const roleById = useMemo(() => new Map(roles.map((r) => [r.ID, r])), [roles]);
    const userById = useMemo(() => new Map(tenantUsers.map((u) => [u.id, u])), [tenantUsers]);

    const userOptions = useMemo<ComboboxOption[]>(
        () => tenantUsers.map((u) => ({ value: u.id, label: u.full_name || u.email, hint: u.full_name ? u.email : undefined })),
        [tenantUsers]
    );

    const permissionsByModule = useMemo(() => {
        const map = new Map<string, typeof permissions>();
        for (const p of permissions) {
            const list = map.get(p.Module) ?? [];
            list.push(p);
            map.set(p.Module, list);
        }
        return map;
    }, [permissions]);

    const handleAssign = async () => {
        const uid = userId.trim();
        if (!uid || !roleId) {
            toast.error('Enter a user ID and pick a role');
            return;
        }
        try {
            await assignRole.mutateAsync({ user_id: uid, role_id: roleId });
            toast.success('Role assigned');
            setUserId('');
            setRoleId('');
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to assign role');
        }
    };

    const handleRevoke = async (assignmentId: string) => {
        try {
            await revokeRole.mutateAsync(assignmentId);
            toast.success('Role revoked');
        } catch (e: any) {
            toast.error(e?.response?.data?.error ?? 'Failed to revoke role');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Users & Roles</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Manage role assignments for this organization. Roles and permissions are defined at the platform level.
                </p>
            </div>

            <Card>
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Assign Role</h3>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <SearchableCombobox
                                options={userOptions}
                                value={userId}
                                onChange={(v) => setUserId(v)}
                                placeholder={usersLoading ? 'Loading users...' : 'Select a user...'}
                                searchPlaceholder="Search by name or email..."
                                emptyText="No matching users"
                                disabled={usersLoading}
                                clearable
                            />
                        </div>
                        <select
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            className="sm:w-56 rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="">Select a role...</option>
                            {roles.map((r) => <option key={r.ID} value={r.ID}>{r.Name}</option>)}
                        </select>
                        <Button size="sm" className="gap-2 shrink-0" disabled={assignRole.isPending} onClick={handleAssign}>
                            {assignRole.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                            Assign
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Current Assignments</h3>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {assignmentsLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments...
                        </div>
                    )}
                    {assignmentsError && (
                        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                            <p className="text-sm text-destructive">Failed to load assignments.</p>
                            <button onClick={() => refetchAssignments()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                        </div>
                    )}
                    {!assignmentsLoading && !assignmentsError && assignments.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">No role assignments yet.</p>
                    )}
                    {!assignmentsLoading && assignments.length > 0 && (
                        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                            {assignments.map((a) => (
                                <div key={a.ID} className="flex items-center justify-between px-4 py-3">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">
                                            {userById.get(a.UserID)?.full_name || userById.get(a.UserID)?.email || (
                                                <span className="font-mono text-muted-foreground">{a.UserID}</span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px]">{roleById.get(a.RoleID)?.Name ?? a.RoleID}</Badge>
                                            <span>assigned {new Date(a.AssignedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 gap-1.5"
                                        disabled={revokeRole.isPending}
                                        onClick={() => handleRevoke(a.ID)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Revoke
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Roles</h3>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {rolesLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading roles...
                        </div>
                    ) : rolesError ? (
                        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 flex items-center justify-between">
                            <p className="text-sm text-destructive">Failed to load roles.</p>
                            <button onClick={() => refetchRoles()} className="text-sm font-medium text-primary hover:underline">Retry</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {roles.map((r) => (
                                <div key={r.ID} className="p-4 rounded-lg border border-border bg-card space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-sm font-semibold">{r.Name}</span>
                                        {r.IsSystemRole && <Badge variant="outline" className="text-[10px]">System</Badge>}
                                    </div>
                                    {r.Description && <p className="text-xs text-muted-foreground">{r.Description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b border-border/50 py-4">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm uppercase tracking-tight">Permissions Reference</h3>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {permsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions...
                        </div>
                    ) : (
                        Array.from(permissionsByModule.entries()).map(([module, perms]) => (
                            <div key={module} className="space-y-2">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{module}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {perms.map((p) => (
                                        <Badge key={p.ID} variant="secondary" className="text-[10px] font-mono">{p.PermissionCode}</Badge>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
