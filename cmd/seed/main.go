package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	tenantmodule "github.com/bengobox/notifications-api/internal/modules/tenant"
	"github.com/joho/godotenv"
)

// platformTenantID is the well-known ID for platform-level (shared) data.
// All platform-managed provider configs use this as tenant_id.
const platformTenantID = "platform"

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

	if err := database.RunMigrations(ctx, client); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// ── Phase 1: Platform-level shared providers ────────────────────────
	// These are global provider configurations available to all tenants.
	// Tenants select which provider to use via their own _preferred rows.
	seedPlatformProviders(ctx, client)

	// ── Phase 2: Tenant sync (optional, for dev/staging) ────────────────
	// In production, tenants are synced JIT via the TenantV2 middleware.
	// For dev/staging, sync a list of known slugs from SEED_TENANTS env var.
	tenantSlugs := os.Getenv("SEED_TENANTS")
	if tenantSlugs == "" {
		tenantSlugs = "codevertex,mss,urban-loft,kura,ultichange"
	}

	tenantSyncer := tenantmodule.NewSyncer(client, cfg.Services.AuthAPI)
	for _, slug := range strings.Split(tenantSlugs, ",") {
		slug = strings.TrimSpace(slug)
		if slug == "" {
			continue
		}

		id, err := tenantSyncer.SyncTenant(ctx, slug)
		if err != nil {
			fmt.Printf("  ! tenant sync failed: %s (%v)\n", slug, err)
			continue
		}
		fmt.Printf("  synced tenant: %s (%s)\n", slug, id)

		seedTenantDefaults(ctx, client, id.String(), slug)
	}

	fmt.Println("seed complete")
}

// seedPlatformProviders creates platform-level provider config rows.
// These are shared across all tenants and managed by platform admins.
func seedPlatformProviders(ctx context.Context, client *ent.Client) {
	providers := []struct {
		providerType string
		providerName string
		envKey       string // if set, check env to determine active status
	}{
		{"email", "smtp", ""},
		{"email", "sendgrid", "SENDGRID_API_KEY"},
		{"sms", "twilio", "TWILIO_ACCOUNT_SID"},
		{"sms", "africastalking", "AFRICAS_TALKING_KEY"},
		{"sms", "vonage", "VONAGE_API_KEY"},
		{"sms", "plivo", "PLIVO_AUTH_ID"},
		{"push", "fcm", "FCM_SERVICE_ACCOUNT"},
		{"whatsapp", "apiwap", "APIWAP_API_KEY"},
	}

	for _, p := range providers {
		existing, _ := client.ProviderSetting.Query().
			Where(
				providersetting.TenantIDEQ(platformTenantID),
				providersetting.IsPlatform(true),
				providersetting.ProviderTypeEQ(p.providerType),
				providersetting.ProviderNameEQ(p.providerName),
				providersetting.KeyEQ("_config"),
			).First(ctx)

		isActive := true
		if p.envKey != "" && os.Getenv(p.envKey) == "" {
			isActive = false
		}

		if existing == nil {
			_, err := client.ProviderSetting.Create().
				SetTenantID(platformTenantID).
				SetChannel(p.providerType).
				SetProvider(p.providerName).
				SetProviderType(p.providerType).
				SetProviderName(p.providerName).
				SetKey("_config").
				SetValue("configured").
				SetIsPlatform(true).
				SetIsPlatformManaged(true).
				SetIsActive(isActive).
				SetStatus("active").
				Save(ctx)
			if err == nil {
				fmt.Printf("  platform provider: %s/%s (active=%v)\n", p.providerType, p.providerName, isActive)
			}
		} else {
			_, _ = existing.Update().SetIsActive(isActive).Save(ctx)
		}
	}
}

// seedTenantDefaults sets default preferred providers for a tenant.
// Only creates rows that don't already exist (idempotent).
func seedTenantDefaults(ctx context.Context, client *ent.Client, tenantID, slug string) {
	defaults := []struct {
		providerType string
		providerName string
	}{
		{"email", "smtp"},
		{"sms", "twilio"},
	}

	for _, d := range defaults {
		existing, _ := client.ProviderSetting.Query().
			Where(
				providersetting.TenantID(tenantID),
				providersetting.ProviderTypeEQ(d.providerType),
				providersetting.KeyEQ("_preferred"),
			).First(ctx)

		if existing != nil {
			continue
		}

		_, err := client.ProviderSetting.Create().
			SetTenantID(tenantID).
			SetChannel(d.providerType).
			SetProvider(d.providerName).
			SetProviderType(d.providerType).
			SetProviderName(d.providerName).
			SetKey("_preferred").
			SetValue(d.providerName).
			SetIsPlatform(false).
			SetIsActive(true).
			SetStatus("active").
			Save(ctx)
		if err == nil {
			fmt.Printf("    default %s for %s: %s\n", d.providerType, slug, d.providerName)
		}
	}
}
