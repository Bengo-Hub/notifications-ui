# API & Event Contracts

## REST Endpoints

- `POST /v1/{tenantId}/notifications/messages`
  - Create notification intent with channel metadata, template reference, personalization data
  - Response: `202 Accepted` with `{ status: "queued", requestId: "..." }`
- `GET /v1/{tenantId}/templates`
  - List available templates for tenant (id, channel, locale)

All responses include `X-Request-ID` header for traceability. Error responses follow RFC 7807.

## Webhooks

- Providers (SendGrid, Mailgun, Twilio, FCM, APNS) POST to `/webhooks/{provider}` (to be implemented)
- Verify signatures per provider best practices; store events for compliance/audit

## Events

- **Inbound subjects**: `notifications.events` containing messages from other services (`invoice.due`, `payment.success`)
- **Outbound subjects**: `notifications.delivery.*` with status updates
- CloudEvents envelope example:

```jsonc
{
  "id": "uuid",
  "source": "treasury/invoice",
  "specversion": "1.0",
  "type": "notifications.message.enqueue",
  "datacontenttype": "application/json",
  "time": "2025-01-02T12:00:00Z",
  "data": {
    "tenantId": "org_123",
    "channel": "email",
    "template": "invoice_due",
    "payload": { "invoiceNumber": "INV-123" }
  }
}
```

## Versioning

- APIs follow `/v1` prefix; breaking changes require new version.
- Event schema evolution uses additive changes; breaking fields require new event type.

## Authentication

- REST endpoints protected with JWT service accounts (Auth middleware to be added).
- Webhooks validated via provider signatures; responses use 2xx for success, 5xx to trigger retries.
