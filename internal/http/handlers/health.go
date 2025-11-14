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

type livenessResponse struct {
	Status  string `json:"status" example:"ok"`
	Service string `json:"service" example:"notifications-app"`
}

type readinessResponse struct {
	Status       string            `json:"status" example:"OK"`
	Dependencies map[string]string `json:"dependencies"`
}

// Liveness returns the service status without touching external deps.
// @Summary Service liveness probe
// @Description Returns OK when the API process is running.
// @Tags Health
// @Produce json
// @Success 200 {object} livenessResponse
// @Router /healthz [get]
func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, livenessResponse{Status: "ok", Service: "notifications-app"})
}

// Readiness checks upstream dependencies.
// @Summary Readiness probe
// @Description Validates connectivity to Postgres, Redis, and NATS (when configured).
// @Tags Health
// @Produce json
// @Success 200 {object} readinessResponse
// @Failure 503 {object} readinessResponse
// @Router /readyz [get]
func (h *HealthHandler) Readiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	issues := map[string]string{}

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

	c.JSON(status, readinessResponse{
		Status:       http.StatusText(status),
		Dependencies: issues,
	})
}

// Metrics exposes Prometheus metrics.
// @Summary Prometheus metrics
// @Description Exposes Prometheus metrics for scraping.
// @Tags Health
// @Produce plain
// @Success 200 {string} string "Prometheus metrics payload"
// @Router /metrics [get]
func (h *HealthHandler) Metrics(c *gin.Context) {
	promhttp.Handler().ServeHTTP(c.Writer, c.Request)
}
