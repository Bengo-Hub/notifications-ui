package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// NotificationPermission holds the schema definition for notification service permissions.
type NotificationPermission struct {
	ent.Schema
}

// Fields of the NotificationPermission.
func (NotificationPermission) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New).
			Immutable(),
		field.String("permission_code").
			NotEmpty().
			Unique().
			Comment("Permission code: notifications.templates.view, etc."),
		field.String("name").
			NotEmpty().
			Comment("Display name"),
		field.String("module").
			NotEmpty().
			Comment("Module: notifications, templates, providers, credits, billing, delivery_logs, config, users"),
		field.String("action").
			NotEmpty().
			Comment("Action: add, view, view_own, change, change_own, delete, delete_own, manage, manage_own"),
		field.String("resource").
			Optional().
			Comment("Resource: notifications, templates, etc."),
		field.Text("description").
			Optional(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

// Edges of the NotificationPermission.
func (NotificationPermission) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("roles", NotificationRole.Type).Ref("permissions").Through("notification_role_permissions", NotificationRolePermission.Type),
	}
}

// Indexes of the NotificationPermission.
func (NotificationPermission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("permission_code").Unique(),
		index.Fields("module"),
		index.Fields("action"),
		index.Fields("module", "action"),
	}
}
