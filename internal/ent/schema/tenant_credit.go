package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TenantCredit holds the schema definition for tenant credits (SMS/WhatsApp).
type TenantCredit struct {
	ent.Schema
}

// Fields of the TenantCredit.
func (TenantCredit) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.UUID("tenant_id", uuid.UUID{}).
			Comment("Tenant identifier"),
		field.Enum("type").
			Values("SMS", "WHATSAPP").
			Default("SMS").
			Comment("Credit type"),
		field.Float("balance").
			Default(0).
			Comment("Current credit balance"),
		field.Float("rate").
			Default(0).
			Comment("Rate per unit (e.g. 1.0 KES per SMS)"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the TenantCredit.
func (TenantCredit) Edges() []ent.Edge {
	return nil
}

// Indexes of the TenantCredit.
func (TenantCredit) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("tenant_id", "type").
			Unique(),
	}
}
