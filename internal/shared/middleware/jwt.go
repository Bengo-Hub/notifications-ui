package middleware

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type JWTValidator struct {
	jwksURL  string
	issuer   string
	audience string
	require  bool
}

func NewJWTValidator(jwksURL, issuer, audience string, require bool) *JWTValidator {
	return &JWTValidator{
		jwksURL:  jwksURL,
		issuer:   issuer,
		audience: audience,
		require:  require,
	}
}

// parseClaims decodes the JWT payload without verifying the signature (best-effort check).
func parseClaims(token string) (map[string]any, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, false
	}
	b, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, false
	}
	var claims map[string]any
	if err := json.Unmarshal(b, &claims); err != nil {
		return nil, false
	}
	return claims, true
}

// JWT enforces Bearer token presence and lightweight iss/aud checks when required.
func (v *JWTValidator) JWT() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !v.require {
			c.Next()
			return
		}
		authz := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(authz), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimSpace(authz[len("Bearer "):])
		claims, ok := parseClaims(tokenStr)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}
		if v.issuer != "" {
			if iss, _ := claims["iss"].(string); iss != v.issuer {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_issuer"})
				return
			}
		}
		if v.audience != "" {
			switch aud := claims["aud"].(type) {
			case string:
				if aud != v.audience {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_audience"})
					return
				}
			case []any:
				found := false
				for _, a := range aud {
					if s, _ := a.(string); s == v.audience {
						found = true
						break
					}
				}
				if !found {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_audience"})
					return
				}
			}
		}
		if sub, _ := claims["sub"].(string); sub != "" {
			c.Set("subject", sub)
		}
		c.Next()
	}
}

// AuthAny allows access if either (JWT present and claims match) or API key matches.
func AuthAny(jwt *JWTValidator, apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if jwt != nil && jwt.require {
			if strings.HasPrefix(strings.ToLower(c.GetHeader("Authorization")), "bearer ") {
				jwt.JWT()(c)
				if !c.IsAborted() {
					return
				}
				c.Abort()
			}
		}
		if strings.TrimSpace(apiKey) != "" && c.GetHeader("X-API-Key") == apiKey {
			c.Next()
			return
		}
		if jwt != nil && !jwt.require {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
	}
}
