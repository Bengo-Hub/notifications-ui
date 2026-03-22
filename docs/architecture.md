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
- **Roles**: `viewer` (read-only), `manager` (send + manage), `admin` (full tenant), `superuser` (platform-wide).
- **Permissions**: 20 fine-grained permissions in `module:action` format across notifications, templates, providers, settings, billing, analytics, credits, users, and platform modules.
- **Authenticator Middleware (`internal/http/handlers/identity`)**: `RequireAuth` (JWT + user load), `RequireRoles`, `RequirePermissions` with superuser/admin bypass.
- **Priority**: JWT claims (source of truth) → local DB permissions (fallback).
- **Ent Schemas**: `User`, `Role`, `Permission` with many-to-many edges (`user_roles`, `role_permissions`).

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
