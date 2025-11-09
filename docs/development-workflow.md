# Development Workflow

## Prerequisites

- Go 1.22+
- PostgreSQL, Redis, NATS JetStream (Docker Compose coming soon)
- golangci-lint, buf CLI (future ConnectRPC)
- Provider sandbox credentials (SendGrid/Twilio/FCM) for integration tests

## Local Setup

```bash
cp config/app.env.example .env
make tidy
make run
```

Run the worker separately for event consumption: `make worker`.

## Branching & Commits

- Trunk-based development with `feature/`, `fix/`, `chore/` branches
- Conventional Commits (e.g. `feat(sms): add africa's talking adapter`)
- Pull request checklist:
  - [ ] `make lint` & `make test`
  - [ ] Docs updated if behaviour/contracts change
  - [ ] Feature flag / rollout plan documented
  - [ ] Provider credentials stored in Vault (no hard-coded secrets)

## CI/CD Pipeline

1. **Lint/Test** – golangci-lint, go test (with race + coverage)
2. **Build** – container image for API + worker
3. **Security** – gosec, Trivy image scan
4. **Deploy** – ArgoCD sync to staging, canary to production
5. **Smoke Tests** – send sample messages to provider sandboxes

## Tooling

- Hot reload via `air` (optional) with config in `.air.toml`
- Buf & Connect (upcoming) for gRPC/gateway support
- Task automation via `Taskfile.yml` (future)

## Observability in Dev

- Use `docker compose -f ops/observability.yml up` for Prometheus + Grafana (TBD)
- `NOTIFICATIONS_OTLP_ENDPOINT` to push traces to local collector
- NATS CLI for inspecting event subjects (`nats sub notifications.events`)
