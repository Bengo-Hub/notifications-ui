# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Go service scaffolding with Gin API, middleware, health endpoints, and documentation

## [0.2.0] - 2025-11-14

### Added
- Production-ready enqueue endpoint with Redis-backed idempotency
- NATS JetStream publisher and worker consumer
- Filesystem template loader and ready-to-use templates (email/sms/push)
- Initial provider integrations: SendGrid (email), Twilio (sms)
- SSO integration: JWT enforcement via Auth Service (configurable), API key fallback
- Tenant branding support and base email layout (header/footer, CSS)
- Local testing guide and README updates (links to docs, production URL)

### Changed
- Template listing endpoint now reflects actual templates on disk

### DevOps
- Verified centralized `devops-k8s` integration, ingress host set to `notifications.codevertexitsolutions.com`