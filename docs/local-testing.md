# Local Testing

This guide helps you run the Notifications Service locally. It assumes:
- PostgreSQL is installed locally and reachable
- Redis and NATS run in Docker (preferred)

## 1) Prepare Environment

Copy and edit env:

```bash
cp config/app.env.example .env
```

Set at minimum:
- `NOTIFICATIONS_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/notifications?sslmode=disable`
- `NOTIFICATIONS_REDIS_ADDR=localhost:6381`
- `NOTIFICATIONS_NATS_URL=nats://localhost:4222`

Optional provider keys for live delivery:
- `NOTIFICATIONS_SENDGRID_API_KEY=...`
- `NOTIFICATIONS_TWILIO_ACCOUNT_SID=...`
- `NOTIFICATIONS_TWILIO_AUTH_TOKEN=...`

## 2) Run Redis and NATS in Docker

```bash
docker run -d --name redis -p 6381:6379 redis:7
docker run -d --name nats -p 4222:4222 nats:2 -js
```

## 3) Start API

```bash
go run ./cmd/api
```

The API serves on `http://localhost:4002`.

## 4) Start Worker

```bash
go run ./cmd/worker
```

The worker consumes messages from NATS JetStream and performs delivery.

## 5) Quick Test

Queue an email:

```bash
curl -s -X POST http://localhost:4002/v1/bengobox/notifications/messages \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: bengobox" \
  -d '{
        "channel":"email",
        "tenant":"bengobox",
        "template":"payment_success",
        "to":["dev@bengobox.com"],
        "data":{"name":"Jane","amount":"KES 1,200","order_id":"ORD-101","brand":"BengoBox"},
        "metadata":{"subject":"Payment Received"}
      }'
```

List templates:

```bash
curl -s http://localhost:4002/v1/bengobox/templates | jq .
```

## 6) Docker (optional)

```bash
docker build -t notifications-app:local .
docker run --rm -p 4002:4002 --env-file .env notifications-app:local
```


