package templates

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/bengobox/notifications-api/internal/config"
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

// Get loads the template content by identifier.
// templateID may be either "<channel>/<name>" or just "<name>" (then channel must be encoded in the ID by caller).
func (l *Loader) Get(_ context.Context, templateID string) (string, error) {
	l.mu.RLock()
	entry, ok := l.cache[templateID]
	l.mu.RUnlock()

	if ok && time.Now().Before(entry.expires) {
		return entry.content, nil
	}

	// Load from filesystem
	baseDir := l.cfg.Directory
	var path string
	if strings.Contains(templateID, "/") {
		path = filepath.Join(baseDir, templateID)
	} else {
		// default to email channel
		path = filepath.Join(baseDir, "email", templateID)
	}
	// try with known extensions
	candidates := []string{path, path + ".html", path + ".txt", path + ".mjml", path + ".json"}
	var content []byte
	var err error
	for _, p := range candidates {
		if _, statErr := os.Stat(p); statErr == nil {
			content, err = os.ReadFile(p)
			if err != nil {
				return "", fmt.Errorf("read template: %w", err)
			}
			goto cacheAndReturn
		}
	}
	// not found
	return "", fmt.Errorf("template not found: %s", templateID)

cacheAndReturn:
	l.mu.Lock()
	l.cache[templateID] = cachedTemplate{
		content: string(content),
		expires: time.Now().Add(l.cfg.CacheTTL),
	}
	l.mu.Unlock()

	return string(content), nil
}

// Summary describes a template available for rendering.
type Summary struct {
	ID      string `json:"id"`
	Channel string `json:"channel"`
}

// List scans the templates directory and returns available templates.
func (l *Loader) List(_ context.Context) ([]Summary, error) {
	var out []Summary
	base := l.cfg.Directory
	channels := []string{"email", "sms", "push"}
	exts := map[string]bool{".html": true, ".txt": true, ".mjml": true, ".json": true}

	for _, ch := range channels {
		dir := filepath.Join(base, ch)
		_ = filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				return nil
			}
			if !exts[strings.ToLower(filepath.Ext(d.Name()))] {
				return nil
			}
			name := strings.TrimSuffix(d.Name(), filepath.Ext(d.Name()))
			out = append(out, Summary{ID: name, Channel: ch})
			return nil
		})
	}
	return out, nil
}
