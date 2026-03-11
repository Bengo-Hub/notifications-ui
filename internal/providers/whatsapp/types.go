package whatsapp

import (
	"context"
)

// WhatsAppProvider defines the interface for sending WhatsApp messages.
type WhatsAppProvider interface {
	Name() string
	SendWhatsApp(ctx context.Context, from string, to []string, body string, metadata map[string]interface{}) error
}
