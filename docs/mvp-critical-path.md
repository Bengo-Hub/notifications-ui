# Notifications API - MVP Critical Path

**Last Updated**: March 2026  
**Purpose**: Notifications-api MVP scope; aligns with [shared-docs/mvp-critical-path.md](../../../shared-docs/mvp-critical-path.md).

---

## Notifications API in BengoBox MVP

| Item | Status |
|------|--------|
| **Production domain** | `notificationsapi.codevertexitsolutions.com` |
| **RBAC** | No local roles; JWT from auth-api; shared-auth-client validation |
| **Endpoints** | Templates, platform providers, tenant branding, analytics/delivery, delivery logs, send message, template test send |

---

## MVP Scope

### P0
- [x] Tenant-scoped routes `/api/v1/{tenantId}/...` with JWT validation
- [x] Template list, get, update (PUT); template test send (POST .../templates/{id}/test)
- [x] Platform providers (list, create, update, delete, test)
- [x] Branding GET/PUT per tenant
- [x] Send message API (POST)
- [x] Analytics/delivery stats (real data from delivery_log store)

### P1
- [x] Idempotency (notification handler)
- [ ] Rate limiting (documented for post-MVP)
- [ ] Provider health and failover
- [x] Delivery log API for UI monitoring (GET /api/v1/analytics/logs/{tenantId})

---

## References

- [Notifications API Plan](../plan.md)
- [Integrations](integrations.md)
- [Shared MVP Critical Path](../../../shared-docs/mvp-critical-path.md)
