# Notifications UI - MVP Critical Path

**Last Updated**: March 2026  
**Purpose**: Notifications-specific MVP scope; aligns with [shared-docs/mvp-critical-path.md](../../../shared-docs/mvp-critical-path.md).

---

## Notifications in BengoBox MVP

| Item | Status |
|------|--------|
| **Production domain** | `notifications.codevertexitsolutions.com` |
| **Auth-ui redirect** | `/dashboard/platform/notifications` → notifications-ui (templates/providers owned here) |
| **SSO** | OIDC/PKCE via auth-ui; GET /me for roles (admin, super_admin for platform) |
| **Templates / providers** | Implemented in notifications-api; UI in notifications-ui |

---

## MVP Scope (from sprint-mvp-launch)

### P0 — Must ship
- [x] SSO login and multi-tenant layout ([orgSlug])
- [x] Templates list and editor (useTemplates)
- [x] Branding page (getBranding, updateBranding, preview)
- [x] Platform section (platform providers, test button)
- [x] Dashboard metrics from notifications-api (sent count, delivery rate)
- [x] Template save/update and Test Send
- [x] Delivery/monitoring view (log table, filters)

### P1 — Should have
- [x] Provider configuration (Tier 2) per tenant
- [x] Empty and error states (toast, retry)
- [x] Responsive sidebar and tables

---

## References

- [Notifications UI Plan](plan.md)
- [UX/UI](ux-ui.md)
- [Sprint MVP Launch](sprints/sprint-mvp-launch.md)
- [Integrations](integrations.md)
- [Shared MVP Critical Path](../../../shared-docs/mvp-critical-path.md)
