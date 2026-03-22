package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-api/internal/config"
	"github.com/bengobox/notifications-api/internal/messaging"
)

// inventoryEvent is the CloudEvents envelope from inventory-service.
type inventoryEvent struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	TenantID string                 `json:"tenantId"`
	Data     map[string]interface{} `json:"data"`
}

// inventoryNotificationMapping maps event types to notification details.
type inventoryNotificationMapping struct {
	TemplateID   string
	EmailSubject string
	DataBuilder  func(data map[string]interface{}) map[string]interface{}
}

var inventoryMappings = map[string]inventoryNotificationMapping{
	"inventory.stock.low": {
		TemplateID:   "email/inventory/low_stock_alert",
		EmailSubject: "Low Stock Alert",
		DataBuilder: func(data map[string]interface{}) map[string]interface{} {
			return map[string]interface{}{
				"name":          "Store Manager",
				"item_name":     data["name"],
				"item_sku":      data["sku"],
				"current_stock": data["available"],
				"min_threshold": data["reorder_level"],
				"unit":          "",
				"location":      data["warehouse_id"],
				"item_link":     fmt.Sprintf("https://theurbanloftcafe.com/dashboard/inventory?sku=%s", data["sku"]),
			}
		},
	},
}

// startInventoryConsumer subscribes to inventory.> events from the inventory-service
// JetStream stream and republishes them as notification messages.
func startInventoryConsumer(ctx context.Context, nc *nats.Conn, js nats.JetStreamContext, cfg *config.Config, logg *zap.Logger) {
	if nc == nil || js == nil {
		logg.Warn("skipping inventory consumer: NATS not available")
		return
	}

	handler := func(m *nats.Msg) {
		var evt inventoryEvent
		if err := json.Unmarshal(m.Data, &evt); err != nil {
			logg.Error("inventory event: unmarshal failed", zap.Error(err))
			_ = m.Ack()
			return
		}

		mapping, ok := inventoryMappings[evt.Type]
		if !ok {
			logg.Debug("inventory event: unhandled type, skipping", zap.String("type", evt.Type))
			_ = m.Ack()
			return
		}

		// For inventory alerts, send to tenant admin (use tenant_id to look up admin email)
		// Fallback: use a configured admin email or the event's tenant context
		adminEmail := "admin@theurbanloftcafe.com" // TODO: resolve from tenant settings
		sku, _ := evt.Data["sku"].(string)

		msg := messaging.Message{
			TenantID:   evt.TenantID,
			Channel:    "email",
			TemplateID: mapping.TemplateID,
			To:         []string{adminEmail},
			Data:       mapping.DataBuilder(evt.Data),
			Metadata: map[string]interface{}{
				"subject": mapping.EmailSubject,
			},
			RequestID:      uuid.New().String(),
			IdempotencyKey: fmt.Sprintf("inventory-%s-%s-%s", evt.Type, sku, evt.ID),
			QueuedAt:       time.Now(),
		}

		if _, err := messaging.Publish(ctx, nc, cfg.Events, msg); err != nil {
			logg.Error("inventory event: failed to dispatch notification",
				zap.String("type", evt.Type),
				zap.String("sku", sku),
				zap.Error(err),
			)
			_ = m.Nak()
			return
		}

		logg.Info("inventory notification dispatched",
			zap.String("type", evt.Type),
			zap.String("template", mapping.TemplateID),
			zap.String("sku", sku),
		)
		_ = m.Ack()
	}

	_, err := js.Subscribe("inventory.>", handler,
		nats.BindStream("inventory"),
		nats.Durable("notifications-inventory-stock"),
		nats.ManualAck(),
		nats.AckWait(30*time.Second),
		nats.MaxDeliver(3),
	)
	if err != nil {
		logg.Warn("inventory consumer subscription failed (inventory stream may not exist yet)", zap.Error(err))
		return
	}

	logg.Info("inventory consumer started", zap.String("subject", "inventory.>"))
}
