//go:build entgen
// +build entgen

package main

import (
	"context"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/bengobox/notifications-app/internal/ent"
)

func main() {
	ctx := context.Background()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	dsn := cfg.Postgres.URL
	if env := os.Getenv("NOTIFICATIONS_POSTGRES_URL"); env != "" {
		dsn = env
	}
	client, err := ent.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("ent open: %v", err)
	}
	defer client.Close()

	// Auto-migrate
	if err := client.Schema.Create(ctx); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Seed branding
	if _, err := client.TenantBranding.
		Create().
		SetTenantID("bengobox").
		SetName("BengoBox").
		SetEmail("hello@bengobox.com").
		SetPhone("+254700000000").
		SetLogoURL("https://cdn.bengobox.com/logo.png").
		SetPrimaryColor("#0F766E").
		SetSecondaryColor("#134E4A").
		Save(ctx); err != nil {
		fmt.Println("seed branding:", err)
	}

	// Seed provider settings
	seed := []struct {
		Channel  string
		Provider string
		Key      string
		Value    string
	}{
		{"email", "smtp", "host", "localhost"},
		{"email", "smtp", "port", "1025"},
		{"sms", "twilio", "from", "BengoBox"},
	}
	for _, s := range seed {
		_, _ = client.ProviderSetting.
			Create().
			SetTenantID("bengobox").
			SetChannel(s.Channel).
			SetProvider(s.Provider).
			SetKey(s.Key).
			SetValue(s.Value).
			Save(ctx)
	}

	fmt.Println("ent migration and seed complete")
}


