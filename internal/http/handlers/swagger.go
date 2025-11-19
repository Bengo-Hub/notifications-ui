package handlers

import (
	_ "embed"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed swagger.json
var swaggerSpec []byte

// OpenAPIJSON serves the OpenAPI/Swagger JSON specification
func OpenAPIJSON(c *gin.Context) {
	// Handle OPTIONS preflight requests
	if c.Request.Method == "OPTIONS" {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		c.Header("Access-Control-Max-Age", "3600")
		c.Status(http.StatusNoContent)
		return
	}

	// Parse the Swagger spec and dynamically set the host
	var spec map[string]interface{}
	if err := json.Unmarshal(swaggerSpec, &spec); err == nil {
		// Set host to the current request's host (protocol + host)
		host := c.Request.Host
		if host == "" {
			host = c.Request.Header.Get("Host")
		}
		if host != "" {
			spec["host"] = host
		}
		// Re-marshal the spec
		if modifiedSpec, err := json.Marshal(spec); err == nil {
			c.Header("Content-Type", "application/json")
			c.Header("Access-Control-Allow-Origin", "*")
			c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
			c.Data(http.StatusOK, "application/json", modifiedSpec)
			return
		}
	}

	// Fallback to original spec if modification fails
	c.Header("Content-Type", "application/json")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
	c.Data(http.StatusOK, "application/json", swaggerSpec)
}

// SwaggerUI serves the Swagger UI HTML page
func SwaggerUI(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Notifications Service API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = () => {
        // Use the same protocol as the current page to avoid HTTP/HTTPS mismatch
        const specUrl = window.location.protocol + '//' + window.location.host + '/api/v1/openapi.json';
        window.ui = SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: "BaseLayout",
          deepLinking: true,
          filter: true,
          persistAuthorization: true
        })
      }
    </script>
  </body>
</html>`))
}
