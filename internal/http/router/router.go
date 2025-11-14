package router

import (
	"github.com/gin-gonic/gin"
	httpSwagger "github.com/swaggo/http-swagger"
	"go.uber.org/zap"

	handlers "github.com/bengobox/notifications-app/internal/http/handlers"
	"github.com/bengobox/notifications-app/internal/shared/middleware"
)

func New(log *zap.Logger, health *handlers.HealthHandler, notifications *handlers.NotificationHandler, templates *handlers.TemplateHandler) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.Tenant())
	r.Use(middleware.Logging(log))
	r.Use(middleware.Recover(log))

	r.GET("/healthz", health.Liveness)
	r.GET("/readyz", health.Readiness)
	r.GET("/metrics", health.Metrics)
	r.GET("/swagger/*any", gin.WrapH(httpSwagger.WrapHandler))

	api := r.Group("/v1")
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
			}
		}
	}

	return r
}
