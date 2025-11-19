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
	// By using an empty URL, gin-swagger will automatically detect the protocol from the request
	swaggerHandler := ginSwagger.WrapHandler(
		swaggerFiles.Handler,
		ginSwagger.URL(""), // Empty URL means use the same host/protocol as the request
		ginSwagger.DefaultModelsExpandDepth(-1),
	)
	return swaggerHandler
}
