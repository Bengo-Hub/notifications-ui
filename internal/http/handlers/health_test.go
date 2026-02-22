package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	testing "testing"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type stubDB struct{ err error }

func (s stubDB) Ping(context.Context) error { return s.err }

func TestHealthHandler_Liveness(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHealthHandler(zap.NewNop(), nil, nil, nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	h.Liveness(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestHealthHandler_Readiness_WithIssues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewHealthHandler(zap.NewNop(), stubDB{err: context.DeadlineExceeded}, redis.NewClient(&redis.Options{Addr: "localhost:0"}), nil)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	h.Readiness(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}
