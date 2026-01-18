package router

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	authclient "github.com/Bengo-Hub/shared-auth-client"
	handlers "github.com/bengobox/notifications-api/internal/http/handlers"
	"github.com/bengobox/notifications-api/internal/shared/middleware"
)

func New(log *zap.Logger, health *handlers.HealthHandler, notifications *handlers.NotificationHandler, templates *handlers.TemplateHandler, apiKey string, authMiddleware *authclient.AuthMiddleware) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(gin.Recovery())

	// CORS middleware for Swagger UI and API requests
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-Tenant-ID, X-Request-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Type, Content-Length, X-Request-ID")
		c.Header("Access-Control-Max-Age", "3600")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	r.Use(middleware.RequestID())
	r.Use(middleware.Tenant())
	r.Use(middleware.Logging(log))
	r.Use(middleware.Recover(log))

	// Swagger UI - custom handler like auth-service
	r.GET("/v1/docs/*any", handlers.SwaggerUI)

	api := r.Group("/api/v1")
	// Serve OpenAPI spec (public, no auth required)
	api.GET("/openapi.json", handlers.OpenAPIJSON)

	// Health endpoints under /api/v1
	api.GET("/healthz", health.Liveness)
	api.GET("/readyz", health.Readiness)
	api.GET("/metrics", health.Metrics)

	// Apply auth middleware if configured, otherwise allow API key
	if authMiddleware != nil {
		api.Use(authclient.GinMiddleware(authMiddleware))
	} else if apiKey != "" {
		api.Use(func(c *gin.Context) {
			if c.GetHeader("X-API-Key") != apiKey {
				c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
				return
			}
			c.Next()
		})
	}
	{
		tenant := api.Group("/:tenantId")
		{
			notif := tenant.Group("/notifications")
			{
				notif.POST("/messages", notifications.Enqueue)
			}

			tmpl := tenant.Group("/templates")
			{
				tmpl.GET("", templates.List)
				tmpl.GET("/:id", templates.Get)
			}
		}
	}

	return r
}
