package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// TenantBranding holds the schema definition for the TenantBranding entity.
type TenantBranding struct {
	ent.Schema
}

// Fields of the TenantBranding.
func (TenantBranding) Fields() []ent.Field {
	return []ent.Field{
		field.String("tenant_id").
			Unique(),
		field.String("logo_url").
			Optional(),
		field.String("primary_color").
			Optional(),
		field.String("secondary_color").
			Optional(),
		field.String("font_family").
			Optional(),
		field.Text("custom_css").
			Optional(),
		field.JSON("metadata", map[string]interface{}{}).
			Optional(),
	}
}

// Edges of the TenantBranding.
func (TenantBranding) Edges() []ent.Edge {
	return nil
}

// Indexes of the TenantBranding.
func (TenantBranding) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("tenant_id").Unique(),
	}
}
