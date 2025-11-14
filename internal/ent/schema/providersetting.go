//go:build entgen
// +build entgen

package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ProviderSetting holds overrides per tenant/channel/provider.
type ProviderSetting struct {
	ent.Schema
}

func (ProviderSetting) Fields() []ent.Field {
	return []ent.Field{
		field.String("tenant_id"),
		field.String("channel"),
		field.String("provider"),
		field.String("key"),
		field.String("value"),
	}
}

func (ProviderSetting) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("tenant_id", "channel", "provider", "key").Unique(),
	}
}


