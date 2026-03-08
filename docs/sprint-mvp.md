# Notifications-UI Sprint MVP (Plan §16)

**Purpose:** Single reference for notifications-ui scope, stack, phases, and DevOps. Align with game-stats-ui / game-stats-api approach and devops-k8s centralized scripts.

---

## Stack (latest stable)

- **Next.js** – latest stable (e.g. 16.x)
- **React** – latest stable (19.x)
- **Tailwind CSS** – v4
- **shadcn/ui** – components and theming
- **TanStack Query** – data fetching, cache TTL (e.g. 5 min for catalog, 1–2 min for admin lists)
- **PWA** – manifest, install prompt (show at most once per day), mobile-responsive
- **Auth** – SSO (auth-api) OIDC + PKCE; tenant in path and headers (`X-Tenant-ID`, `X-Tenant-Slug`)

---

## Features (full backend connection, no dummy data)

- **Tenants** – list/manage tenants; tenant slug consistent with auth-api and notifications-api seed (`mss`, `urban-loft`, `kura`, `ultichange`; platform owner `codevertex`)
- **Templates** – CRUD notification templates; test send
- **Channels** – channel configuration (email, SMS, push) per tenant
- **Delivery logs** – list/filter delivery events and status
- **Provider settings** – platform and tenant-level provider config (API keys, webhooks)
- **Tenant branding** – logo, colors per tenant
- **PWA** – install prompt, mobile-responsive layout, offline-ready where applicable

---

## Phases

1. **Setup** – Next.js, React, Tailwind, shadcn/ui, TanStack Query, env (API URL, auth URL)
2. **Auth** – SSO flow, callback at `/[orgSlug]/auth/callback`, store tokens; GET /me with tenant in path; persist `tenant_id` and `tenant_slug` for headers
3. **Tenants** – tenant list from notifications-api; slug as first-class filter; align with auth-api default tenants
4. **Templates** – list, create, edit, delete, test send; all via notifications-api tenant-scoped routes
5. **Channels & provider settings** – UI for channel config and provider credentials; platform vs tenant scope
6. **Delivery logs** – list and filter by channel, status, date; link to notifications-api delivery log endpoints
7. **Settings** – tenant branding, security (e.g. webhook secret), provider toggles
8. **PWA** – manifest, service worker, install prompt (once per day), responsive layout
9. **DevOps** – Dockerfile, build script, Helm values; reuse devops-k8s scripts (update-values, check-and-sync-secrets, create-service-secrets)

---

## Acceptance criteria

- All data from notifications-api (no hardcoded lists)
- Tenant slug in URL path and in headers for API calls; tenant slug list matches auth-api seed
- GET /me (or equivalent) returns `tenant_id` and `tenant_slug`; frontend stores and sends in headers
- TanStack Query used for all API calls with explicit stale/gc TTL
- PWA install prompt shown on supported browsers, dismissible (e.g. once per day)
- Build and deploy succeed using devops-k8s patterns (build from repo root or correct context, `-f` path to Dockerfile)

---

## DevOps

- **Build:** Run from repo root or service dir with correct context so `COPY` paths in Dockerfile resolve (see plan §14)
- **CI:** Use devops-k8s centralized workflows/scripts where applicable
- **Secrets:** Use check-and-sync-secrets, create-service-secrets from devops-k8s
- **Helm:** update-values script or equivalent for image tag and repo

---

## Tenant slug consistency

Default tenant slugs must match across auth-api, notifications-api, and notifications-ui:

| Name       | tenant_slug  |
|-----------|--------------|
| Codevertex (platform) | `codevertex` |
| Masterspace Solutions | `mss` |
| Urban Loft Cafe       | `urban-loft` |
| KURA                  | `kura` |
| UltiChange            | `ultichange` |

Use these slugs in seed data, API filters, and frontend routes.
