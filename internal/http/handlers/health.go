package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type dbPinger interface {
	Ping(context.Context) error
}

// HealthHandler exposes service health endpoints.
type HealthHandler struct {
	log    *zap.Logger
	db     dbPinger
	cache  *redis.Client
	events *nats.Conn
}

func NewHealthHandler(log *zap.Logger, db dbPinger, cache *redis.Client, events *nats.Conn) *HealthHandler {
	return &HealthHandler{log: log, db: db, cache: cache, events: events}
}

func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "notifications-app"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	issues := gin.H{}

	if h.db != nil {
		if err := h.db.Ping(ctx); err != nil {
			issues["postgres"] = err.Error()
		}
	}

	if h.cache != nil {
		if err := h.cache.Ping(ctx).Err(); err != nil {
			issues["redis"] = err.Error()
		}
	}

	if h.events != nil && !h.events.IsConnected() {
		issues["nats"] = "not connected"
	}

	status := http.StatusOK
	if len(issues) > 0 {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"status":       http.StatusText(status),
		"dependencies": issues,
	})
}

func (h *HealthHandler) Metrics(c *gin.Context) {
	promhttp.Handler().ServeHTTP(c.Writer, c.Request)
}
