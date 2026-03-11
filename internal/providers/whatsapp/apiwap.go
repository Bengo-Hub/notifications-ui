package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// APIWAPProvider implements WhatsAppProvider using the APIWAP service.
type APIWAPProvider struct {
	apiKey      string
	instanceID  string
	environment string // sandbox, production
	httpClient  *http.Client
}

type APIWAPConfig struct {
	APIKey      string
	InstanceID  string
	Environment string
}

func NewAPIWAPProvider(cfg APIWAPConfig) *APIWAPProvider {
	return &APIWAPProvider{
		apiKey:      cfg.APIKey,
		instanceID:  cfg.InstanceID,
		environment: cfg.Environment,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (p *APIWAPProvider) Name() string {
	return "apiwap"
}

func (p *APIWAPProvider) SendWhatsApp(ctx context.Context, from string, to []string, body string, metadata map[string]interface{}) error {
	// APIWAP typically sends per-recipient.
	for _, recipient := range to {
		if err := p.sendSingle(ctx, recipient, body, metadata); err != nil {
			return err
		}
	}
	return nil
}

func (p *APIWAPProvider) sendSingle(ctx context.Context, to, body string, metadata map[string]interface{}) error {
	url := fmt.Sprintf("https://apiwap.com/api/v1/instance/%s/messages/chat", p.instanceID)
	if p.environment == "sandbox" {
		url = "https://sandbox.apiwap.com/api/v1/messages/chat"
	}

	payload := map[string]interface{}{
		"to":   to,
		"body": body,
	}
	// Add potential metadata (templates, etc.)
	for k, v := range metadata {
		payload[k] = v
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("apiwap error: status %d", resp.StatusCode)
	}

	return nil
}
