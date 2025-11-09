package templates

import (
	"context"
	"sync"
	"time"

	"github.com/bengobox/notifications-app/internal/config"
)

// Loader caches compiled templates in-memory with TTL invalidation.
type Loader struct {
	cfg   config.TemplateConfig
	mu    sync.RWMutex
	cache map[string]cachedTemplate
}

type cachedTemplate struct {
	content string
	expires time.Time
}

func New(cfg config.TemplateConfig) *Loader {
	return &Loader{cfg: cfg, cache: make(map[string]cachedTemplate)}
}

func (l *Loader) Get(_ context.Context, templateID string) (string, error) {
	l.mu.RLock()
	entry, ok := l.cache[templateID]
	l.mu.RUnlock()

	if ok && time.Now().Before(entry.expires) {
		return entry.content, nil
	}

	// TODO: load from filesystem / DB. For now, return stub content.
	content := "Hello {{name}}, your payment is successful."

	l.mu.Lock()
	l.cache[templateID] = cachedTemplate{
		content: content,
		expires: time.Now().Add(l.cfg.CacheTTL),
	}
	l.mu.Unlock()

	return content, nil
}
