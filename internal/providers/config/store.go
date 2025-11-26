package config

import (
	"context"
	"os"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/bengobox/notifications-app/internal/database"
	"github.com/bengobox/notifications-app/internal/ent/providersetting"
)

type Settings map[string]string

// LoadTenantProviderSettings loads provider settings for a tenant/channel/provider using Ent.
func LoadTenantProviderSettings(ctx context.Context, dbCfg config.PostgresConfig, tenantID, channel, provider string) (Settings, error) {
	dsn := dbCfg.URL
	if env := os.Getenv("NOTIFICATIONS_POSTGRES_URL"); env != "" {
		dsn = env
	}
	if dsn == "" {
		return Settings{}, nil
	}
	client, err := database.NewClient(ctx, config.PostgresConfig{URL: dsn})
	if err != nil {
		return Settings{}, err
	}
	defer client.Close()

	rows, err := client.ProviderSetting.
		Query().
		Where(
			providersetting.TenantIDEQ(tenantID),
			providersetting.ChannelEQ(channel),
			providersetting.ProviderEQ(provider),
		).
		All(ctx)
	if err != nil {
		return Settings{}, err
	}

	out := Settings{}
	for _, r := range rows {
		out[r.Key] = r.Value
	}
	return out, nil
}
