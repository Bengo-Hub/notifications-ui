//go:build entgen

package branding

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bengobox/notifications-app/internal/ent"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// LoadBranding (entgen) uses ent client; db is unused here.
func LoadBranding(ctx context.Context, _ *pgxpool.Pool, tenantID string) (Info, error) {
	dsn := os.Getenv("NOTIFICATIONS_POSTGRES_URL")
	client, err := ent.Open("pgx", dsn)
	if err != nil {
		return Info{}, nil
	}
	defer client.Close()
	b, err := client.TenantBranding.
		Query().
		Where(ent.TenantBrandingTenantID(tenantID)).
		Only(ctx)
	if err != nil {
		return Info{}, nil
	}
	return Info{
		Name:           b.Name,
		Email:          b.Email,
		Phone:          b.Phone,
		LogoURL:        b.LogoURL,
		PrimaryColor:   b.PrimaryColor,
		SecondaryColor: b.SecondaryColor,
	}, nil
}


