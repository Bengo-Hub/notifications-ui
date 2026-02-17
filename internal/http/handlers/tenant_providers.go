package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"

	"github.com/bengobox/notifications-api/internal/ent"
	"github.com/bengobox/notifications-api/internal/ent/providersetting"
	"github.com/bengobox/notifications-api/internal/ent/tenantbranding"
)

// TenantProviders handles tenant-level notification provider selection and branding.
type TenantProviders struct {
	client *ent.Client
	logger *zap.Logger
}

// NewTenantProviders creates a new TenantProviders handler.
func NewTenantProviders(client *ent.Client, logger *zap.Logger) *TenantProviders {
	return &TenantProviders{client: client, logger: logger}
}

type availableProviderResponse struct {
	ProviderType string `json:"provider_type"`
	ProviderName string `json:"provider_name"`
	IsActive     bool   `json:"is_active"`
}

type selectProviderRequest struct {
	ProviderType string `json:"provider_type"` // email, sms
	ProviderName string `json:"provider_name"` // smtp, sendgrid, twilio, etc.
}

type brandingRequest struct {
	FromEmail      string `json:"from_email,omitempty"`
	FromName       string `json:"from_name,omitempty"`
	LogoURL        string `json:"logo_url,omitempty"`
	PrimaryColor   string `json:"primary_color,omitempty"`
	SecondaryColor string `json:"secondary_color,omitempty"`
}

type brandingResponse struct {
	TenantID       string `json:"tenant_id"`
	FromEmail      string `json:"from_email,omitempty"`
	FromName       string `json:"from_name,omitempty"`
	LogoURL        string `json:"logo_url,omitempty"`
	PrimaryColor   string `json:"primary_color,omitempty"`
	SecondaryColor string `json:"secondary_color,omitempty"`
}

// ListAvailable lists active platform providers available for tenant selection.
func (h *TenantProviders) ListAvailable(w http.ResponseWriter, r *http.Request) {
	settings, err := h.client.ProviderSetting.Query().
		Where(
			providersetting.TenantID(platformTenantID),
			providersetting.IsPlatform(true),
			providersetting.IsActive(true),
			providersetting.KeyEQ("_config"),
		).
		All(r.Context())
	if err != nil {
		h.logger.Error("failed to list available providers", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to list providers")
		return
	}

	result := make([]availableProviderResponse, 0, len(settings))
	for _, s := range settings {
		result = append(result, availableProviderResponse{
			ProviderType: s.ProviderType,
			ProviderName: s.ProviderName,
			IsActive:     s.IsActive,
		})
	}

	jsonResponse(w, http.StatusOK, map[string]any{"providers": result})
}

// SelectProvider sets the tenant's preferred provider for a channel.
func (h *TenantProviders) SelectProvider(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		jsonError(w, http.StatusBadRequest, "tenant ID required")
		return
	}

	var req selectProviderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProviderType == "" || req.ProviderName == "" {
		jsonError(w, http.StatusBadRequest, "provider_type and provider_name are required")
		return
	}

	ctx := r.Context()

	// Verify platform provider is active
	count, _ := h.client.ProviderSetting.Query().
		Where(
			providersetting.TenantID(platformTenantID),
			providersetting.IsPlatform(true),
			providersetting.ProviderType(req.ProviderType),
			providersetting.ProviderName(req.ProviderName),
			providersetting.IsActive(true),
			providersetting.KeyEQ("_config"),
		).
		Count(ctx)
	if count == 0 {
		jsonError(w, http.StatusBadRequest, "provider not available on this platform")
		return
	}

	// Remove previous selection for this channel
	_, _ = h.client.ProviderSetting.Delete().
		Where(
			providersetting.TenantID(tenantID),
			providersetting.ProviderType(req.ProviderType),
			providersetting.KeyEQ("_preferred"),
		).
		Exec(ctx)

	// Create preferred provider selection
	_, err := h.client.ProviderSetting.Create().
		SetTenantID(tenantID).
		SetChannel(req.ProviderType).
		SetProvider(req.ProviderName).
		SetProviderType(req.ProviderType).
		SetProviderName(req.ProviderName).
		SetKey("_preferred").
		SetValue(req.ProviderName).
		SetIsPlatform(false).
		SetIsActive(true).
		SetStatus("active").
		Save(ctx)
	if err != nil {
		h.logger.Error("failed to select provider", zap.Error(err))
		jsonError(w, http.StatusInternalServerError, "failed to select provider")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"message":       "provider selected",
		"provider_type": req.ProviderType,
		"provider_name": req.ProviderName,
	})
}

// GetSelected returns the tenant's currently selected providers.
func (h *TenantProviders) GetSelected(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		jsonError(w, http.StatusBadRequest, "tenant ID required")
		return
	}

	settings, err := h.client.ProviderSetting.Query().
		Where(
			providersetting.TenantID(tenantID),
			providersetting.KeyEQ("_preferred"),
		).
		All(r.Context())
	if err != nil {
		jsonError(w, http.StatusNotFound, "no selected providers")
		return
	}

	result := make([]map[string]string, 0, len(settings))
	for _, s := range settings {
		result = append(result, map[string]string{
			"provider_type": s.ProviderType,
			"provider_name": s.ProviderName,
		})
	}

	jsonResponse(w, http.StatusOK, map[string]any{"selected": result})
}

// GetBranding returns the tenant's notification branding.
func (h *TenantProviders) GetBranding(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		jsonError(w, http.StatusBadRequest, "tenant ID required")
		return
	}

	branding, err := h.client.TenantBranding.Query().
		Where(tenantbranding.TenantID(tenantID)).
		First(r.Context())
	if err != nil {
		jsonError(w, http.StatusNotFound, "branding not configured")
		return
	}

	resp := brandingResponse{
		TenantID:       branding.TenantID,
		LogoURL:        branding.LogoURL,
		PrimaryColor:   branding.PrimaryColor,
		SecondaryColor: branding.SecondaryColor,
	}

	// Get from_email and from_name from metadata
	if branding.Metadata != nil {
		if v, ok := branding.Metadata["from_email"].(string); ok {
			resp.FromEmail = v
		}
		if v, ok := branding.Metadata["from_name"].(string); ok {
			resp.FromName = v
		}
	}

	jsonResponse(w, http.StatusOK, resp)
}

// UpdateBranding creates or updates the tenant's notification branding.
func (h *TenantProviders) UpdateBranding(w http.ResponseWriter, r *http.Request) {
	tenantID := chi.URLParam(r, "tenantId")
	if tenantID == "" {
		jsonError(w, http.StatusBadRequest, "tenant ID required")
		return
	}

	var req brandingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()

	existing, _ := h.client.TenantBranding.Query().
		Where(tenantbranding.TenantID(tenantID)).
		First(ctx)

	metadata := map[string]interface{}{
		"from_email": req.FromEmail,
		"from_name":  req.FromName,
	}

	if existing != nil {
		update := existing.Update().SetMetadata(metadata)
		if req.LogoURL != "" {
			update = update.SetLogoURL(req.LogoURL)
		}
		if req.PrimaryColor != "" {
			update = update.SetPrimaryColor(req.PrimaryColor)
		}
		if req.SecondaryColor != "" {
			update = update.SetSecondaryColor(req.SecondaryColor)
		}

		_, err := update.Save(ctx)
		if err != nil {
			h.logger.Error("failed to update branding", zap.Error(err))
			jsonError(w, http.StatusInternalServerError, "failed to update branding")
			return
		}
	} else {
		create := h.client.TenantBranding.Create().
			SetTenantID(tenantID).
			SetMetadata(metadata)
		if req.LogoURL != "" {
			create = create.SetLogoURL(req.LogoURL)
		}
		if req.PrimaryColor != "" {
			create = create.SetPrimaryColor(req.PrimaryColor)
		}
		if req.SecondaryColor != "" {
			create = create.SetSecondaryColor(req.SecondaryColor)
		}

		_, err := create.Save(ctx)
		if err != nil {
			h.logger.Error("failed to create branding", zap.Error(err))
			jsonError(w, http.StatusInternalServerError, "failed to create branding")
			return
		}
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "branding updated"})
}

// RegisterTenantProviderRoutes registers tenant provider routes.
func (h *TenantProviders) RegisterTenantProviderRoutes(r chi.Router) {
	r.Route("/providers", func(prov chi.Router) {
		prov.Get("/available", h.ListAvailable)
		prov.Post("/select", h.SelectProvider)
		prov.Get("/selected", h.GetSelected)
	})
	r.Get("/branding", h.GetBranding)
	r.Put("/branding", h.UpdateBranding)
}
