package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-api/internal/modules/billing"
	httpware "github.com/Bengo-Hub/httpware"
)

// BillingHandler handles credit-related requests.
type BillingHandler struct {
	log     *zap.Logger
	service *billing.Service
}

// NewBillingHandler creates a new billing handler.
func NewBillingHandler(log *zap.Logger, service *billing.Service) *BillingHandler {
	return &BillingHandler{
		log:     log.Named("billing.handler"),
		service: service,
	}
}

// GetBalance returns the credit balance for a tenant.
func (h *BillingHandler) GetBalance(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantIDStr := httpware.GetTenantID(ctx)

	// Platform owners can override via query param
	if httpware.IsPlatformOwner(ctx) {
		if q := r.URL.Query().Get("tenantId"); q != "" {
			tenantIDStr = q
		}
	}

	if tenantIDStr == "" {
		h.respondWithError(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	creditType := r.URL.Query().Get("type")
	if creditType == "" {
		creditType = "SMS"
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid tenant id")
		return
	}

	balance, err := h.service.GetBalance(r.Context(), tenantID, creditType)
	if err != nil {
		h.log.Error("failed to get balance", zap.Error(err))
		h.respondWithError(w, http.StatusInternalServerError, "failed to retrieve balance")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]any{
		"tenant_id": tenantID,
		"type":      creditType,
		"balance":   balance,
	})
}

// TopUp (Internal-only or secured) adds credits to a tenant.
func (h *BillingHandler) TopUp(w http.ResponseWriter, r *http.Request) {
	var in struct {
		TenantID    uuid.UUID `json:"tenant_id"`
		Type        string    `json:"type"`
		Amount      float64   `json:"amount"`
		ReferenceID string    `json:"reference_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.TopUpCredits(r.Context(), in.TenantID, in.Type, in.Amount, in.ReferenceID); err != nil {
		h.log.Error("failed to top up", zap.Error(err))
		h.respondWithError(w, http.StatusInternalServerError, "failed to process top-up")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

// Initiate starts the checkout flow for credit top-up.
func (h *BillingHandler) Initiate(w http.ResponseWriter, r *http.Request) {
	var in billing.TopUpInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	tenantIDStr := httpware.GetTenantID(ctx)
	if tenantIDStr != "" && !httpware.IsPlatformOwner(ctx) {
		tid, _ := uuid.Parse(tenantIDStr)
		in.TenantID = tid
	}

	if in.TenantID == uuid.Nil {
		h.respondWithError(w, http.StatusBadRequest, "tenant_id required")
		return
	}

	result, err := h.service.InitiateTopUp(ctx, in)
	if err != nil {
		h.log.Error("failed to initiate top-up", zap.Error(err))
		h.respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.respondWithJSON(w, http.StatusOK, result)
}

func (h *BillingHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

func (h *BillingHandler) respondWithJSON(w http.ResponseWriter, code int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}
