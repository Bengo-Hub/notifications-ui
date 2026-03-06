# Sprint 1: Notifications Service Foundation

**Sprint**: 1
**Dates**: February 14, 2026
**Goal**: Email/SMS providers, NATS worker with retry, template rendering

---

## Completed

### Provider Implementations
- **SendGrid** (Email): Direct HTTP API to `api.sendgrid.com/v3/mail/send`
  - Bearer token auth, personalizations array for recipients
  - HTML and plain text body support
  - No external SDK dependency
- **Twilio** (SMS): REST API to `api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`
  - Basic auth (AccountSID:AuthToken)
  - Form-encoded body, per-recipient delivery
- **SMTP** (Email fallback): Standard Go `net/smtp` for dev/fallback
- **Push**: Placeholder for FCM/APNS (post-MVP)

### Worker Architecture
- NATS JetStream durable consumer (`notifications-worker`)
- Message format: channel, template_id, to[], data, metadata
- Template rendering with Go `html/template`
- Email base template with tenant branding injection

### Retry Logic
- Max 3 delivery attempts (`MaxDeliver(3)`)
- Failed delivery: `NAck()` → redelivery after 30s `AckWait`
- Template/parse errors: `Ack()` immediately (non-transient)
- Max retries exceeded: `Ack()` + error log

### Provider Manager
- Per-tenant provider configuration via database
- Fallback to default providers when no override
- Provider selection: `GetEmailProvider(ctx, tenantID, preferred)`
- Config fields: provider name, API key, from address

### Branding System
- Load tenant branding from database (name, logo, colors, email, phone)
- Inject branding variables into email templates
- Fallback to tenant ID when no branding configured

### RBAC (MVP)
- **No local Role/Permission schema.** Authorization is delegated to **auth-api JWT**: the service validates the Bearer token and respects claims (tenant_id, user_id, scopes/permissions) from auth-api. No seed for roles or permissions in this service; permission codes (e.g. `notifications:read`, `templates:read`) are defined and enforced centrally in auth-api.

### Build Status
- `go build ./...` — 0 errors (2 pre-existing vet warnings in smtp.go and health_test.go)
