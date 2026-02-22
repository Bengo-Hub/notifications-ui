package push

import (
	"context"
	"fmt"
)

type FCMConfig struct {
	ProjectID      string
	ServiceAccount string
}

type FCMProvider struct {
	cfg FCMConfig
}

func NewFCM(cfg FCMConfig) *FCMProvider {
	return &FCMProvider{cfg: cfg}
}

func (p *FCMProvider) Name() string {
	return "fcm"
}

func (p *FCMProvider) SendPush(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if p.cfg.ProjectID == "" {
		return fmt.Errorf("fcm project id not configured")
	}
	// TODO: Implement actual FCM sending logic with firebase-admin-go
	fmt.Printf("Push sent to %v: %s - %s\n", tokens, title, body)
	return nil
}
