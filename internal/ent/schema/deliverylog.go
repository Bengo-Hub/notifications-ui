package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// DeliveryLog holds the schema definition for notification delivery audit log.
type DeliveryLog struct {
	ent.Schema
}

// Fields of the DeliveryLog.
func (DeliveryLog) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("tenant_id").
			NotEmpty(),
		field.String("template_id").
			NotEmpty().
			Comment("Template identifier (e.g. order_confirmation)"),
		field.String("channel").
			NotEmpty().
			Comment("email, sms, push"),
		field.String("recipient").
			NotEmpty(),
		field.String("status").
			Default("sent").
			Comment("sent, delivered, failed"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

// Indexes of the DeliveryLog.
func (DeliveryLog) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("tenant_id"),
		index.Fields("created_at"),
		index.Fields("tenant_id", "created_at"),
	}
}
