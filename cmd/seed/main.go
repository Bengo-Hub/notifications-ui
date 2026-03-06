package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	"github.com/bengobox/notifications-api/internal/ent/tenantbranding"
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

	// Default tenants (must match auth-api slugs: codevertex, mss, urban-loft, kura, ultichange).
	// Codevertex = platform owner; others = Masterspace, Urban Loft, KURA, UltiChange.
	tenants := []struct {
		ID         string
		Name       string
		Logo       string
		Color      string
		BaseDomain string
	}{
		{"codevertex", "CodeVertex", "https://codevertexitsolutions.com/logo.png", "#0F766E", "codevertexitsolutions.com"},
		{"mss", "Masterspace Solutions", "https://masterspace.co.ke/logo.png", "#2563eb", "masterspace.co.ke"},
		{"urban-loft", "Urban Loft Cafe", "https://theurbanloftcafe.com/logo.png", "#f97316", "theurbanloftcafe.com"},
		{"kura", "Kenya Urban Roads Authority", "https://kura.go.ke/logo.png", "#059669", "kura.go.ke"},
		{"ultichange", "UltiChange", "https://ultichange.org/logo.png", "#4f46e5", "ultichange.org"},
	}

	for _, t := range tenants {
		// Seed/Update Branding
		existingBranding, _ := client.TenantBranding.Query().Where(tenantbranding.TenantIDEQ(t.ID)).First(ctx)
		if existingBranding == nil {
			_, err = client.TenantBranding.Create().
				SetTenantID(t.ID).
				SetLogoURL(t.Logo).
				SetPrimaryColor(t.Color).
				SetSecondaryColor("#1f2937").
				SetMetadata(map[string]interface{}{
					"from_email":  fmt.Sprintf("notifications@%s", t.BaseDomain),
					"from_name":   t.Name,
					"base_domain": t.BaseDomain,
				}).Save(ctx)
			if err == nil {
				fmt.Printf("✓ Created branding for: %s\n", t.ID)
			}
		} else {
			_, _ = existingBranding.Update().
				SetLogoURL(t.Logo).
				SetPrimaryColor(t.Color).
				Save(ctx)
		}

		// Seed/Update Default Provider Selectors (preferred provider)
		defaults := []struct{ Type, Name string }{
			{"email", "smtp"},
			{"sms", "twilio"},
		}

		for _, d := range defaults {
			existing, _ := client.ProviderSetting.Query().
				Where(
					providersetting.TenantIDEQ(t.ID),
					providersetting.ProviderTypeEQ(d.Type),
					providersetting.KeyEQ("_preferred"),
				).First(ctx)

			if existing == nil {
				_, err = client.ProviderSetting.Create().
					SetTenantID(t.ID).
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
					fmt.Printf("✓ Set preferred %s for: %s (%s)\n", d.Type, t.ID, d.Name)
				}
			}
		}
	}

	// Seed platform-level provider availability (tenant_id="platform")
	platformTenantID := "platform"
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
