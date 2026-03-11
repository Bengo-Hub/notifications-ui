package branding

import (
	"context"
	"os"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	enttenant "github.com/bengobox/notifications-api/internal/ent/tenant"
	"github.com/google/uuid"
)

// LoadBrandingEnt loads tenant branding using Ent.
func LoadBrandingEnt(ctx context.Context, dbCfg config.PostgresConfig, tenantID string) (Info, error) {
	dsn := dbCfg.URL
	if env := os.Getenv("NOTIFICATIONS_POSTGRES_URL"); env != "" {
		dsn = env
	}
	if dsn == "" {
		return Info{}, nil
	}
	client, err := database.NewClient(ctx, config.PostgresConfig{URL: dsn})
	if err != nil {
		return Info{}, nil
	}
	defer client.Close()

	// Query from Tenant entity instead of TenantBranding
	t, err := client.Tenant.
		Query().
		Where(enttenant.IDEQ(parseUUID(tenantID))).
		Only(ctx)
	if err != nil {
		return Info{}, nil
	}

	info := Info{
		LogoURL: t.LogoURL,
	}

	// Extract brand colors
	if t.BrandColors != nil {
		if v, ok := t.BrandColors["primary"].(string); ok {
			info.PrimaryColor = v
		}
		if v, ok := t.BrandColors["secondary"].(string); ok {
			info.SecondaryColor = v
		}
	}

	// Extract optional fields from metadata
	if t.Metadata != nil {
		if name, ok := t.Metadata["from_name"].(string); ok {
			info.Name = name
		}
		if email, ok := t.Metadata["from_email"].(string); ok {
			info.Email = email
		}
	}

	return info, nil
}

func parseUUID(s string) uuid.UUID {
	u, _ := uuid.Parse(s)
	return u
}
