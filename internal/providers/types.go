package providers

import "context"

// EmailProvider sends email messages.
type EmailProvider interface {
	SendEmail(ctx context.Context, from string, to []string, subject string, htmlBody string, textBody string) error
	Name() string
}

// SMSProvider sends SMS messages.
type SMSProvider interface {
	SendSMS(ctx context.Context, from string, to []string, body string) error
	Name() string
}
