package providers

import (
	"context"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bengobox/notifications-api/internal/config"
	pcfg "github.com/bengobox/notifications-api/internal/providers/config"
	"github.com/bengobox/notifications-api/internal/providers/email"
	"github.com/bengobox/notifications-api/internal/providers/sms"
)

const platformTenantID = "platform"

// Manager resolves providers per-tenant. Credentials are loaded from platform config (tenant_id=platform);
// env fallbacks are used when platform DB config is missing.
type Manager struct {
	cfg            config.ProviderConfig
	db             *pgxpool.Pool
	dbCfg          config.PostgresConfig
	decryptionKey  []byte
}

// NewManager creates a provider manager. decryptionKey is optional (32 bytes) for decrypting provider secrets at rest.
func NewManager(db *pgxpool.Pool, dbCfg config.PostgresConfig, cfg config.ProviderConfig, decryptionKey []byte) *Manager {
	return &Manager{db: db, dbCfg: dbCfg, cfg: cfg, decryptionKey: decryptionKey}
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
			// Platform config (tenant_id=platform); fallback to env
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "email", "smtp", m.decryptionKey)
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
			// Platform config (tenant_id=platform); fallback to env
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "email", "sendgrid", m.decryptionKey)
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
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "sms", "twilio", m.decryptionKey)
			sid := firstNonEmpty(s["account_sid"], m.cfg.TwilioAccountSID)
			token := firstNonEmpty(s["auth_token"], m.cfg.TwilioAuthToken)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return &twilioAdapter{accountSID: sid, authToken: token, from: from}, nil
		case "africastalking":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "sms", "africastalking", m.decryptionKey)
			user := firstNonEmpty(s["username"], m.cfg.AfricasTalkingUsername)
			key := firstNonEmpty(s["api_key"], m.cfg.AfricasTalkingKey)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return &africasTalkingAdapter{username: user, apiKey: key, from: from}, nil
		case "vonage":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "sms", "vonage", m.decryptionKey)
			key := firstNonEmpty(s["api_key"], m.cfg.VonageAPIKey)
			secret := firstNonEmpty(s["api_secret"], m.cfg.VonageAPISecret)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return &vonageAdapter{apiKey: key, apiSecret: secret, from: from}, nil
		case "plivo":
			s, _ := pcfg.LoadTenantProviderSettings(ctx, m.dbCfg, platformTenantID, "sms", "plivo", m.decryptionKey)
			id := firstNonEmpty(s["auth_id"], m.cfg.PlivoAuthID)
			token := firstNonEmpty(s["auth_token"], m.cfg.PlivoAuthToken)
			from := firstNonEmpty(s["from"], m.cfg.DefaultSMSSender)
			return &plivoAdapter{authID: id, authToken: token, from: from}, nil
		}
	}
	return &twilioAdapter{accountSID: m.cfg.TwilioAccountSID, authToken: m.cfg.TwilioAuthToken, from: m.cfg.DefaultSMSSender}, nil
}

// TestConnection loads platform config for the given channel/provider, builds the provider, and sends a test message to the given recipient.
func (m *Manager) TestConnection(ctx context.Context, channel, providerName, to string) error {
	if to == "" {
		return nil // callers should validate
	}
	switch channel {
	case "email":
		prov, err := m.GetEmailProvider(ctx, platformTenantID, providerName)
		if err != nil {
			return err
		}
		return prov.SendEmail(ctx, "", []string{to}, "Test connection", "<p>Test notification from Notifications API.</p>", "Test notification from Notifications API.")
	case "sms":
		prov, err := m.GetSMSProvider(ctx, platformTenantID, providerName)
		if err != nil {
			return err
		}
		return prov.SendSMS(ctx, "", []string{to}, "Test SMS from Notifications API.")
	default:
		return nil
	}
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
	return sms.SendWithTwilio(ctx, t.accountSID, t.authToken, from, to, body)
}

// africasTalkingAdapter bridges to our existing stub implementation.
type africasTalkingAdapter struct {
	username string
	apiKey   string
	from     string
}

func (a *africasTalkingAdapter) Name() string { return "africastalking" }

func (a *africasTalkingAdapter) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if from == "" {
		from = a.from
	}
	provider := sms.NewAfricasTalking(sms.AfricasTalkingConfig{Username: a.username, APIKey: a.apiKey, From: from})
	return provider.SendSMS(ctx, from, to, body)
}

// vonageAdapter bridges to our existing stub implementation.
type vonageAdapter struct {
	apiKey    string
	apiSecret string
	from      string
}

func (v *vonageAdapter) Name() string { return "vonage" }

func (v *vonageAdapter) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if from == "" {
		from = v.from
	}
	provider := sms.NewVonage(sms.VonageConfig{APIKey: v.apiKey, APISecret: v.apiSecret, From: from})
	return provider.SendSMS(ctx, from, to, body)
}

// plivoAdapter bridges to our existing stub implementation.
type plivoAdapter struct {
	authID    string
	authToken string
	from      string
}

func (p *plivoAdapter) Name() string { return "plivo" }

func (p *plivoAdapter) SendSMS(ctx context.Context, from string, to []string, body string) error {
	if from == "" {
		from = p.from
	}
	provider := sms.NewPlivo(sms.PlivoConfig{AuthID: p.authID, Token: p.authToken, From: from})
	return provider.SendSMS(ctx, from, to, body)
}
