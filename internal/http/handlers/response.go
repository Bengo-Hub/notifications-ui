package handlers

import (
	"encoding/json"
	"net/http"
)

// RespondError writes a JSON error response.
func RespondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
