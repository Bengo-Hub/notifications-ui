package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.uber.org/zap"

	httpware "github.com/Bengo-Hub/httpware"
	authclient "github.com/Bengo-Hub/shared-auth-client"
	handlers "github.com/bengobox/notifications-api/internal/http/handlers"
)

func New(log *zap.Logger, health *handlers.HealthHandler, notifications *handlers.NotificationHandler, templates *handlers.TemplateHandler, platformProviders *handlers.PlatformProviders, tenantProviders *handlers.TenantProviders, apiKey string, authMiddleware *authclient.AuthMiddleware, allowedOrigins []string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	r.Use(httpware.RequestID)
	r.Use(httpware.Tenant)
	r.Use(httpware.Logging(log))
	r.Use(httpware.Recover(log))
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Tenant-ID", "X-Request-ID", "X-API-Key", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Swagger UI
	r.Get("/v1/docs/*", handlers.SwaggerUI)

	// Redirect root path to Swagger documentation
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/v1/docs/", http.StatusMovedPermanently)
	})

	r.Route("/api/v1", func(api chi.Router) {
		// Serve OpenAPI spec (public, no auth required)
		api.Get("/openapi.json", handlers.OpenAPIJSON)

		// Health endpoints (public)
		api.Get("/healthz", health.Liveness)
		api.Get("/readyz", health.Readiness)
		api.Get("/metrics", health.Metrics)

		// Protected routes - require authentication
		api.Group(func(protected chi.Router) {
			// Apply auth middleware if configured, otherwise allow API key
			if authMiddleware != nil {
				protected.Use(authMiddleware.RequireAuth)
			} else if apiKey != "" {
				protected.Use(func(next http.Handler) http.Handler {
					return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						if r.Header.Get("X-API-Key") != apiKey {
							http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
							return
						}
						next.ServeHTTP(w, r)
					})
				})
			}

			// Platform admin routes (superuser-only)
			protected.Route("/platform", func(platform chi.Router) {
				platformProviders.RegisterPlatformProviderRoutes(platform)
			})

			protected.Route("/{tenantId}", func(tenant chi.Router) {
				tenant.Route("/notifications", func(notif chi.Router) {
					notif.Post("/messages", notifications.Enqueue)
				})

				tenant.Route("/templates", func(tmpl chi.Router) {
					tmpl.Get("/", templates.List)
					tmpl.Get("/{id}", templates.Get)
				})

				// Tenant provider selection + branding
				tenantProviders.RegisterTenantProviderRoutes(tenant)
			})
		})
	})

	return r
}
