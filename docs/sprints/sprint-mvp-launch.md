# Sprint MVP Launch (March 17, 2026)

**Progress (March 2026)**: **RBAC & TanStack Query:** Roles/permissions from auth-api GET /me with TanStack Query (useMe hook, 5 min TTL). AuthProvider and nav use useMe; `/unauthorized` page added. All /me fetches via TanStack Query; store synced for compatibility. Notifications-api has no local RBAC (auth-api is source); Redis (rate limit, idempotency) and NATS/events documented in plan.md. — Verified in code: CP-1 SSO/OIDC PKCE flow (buildAuthorizeUrl, exchangeCodeForTokens), callback at `/{orgSlug}/auth/callback`, tokens in session, unauthenticated redirect via AuthProvider. CP-2 dashboard route exists but metrics are static placeholders (no API fetch). CP-3 templates page and editor call `templatesApi.list(orgSlug)` / `templatesApi.get(orgSlug, ...)`. CP-4 orgSlug from URL passed to all API calls (templates, settings, analytics, branding). **Branding**: BrandingProvider + `/api/v1/{orgSlug}/branding` load logo/colors per org; `/urban-loft/settings/branding` page exists with edit and preview (HP-2). Other UIs (auth-ui, pos-ui, subscriptions-ui) use auth-api GET tenants/by-slug for tenant/brand when they do not have their own branding API.

**Duration**: March 6 -- March 17, 2026 (10 working days)
**Status**: In Progress
**Goal**: Ship a production-ready notifications management UI at `notifications.codevertexitsolutions.com` enabling `urban-loft` tenant admins to manage templates, view delivery logs, and configure branding.

### Fixes applied (March 6)
- **API paths**: UI now calls `/api/v1/{orgSlug}/templates` (was `/api/v1/templates/{orgSlug}`) and `/api/v1/{orgSlug}/providers/available`; platform providers at `/api/v1/platform/providers`. Fixes 401 on templates and 404 on settings/providers when backend routes are under tenantId.
- **Analytics**: Backend added `GET /api/v1/analytics/delivery/{tenantId}?range=24h` (stub returns zeros). UI updated to use `/api/v1/analytics/delivery/...`. Fixes 404 on analytics/delivery.
- **PWA**: Install prompt shown at most once per day (localStorage key `notifications-ui-pwa-prompt-dismissed`).
- **Platform-admin-first**: Platform section at `/platform/providers`, `/platform/tenants`, `/platform/configuration`. Platform provider list is unscoped by tenant (backend returns all platform configs). Test button per provider calls `POST /api/v1/platform/providers/{id}/test` with `{"to": "email or phone"}` and shows success/failure. Backend stores provider secrets encrypted at rest when `NOTIFICATIONS_ENCRYPTION_KEY` is set.

---

## Hard Deadline Constraints

- **March 17**: All BengoBox services go live; notifications-ui must be accessible for tenant admins
- **Tenant**: `urban-loft` only (The Urban Loft Cafe)
- **Outlet**: Busia only
- **Scope**: Template management, delivery monitoring, provider configuration (Tier 2), branding. Advanced analytics deferred.

---

## Critical Path Tasks

### CP-1: SSO Authentication via Auth Service

**Priority**: P0 -- blocks all authenticated pages
**Owner**: Frontend

- [x] Verify OIDC PKCE flow redirects to `auth.codevertexitsolutions.com/login`
- [x] Verify callback at `/{orgSlug}/auth/callback` exchanges code for tokens
- [x] Verify tokens are stored in session and used for API calls
- [x] Verify unauthenticated users are redirected to login
- [ ] Test: login as `admin@theurbanloftcafe.com`, verify access to `/urban-loft/dashboard`
- [ ] Verify OAuth client `notifications-ui` is registered in auth-service with correct redirect URI

### CP-2: Dashboard Loads with Real Data

**Priority**: P0
**Owner**: Frontend

- [x] Verify `/urban-loft/dashboard` loads without errors
- [ ] Verify dashboard metrics (sent count, delivery rate) fetch from notifications-api
- [ ] Verify recent activity feed displays delivery events
- [ ] Handle empty state gracefully (no notifications sent yet)

### CP-3: Template Management

**Priority**: P0 -- admins need to view/edit notification templates
**Owner**: Frontend

- [x] Verify `/urban-loft/templates` lists templates from notifications-api
- [x] Verify template editor loads for individual templates
- [ ] Verify template save/update works
- [ ] Verify "Test Send" sends a preview notification
- [ ] Verify MVP templates are visible: `order_confirmation`, `order_status_update`, `order_ready`, `payment_receipt`, `welcome_email`

### CP-4: Multi-Tenant Context Isolation

**Priority**: P0
**Owner**: Frontend

- [x] Verify `[orgSlug]` parameter is extracted from URL and passed to all API calls
- [ ] Verify API calls include correct tenant scoping headers
- [x] Verify branding context (logo, colors) loads per organisation
- [ ] Test: navigating to a non-existent org slug returns 404 or redirect

---

## High Priority Tasks

### HP-1: Provider Configuration (Tier 2)

**Priority**: P1
**Owner**: Frontend

- [ ] Verify `/urban-loft/settings/providers` shows configured providers (from platform; tenant sees only available providers)
- [ ] Verify tenant admin can edit Tier 2 settings (from email, sender ID)
- [ ] Verify Tier 1 settings (API keys) are NOT visible to tenant admin
- [ ] Test: update from email -> next notification uses updated address
- [ ] Platform admin: verify `/platform/providers` lists all platform configs (Email: SMTP, SendGrid; SMS: Africa's Talking) and "Test" button calls backend test endpoint and shows success/failure

### HP-2: Branding Configuration

**Priority**: P1
**Owner**: Frontend

- [x] Verify `/urban-loft/settings/branding` loads current branding (page exists; getBranding(orgSlug), updateBranding)
- [x] Verify logo, colors, footer text can be updated (form fields + updateBranding API)
- [x] Verify live preview renders correctly (preview block in same page)
- [ ] Test: update branding -> email template preview reflects changes

### HP-3: Delivery Monitoring

**Priority**: P1
**Owner**: Frontend

- [ ] Verify `/urban-loft/monitoring` shows delivery log table
- [ ] Verify filtering by channel, status, date range works
- [ ] Verify clicking a row shows delivery details
- [ ] Verify provider health status cards display correctly

### HP-4: Responsive Layout

**Priority**: P1
**Owner**: Frontend

- [ ] Verify sidebar navigation works on desktop
- [ ] Verify mobile layout is usable (hamburger menu or bottom nav)
- [ ] Verify tables scroll horizontally on mobile
- [ ] Verify template editor stacks vertically on mobile

---

## Medium Priority Tasks

### MP-1: Security Settings Page

**Priority**: P2

- [ ] Verify `/urban-loft/settings/security` loads
- [ ] Verify webhook signing secret is displayed (masked)
- [ ] Verify copy-to-clipboard works

### MP-2: Error Handling & Empty States

**Priority**: P2

- [ ] Verify network errors show toast notification with retry
- [ ] Verify empty states (no templates, no logs) show helpful messaging
- [ ] Verify session expiry redirects to login gracefully

### MP-3: Performance

**Priority**: P2

- [ ] Verify page load time < 3s on 3G
- [ ] Verify Next.js code splitting is working
- [ ] Verify API calls use appropriate caching (TanStack Query or equivalent)

---

## Out of Scope (Post-MVP)

- Push notification device registration UX
- Advanced analytics (charts, trends, A/B comparisons)
- Template version history
- Bulk notification UI
- Scheduled notification management
- Export delivery logs to CSV
- Multi-language template editor
- Dark mode

---

## Deployment Checklist

### Pre-Launch (March 14-16)

- [ ] Verify environment variables in K8s ConfigMap/Secrets:
  - `NEXT_PUBLIC_API_BASE_URL` -> `https://notificationsapi.codevertexitsolutions.com`
  - SSO client ID, redirect URI
- [ ] Verify OAuth client `notifications-ui` registered in auth-service
- [ ] Build production Docker image and push to registry
- [ ] Smoke test all pages on staging with `urban-loft` org slug
- [ ] Verify CORS between notifications-ui and notifications-api

### Launch Day (March 17)

- [ ] Deploy final image via ArgoCD
- [ ] Verify landing page loads at `https://notifications.codevertexitsolutions.com`
- [ ] Verify SSO login works
- [ ] Verify `/urban-loft/dashboard` shows real data
- [ ] Verify `/urban-loft/templates` lists MVP templates
- [ ] Monitor for JavaScript errors

### Post-Launch (March 18-21)

- [ ] Monitor page load performance
- [ ] Review browser console errors
- [ ] Collect tenant admin feedback on template management UX
- [ ] Triage blocking bugs as hotfixes

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth-service SSO down | Cannot login to notifications-ui | Display maintenance page; monitor auth-service health |
| Notifications-api unreachable | Dashboard/templates show empty/errors | Graceful error states; retry logic; API health monitoring |
| Branding not loaded | Emails use default/broken styling | Fallback branding defaults; verify branding seed on deploy |
| Template editor MJML rendering fails | Cannot preview email templates | Client-side MJML renderer with error boundary |
| Org slug mismatch | 403/404 on all API calls | Validate slug on mount; redirect to default org on error |

---

## Success Criteria

- [ ] Tenant admin can login and access `/urban-loft/dashboard`
- [ ] Tenant admin can view and edit notification templates
- [ ] Delivery logs show notifications triggered by ordering/payment events
- [ ] Branding configuration updates reflect in email template previews
- [ ] Provider settings (Tier 2) are editable by tenant admin
- [ ] Platform secrets (Tier 1) are NOT accessible from notifications-ui
- [ ] Page load time < 3s on broadband
- [ ] Zero JavaScript errors on critical paths (login, dashboard, templates)
