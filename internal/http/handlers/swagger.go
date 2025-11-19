package handlers

import (
	_ "github.com/bengobox/notifications-app/internal/http/docs"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SwaggerHandler returns a handler for Swagger UI that uses the correct protocol
func SwaggerHandler() gin.HandlerFunc {
	// Configure swagger to use the same protocol as the request
	// swaggerFiles.Handler serves the spec at /swagger/doc.json relative to mount point
	// Since we mount at /v1/docs/*any, the spec will be at /v1/docs/swagger/doc.json
	// We need to tell gin-swagger where to find it
	swaggerHandler := ginSwagger.WrapHandler(
		swaggerFiles.Handler,
		ginSwagger.URL("/v1/docs/swagger/doc.json"), // Full path to swagger spec
		ginSwagger.DefaultModelsExpandDepth(-1),
	)
	return swaggerHandler
}
