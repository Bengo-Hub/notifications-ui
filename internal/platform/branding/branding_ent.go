package branding

import (
	"context"
	"os"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent/tenantbranding"
)

// LoadBrandingEnt loads tenant branding using Ent; falls back gracefully if Ent is not compiled.
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
	b, err := client.TenantBranding.
		Query().
		Where(tenantbranding.TenantIDEQ(tenantID)).
		Only(ctx)
	if err != nil {
		return Info{}, nil
	}

	// Extract data from metadata field
	info := Info{
		LogoURL:        b.LogoURL,
		PrimaryColor:   b.PrimaryColor,
		SecondaryColor: b.SecondaryColor,
	}

	// Extract optional fields from metadata
	if b.Metadata != nil {
		if name, ok := b.Metadata["name"].(string); ok {
			info.Name = name
		}
		if email, ok := b.Metadata["email"].(string); ok {
			info.Email = email
		}
		if phone, ok := b.Metadata["phone"].(string); ok {
			info.Phone = phone
		}
	}

	return info, nil
}
