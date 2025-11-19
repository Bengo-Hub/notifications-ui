package handlers

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed swagger.json
var swaggerSpec []byte

// convertSwagger2ToOpenAPI3 converts Swagger 2.0 spec to OpenAPI 3.0 format
func convertSwagger2ToOpenAPI3(swagger2Spec map[string]interface{}) map[string]interface{} {
	openAPI3 := make(map[string]interface{})
	
	// Set OpenAPI version
	openAPI3["openapi"] = "3.0.3"
	
	// Copy info
	if info, ok := swagger2Spec["info"].(map[string]interface{}); ok {
		openAPI3["info"] = info
	}
	
	// Convert servers - add both local and production
	openAPI3["servers"] = []map[string]interface{}{
		{
			"url":         "http://notifications.codevertex.local:4002",
			"description": "Local development (HTTP)",
		},
		{
			"url":         "https://notifications.codevertex.local:4002",
			"description": "Local development (HTTPS)",
		},
		{
			"url":         "https://notifications.codevrtexitsolutions.com",
			"description": "Production",
		},
	}
	
	// Copy components (security schemes, schemas)
	components := make(map[string]interface{})
	
	// Convert security definitions to security schemes
	if securityDefs, ok := swagger2Spec["securityDefinitions"].(map[string]interface{}); ok {
		securitySchemes := make(map[string]interface{})
		for key, value := range securityDefs {
			securitySchemes[key] = value
		}
		components["securitySchemes"] = securitySchemes
	}
	
	// Copy definitions to schemas
	if definitions, ok := swagger2Spec["definitions"].(map[string]interface{}); ok {
		components["schemas"] = definitions
	}
	
	if len(components) > 0 {
		openAPI3["components"] = components
	}
	
	// Copy security
	if security, ok := swagger2Spec["security"].([]interface{}); ok {
		openAPI3["security"] = security
	}
	
	// Convert paths - paths in Swagger 2.0 are relative to basePath
	// In OpenAPI 3.0, paths are absolute
	// Root-level paths (healthz, metrics, readyz) should stay at root
	// API paths should be prepended with basePath
	basePath := ""
	if bp, ok := swagger2Spec["basePath"].(string); ok {
		basePath = strings.TrimSuffix(bp, "/")
	}
	
	rootLevelPaths := map[string]bool{
		"/healthz": true,
		"/metrics": true,
		"/readyz":  true,
	}
	
	if paths, ok := swagger2Spec["paths"].(map[string]interface{}); ok {
		convertedPaths := make(map[string]interface{})
		for path, pathItem := range paths {
			// Ensure path starts with /
			if !strings.HasPrefix(path, "/") {
				path = "/" + path
			}
			
			// Keep root-level paths as-is, prepend basePath to API paths
			if !rootLevelPaths[path] && basePath != "" && !strings.HasPrefix(path, basePath) {
				path = basePath + path
			}
			convertedPaths[path] = pathItem
		}
		openAPI3["paths"] = convertedPaths
	}
	
	return openAPI3
}

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

	// Parse the Swagger spec
	var spec map[string]interface{}
	if err := json.Unmarshal(swaggerSpec, &spec); err == nil {
		// Check if it's Swagger 2.0 and convert to OpenAPI 3.0
		if swaggerVersion, ok := spec["swagger"].(string); ok && strings.HasPrefix(swaggerVersion, "2.") {
			openAPI3Spec := convertSwagger2ToOpenAPI3(spec)
			if modifiedSpec, err := json.Marshal(openAPI3Spec); err == nil {
				c.Header("Content-Type", "application/json")
				c.Header("Access-Control-Allow-Origin", "*")
				c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
				c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
				c.Data(http.StatusOK, "application/json", modifiedSpec)
				return
			}
		} else {
			// Already OpenAPI 3.0, just ensure servers are set
			if _, hasServers := spec["servers"]; !hasServers {
				spec["servers"] = []map[string]interface{}{
					{"url": "http://notifications.codevertex.local:4002", "description": "Local development (HTTP)"},
					{"url": "https://notifications.codevertex.local:4002", "description": "Local development (HTTPS)"},
					{"url": "https://notifications.codevrtexitsolutions.com", "description": "Production"},
				}
			}
			if modifiedSpec, err := json.Marshal(spec); err == nil {
				c.Header("Content-Type", "application/json")
				c.Header("Access-Control-Allow-Origin", "*")
				c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
				c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
				c.Data(http.StatusOK, "application/json", modifiedSpec)
				return
			}
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
          persistAuthorization: true,
          tryItOutEnabled: true,
          requestInterceptor: (request) => {
            // Ensure CORS headers are included
            request.credentials = 'omit';
            return request;
          },
          responseInterceptor: (response) => {
            return response;
          }
        })
      }
    </script>
  </body>
</html>`))
}
