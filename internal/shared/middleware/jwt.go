package middleware

import (
	"net/http"
	"strings"

	auth "github.com/Bengo-Hub/shared-auth-client"
	"github.com/gin-gonic/gin"
)

type JWTValidator struct {
	validator *auth.Validator
}

func NewJWTValidator(validator *auth.Validator) *JWTValidator {
	return &JWTValidator{
		validator: validator,
	}
}

// JWT enforces Bearer token presence and verifies it using the shared auth validator.
func (v *JWTValidator) JWT() gin.HandlerFunc {
	return func(c *gin.Context) {
		authz := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(authz), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimSpace(authz[len("Bearer "):])

		// Verify token using the shared auth validator
		claims, err := v.validator.ValidateToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_token", "details": err.Error()})
			return
		}

		// Set claims in context
		c.Set("claims", claims)
		c.Set("subject", claims.Subject)
		c.Next()
	}
}

// AuthAny allows access if either (JWT present and valid) or API key matches.
func AuthAny(jwt *JWTValidator, apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check JWT first if present
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			if jwt != nil {
				jwt.JWT()(c)
				if !c.IsAborted() {
					return
				}
				// If JWT failed, we stop here (don't fall back to API key for a bad token)
				return
			}
		}

		// Fallback to API Key
		if strings.TrimSpace(apiKey) != "" && c.GetHeader("X-API-Key") == apiKey {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}
