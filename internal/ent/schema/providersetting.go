package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ProviderSetting holds the schema definition for the ProviderSetting entity.
type ProviderSetting struct {
	ent.Schema
}

// Fields of the ProviderSetting.
func (ProviderSetting) Fields() []ent.Field {
	return []ent.Field{
		field.String("tenant_id"),
		field.String("channel"). // email, sms, push
						Optional(),
		field.String("provider"). // smtp, sendgrid, twilio, etc.
						Optional(),
		field.String("provider_type"). // email, sms, push
						Optional(),
		field.String("provider_name"). // smtp, sendgrid, twilio, etc.
						Optional(),
		field.String("key").
			Optional(),
		field.Text("value").
			Optional(),
		field.Text("description").
			Optional(),
		field.Bool("is_encrypted").
			Default(false),
	}
}

// Edges of the ProviderSetting.
func (ProviderSetting) Edges() []ent.Edge {
	return nil
}

// Indexes of the ProviderSetting.
func (ProviderSetting) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("tenant_id", "provider_type", "provider_name", "key"),
		index.Fields("tenant_id", "provider_type"),
	}
}
