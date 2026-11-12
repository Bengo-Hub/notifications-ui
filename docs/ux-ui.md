# Notifications UI - UX/UI Specification

**Last Updated**: March 2026  
**Purpose**: User-facing flows, layouts, and interaction patterns for notifications management at `notifications.codevertexafrica.com`.

---

## Design System

- **Stack**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI
- **Auth**: SSO via auth-ui (OIDC/PKCE); GET /me for roles/permissions (TanStack Query, 5 min TTL)
- **Tenant context**: `[orgSlug]` from URL; same slugs as auth-api (codevertex, urban-loft, mss, kura, ultichange)

---

## Page Inventory

### Public
- **Landing** `/` — Redirect or service overview; sign-in CTA
- **Auth callback** `/[orgSlug]/auth/callback` — OIDC code exchange, then redirect to dashboard

### Authenticated (per orgSlug)
- **Dashboard** `/[orgSlug]/dashboard` — Metrics (sent count, delivery rate), recent activity
- **Templates** `/[orgSlug]/templates` — List and edit notification templates (order_confirmation, order_status_update, etc.)
- **Settings – Providers** `/[orgSlug]/settings/providers` — Tenant-level provider settings (Tier 2)
- **Settings – Branding** `/[orgSlug]/settings/branding` — Logo, colors, footer; live preview
- **Monitoring** `/[orgSlug]/monitoring` — Delivery log table, filters (channel, status, date)

### Platform (super_admin only)
- **Platform providers** `/platform/providers` — List/test platform provider configs (Email, SMS)
- **Platform tenants** `/platform/tenants` — Tenant overview
- **Platform configuration** `/platform/configuration` — Global config

---

## Key Flows

### Template management
- List templates from `GET /api/v1/{orgSlug}/templates`
- Edit template: load, edit body/subject, save via PUT/PATCH
- Test send: trigger test notification (backend test endpoint)

### Branding
- Load branding `GET /api/v1/{orgSlug}/branding`
- Update logo, primary color, footer text; live preview on same page

### Dashboard and Monitoring
- Metrics from analytics/delivery API; empty state when no data
- Recent activity from delivery/activity API
- Every log row shows its status badge (`src/lib/delivery-status.ts`): Sent, Delivered, Failed, or Not sent.
  "Not sent" is a send the gate held back (no SMS credits or no WhatsApp credits of the message's kind, invalid or unverified
  recipient). Without the badge, a tenant's refused SMS and WhatsApp attempts looked like real sends.
- Delivery rate shows "—" when nothing was attempted (never 0%); the not-sent count sits under the sent total.
  KPI cards show only computed figures (the old fixed trend percentages are gone).

### WhatsApp credits (/billing/whatsapp)
- One card per kind of message, by its plain name: Promotions and broadcasts, Order, payment and account updates,
  Login and verification codes, Replies to customers. Meta's category words never appear on their own.
- Each card shows the price per message, credits left, the tenant's own messages of the last 90 days that use it
  (notifications-api `GET /api/v1/settings/whatsapp/credit-categories`), or examples when there are none, and the
  bundles to buy. Activity and auto top-up follow the selected card.
- A tenant still inside a paid monthly plan (retired 2026-11-12) sees when it ends and that it will not renew.
- Prices and bundles come from subscriptions-api; nothing is priced in the app.

---

## Responsive & Accessibility

- Sidebar collapsible on mobile; tables scroll horizontally
- WCAG 2.1 Level AA; keyboard navigation; ARIA where needed

---

## References

- [Notifications UI Plan](plan.md)
- [Sprint MVP Launch](sprints/sprint-mvp-launch.md)
- [Integrations](integrations.md)
