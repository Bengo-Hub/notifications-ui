package config

import (
	"context"
	"os"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/database"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	"github.com/bengobox/notifications-api/internal/encryption"
)

type Settings map[string]string

// LoadTenantProviderSettings loads provider settings for a tenant/channel/provider using Ent.
// If decryptionKey is non-nil (32 bytes), values stored with is_encrypted=true are decrypted.
func LoadTenantProviderSettings(ctx context.Context, dbCfg config.PostgresConfig, tenantID, channel, provider string, decryptionKey []byte) (Settings, error) {
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
		val := r.Value
		if r.IsEncrypted && len(decryptionKey) == 32 {
			if dec, err := encryption.Decrypt(val, decryptionKey); err == nil {
				val = dec
			}
		}
		out[r.Key] = val
	}
	return out, nil
}
