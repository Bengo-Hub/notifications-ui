package main

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	"github.com/bengobox/notifications-api/internal/modules/identity"
	tenantmodule "github.com/bengobox/notifications-api/internal/modules/tenant"
	"github.com/google/uuid"
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

	// ── Phase 3: Identity — roles, permissions, role-permission mappings ─
	seedPermissions(ctx, client)
	seedRoles(ctx, client)
	seedRolePermissions(ctx, client)

	// Optionally seed platform admin user
	if adminUserID := os.Getenv("SEED_PLATFORM_ADMIN_USER_ID"); adminUserID != "" {
		seedPlatformAdmin(ctx, client, tenantSyncer, adminUserID)
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

// permissionUUID generates a deterministic UUID from a permission code.
func permissionUUID(code string) uuid.UUID {
	hash := sha256.Sum256([]byte("notifications:" + code))
	return uuid.UUID(hash[:16])
}

// seedPermissions creates all notification-service permissions.
func seedPermissions(ctx context.Context, client *ent.Client) {
	fmt.Println("  seeding permissions...")

	type permDef struct {
		code        string
		module      string
		description string
	}

	perms := []permDef{
		{"notifications:read", "notifications", "View delivery logs and notification history"},
		{"notifications:send", "notifications", "Send/enqueue notifications"},
		{"notifications:manage", "notifications", "Full notification management"},
		{"templates:read", "templates", "View notification templates"},
		{"templates:manage", "templates", "Create, update, delete templates"},
		{"templates:test", "templates", "Send test notifications from templates"},
		{"providers:read", "providers", "View provider configurations"},
		{"providers:manage", "providers", "Configure notification providers"},
		{"settings:read", "settings", "View tenant settings"},
		{"settings:manage", "settings", "Update tenant settings"},
		{"billing:read", "billing", "View balance and transaction history"},
		{"billing:manage", "billing", "Initiate top-ups and manage billing"},
		{"analytics:read", "analytics", "View delivery analytics"},
		{"analytics:export", "analytics", "Export analytics data"},
		{"credits:read", "credits", "View credit balance"},
		{"credits:manage", "credits", "Manage credit transactions"},
		{"users:read", "users", "View users in tenant"},
		{"users:manage", "users", "Manage user roles"},
		{"platform:providers", "platform", "Manage platform-level providers"},
		{"platform:billing", "platform", "Manage platform billing settings"},
	}

	for _, p := range perms {
		id := permissionUUID(p.code)
		existing, _ := client.Permission.Get(ctx, id)
		if existing != nil {
			// Update in case description changed
			_, _ = existing.Update().
				SetName(p.code).
				SetModule(p.module).
				SetDescription(p.description).
				Save(ctx)
			continue
		}

		err := client.Permission.Create().
			SetID(id).
			SetName(p.code).
			SetModule(p.module).
			SetDescription(p.description).
			Exec(ctx)
		if err == nil {
			fmt.Printf("    permission: %s\n", p.code)
		} else {
			fmt.Printf("    ! permission %s: %v\n", p.code, err)
		}
	}
}

// seedRoles creates the system roles.
func seedRoles(ctx context.Context, client *ent.Client) {
	fmt.Println("  seeding roles...")

	type roleDef struct {
		id          string
		name        string
		scope       string
		description string
	}

	roles := []roleDef{
		{"viewer", "Viewer", "tenant", "Read-only access to notifications data"},
		{"manager", "Manager", "tenant", "Manage notifications, templates, providers"},
		{"admin", "Admin", "tenant", "Full tenant administration"},
		{"superuser", "Superuser", "global", "Platform-wide superuser access"},
	}

	for _, r := range roles {
		existing, _ := client.Role.Get(ctx, r.id)
		if existing != nil {
			_, _ = existing.Update().
				SetName(r.name).
				SetScope(r.scope).
				SetDescription(r.description).
				SetSystemRole(true).
				Save(ctx)
			fmt.Printf("    role (updated): %s (%s)\n", r.id, r.scope)
			continue
		}

		err := client.Role.Create().
			SetID(r.id).
			SetName(r.name).
			SetScope(r.scope).
			SetDescription(r.description).
			SetSystemRole(true).
			Exec(ctx)
		if err == nil {
			fmt.Printf("    role: %s (%s)\n", r.id, r.scope)
		} else {
			fmt.Printf("    ! role %s: %v\n", r.id, err)
		}
	}
}

// seedRolePermissions attaches permissions to roles per DefaultPermissions mapping.
func seedRolePermissions(ctx context.Context, client *ent.Client) {
	fmt.Println("  seeding role-permission mappings...")

	roles := []identity.Role{
		identity.RoleViewer,
		identity.RoleManager,
		identity.RoleAdmin,
		identity.RoleSuperAdmin,
	}

	for _, role := range roles {
		perms := identity.DefaultPermissions(role)
		permIDs := make([]uuid.UUID, 0, len(perms))
		for _, p := range perms {
			permIDs = append(permIDs, permissionUUID(string(p)))
		}

		err := client.Role.UpdateOneID(string(role)).
			ClearPermissions().
			AddPermissionIDs(permIDs...).
			Exec(ctx)
		if err != nil {
			fmt.Printf("    ! role-perms %s: %v\n", role, err)
		} else {
			fmt.Printf("    role-perms: %s (%d permissions)\n", role, len(permIDs))
		}
	}
}

// seedPlatformAdmin seeds a platform admin user for the codevertex tenant.
func seedPlatformAdmin(ctx context.Context, client *ent.Client, syncer *tenantmodule.Syncer, adminUserIDStr string) {
	adminUserID, err := uuid.Parse(adminUserIDStr)
	if err != nil {
		fmt.Printf("  ! invalid SEED_PLATFORM_ADMIN_USER_ID: %v\n", err)
		return
	}

	// Ensure codevertex tenant is synced
	tenantID, err := syncer.SyncTenant(ctx, "codevertex")
	if err != nil {
		fmt.Printf("  ! failed to sync codevertex tenant for admin: %v\n", err)
		return
	}

	// Check if user already exists
	existing, _ := client.User.Get(ctx, adminUserID)
	if existing != nil {
		fmt.Printf("  platform admin already exists: %s\n", adminUserID)
		return
	}

	// Ensure superuser and admin roles exist
	for _, roleID := range []string{"superuser", "admin"} {
		if _, err := client.Role.Get(ctx, roleID); err != nil {
			fmt.Printf("  ! role %s not found, run seedRoles first\n", roleID)
			return
		}
	}

	err = client.User.Create().
		SetID(adminUserID).
		SetTenantID(tenantID).
		SetAuthServiceUserID(adminUserID).
		SetEmail("admin@codevertexitsolutions.com").
		SetFullName("Platform Admin").
		SetStatus("active").
		SetSyncStatus("synced").
		SetLocale("en").
		AddRoleIDs("superuser", "admin").
		Exec(ctx)
	if err != nil {
		fmt.Printf("  ! platform admin create: %v\n", err)
	} else {
		fmt.Printf("  platform admin seeded: %s\n", adminUserID)
	}
}
