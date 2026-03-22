package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// NotificationRolePermission holds the schema definition for the notification role-permission junction table.
type NotificationRolePermission struct {
	ent.Schema
}

// Fields of the NotificationRolePermission.
func (NotificationRolePermission) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("role_id", uuid.UUID{}).
			Comment("Role identifier"),
		field.UUID("permission_id", uuid.UUID{}).
			Comment("Permission identifier"),
	}
}

// Edges of the NotificationRolePermission.
func (NotificationRolePermission) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("role", NotificationRole.Type).
			Field("role_id").
			Required().
			Unique(),
		edge.To("permission", NotificationPermission.Type).
			Field("permission_id").
			Required().
			Unique(),
	}
}

// Indexes of the NotificationRolePermission.
func (NotificationRolePermission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("role_id", "permission_id").Unique(),
		index.Fields("role_id"),
		index.Fields("permission_id"),
	}
}
