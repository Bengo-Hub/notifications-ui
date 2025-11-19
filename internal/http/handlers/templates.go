package handlers

import (
	"net/http"

	"github.com/bengobox/notifications-app/internal/platform/templates"
	"github.com/gin-gonic/gin"
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
func (h *TemplateHandler) List(c *gin.Context) {
	summaries, _ := h.loader.List(c.Request.Context())
	resp := templateListResponse{Templates: make([]templateSummary, 0, len(summaries))}
	for _, s := range summaries {
		resp.Templates = append(resp.Templates, templateSummary{ID: s.ID, Channel: s.Channel})
	}
	c.JSON(http.StatusOK, resp)
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
func (h *TemplateHandler) Get(c *gin.Context) {
	id := c.Param("id")
	channel := c.Query("channel")
	if id == "" || channel == "" {
		c.JSON(http.StatusBadRequest, errorResponse{Error: "id and channel required"})
		return
	}
	content, err := h.loader.Get(c.Request.Context(), channel+"/"+id)
	if err != nil {
		c.JSON(http.StatusNotFound, errorResponse{Error: "template not found"})
		return
	}
	mime := "text/plain"
	if channel == "email" {
		mime = "text/html"
	} else if channel == "push" {
		mime = "application/json"
	}
	c.JSON(http.StatusOK, templateGetResponse{
		ID:       id,
		Channel:  channel,
		Content:  content,
		MimeType: mime,
	})
}
