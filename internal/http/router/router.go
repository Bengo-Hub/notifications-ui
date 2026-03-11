package router

import (
	"context"
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

func New(log *zap.Logger, health *handlers.HealthHandler, notifications *handlers.NotificationHandler, templates *handlers.TemplateHandler, platformProviders *handlers.PlatformProviders, tenantProviders *handlers.TenantProviders, analytics *handlers.AnalyticsHandler, billing *handlers.BillingHandler, platformBilling *handlers.PlatformBilling, apiKey string, authMiddleware *authclient.AuthMiddleware, allowedOrigins []string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	r.Use(httpware.RequestID)
	r.Use(httpware.Logging(log))
	r.Use(httpware.Recover(log))
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Tenant-ID", "X-Tenant-Slug", "X-Request-ID", "X-API-Key", "Idempotency-Key"},
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
				platform.Route("/billing", func(pb chi.Router) {
					pb.Get("/", platformBilling.GetSettings)
					pb.Post("/", platformBilling.UpdateSettings)
				})
			})

			// Analytics (platform or tenant-scoped)
			// For platform users, tenantId is optional and passed via query params or headers
			protected.Route("/analytics", func(analyticsRouter chi.Router) {
				analyticsRouter.Get("/delivery", analytics.Delivery)
				analyticsRouter.Get("/delivery/{tenantId}", analytics.Delivery)
				analyticsRouter.Get("/logs", analytics.Logs)
				analyticsRouter.Get("/logs/{tenantId}", analytics.Logs)
			})

			// Base group for tenant-scoped operations
			protected.Group(func(tenant chi.Router) {
				tenant.Use(httpware.TenantV2(httpware.TenantConfig{
					ClaimsExtractor: func(ctx context.Context) (tenantID, tenantSlug string, isPlatformOwner bool, ok bool) {
						claims, found := authclient.ClaimsFromContext(ctx)
						if !found {
							return "", "", false, false
						}
						// Slug-based platform owner check
						isPO := claims.GetTenantSlug() == "codevertex"
						return claims.TenantID, claims.GetTenantSlug(), isPO, true
					},
					URLParamFunc: chi.URLParam,
					Required:     false, // Make optional to allow platform owners to bypass
				}))

				tenant.Route("/notifications", func(notif chi.Router) {
					notif.Post("/messages", notifications.Enqueue)
				})

				tenant.Route("/templates", func(tmpl chi.Router) {
					tmpl.Get("/", templates.List)
					tmpl.Get("/{id}", templates.Get)
					tmpl.Put("/{id}", templates.Update)
					tmpl.Post("/{id}/test", templates.TestSend)
				})

				// Tenant provider selection + branding
				tenantProviders.RegisterTenantProviderRoutes(tenant)

				// Billing routes
				tenant.Route("/billing", func(b chi.Router) {
					b.Get("/balance", billing.GetBalance)
					b.Post("/topup", billing.TopUp)
					b.Post("/initiate", billing.Initiate)
				})
			})
		})
	})

	return r
}
