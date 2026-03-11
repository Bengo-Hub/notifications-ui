package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// PlatformBilling holds the schema definition for global billing settings.
type PlatformBilling struct {
	ent.Schema
}

// Fields of the PlatformBilling.
func (PlatformBilling) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.Float("cost_per_sms").
			Default(1.0).
			Comment("Default cost per SMS segment"),
		field.Float("cost_per_whatsapp").
			Default(2.0).
			Comment("Default cost per WhatsApp conversation/message"),
		field.Float("min_topup_amount").
			Default(500.0).
			Comment("Minimum allowed top-up amount in base currency"),
		field.UUID("treasury_gateway_id", uuid.UUID{}).
			Optional().
			Nillable().
			Comment("The gateway ID in Treasury service to use for top-ups"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}
