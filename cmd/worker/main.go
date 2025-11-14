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

	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/bengobox/notifications-app/internal/messaging"
	"github.com/bengobox/notifications-app/internal/platform/branding"
	"github.com/bengobox/notifications-app/internal/platform/database"
	"github.com/bengobox/notifications-app/internal/platform/events"
	"github.com/bengobox/notifications-app/internal/platform/templates"
	"github.com/bengobox/notifications-app/internal/providers"
	"github.com/bengobox/notifications-app/internal/shared/logger"
)

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
	pm := providers.NewManager(dbPool, cfg.Providers)

	durable := "notifications-worker"
	_, err = js.Subscribe(subject, func(m *nats.Msg) {
		defer func() {
			_ = m.Ack()
		}()
		var msg messaging.Message
		if err := json.Unmarshal(m.Data, &msg); err != nil {
			logg.Error("invalid message", zap.Error(err))
			return
		}

		// Load template
		tplID := msg.TemplateID
		if !strings.Contains(tplID, "/") {
			tplID = msg.Channel + "/" + tplID
		}
		content, err := tpl.Get(ctx, tplID)
		if err != nil {
			logg.Error("template load failed", zap.String("tpl", tplID), zap.Error(err))
			return
		}

		var rendered strings.Builder
		// Render with Go templates and base layout for emails
		if strings.HasPrefix(tplID, "email/") {
			basePath := filepath.Join(cfg.Templates.Directory, "email", "base.html")
			baseBytes, readErr := os.ReadFile(basePath)
			if readErr != nil {
				logg.Warn("base template not found", zap.String("base", basePath), zap.Error(readErr))
			}
			// Enrich data with branding (DB -> message fallback)
			data := map[string]any{}
			for k, v := range msg.Data {
				data[k] = v
			}
			// Default brand name to tenant slug if not provided
			if _, ok := data["brand_name"]; !ok || data["brand_name"] == "" {
				data["brand_name"] = msg.TenantID
			}
			if b, err := branding.LoadBranding(ctx, dbPool, msg.TenantID); err == nil {
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
			// allow overrides from message data if already set
			tplSet := template.New("base")
			if len(baseBytes) > 0 {
				if _, err := tplSet.Parse(string(baseBytes)); err != nil {
					logg.Warn("base template parse failed", zap.Error(err))
				}
			}
			if _, err := tplSet.Parse(content); err != nil {
				logg.Error("template parse failed", zap.Error(err))
				return
			}
			if err := tplSet.ExecuteTemplate(&rendered, "base.html", data); err != nil {
				// If base not defined, try executing "content" directly
				_ = tplSet.ExecuteTemplate(&rendered, "content", data)
			}
		} else {
			// Non-email (sms/push)
			t, err := template.New("msg").Parse(content)
			if err != nil {
				logg.Error("template parse failed", zap.Error(err))
				return
			}
			if err := t.Execute(&rendered, msg.Data); err != nil {
				logg.Error("template render failed", zap.Error(err))
				return
			}
		}

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
			if err := emailProv.SendEmail(ctx, cfg.Providers.DefaultEmailSender, msg.To, subject, rendered.String(), ""); err != nil {
				logg.Warn("email send failed", zap.String("provider", emailProv.Name()), zap.Error(err))
			} else {
				logg.Info("email sent", zap.String("provider", emailProv.Name()), zap.String("template", tplID), zap.Strings("to", msg.To))
			}
		case "sms":
			smsProv, _ := pm.GetSMSProvider(ctx, msg.TenantID, preferred)
			if err := smsProv.SendSMS(ctx, cfg.Providers.DefaultSMSSender, msg.To, rendered.String()); err != nil {
				logg.Warn("sms send failed", zap.String("provider", smsProv.Name()), zap.Error(err))
			} else {
				logg.Info("sms sent", zap.String("provider", smsProv.Name()), zap.Strings("to", msg.To))
			}
		case "push":
			// TODO: FCM/APNS integrations. For now, log delivery.
			logg.Info("push message rendered", zap.String("template", tplID), zap.Strings("to", msg.To))
		default:
			logg.Warn("unknown channel", zap.String("channel", msg.Channel))
		}
	}, nats.Durable(durable), nats.ManualAck(), nats.AckWait(30*time.Second))
	if err != nil {
		logg.Fatal("subscription failed", zap.Error(err))
	}

	<-ctx.Done()
	_ = nc.Drain()
}
