# Notifications UI - Implementation Plan

## Executive Summary

**System Purpose**: Central hub for managing notification channels, templates, and delivery across the BengoBox ecosystem. Provides platform admins with tools to configure SMS/Email/Push providers, create/manage notification templates, and monitor delivery status.

**Key Capabilities**:
- **Provider Management**: Configure SMS (Twilio, Africast), Email (SendGrid, AWS SES), Push (Firebase, OneSignal), WhatsApp providers
- **Template Management**: Create, version, and manage notification templates
- **Delivery Monitoring**: Track notification delivery status, bounce rates, and failures
- **Channel Routing**: Define routing rules (e.g., SMS for urgent, Email for marketing)
- **Audit & Compliance**: Notification sending audit trail

---

## Technology Stack

### Frontend Framework
- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Zustand (Global State) + TanStack Query (Server State)
- **API Client**: Axios with interceptors for auth handling
- **PWA**: `@ducanh2912/next-pwa` for service worker management
- **Authentication**: SSO via `auth-ui` (OIDC/OAuth2)

---

## Service Boundaries

### ✅ Notification Operations (Owned by Notifications UI)
- Provider configuration and testing
- Template creation and versioning
- Delivery monitoring and analytics
- Channel routing and preferences
- Audit logging

### ❌ Notification Sending → **notifications-api**
- Sending notifications is handled by the backend service
- UI monitors status but does not send directly

---

## Roadmap

### Sprint 1: Foundation & Provider Management
- [ ] Project scaffolding with Next.js 15
- [ ] SSO integration with `auth-ui`
- [ ] Core layout with notification admin shell
- [ ] Provider configuration interface (SMS, Email, Push)
- [ ] Test provider connection (ping endpoint)

### Sprint 2: Template Management
- [ ] Notification template CRUD
- [ ] Template variables and substitutions
- [ ] Template versioning
- [ ] Preview/testing templates

### Sprint 3: Monitoring & Analytics
- [ ] Delivery status dashboard
- [ ] Bounce/failure rate metrics
- [ ] Notification send history
- [ ] Channel statistics

---

## Architecture Decisions

**Tenant/brand (2026-03)**: Tenant slug from `[orgSlug]` URL parameter. Tenant info via auth-api `GET /api/v1/tenants/by-slug/{slug}`. Branding via notifications-api `GET /api/v1/{tenantId}/branding`. `BrandingProvider` applies logo and theme colors.

**RBAC (2026-03)**: Current user from auth-api `GET /api/v1/auth/me` via `useMe()` hook (TanStack Query, 5 min TTL). Sidebar platform section only for `super_admin`. AuthProvider redirects unauthenticated to SSO, 401 to SSO, and routes without super_admin to `/[orgSlug]/unauthorized`.

**API Communication**: All data fetches use TanStack Query with proper caching. `QueryClientProvider` in `[orgSlug]/layout`. Notifications-api provides:
- `GET /api/v1/platform/providers` - List all providers
- `POST /api/v1/platform/providers` - Create provider config
- `PUT /api/v1/platform/providers/{id}` - Update provider
- `DELETE /api/v1/platform/providers/{id}` - Delete provider
- `POST /api/v1/platform/providers/{id}/test` - Test connection

**MVP docs (March 2026):** [ux-ui.md](ux-ui.md), [mvp-critical-path.md](mvp-critical-path.md), [sprint-mvp-launch.md](sprints/sprint-mvp-launch.md), [integrations.md](integrations.md).

---

## File Structure

```
notifications-ui/
├── src/
│   ├── app/[orgSlug]/
│   │   ├── layout.tsx (main layout with sidebar)
│   │   ├── unauthorized/page.tsx
│   │   └── notifications/
│   │       ├── layout.tsx (notifications section layout)
│   │       ├── page.tsx (dashboard)
│   │       ├── providers/page.tsx (provider management)
│   │       ├── templates/page.tsx (template management)
│   │       └── analytics/page.tsx (monitoring)
│   ├── components/
│   │   ├── layout/ (Sidebar, Header, Breadcrumbs)
│   │   ├── notifications/ (reusable components)
│   │   │   ├── provider-card.tsx
│   │   │   ├── create-provider-dialog.tsx
│   │   │   ├── template-editor.tsx
│   │   │   └── delivery-table.tsx
│   │   └── ui/ (shared UI components)
│   ├── hooks/
│   │   ├── useMe.ts (current user + auth)
│   │   ├── useNotificationProviders.ts (TanStack Query)
│   │   └── useNotificationTemplates.ts (TanStack Query)
│   ├── lib/
│   │   ├── api-client.ts (Axios instance)
│   │   └── service-clients.ts (service-specific clients)
│   └── store/
│       └── auth-store.ts (Zustand)
├── docs/
│   ├── plan.md (this file)
│   ├── architecture.md
│   ├── ux-ui.md
│   ├── integrations.md
│   └── sprints/
│       └── sprint-1-foundations.md
└── package.json
```

---

## API Dependencies

### Auth-API
- `GET /api/v1/auth/me` - Current user info with roles/permissions
- `POST /api/v1/auth/logout` - Sign out

### Notifications-API
- `GET /api/v1/platform/providers` - List providers
- `POST /api/v1/platform/providers` - Create provider
- `PUT /api/v1/platform/providers/{id}` - Update provider
- `DELETE /api/v1/platform/providers/{id}` - Delete provider
- `POST /api/v1/platform/providers/{id}/test` - Test connection
- `GET /api/v1/platform/templates` - List templates
- `POST /api/v1/platform/templates` - Create template
- `PUT /api/v1/platform/templates/{id}` - Update template
- `DELETE /api/v1/platform/templates/{id}` - Delete template
- `GET /api/v1/platform/deliveries` - Delivery history
- `GET /api/v1/platform/analytics` - Delivery metrics

