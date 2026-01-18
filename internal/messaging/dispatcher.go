package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/bengobox/notifications-api/internal/config"
)

const defaultSubject = "notifications.events"

// ensureStream creates a JetStream stream if it doesn't already exist.
func ensureStream(js nats.JetStreamContext, streamName, subject string) error {
	if streamName == "" {
		streamName = "notifications"
	}
	if subject == "" {
		subject = defaultSubject
	}

	if _, err := js.StreamInfo(streamName); err == nil {
		return nil
	}
	_, err := js.AddStream(&nats.StreamConfig{
		Name:      streamName,
		Subjects:  []string{subject},
		Retention: nats.LimitsPolicy,
		Storage:   nats.FileStorage,
		MaxAge:    7 * 24 * time.Hour,
		MaxMsgs:   -1,
	})
	return err
}

// Publish enqueues a message to NATS JetStream for asynchronous processing.
func Publish(ctx context.Context, nc *nats.Conn, cfg config.EventsConfig, msg Message) (string, error) {
	if nc == nil {
		return "", fmt.Errorf("event bus not configured")
	}
	js, err := nc.JetStream()
	if err != nil {
		return "", fmt.Errorf("jetstream: %w", err)
	}
	subject := cfg.Subject
	if subject == "" {
		subject = defaultSubject
	}
	if err := ensureStream(js, cfg.StreamName, subject); err != nil {
		return "", fmt.Errorf("ensure stream: %w", err)
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("marshal message: %w", err)
	}
	ack, err := js.PublishMsg(&nats.Msg{
		Subject: subject,
		Data:    payload,
		Header:  nats.Header{"Content-Type": []string{"application/json"}},
	})
	if err != nil {
		return "", fmt.Errorf("publish: %w", err)
	}
	return fmt.Sprintf("%d", ack.Sequence), nil
}
