package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"context"
	"crypto/sha256"
	"encoding/hex"

	"github.com/bengobox/notifications-app/internal/config"
	"github.com/bengobox/notifications-app/internal/messaging"
	"github.com/bengobox/notifications-app/internal/shared/middleware"
)

type NotificationHandler struct {
	log       *zap.Logger
	nats      *nats.Conn
	cache     *redis.Client
	eventsCfg config.EventsConfig
}

type CreateMessageRequest struct {
	Channel  string         `json:"channel" binding:"required" example:"email"`
	Tenant   string         `json:"tenant" binding:"required" example:"bengobox"`
	Template string         `json:"template" binding:"required" example:"invoice_due"`
	Data     map[string]any `json:"data" binding:"required" swaggertype:"object" example:"{\"name\":\"Jane\",\"invoice_number\":\"INV-1001\",\"amount\":\"KES 1,200\",\"due_date\":\"2025-11-30\",\"payment_link\":\"https://pay.example.com/invoices/INV-1001\",\"brand_name\":\"BengoBox\"}"`
	To       []string       `json:"to" binding:"required,min=1" example:"customer@example.com"`
	Metadata map[string]any `json:"metadata" swaggertype:"object" example:"{\"subject\":\"Invoice INV-1001 is due\",\"provider\":\"smtp\"}"`
}

func NewNotificationHandler(log *zap.Logger, natsConn *nats.Conn, cache *redis.Client, eventsCfg config.EventsConfig) *NotificationHandler {
	return &NotificationHandler{
		log:       log,
		nats:      natsConn,
		cache:     cache,
		eventsCfg: eventsCfg,
	}
}

type enqueueResponse struct {
	Status    string `json:"status" example:"queued"`
	RequestID string `json:"requestId" example:"req_123"`
}

type errorResponse struct {
	Error string `json:"error" example:"validation failed"`
}

// Enqueue receives a notification request and queues it for delivery.
// @Summary Queue notification message
// @Description Accepts a notification payload and queues it for downstream processing.
// @Tags Notifications
// @Accept json
// @Produce json
// @Param tenantId path string true "Tenant identifier"
// @Param request body CreateMessageRequest true "Message payload"
// @Example request
//
//	{
//	  "channel": "email",
//	  "tenant": "bengobox",
//	  "template": "invoice_due",
//	  "to": ["customer@example.com"],
//	  "data": {
//	    "name": "Jane",
//	    "invoice_number": "INV-1001",
//	    "amount": "KES 1,200",
//	    "due_date": "2025-11-30",
//	    "payment_link": "https://pay.example.com/invoices/INV-1001",
//	    "brand_name": "BengoBox"
//	  },
//	  "metadata": { "subject": "Invoice INV-1001 is due", "provider": "smtp" }
//	}
//
// @Success 202 {object} enqueueResponse
// @Failure 400 {object} errorResponse
// @Security ApiKeyAuth
// @Router /v1/{tenantId}/notifications/messages [post]
func (h *NotificationHandler) Enqueue(c *gin.Context) {
	var req CreateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	}

	tenant := req.Tenant
	if tenant == "" {
		tenant = middleware.TenantFromContext(c)
	}
	if tenant == "" {
		c.JSON(http.StatusBadRequest, errorResponse{Error: "tenant required"})
		return
	}

	requestID := c.GetString("request_id")
	idemp := c.GetHeader("Idempotency-Key")
	if idemp == "" {
		// derive from payload
		sum := sha256.Sum256([]byte(tenant + "|" + req.Channel + "|" + req.Template + "|" + requestID))
		idemp = hex.EncodeToString(sum[:])
	}

	// idempotency check (24h)
	if h.cache != nil {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
		defer cancel()
		key := "idemp:" + idemp
		ok, err := h.cache.SetNX(ctx, key, requestID, 24*time.Hour).Result()
		if err != nil {
			h.log.Warn("idempotency setnx failed", zap.Error(err))
		}
		if !ok {
			c.JSON(http.StatusAccepted, enqueueResponse{Status: "duplicate", RequestID: requestID})
			return
		}
	}

	msg := messaging.Message{
		TenantID:       tenant,
		Channel:        req.Channel,
		TemplateID:     req.Template,
		Data:           req.Data,
		To:             req.To,
		Metadata:       req.Metadata,
		RequestID:      requestID,
		IdempotencyKey: idemp,
		QueuedAt:       time.Now(),
	}

	if _, err := messaging.Publish(c.Request.Context(), h.nats, h.eventsCfg, msg); err != nil {
		h.log.Error("publish failed", zap.Error(err), zap.String("request_id", requestID))
		c.JSON(http.StatusInternalServerError, errorResponse{Error: "queue_unavailable"})
		return
	}

	c.JSON(http.StatusAccepted, enqueueResponse{Status: "queued", RequestID: requestID})
}
