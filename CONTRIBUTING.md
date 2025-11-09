# Contributing

Thanks for contributing to the Notifications service! Follow these guidelines to keep changes safe and maintainable.

## Prerequisites

- Go 1.22+
- golangci-lint installed
- Provider sandbox credentials (SendGrid/Twilio/FCM) for integration testing
- Understanding of event-driven architectures and multi-tenant systems

## Workflow

1. Branch from `main`: `git checkout -b feature/{ticket}`
2. Install dependencies: `make tidy`
3. Make changes + add tests (`make test`)
4. Run linting (`make lint`) and format code (`go fmt ./...`)
5. Update docs for behaviour changes (routing, templates, contracts)
6. Commit using Conventional Commits (`feat(sms): add throttling`)
7. Open a PR including:
   - Summary and context
   - Testing evidence (unit/integration)
   - Rollout plan & feature flags
   - Provider credential requirements

## Coding Standards

- Keep business logic in `internal/messaging` and provider adapters under `internal/providers`
- Use dependency injection to abstract external providers for testing
- Propagate context with deadlines/trace IDs across goroutines
- Leverage Redis for idempotency + rate limiting (no in-memory singletons)
- Instrument new flows with metrics, logs, and traces

## Testing Expectations

- Unit tests for new logic and edge cases
- Integration tests covering DB/cache/event interactions (Testcontainers)
- Contract tests when changing external webhooks/events
- Document remaining risks in the PR if coverage gaps exist

By contributing, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
