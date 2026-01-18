package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/bengobox/notifications-api/internal/platform/templates"
	"github.com/go-chi/chi/v5"
)

// TemplateHandler exposes endpoints for listing and previewing templates.
type TemplateHandler struct {
	loader *templates.Loader
}

func NewTemplateHandler(loader *templates.Loader) *TemplateHandler {
	return &TemplateHandler{loader: loader}
}

type templateSummary struct {
	ID      string `json:"id" example:"payment_success"`
	Channel string `json:"channel" example:"email"`
}

type templateListResponse struct {
	Templates []templateSummary `json:"templates"`
}

type templateGetResponse struct {
	ID       string `json:"id"`
	Channel  string `json:"channel"`
	Content  string `json:"content"`
	MimeType string `json:"mimeType"`
}

// List returns available notification templates for a tenant.
// @Summary List notification templates
// @Description Returns the default set of notification templates available to the tenant.
// @Tags Templates
// @Produce json
// @Param tenantId path string true "Tenant identifier"
// @Success 200 {object} templateListResponse
// @Security bearerAuth
// @Security ApiKeyAuth
// @Router /{tenantId}/templates [get]
func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	summaries, _ := h.loader.List(r.Context())
	resp := templateListResponse{Templates: make([]templateSummary, 0, len(summaries))}
	for _, s := range summaries {
		resp.Templates = append(resp.Templates, templateSummary{ID: s.ID, Channel: s.Channel})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Get returns the raw template content for an ID and channel.
// @Summary Get template content
// @Description Returns the raw template content for preview or client-side rendering.
// @Tags Templates
// @Produce json
// @Param tenantId path string true "Tenant identifier"
// @Param id path string true "Template identifier"
// @Param channel query string true "Channel (email|sms|push)"
// @Success 200 {object} templateGetResponse
// @Failure 404 {object} errorResponse
// @Security bearerAuth
// @Security ApiKeyAuth
// @Router /{tenantId}/templates/{id} [get]
func (h *TemplateHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	channel := r.URL.Query().Get("channel")
	if id == "" || channel == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse{Error: "id and channel required"})
		return
	}
	content, err := h.loader.Get(r.Context(), channel+"/"+id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(errorResponse{Error: "template not found"})
		return
	}
	mime := "text/plain"
	if channel == "email" {
		mime = "text/html"
	} else if channel == "push" {
		mime = "application/json"
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templateGetResponse{
		ID:       id,
		Channel:  channel,
		Content:  content,
		MimeType: mime,
	})
}
