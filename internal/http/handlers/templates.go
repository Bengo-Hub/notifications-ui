package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// TemplateHandler exposes endpoints for listing and previewing templates.
type TemplateHandler struct{}

func NewTemplateHandler() *TemplateHandler { return &TemplateHandler{} }

func (h *TemplateHandler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"templates": []gin.H{
			{"id": "payment_success", "channel": "email"},
			{"id": "invoice_due", "channel": "sms"},
		},
	})
}
