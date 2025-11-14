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

// List returns available notification templates for a tenant.
// @Summary List notification templates
// @Description Returns the default set of notification templates available to the tenant.
// @Tags Templates
// @Produce json
// @Param tenantId path string true "Tenant identifier"
// @Success 200 {object} templateListResponse
// @Router /v1/{tenantId}/templates [get]
func (h *TemplateHandler) List(c *gin.Context) {
	summaries, _ := h.loader.List(c.Request.Context())
	resp := templateListResponse{Templates: make([]templateSummary, 0, len(summaries))}
	for _, s := range summaries {
		resp.Templates = append(resp.Templates, templateSummary{ID: s.ID, Channel: s.Channel})
	}
	c.JSON(http.StatusOK, resp)
}
