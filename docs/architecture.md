# Architecture Overview

## Layers

- **Transport (`internal/http`)**: Gin-based REST API, future ConnectRPC gateway. Provides endpoints for tenancy, template management, message orchestration, and preferences.
- **Application (`internal/app`)**: Configures infrastructure, dependency graph, HTTP server lifecycle, worker bootstrap.
- **Messaging (`internal/messaging`)**: Domain services handling provider routing, idempotency, rate limiting, preference enforcement.
- **Providers (`internal/providers`)**: Channel adapters for email (SendGrid/Mailgun), SMS (Twilio/Africa's Talking), push (FCM/APNS). Each implements a common interface for send/status operations.
- **Platform (`internal/platform`)**: Infrastructure adapters (Postgres, Redis, NATS JetStream, template loader, observability).
- **Shared (`internal/shared`)**: Logging, middleware, error handling utilities.

## Data Stores

- **PostgreSQL** – multi-tenant metadata (templates, providers, preferences, audit logs).
- **Redis** – rate limiting counters, idempotency keys, short-lived verification tokens.
- **Object Storage** – MJML assets, attachments (future).

## Event Flow

- Inbound events from services (orders, payments, invoices) published to NATS JetStream `notifications.events` subject.
- Worker consumes events, maps payload to template + channel strategy, queues messages.
- Delivery statuses emitted back to event bus (`notifications.delivery.*`) for analytics and downstream updates.
- Webhooks from providers (SendGrid, Twilio) processed via dedicated endpoints (to be added).

## Identity & Authorization (RBAC)

- **Identity Module (`internal/modules/identity`)**: Manages local user records synced from auth-service via NATS events (`auth.user.created`, `auth.user.updated`, `auth.user.deactivated`).
- **JIT Provisioning**: Valid JWT but missing local user → auto-create with default `viewer` role from token claims.
- **Legacy Roles**: `viewer` (read-only), `manager` (send + manage), `admin` (full tenant), `superuser` (platform-wide).
- **Legacy Permissions**: 20 fine-grained permissions in `module:action` format across notifications, templates, providers, settings, billing, analytics, credits, users, and platform modules.
- **Authenticator Middleware (`internal/http/handlers/identity`)**: `RequireAuth` (JWT + user load), `RequireRoles`, `RequirePermissions` with superuser/admin bypass.
- **Priority**: JWT claims (source of truth) → local DB permissions (fallback).
- **Legacy Ent Schemas**: `User`, `Role`, `Permission` with many-to-many edges (`user_roles`, `role_permissions`).

### Full RBAC System (Canonical Pattern)

Following the treasury-api canonical pattern, the service now includes a full database-backed RBAC system:

- **RBAC Module (`internal/modules/rbac`)**: Service, repository, and models for managing notification permissions, roles, and user-role assignments.
- **New Ent Schemas**:
  - `NotificationPermission` — permissions with `permission_code` (e.g. `notifications.templates.view`), module, action, resource.
  - `NotificationRole` — tenant-scoped roles with `role_code` (e.g. `notifications_admin`, `operator`, `viewer`), `is_system_role` flag.
  - `NotificationRolePermission` — junction table linking roles to permissions (Through edge).
  - `UserRoleAssignment` — user-role mapping with `assigned_by`, `assigned_at`, optional `expires_at`.
  - `RateLimitConfig` — DB-driven rate limit configuration per service, key type, and endpoint pattern.
  - `ServiceConfig` — key-value service configuration with optional tenant-specific overrides.
- **Permission Codes**: Use `notifications.{module}.{action}` format (e.g. `notifications.templates.view`, `notifications.billing.manage`).
- **Modules**: notifications, templates, providers, credits, billing, delivery_logs, config, users, analytics, platform.
- **Actions**: add, view, view_own, change, change_own, delete, delete_own, manage, manage_own.
- **System Roles**: `notifications_admin` (full access), `operator` (send + manage), `viewer` (read-only). Seeded per-tenant.
- **RBAC API**: `GET /rbac/roles`, `GET /rbac/permissions`, `GET/POST/DELETE /rbac/assignments`, `GET /rbac/users/{userId}/roles`, `GET /rbac/users/{userId}/permissions`.
- **Handler**: `internal/http/handlers/rbac.go` — protected by `users:manage` permission.

## Tenancy & Preferences

- Requests scoped by `tenantId` (header or path param).
- Preferences store channel opt-in/out, quiet hours, locale, and custom rules.
- Routing matrix considers provider health, cost, compliance region, and tenant overrides.

## Observability

- Structured logging with request/tenant IDs.
- Prometheus metrics: delivery_latency_seconds, send_success_total, provider_failover_total.
- OTEL tracing for end-to-end message lifecycle.
- Alerting on SLA breaches (queue backlog, provider outages).

## Deployment

- Containerized (Docker) with Helm chart per environment.
- GitOps via ArgoCD; secrets from Vault/Kubernetes secrets.
- Horizontal scaling with HPA; dedicated worker deployment for event processing.
