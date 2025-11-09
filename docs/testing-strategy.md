# Testing Strategy

## Pyramid

1. **Unit Tests (60%)** – Domain services (routing, throttling, idempotency) with table-driven tests and mocks.
2. **Integration Tests (25%)** – Testcontainers for Postgres/Redis/NATS; provider sandbox mocks using httptest or MockServer.
3. **Contract Tests (10%)** – Webhook payload validation, event schemas shared with upstream/downstream services.
4. **End-to-End (5%)** – Synthetic flows verifying message delivery to provider sandbox.

## Tooling

- `go test ./...` with race detector for concurrency heavy code.
- `github.com/stretchr/testify` for assertions/mocks.
- `github.com/testcontainers/testcontainers-go` for dependency orchestration (planned).
- `k6` for throughput/latency tests under high volume notification bursts.
- `gosec` and `golangci-lint` in CI.

## Coverage Targets

- Overall coverage ≥ 80%
- Routing & preference modules ≥ 90%

## CI Gates

- Lint + unit tests required before merge
- Integration suite triggered nightly and before releases
- Canary environment smoke tests sending real sandbox messages

## Future Enhancements

- Contract testing harness with Pact for webhook consumers
- Synthetic monitoring for provider health
- Replay tooling for reprocessing failed batches
