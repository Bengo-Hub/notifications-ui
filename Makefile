APP := notifications-app

.PHONY: run worker test lint tidy build migrate seed docker

run:
	go run ./cmd/api

worker:
	go run ./cmd/worker

migrate:
	go run ./cmd/migrate

seed:
	go run ./cmd/seed

build:
	CGO_ENABLED=0 go build -o bin/$(APP)-api ./cmd/api
	CGO_ENABLED=0 go build -o bin/$(APP)-worker ./cmd/worker
	CGO_ENABLED=0 go build -o bin/$(APP)-migrate ./cmd/migrate
	CGO_ENABLED=0 go build -o bin/$(APP)-seed ./cmd/seed

docker:
	docker build -t $(APP):local .

lint:
	golangci-lint run ./...

test:
	go test ./...

tidy:
	go mod tidy
