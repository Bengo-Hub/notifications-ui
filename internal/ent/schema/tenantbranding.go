//go:build entgen
// +build entgen

package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// TenantBranding stores tenant branding information.
type TenantBranding struct {
	ent.Schema
}

func (TenantBranding) Fields() []ent.Field {
	return []ent.Field{
		field.String("tenant_id").Unique(),
		field.String("name").Optional(),
		field.String("email").Optional(),
		field.String("phone").Optional(),
		field.String("logo_url").Optional(),
		field.String("primary_color").Optional(),
		field.String("secondary_color").Optional(),
	}
}


