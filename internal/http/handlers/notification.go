package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct{}

type CreateMessageRequest struct {
	Channel  string         `json:"channel" binding:"required"`
	Tenant   string         `json:"tenant" binding:"required"`
	Template string         `json:"template" binding:"required"`
	Data     map[string]any `json:"data" binding:"required"`
	To       []string       `json:"to" binding:"required,min=1"`
	Metadata map[string]any `json:"metadata"`
}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

func (h *NotificationHandler) Enqueue(c *gin.Context) {
	var req CreateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"status":    "queued",
		"requestId": c.GetString("request_id"),
	})
}
