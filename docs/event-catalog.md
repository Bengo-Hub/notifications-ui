# Event Catalog

## Inbound Events (from other services)

| Subject | Description | Producer |
| ------- | ----------- | -------- |
| `treasury.invoice.due` | Invoice due reminder required | Treasury Service |
| `treasury.payment.success` | Payment confirmed, send receipt | Treasury Service |
| `food.orders.status.changed` | Order status update for customer push/SMS | Food Delivery Backend |
| `erp.payroll.generated` | Payroll notification for employees | ERP System |

## Outbound Events (emitted by notifications service)

| Subject | Description |
| ------- | ----------- |
| `notifications.delivery.accepted` | Message accepted by provider |
| `notifications.delivery.failed` | Provider rejected delivery |
| `notifications.delivery.completed` | Provider confirmed delivery (email opened, SMS delivered) |
| `notifications.campaign.completed` | Campaign finished processing |

## Event Fields

Common fields across events:

- `tenantId` – organisation/branch identifier
- `channel` – `email`, `sms`, `push`
- `template` – template identifier used
- `metadata` – map for correlation IDs, campaign IDs
- `retries` – number of attempts for delivery (outbound)

## Schema Governance

- JSON Schemas stored under `docs/schemas/` (to be added)
- Schemas versioned with semantic version; breaking changes require new schema ID
- Schema registry integration planned (e.g., Redpanda/Schema Registry)
