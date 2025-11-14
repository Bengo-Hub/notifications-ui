//go:build entgen

package config

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bengobox/notifications-app/internal/ent"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// LoadTenantProviderSettings (entgen) uses ent if available; db is unused here.
func LoadTenantProviderSettings(ctx context.Context, _ *pgxpool.Pool, tenantID, channel, provider string) (Settings, error) {
	dsn := os.Getenv("NOTIFICATIONS_POSTGRES_URL")
	client, err := ent.Open("pgx", dsn)
	if err != nil {
		return Settings{}, nil
	}
	defer client.Close()
	rows, err := client.ProviderSetting.
		Query().
		Where(
			ent.ProviderSettingTenantID(tenantID),
			ent.ProviderSettingChannel(channel),
			ent.ProviderSettingProvider(provider),
		).
		All(ctx)
	if err != nil {
		return Settings{}, nil
	}
	out := Settings{}
	for _, r := range rows {
		out[r.Key] = r.Value
	}
	return out, nil
}


