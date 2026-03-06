# Sprint 4: Notifications UI — Full scope, stack alignment & DevOps

**Goal:** Align notifications-ui with latest stable stack, complete all user interfaces for managing notifications and configs (including tenants), ensure uniform backend connection, and implement deployment DevOps configs using the same pattern as other MVP UIs (rider-app / game-stats-ui approach) and devops-k8s centralized scripts.

**Tenant slug consistency:** Use the same tenant slugs across auth-service and all services that integrate with notifications: **codevertex** (platform owner), **mss** (Masterspace Solutions, masterspace.co.ke), **urban-loft** (Urban Loft Cafe, theurbanloftcafe.com), **kura** (KURA, kura.go.ke), **ultichange** (UltiChange, ultichange.org). All API calls and routes must use `orgSlug` from URL; no hardcoded tenant slugs except default fallback.

---

## 1. Stack (latest stable & libraries)

| Layer | Target |
|-------|--------|
| Framework | **Next.js** (latest stable, e.g. 15.x or 16.x) with App Router |
| UI library | **React** (latest stable, 19.x) |
| Component library | **shadcn/ui** (Button, Card, Input, Label, Table, Tabs, Dialog, Select, etc.) and **React** ecosystem libraries |
| Styling | **Tailwind CSS** (v4 or latest stable) |
| PWA | **@ducanh2912/next-pwa** or equivalent; **PWA install prompt** (aggressive, at least once per 30 min if not installed); mobile responsive |
| Design | Modern, intuitive layout; mobile-first responsive design |
| Data & state | **TanStack Query** for all API fetches; **Zustand** for auth/session |

---

## 2. User interfaces (complete backend connection)

All UIs must call **notifications-api** (and auth-api for /me); no mock or dummy data.

| Area | Routes / pages | Backend |
|------|----------------|---------|
| **Tenant dashboard** | `/[orgSlug]/dashboard` | Notifications-api metrics/delivery |
| **Templates** | `/[orgSlug]/templates`, `/[orgSlug]/templates/[id]` | `GET/POST/PUT /api/v1/{orgSlug}/templates` |
| **Settings – providers** | `/[orgSlug]/settings/providers` | Platform + tenant provider config |
| **Settings – branding** | `/[orgSlug]/settings/branding` | `GET/PUT /api/v1/{orgSlug}/branding` |
| **Settings – security** | `/[orgSlug]/settings/security` | Webhook/security config |
| **Monitoring / delivery** | `/[orgSlug]/monitoring` | Delivery log API |
| **Platform admin** | `/platform/providers`, `/platform/tenants`, `/platform/configuration` | `/api/v1/platform/*` |
| **Auth** | `/[orgSlug]/auth/callback`, login redirect | Auth-api OAuth + GET /me |

- **Tenant context:** `orgSlug` from URL; pass to every API call (path or header).
- **Branding:** Load from notifications-api `/[orgSlug]/branding` (or auth-api tenants/by-slug) and apply to theme (logo, colors).

---

## 3. DevOps (game-stats-ui / rider-app approach)

Reuse **devops-k8s** centralized scripts and workflows; no one-off scripts.

| Asset | Purpose |
|-------|---------|
| **Dockerfile** | Multi-stage build; Next.js standalone; build args for `NEXT_PUBLIC_*` (API URL, SSO URL) |
| **build.sh** | Build image, push to registry, sync secrets from devops-k8s, run centralized `update-values.sh` (or equivalent) to update Helm values |
| **.github/workflows/deploy.yml** | On push to main (and workflow_dispatch); sync-secrets job; deploy job with `DEPLOY=true`, `ENV_SECRET_NAME`, `VALUES_FILE_PATH=apps/notifications-ui/values.yaml`; use **Bengo-Hub/devops-k8s** actions (e.g. install-devops-tools) |
| **values.yaml** | In **devops-k8s** repo under `apps/notifications-ui/values.yaml`; image tag, env, ingress if needed (frontend does not need ingress CORS for itself) |
| **KubeSecrets/devENV.yaml** | Local/dev secret template for `NEXT_PUBLIC_*` and API URLs |

Pattern: same as **rider-app** and **notifications-ui** (existing): build.sh calls devops-k8s clone and update_helm_values; deploy.yml sets `VALUES_FILE_PATH`, `APP_NAME`, `NAMESPACE`, `ENV_SECRET_NAME`.

---

## 4. Notifications-api alignment (game-stats-api approach)

- **Tenant IDs / slugs:** Notifications-api seed and API must use the same slugs: **codevertex**, **mss**, **urban-loft**, **kura**, **ultichange** (see auth-api seed and shared-docs).
- **Routes:** ` /api/v1/{tenantId}` or ` /api/v1/{orgSlug}` consistently; UI uses `orgSlug` from URL.
- **Platform routes:** ` /api/v1/platform/providers`, etc., for platform admin only.

---

## 5. PWA and mobile

- **PWA:** Installable; service worker; offline fallback where appropriate.
- **Install prompt:** Shown at least once per 30 minutes if not installed (localStorage key + timestamp).
- **Mobile:** All layouts responsive; tables scroll horizontally; sidebar collapses to hamburger on small screens.

---

## 6. Checklist (sprint 4)

- [ ] Next.js and React on latest stable; shadcn/ui and Tailwind added/updated
- [ ] All notification/config/tenant UIs implemented with real API calls (no mocks)
- [ ] Tenant slug from URL (`[orgSlug]`) used everywhere; slugs match auth-api (mss, urban-loft, kura, ultichange, codevertex)
- [ ] PWA install prompt (frequency per product requirement, e.g. once per 30 min)
- [ ] Mobile responsive layout and tables
- [ ] Dockerfile with build args for production API/SSO URLs
- [ ] build.sh and deploy.yml using devops-k8s centralized scripts
- [ ] values.yaml in devops-k8s for notifications-ui (image, env)
- [ ] Notifications-api seed and routes use same tenant slugs; branding/metadata include base_domain where applicable

---

## 7. References

- [sprint-mvp-launch.md](./sprint-mvp-launch.md) — MVP launch tasks and deadlines
- [shared-docs/mvp-critical-path.md](../../../shared-docs/mvp-critical-path.md) — CORS, tenants, RBAC
- [shared-docs/devops-k8s-ingress-cors.md](../../../shared-docs/devops-k8s-ingress-cors.md) — Ingress CORS for backend APIs
- rider-app: `logistics-service/rider-app/build.sh`, `.github/workflows/deploy.yml`, `Dockerfile`
