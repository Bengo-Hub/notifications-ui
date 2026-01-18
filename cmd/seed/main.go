package main

import (
	"context"
	"fmt"
	"log"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent"
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

	// Seed branding with get-or-create logic
	tenantID := "codevertex"
	existingBranding, err := client.TenantBranding.
		Query().
		Where(tenantbranding.TenantIDEQ(tenantID)).
		Only(ctx)

	if err != nil {
		if ent.IsNotFound(err) {
			// Create new branding record
			_, err := client.TenantBranding.
				Create().
				SetTenantID(tenantID).
				SetLogoURL("https://codevertexitsolutions.com/wp-content/uploads/2025/05/logonobg-300x69.png").
				SetPrimaryColor("#0F766E").
				SetSecondaryColor("#134E4A").
				SetMetadata(map[string]interface{}{
					"name":  "CodeVertex",
					"email": "hello@codevertexitsolutions.com",
					"phone": "+254700000000",
				}).
				Save(ctx)
			if err != nil {
				log.Printf("seed branding create: %v", err)
			} else {
				fmt.Println("✓ Created branding for tenant:", tenantID)
			}
		} else {
			log.Printf("seed branding query: %v", err)
		}
	} else {
		// Update existing branding if needed
		updatedBranding, err := existingBranding.Update().
			SetLogoURL("https://codevertexitsolutions.com/wp-content/uploads/2025/05/logonobg-300x69.png").
			SetPrimaryColor("#0F766E").
			SetSecondaryColor("#134E4A").
			SetMetadata(map[string]interface{}{
				"name":  "CodeVertex",
				"email": "hello@codevertexitsolutions.com",
				"phone": "+254700000000",
			}).
			Save(ctx)
		if err != nil {
			log.Printf("seed branding update: %v", err)
		} else {
			fmt.Println("✓ Updated branding for tenant:", tenantID, "(ID:", updatedBranding.ID, ")")
		}
	}

	// Seed provider settings with get-or-create logic
	seedData := []struct {
		Channel      string // Legacy field name
		Provider     string // Legacy field name
		ProviderType string // email, sms, push
		ProviderName string // smtp, sendgrid, twilio, etc.
		Key          string
		Value        string
		Description  string
	}{
		{"email", "smtp", "email", "smtp", "host", "localhost", "SMTP host for email delivery"},
		{"email", "smtp", "email", "smtp", "port", "1025", "SMTP port for email delivery"},
		{"sms", "twilio", "sms", "twilio", "from", "CodeVertex", "Twilio sender ID"},
	}

	for _, data := range seedData {
		// Check if setting already exists
		existing, err := client.ProviderSetting.
			Query().
			Where(
				providersetting.TenantIDEQ(tenantID),
				providersetting.ChannelEQ(data.Channel),
				providersetting.ProviderEQ(data.Provider),
				providersetting.ProviderTypeEQ(data.ProviderType),
				providersetting.ProviderNameEQ(data.ProviderName),
				providersetting.KeyEQ(data.Key),
			).
			Only(ctx)

		if err != nil {
			if ent.IsNotFound(err) {
				// Create new provider setting
				_, err := client.ProviderSetting.
					Create().
					SetTenantID(tenantID).
					SetChannel(data.Channel).
					SetProvider(data.Provider).
					SetProviderType(data.ProviderType).
					SetProviderName(data.ProviderName).
					SetKey(data.Key).
					SetValue(data.Value).
					SetDescription(data.Description).
					Save(ctx)
				if err != nil {
					log.Printf("seed provider setting create: %v", err)
				} else {
					fmt.Printf("✓ Created provider setting: %s/%s/%s/%s\n", data.ProviderType, data.ProviderName, data.Key, data.Value)
				}
			} else {
				log.Printf("seed provider setting query: %v", err)
			}
		} else {
			// Update existing setting if needed
			updated, err := existing.Update().
				SetChannel(data.Channel).
				SetProvider(data.Provider).
				SetProviderType(data.ProviderType).
				SetProviderName(data.ProviderName).
				SetValue(data.Value).
				SetDescription(data.Description).
				Save(ctx)
			if err != nil {
				log.Printf("seed provider setting update: %v", err)
			} else {
				fmt.Printf("✓ Updated provider setting: %s/%s/%s/%s (ID: %d)\n", data.ProviderType, data.ProviderName, data.Key, data.Value, updated.ID)
			}
		}
	}

	fmt.Println("✅ Ent migration and seed complete")
}
