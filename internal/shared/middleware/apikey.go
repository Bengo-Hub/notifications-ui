package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// APIKey validates the X-API-Key header if expectedKey is non-empty.
// If expectedKey is empty, it is a no-op (passes through).
func APIKey(expectedKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(expectedKey) == "" {
			c.Next()
			return
		}
		if k := c.GetHeader("X-API-Key"); k == expectedKey {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}
