package main

import (
	"context"
	"encoding/json"
	"html/template"
	"log"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/bengobox/notifications-app/internal/messaging"
	"github.com/bengobox/notifications-app/internal/platform/events"
	"github.com/bengobox/notifications-app/internal/platform/templates"
	"github.com/bengobox/notifications-app/internal/providers/email"
	"github.com/bengobox/notifications-app/internal/providers/sms"
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

		// Render with Go templates (safe for both text and html)
		t, err := template.New("msg").Parse(content)
		if err != nil {
			logg.Error("template parse failed", zap.Error(err))
			return
		}
		var rendered strings.Builder
		if err := t.Execute(&rendered, msg.Data); err != nil {
			logg.Error("template render failed", zap.Error(err))
			return
		}

		switch strings.ToLower(msg.Channel) {
		case "email":
			subject := "Notification"
			if s, ok := msg.Metadata["subject"].(string); ok && s != "" {
				subject = s
			}
			// best-effort SendGrid
			if err := email.SendWithSendGrid(ctx, cfg.Providers.SendGridAPIKey, cfg.Providers.DefaultEmailSender, msg.To, subject, rendered.String(), ""); err != nil {
				logg.Warn("sendgrid send failed", zap.Error(err))
			} else {
				logg.Info("email sent", zap.String("template", tplID), zap.Strings("to", msg.To))
			}
		case "sms":
			if err := sms.SendWithTwilio(ctx, cfg.Providers.TwilioAccountSID, cfg.Providers.TwilioAuthToken, cfg.Providers.DefaultSMSSender, msg.To, rendered.String()); err != nil {
				logg.Warn("twilio send failed", zap.Error(err))
			} else {
				logg.Info("sms sent", zap.Strings("to", msg.To))
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
