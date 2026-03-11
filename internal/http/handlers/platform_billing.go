package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/bengobox/notifications-api/internal/ent"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type PlatformBilling struct {
	client *ent.Client
	logger *zap.Logger
}

func NewPlatformBilling(client *ent.Client, logger *zap.Logger) *PlatformBilling {
	return &PlatformBilling{
		client: client,
		logger: logger.Named("platform_billing"),
	}
}

type updateBillingRequest struct {
	CostPerSMS       float64   `json:"cost_per_sms"`
	CostPerWhatsApp  float64   `json:"cost_per_whatsapp"`
	MinTopupAmount   float64   `json:"min_topup_amount"`
	TreasuryGatewayID *uuid.UUID `json:"treasury_gateway_id,omitempty"`
}

func (h *PlatformBilling) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.client.PlatformBilling.Query().First(r.Context())
	if err != nil {
		if ent.IsNotFound(err) {
			// Return default/empty
			jsonResponse(w, http.StatusOK, map[string]interface{}{})
			return
		}
		h.logger.Error("failed to get billing settings", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to get settings")
		return
	}
	jsonResponse(w, http.StatusOK, settings)
}

func (h *PlatformBilling) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req updateBillingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request")
		return
	}

	settings, err := h.client.PlatformBilling.Query().First(r.Context())
	if err != nil {
		if ent.IsNotFound(err) {
			// Create new
			builder := h.client.PlatformBilling.Create().
				SetCostPerSms(req.CostPerSMS).
				SetCostPerWhatsapp(req.CostPerWhatsApp).
				SetMinTopupAmount(req.MinTopupAmount)
			if req.TreasuryGatewayID != nil {
				builder.SetTreasuryGatewayID(*req.TreasuryGatewayID)
			}
			settings, err = builder.Save(r.Context())
		} else {
			h.logger.Error("failed to query billing settings", zap.Error(err))
			jsonError(w, http.StatusInternalServerError, "failed to update settings")
			return
		}
	} else {
		// Update existing
		builder := settings.Update().
			SetCostPerSms(req.CostPerSMS).
			SetCostPerWhatsapp(req.CostPerWhatsApp).
			SetMinTopupAmount(req.MinTopupAmount)
		if req.TreasuryGatewayID != nil {
			builder.SetTreasuryGatewayID(*req.TreasuryGatewayID)
		}
		settings, err = builder.Save(r.Context())
	}

	if err != nil {
		h.logger.Error("failed to save billing settings", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to save settings")
		return
	}

	jsonResponse(w, http.StatusOK, settings)
}
