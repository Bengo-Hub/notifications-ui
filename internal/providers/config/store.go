package config

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Settings map[string]string

// LoadTenantProviderSettings loads provider settings for a tenant/channel/provider from DB.
// Falls back to empty result when table doesn't exist or no rows present.
func LoadTenantProviderSettings(ctx context.Context, db *pgxpool.Pool, tenantID, channel, provider string) (Settings, error) {
	if db == nil {
		return Settings{}, nil
	}
	const q = `
SELECT key, value
FROM provider_settings
WHERE tenant_id = $1 AND channel = $2 AND provider = $3
`
	rows, err := db.Query(ctx, q, tenantID, channel, provider)
	if err != nil {
		// fallback if table missing
		var pgErr *pgx.PgError
		if errors.As(err, &pgErr) {
			if strings.EqualFold(pgErr.Code, "42P01") { // undefined_table
				return Settings{}, nil
			}
		}
		return Settings{}, nil
	}
	defer rows.Close()
	out := Settings{}
	for rows.Next() {
		var k, v string
		if scanErr := rows.Scan(&k, &v); scanErr == nil {
			out[k] = v
		}
	}
	return out, nil
}
