package providers

import (
	"context"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bengobox/notifications-app/internal/config"
	pcfg "github.com/bengobox/notifications-app/internal/providers/config"
	"github.com/bengobox/notifications-app/internal/providers/email"
	smsprov "github.com/bengobox/notifications-app/internal/providers/sms"
)

// Manager resolves providers per-tenant with DB overrides and env fallbacks.
type Manager struct {
	cfg config.ProviderConfig
	db  *pgxpool.Pool
}

func NewManager(db *pgxpool.Pool, cfg config.ProviderConfig) *Manager {
	return &Manager{db: db, cfg: cfg}
}

func (m *Manager) GetEmailProvider(ctx context.Context, tenantID string, preferred string) (EmailProvider, error) {
	// Default to SMTP per user preference
	order := []string{"smtp", "sendgrid"}
	if preferred != "" {
		order = append([]string{strings.ToLower(preferred)}, order...)
	}
	for _, name := range dedup(order) {
		switch name {
		case "smtp":
			// DB override
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "email", "smtp")
			host := firstNonEmpty(s["host"], m.cfg.SMTPHost)
			port := parseInt(firstNonEmpty(s["port"], strconv.Itoa(m.cfg.SMTPPort)))
			user := firstNonEmpty(s["username"], m.cfg.SMTPUsername)
			pass := firstNonEmpty(s["password"], m.cfg.SMTPPassword)
			from := firstNonEmpty(s["from"], m.cfg.SMTPFrom)
			startTLS := parseBool(firstNonEmpty(s["start_tls"], boolToStr(m.cfg.SMTPStartTLS)))
			return email.NewSMTPProvider(email.SMTPConfig{
				Host:     host,
				Port:     port,
				Username: user,
				Password: pass,
				From:     from,
				StartTLS: startTLS,
			}), nil
		case "sendgrid":
			// DB override
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "email", "sendgrid")
			apiKey := firstNonEmpty(s["api_key"], m.cfg.SendGridAPIKey)
			from := firstNonEmpty(s["from"], m.cfg.DefaultEmailSender)
			return &sendGridAdapter{apiKey: apiKey, from: from}, nil
		}
	}
	// fallback to smtp with defaults
	return email.NewSMTPProvider(email.SMTPConfig{
		Host:     m.cfg.SMTPHost,
		Port:     m.cfg.SMTPPort,
		Username: m.cfg.SMTPUsername,
		Password: m.cfg.SMTPPassword,
		From:     m.cfg.SMTPFrom,
		StartTLS: m.cfg.SMTPStartTLS,
	}), nil
}

func (m *Manager) GetSMSProvider(ctx context.Context, tenantID string, preferred string) (SMSProvider, error) {
	order := []string{"twilio", "africastalking", "vonage", "plivo"}
	if preferred != "" {
		order = append([]string{strings.ToLower(preferred)}, order...)
	}
	for _, name := range dedup(order) {
		switch name {
		case "twilio":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "sms", "twilio")
			sid := firstNonEmpty(s["account_sid"], m.cfg.TwilioAccountSID)
			token := firstNonEmpty(s["auth_token"], m.cfg.TwilioAuthToken)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return &twilioAdapter{accountSID: sid, authToken: token, from: from}, nil
		case "africastalking":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "sms", "africastalking")
			user := firstNonEmpty(s["username"], m.cfg.AfricasTalkingUsername)
			key := firstNonEmpty(s["api_key"], m.cfg.AfricasTalkingKey)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return smsprov.NewAfricasTalking(smsprov.AfricasTalkingConfig{
				Username: user,
				APIKey:   key,
				From:     from,
			}), nil
		case "vonage":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "sms", "vonage")
			key := firstNonEmpty(s["api_key"], m.cfg.VonageAPIKey)
			secret := firstNonEmpty(s["api_secret"], m.cfg.VonageAPISecret)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return smsprov.NewVonage(smsprov.VonageConfig{
				APIKey:    key,
				APISecret: secret,
				From:      from,
			}), nil
		case "plivo":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.db, tenantID, "sms", "plivo")
			id := firstNonEmpty(s["auth_id"], m.cfg.PlivoAuthID)
			token := firstNonEmpty(s["auth_token"], m.cfg.PlivoAuthToken)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return smsprov.NewPlivo(smsprov.PlivoConfig{
				AuthID: id, Token: token, From: from,
			}), nil
		}
	}
	return &twilioAdapter{accountSID: m.cfg.TwilioAccountSID, authToken: m.cfg.TwilioAuthToken, from: m.cfg.DefaultSMSSender}, nil
}

// Helpers

func firstNonEmpty(v ...string) string {
	for _, s := range v {
		if strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

func parseInt(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}

func parseBool(s string) bool {
	return strings.EqualFold(s, "true") || s == "1" || strings.EqualFold(s, "yes")
}

func boolToStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func dedup(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

// sendGridAdapter bridges to our existing stub implementation.
type sendGridAdapter struct {
	apiKey string
	from   string
}

func (s *sendGridAdapter) Name() string { return "sendgrid" }

func (s *sendGridAdapter) SendEmail(ctx context.Context, from string, to []string, subject string, htmlBody string, textBody string) error {
	if from == "" {
		from = s.from
	}
	// use the existing stub that returns nil if configured
	return email.SendWithSendGrid(ctx, s.apiKey, from, to, subject, htmlBody, textBody)
}

// twilioAdapter bridges to our existing stub (or future real impl)
type twilioAdapter struct {
	accountSID string
	authToken  string
	from       string
}

func (t *twilioAdapter) Name() string { return "twilio" }

func (t *twilioAdapter) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if from == "" {
		from = t.from
	}
	return smsprov.SendWithTwilio(ctx, t.accountSID, t.authToken, from, to, body)
}
