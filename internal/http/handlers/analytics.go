package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// AnalyticsHandler provides delivery analytics endpoints (stub for MVP; can be backed by DB/ClickHouse later).
type AnalyticsHandler struct{}

// NewAnalyticsHandler creates a new AnalyticsHandler.
func NewAnalyticsHandler() *AnalyticsHandler {
	return &AnalyticsHandler{}
}

// DeliveryStatsResponse matches the notifications-ui DeliveryStats type.
type DeliveryStatsResponse struct {
	TotalSent      int                `json:"totalSent"`
	DeliveryRate   float64            `json:"deliveryRate"`
	ErrorRate      float64            `json:"errorRate"`
	ChannelBreakdown map[string]int    `json:"channelBreakdown"`
	TimeSeries     []TimeSeriesPoint  `json:"timeSeries"`
}

type TimeSeriesPoint struct {
	Date      string `json:"date"`
	Sent      int    `json:"sent"`
	Delivered int    `json:"delivered"`
}

// Delivery returns delivery stats for a tenant (stub: zeros; implement with real data when analytics store exists).
//
// @Summary      Delivery analytics
// @Description  Returns delivery statistics for the tenant. Query: range (e.g. 24h, 7d). Stub implementation; implement with real data when analytics store exists.
// @Tags         Analytics
// @Param        tenantId  path      string  true   "Tenant identifier"
// @Param        range     query     string  false  "Time range (e.g. 24h, 7d)"
// @Success      200       {object}  DeliveryStatsResponse
// @Router       /analytics/delivery/{tenantId} [get]
// @Security     bearerAuth
// @Security     ApiKeyAuth
func (h *AnalyticsHandler) Delivery(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "tenantId")
	rangeQ := r.URL.Query().Get("range")
	if rangeQ == "" {
		rangeQ = "24h"
	}

	resp := DeliveryStatsResponse{
		TotalSent:       0,
		DeliveryRate:    0,
		ErrorRate:       0,
		ChannelBreakdown: map[string]int{"email": 0, "sms": 0, "push": 0},
		TimeSeries:      []TimeSeriesPoint{},
	}
	_ = rangeQ

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
