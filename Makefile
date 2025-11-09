APP := notifications-app

.PHONY: run worker test lint tidy build

run:
	go run ./cmd/api

worker:
	go run ./cmd/worker

build:
	CGO_ENABLED=0 go build -o bin/$(APP)-api ./cmd/api
	CGO_ENABLED=0 go build -o bin/$(APP)-worker ./cmd/worker

lint:
	golangci-lint run ./...

test:
	go test ./...

tidy:
	go mod tidy
