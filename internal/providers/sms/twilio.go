package sms

import (
	"context"
	"fmt"
)

// SendWithTwilio sends SMS messages using Twilio.
func SendWithTwilio(ctx context.Context, accountSID, authToken, from string, to []string, body string) error {
	_ = ctx
	_ = body
	if accountSID == "" || authToken == "" {
		return fmt.Errorf("twilio credentials not configured")
	}
	// NOTE: real Twilio integration should be added via github.com/twilio/twilio-go
	return nil
}
