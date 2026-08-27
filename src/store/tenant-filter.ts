import { create } from 'zustand';

// Platform-admin "act as tenant X" selection — mirrors subscriptions-ui's identical store
// (src/store/tenant-filter.ts there) so the same top-nav tenant-switcher mechanism works the
// same way across both apps. Deliberately NOT persisted (no zustand `persist` middleware): the
// selection is meant to be a per-session, in-memory "what am I looking at right now" choice that
// resets on a full reload, not a sticky preference. It survives client-side route navigation
// because this is a module-level store, not React context tied to a provider in the tree.
export interface TenantOption {
    id: string;
    slug: string;
    name: string;
}

interface TenantFilterState {
    selectedTenant: TenantOption | null;
    setSelectedTenant: (tenant: TenantOption | null) => void;
    clearTenant: () => void;
    tenantIdParam: () => string;
}

export const useTenantFilterStore = create<TenantFilterState>((set, get) => ({
    selectedTenant: null,
    setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),
    clearTenant: () => set({ selectedTenant: null }),
    tenantIdParam: () => get().selectedTenant?.id ?? '',
}));
