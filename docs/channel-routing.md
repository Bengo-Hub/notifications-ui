# Channel Routing Strategy

## Goals

- Deliver messages via the most reliable, cost-effective provider per tenant/channel
- Provide automatic failover when providers degrade
- Respect tenant preferences, quiet hours, and compliance rules

## Routing Inputs

- **Tenant configuration** – preferred providers, SLAs, regulatory constraints
- **Provider health** – latency, success rate, error codes
- **Message metadata** – priority, category (transactional vs marketing), locale
- **Cost model** – per-channel pricing to optimise spend

## Decision Flow

1. Validate tenant preferences and opt-in status
2. Apply routing matrix (tenant override → global default)
3. Check provider health metrics (latency, error rate)
4. Select primary provider and fallback list
5. Enqueue delivery job with retries + exponential backoff

## Failover Policy

- Threshold-based failover triggered when error rate or latency exceeds SLO
- Automatic fallback to secondary provider; record incident for analytics
- Dead letter queue for messages that exhaust all providers

## Rate Limiting & Idempotency

- Redis counters limit messages per tenant/channel/time window
- Idempotency keys prevent duplicate sends when retried by clients
- Back-pressure applied when queues exceed thresholds

## Future Enhancements

- Machine learning scoring for provider selection
- Real-time cost optimisation using historical spend
- Tenant-facing routing rules editor in UI
