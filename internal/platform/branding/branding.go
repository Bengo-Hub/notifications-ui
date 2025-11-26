package branding

import (
	"context"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Info struct {
	Name           string
	Email          string
	Phone          string
	LogoURL        string
	PrimaryColor   string
	SecondaryColor string
}

// LoadBranding loads tenant branding details. Tries Ent first; falls back to raw SQL if Ent schemas not yet created.
func LoadBranding(ctx context.Context, db *pgxpool.Pool, dbCfg config.PostgresConfig, tenantID string) (Info, error) {
	// Try Ent path first (when schemas are generated and migrated)
	if info, err := LoadBrandingEnt(ctx, dbCfg, tenantID); err == nil && (info != Info{}) {
		return info, nil
	}
	// Fallback to raw SQL for early bootstrap or when Ent not compiled
	return loadBrandingSQL(ctx, db, tenantID)
}

// loadBrandingSQL loads branding via raw SQL; used as fallback.
func loadBrandingSQL(ctx context.Context, db *pgxpool.Pool, tenantID string) (Info, error) {
	if db == nil || tenantID == "" {
		return Info{}, nil
	}
	const q = `
SELECT name, email, phone, logo_url, primary_color, secondary_color
FROM tenant_branding
WHERE tenant_id = $1
LIMIT 1
`
	var out Info
	_ = db.QueryRow(ctx, q, tenantID).Scan(
		&out.Name,
		&out.Email,
		&out.Phone,
		&out.LogoURL,
		&out.PrimaryColor,
		&out.SecondaryColor,
	)
	return out, nil
}
