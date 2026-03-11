package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	tenantmodule "github.com/bengobox/notifications-api/internal/modules/tenant"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	ctx := context.Background()
	client, err := database.NewClient(ctx, cfg.Postgres)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer client.Close()

	// Ensure schema exists
	if err := database.RunMigrations(ctx, client); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Sync/Seed Tenants from Auth-API slugs
	tenantSyncer := tenantmodule.NewSyncer(client, cfg.Services.AuthAPI)
	
	tenants := []string{"codevertex", "mss", "urban-loft", "kura", "ultichange"}
	tenantIDs := make(map[string]uuid.UUID)

	for _, slug := range tenants {
		id, err := tenantSyncer.SyncTenant(ctx, slug)
		if err != nil {
			fmt.Printf("! Failed to sync tenant %s: %v\n", slug, err)
			continue
		}
		tenantIDs[slug] = id
		fmt.Printf("✓ Synced tenant: %s (%s)\n", slug, id)

		// Seed/Update Default Provider Selectors (preferred provider)
		defaults := []struct{ Type, Name string }{
			{"email", "smtp"},
			{"sms", "twilio"},
		}

		for _, d := range defaults {
			existing, _ := client.ProviderSetting.Query().
				Where(
					providersetting.TenantID(id.String()),
					providersetting.ProviderTypeEQ(d.Type),
					providersetting.KeyEQ("_preferred"),
				).First(ctx)

			if existing == nil {
				_, err = client.ProviderSetting.Create().
					SetTenantID(id.String()).
					SetChannel(d.Type).
					SetProvider(d.Name).
					SetProviderType(d.Type).
					SetProviderName(d.Name).
					SetKey("_preferred").
					SetValue(d.Name).
					SetIsPlatform(false).
					SetIsActive(true).
					SetStatus("active").
					Save(ctx)
				if err == nil {
					fmt.Printf("  ✓ Set preferred %s for: %s (%s)\n", d.Type, slug, d.Name)
				}
			}
		}
	}

	platformTenantID := tenantIDs["codevertex"].String()
	if platformTenantID == "" || platformTenantID == "00000000-0000-0000-0000-000000000000" {
		platformTenantID = "00000000-0000-0000-0000-000000000000" // Fallback if sync failed
	}
	platformProviders := []struct {
		Type string
		Name string
	}{
		{"email", "smtp"},
		{"email", "sendgrid"},
		{"sms", "twilio"},
		{"sms", "africastalking"},
		{"sms", "vonage"},
		{"sms", "plivo"},
		{"push", "fcm"},
		{"whatsapp", "apiwap"},
	}

	for _, pp := range platformProviders {
		existing, _ := client.ProviderSetting.Query().
			Where(
				providersetting.TenantIDEQ(platformTenantID),
				providersetting.IsPlatform(true),
				providersetting.ProviderTypeEQ(pp.Type),
				providersetting.ProviderNameEQ(pp.Name),
				providersetting.KeyEQ("_config"),
			).First(ctx)

		isActive := true
		if pp.Name == "sendgrid" && os.Getenv("SENDGRID_API_KEY") == "" {
			isActive = false
		}
		if pp.Name == "africastalking" && os.Getenv("AFRICAS_TALKING_KEY") == "" {
			isActive = false
		}
		if pp.Name == "twilio" && os.Getenv("TWILIO_ACCOUNT_SID") == "" {
			isActive = false
		}
		if pp.Name == "apiwap" && os.Getenv("APIWAP_API_KEY") == "" {
			isActive = false
		}

		if existing == nil {
			_, err = client.ProviderSetting.Create().
				SetTenantID(platformTenantID).
				SetChannel(pp.Type).
				SetProvider(pp.Name).
				SetProviderType(pp.Type).
				SetProviderName(pp.Name).
				SetKey("_config").
				SetValue("configured").
				SetIsPlatform(true).
				SetIsActive(isActive).
				SetStatus("active").
				Save(ctx)
			if err == nil {
				fmt.Printf("✓ Created platform provider: %s/%s\n", pp.Type, pp.Name)
			}
		} else {
			_, _ = existing.Update().SetIsActive(isActive).Save(ctx)
		}
	}

	fmt.Println("✅ Ent migration and seed complete")
}
