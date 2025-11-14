package branding

import (
	"context"

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

// LoadBranding loads tenant branding details from DB if the table exists.
// Returns zero-values when not found or on any error (non-fatal).
func LoadBranding(ctx context.Context, db *pgxpool.Pool, tenantID string) (Info, error) {
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
