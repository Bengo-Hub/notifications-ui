package main

import (
	"context"
	"encoding/json"
	"html/template"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/encryption"
	"github.com/bengobox/notifications-api/internal/messaging"
	"github.com/bengobox/notifications-api/internal/platform/branding"
	"github.com/bengobox/notifications-api/internal/platform/database"
	"github.com/bengobox/notifications-api/internal/platform/events"
	"github.com/bengobox/notifications-api/internal/platform/templates"
	"github.com/bengobox/notifications-api/internal/providers"
	"github.com/bengobox/notifications-api/internal/shared/logger"
)

const maxRetries = 3

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config load failed: %v", err)
	}
	logg, err := logger.New(cfg.App.Env)
	if err != nil {
		log.Fatalf("logger init failed: %v", err)
	}

	nc, err := events.Connect(cfg.Events)
	if err != nil {
		logg.Fatal("nats connect failed", zap.Error(err))
	}
	js, err := nc.JetStream()
	if err != nil {
		logg.Fatal("jetstream init failed", zap.Error(err))
	}
	subject := cfg.Events.Subject
	if subject == "" {
		subject = "notifications.events"
	}
	// Ensure stream exists
	if _, err := js.StreamInfo(cfg.Events.StreamName); err != nil {
		if _, err := js.AddStream(&nats.StreamConfig{
			Name:      cfg.Events.StreamName,
			Subjects:  []string{subject},
			Retention: nats.LimitsPolicy,
			Storage:   nats.FileStorage,
			MaxAge:    7 * 24 * time.Hour,
		}); err != nil {
			logg.Fatal("stream ensure failed", zap.Error(err))
		}
	}

	tpl := templates.New(cfg.Templates)

	// DB for provider overrides
	dbPool, err := database.NewPool(ctx, cfg.Postgres)
	if err != nil {
		logg.Warn("postgres not available for provider overrides", zap.Error(err))
	}
	pm := providers.NewManager(dbPool, cfg.Postgres, cfg.Providers, encryption.KeyFromEnv(cfg.Security.EncryptionKey))

	durable := "notifications-worker"
	_, err = js.Subscribe(subject, func(m *nats.Msg) {
		var msg messaging.Message
		if err := json.Unmarshal(m.Data, &msg); err != nil {
			logg.Error("invalid message, dropping", zap.Error(err))
			_ = m.Ack() // unrecoverable — don't retry
			return
		}

		// Determine retry attempt from NATS metadata
		meta, _ := m.Metadata()
		attempt := uint64(1)
		if meta != nil {
			attempt = meta.NumDelivered
		}

		// Render template
		rendered, renderErr := renderMessage(ctx, cfg, tpl, dbPool, &msg, logg)
		if renderErr != nil {
			logg.Error("template render failed, dropping", zap.String("template", msg.TemplateID), zap.Error(renderErr))
			_ = m.Ack() // template errors are not transient
			return
		}

		// Deliver via provider
		deliverErr := deliver(ctx, cfg, pm, &msg, rendered, logg)
		if deliverErr != nil {
			logg.Warn("delivery failed",
				zap.String("channel", msg.Channel),
				zap.String("template", msg.TemplateID),
				zap.Uint64("attempt", attempt),
				zap.Error(deliverErr),
			)

			if attempt >= maxRetries {
				logg.Error("max retries exceeded, dropping message",
					zap.String("channel", msg.Channel),
					zap.String("tenant_id", msg.TenantID),
					zap.String("request_id", msg.RequestID),
					zap.Strings("to", msg.To),
					zap.Uint64("attempts", attempt),
					zap.Error(deliverErr),
				)
				_ = m.Ack() // give up after max retries
			} else {
				// NAck triggers redelivery after AckWait (30s)
				_ = m.Nak()
			}
			return
		}

		logg.Info("message delivered",
			zap.String("channel", msg.Channel),
			zap.String("template", msg.TemplateID),
			zap.Strings("to", msg.To),
			zap.Uint64("attempt", attempt),
		)
		_ = m.Ack()
	}, nats.Durable(durable), nats.ManualAck(), nats.AckWait(30*time.Second), nats.MaxDeliver(maxRetries))
	if err != nil {
		logg.Fatal("subscription failed", zap.Error(err))
	}

	<-ctx.Done()
	_ = nc.Drain()
}

// renderMessage loads the template, renders it with branding data, and returns the rendered content.
func renderMessage(ctx context.Context, cfg *config.Config, tpl *templates.Loader, dbPool *pgxpool.Pool, msg *messaging.Message, logg *zap.Logger) (string, error) {
	tplID := msg.TemplateID
	if !strings.Contains(tplID, "/") {
		tplID = msg.Channel + "/" + tplID
	}
	content, err := tpl.Get(ctx, tplID)
	if err != nil {
		return "", err
	}

	var rendered strings.Builder

	if strings.HasPrefix(tplID, "email/") {
		basePath := filepath.Join(cfg.Templates.Directory, "email", "base.html")
		baseBytes, readErr := os.ReadFile(basePath)
		if readErr != nil {
			logg.Warn("base template not found", zap.String("base", basePath), zap.Error(readErr))
		}

		data := map[string]any{}
		for k, v := range msg.Data {
			data[k] = v
		}
		if _, ok := data["brand_name"]; !ok || data["brand_name"] == "" {
			data["brand_name"] = msg.TenantID
		}
		if b, err := branding.LoadBranding(ctx, dbPool, cfg.Postgres, msg.TenantID); err == nil {
			if b.Name != "" {
				data["brand_name"] = b.Name
			}
			if b.Email != "" {
				data["brand_email"] = b.Email
			}
			if b.Phone != "" {
				data["brand_phone"] = b.Phone
			}
			if b.LogoURL != "" {
				data["brand_logo_url"] = b.LogoURL
			}
			if b.PrimaryColor != "" {
				data["brand_primary_color"] = b.PrimaryColor
			}
			if b.SecondaryColor != "" {
				data["brand_secondary_color"] = b.SecondaryColor
			}
		}

		tplSet := template.New("base")
		if len(baseBytes) > 0 {
			if _, err := tplSet.Parse(string(baseBytes)); err != nil {
				logg.Warn("base template parse failed", zap.Error(err))
			}
		}
		if _, err := tplSet.Parse(content); err != nil {
			return "", err
		}
		if err := tplSet.ExecuteTemplate(&rendered, "base.html", data); err != nil {
			_ = tplSet.ExecuteTemplate(&rendered, "content", data)
		}
	} else {
		t, err := template.New("msg").Parse(content)
		if err != nil {
			return "", err
		}
		if err := t.Execute(&rendered, msg.Data); err != nil {
			return "", err
		}
	}

	return rendered.String(), nil
}

// deliver sends the rendered message via the appropriate provider.
func deliver(ctx context.Context, cfg *config.Config, pm *providers.Manager, msg *messaging.Message, rendered string, logg *zap.Logger) error {
	channel := strings.ToLower(msg.Channel)
	preferred := ""
	if p, ok := msg.Metadata["provider"].(string); ok {
		preferred = p
	}

	switch channel {
	case "email":
		subject := "Notification"
		if s, ok := msg.Metadata["subject"].(string); ok && s != "" {
			subject = s
		}
		emailProv, _ := pm.GetEmailProvider(ctx, msg.TenantID, preferred)
		if err := emailProv.SendEmail(ctx, cfg.Providers.DefaultEmailSender, msg.To, subject, rendered, ""); err != nil {
			return err
		}
		logg.Info("email sent", zap.String("provider", emailProv.Name()), zap.String("template", msg.TemplateID), zap.Strings("to", msg.To))
		return nil

	case "sms":
		smsProv, _ := pm.GetSMSProvider(ctx, msg.TenantID, preferred)
		if err := smsProv.SendSMS(ctx, cfg.Providers.DefaultSMSSender, msg.To, rendered); err != nil {
			return err
		}
		logg.Info("sms sent", zap.String("provider", smsProv.Name()), zap.Strings("to", msg.To))
		return nil

	case "push":
		// TODO: FCM/APNS integrations. For now, log delivery.
		logg.Info("push message rendered", zap.String("template", msg.TemplateID), zap.Strings("to", msg.To))
		return nil

	default:
		logg.Warn("unknown channel", zap.String("channel", msg.Channel))
		return nil
	}
}
