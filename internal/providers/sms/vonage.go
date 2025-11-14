package sms

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type VonageConfig struct {
	APIKey    string
	APISecret string
	From      string
}

type vonageProvider struct {
	cfg VonageConfig
	cl  *http.Client
}

func NewVonage(cfg VonageConfig) *vonageProvider {
	return &vonageProvider{
		cfg: cfg,
		cl:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *vonageProvider) Name() string { return "vonage" }

func (p *vonageProvider) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if p.cfg.APIKey == "" || p.cfg.APISecret == "" {
		return fmt.Errorf("vonage not configured")
	}
	if from == "" {
		from = p.cfg.From
	}
	for _, dest := range to {
		form := url.Values{}
		form.Set("api_key", p.cfg.APIKey)
		form.Set("api_secret", p.cfg.APISecret)
		form.Set("to", dest)
		if from != "" {
			form.Set("from", from)
		}
		form.Set("text", body)
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://rest.nexmo.com/sms/json", strings.NewReader(form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		resp, err := p.cl.Do(req)
		if err != nil {
			return err
		}
		resp.Body.Close()
		if resp.StatusCode >= 300 {
			return fmt.Errorf("vonage error: %s", resp.Status)
		}
	}
	return nil
}
