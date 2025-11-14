package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	_ "github.com/bengobox/notifications-app/internal/http/docs"

	"github.com/bengobox/notifications-app/internal/app"
)

// @title Notifications Service API
// @version 0.1.0
// @description HTTP API for the BengoBox notifications service.
// @BasePath /
// @Schemes http
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	a, err := app.New(ctx)
	if err != nil {
		log.Fatalf("failed to initialise app: %v", err)
	}
	defer a.Close()

	if err := a.Run(ctx); err != nil {
		log.Fatalf("runtime error: %v", err)
	}
}
