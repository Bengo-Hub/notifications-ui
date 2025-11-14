package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type AfricasTalkingConfig struct {
	Username string
	APIKey   string
	From     string
}

type africasTalkingProvider struct {
	cfg AfricasTalkingConfig
	cl  *http.Client
}

func NewAfricasTalking(cfg AfricasTalkingConfig) *africasTalkingProvider {
	return &africasTalkingProvider{
		cfg: cfg,
		cl:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *africasTalkingProvider) Name() string { return "africastalking" }

func (p *africasTalkingProvider) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if p.cfg.APIKey == "" || p.cfg.Username == "" {
		return fmt.Errorf("africastalking not configured")
	}
	if from == "" {
		from = p.cfg.From
	}
	payload := map[string]any{
		"username": p.cfg.Username,
		"to":       to,
		"message":  body,
	}
	if from != "" {
		payload["from"] = from
	}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.africastalking.com/version1/messaging", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apiKey", p.cfg.APIKey)
	resp, err := p.cl.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("africastalking error: %s", resp.Status)
	}
	return nil
}
