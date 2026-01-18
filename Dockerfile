# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS builder
WORKDIR /src
# go.mod uses remote replace directive for auth-client, no local copy needed
# Build context is the service directory root
COPY go.mod go.sum ./
RUN GOTOOLCHAIN=auto go mod download
COPY . .

RUN GOTOOLCHAIN=auto CGO_ENABLED=0 go build -o /out/notifications ./cmd/api
RUN GOTOOLCHAIN=auto CGO_ENABLED=0 go build -o /out/worker ./cmd/worker
RUN GOTOOLCHAIN=auto CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate
RUN GOTOOLCHAIN=auto CGO_ENABLED=0 go build -o /out/seed ./cmd/seed

FROM alpine:3.20
RUN apk add --no-cache postgresql-client
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /out/notifications /app/service
COPY --from=builder /out/worker /app/worker
COPY --from=builder /out/migrate /app/migrate
COPY --from=builder /out/seed /app/seed
COPY --from=builder /src/scripts/migrate.sh /app/migrate.sh
RUN chmod +x /app/migrate.sh
# TLS certificates directory (optional, can be mounted as volume)
RUN mkdir -p ./config/certs
USER app
EXPOSE 4000
ENV PORT=4000
ENTRYPOINT ["/app/migrate.sh"]
