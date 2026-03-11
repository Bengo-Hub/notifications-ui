package branding

import (
	"context"

	"github.com/bengobox/notifications-api/internal/config"
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
SELECT name, contact_email, contact_phone, logo_url, brand_colors
FROM tenants
WHERE id = $1
LIMIT 1
`
	var colors map[string]any
	var out Info
	err := db.QueryRow(ctx, q, tenantID).Scan(
		&out.Name,
		&out.Email,
		&out.Phone,
		&out.LogoURL,
		&colors,
	)
	if err == nil {
		if v, ok := colors["primary"].(string); ok {
			out.PrimaryColor = v
		}
		if v, ok := colors["secondary"].(string); ok {
			out.SecondaryColor = v
		}
	}
	return out, nil
}
