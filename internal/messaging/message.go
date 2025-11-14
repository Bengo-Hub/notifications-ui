package messaging

import "time"

// Message represents a tenant-scoped notification request.
type Message struct {
	TenantID       string         `json:"tenantId"`
	Channel        string         `json:"channel"`  // email | sms | push
	TemplateID     string         `json:"template"` // e.g. email/payment_success
	Data           map[string]any `json:"data"`
	To             []string       `json:"to"`
	Metadata       map[string]any `json:"metadata,omitempty"`
	RequestID      string         `json:"requestId"`
	IdempotencyKey string         `json:"idempotencyKey"`
	QueuedAt       time.Time      `json:"queuedAt"`
}
