package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type PlivoConfig struct {
	AuthID  string
	Token   string
	From    string
	BaseURL string // optional override
}

type plivoProvider struct {
	cfg PlivoConfig
	cl  *http.Client
}

func NewPlivo(cfg PlivoConfig) *plivoProvider {
	return &plivoProvider{
		cfg: cfg,
		cl:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *plivoProvider) Name() string { return "plivo" }

func (p *plivoProvider) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if p.cfg.AuthID == "" || p.cfg.Token == "" {
		return fmt.Errorf("plivo not configured")
	}
	if from == "" {
		from = p.cfg.From
	}
	endpoint := p.cfg.BaseURL
	if endpoint == "" {
		endpoint = "https://api.plivo.com/v1/Account/" + p.cfg.AuthID + "/Message/"
	}
	payload := map[string]any{
		"src":  from,
		"dst":  to,
		"text": body,
	}
	b, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(b))
	req.SetBasicAuth(p.cfg.AuthID, p.cfg.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := p.cl.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("plivo error: %s", resp.Status)
	}
	return nil
}
