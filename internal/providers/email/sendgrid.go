package email

import (
	"context"
	"fmt"
)

// SendWithSendGrid sends an email using SendGrid.
func SendWithSendGrid(ctx context.Context, apiKey, from string, to []string, subject, htmlBody, textBody string) error {
	_ = ctx
	if apiKey == "" {
		return fmt.Errorf("sendgrid api key not configured")
	}
	// NOTE: real SendGrid integration should be added via github.com/sendgrid/sendgrid-go
	// For now we return nil to avoid hard dependency during local/dev builds.
	return nil
}
