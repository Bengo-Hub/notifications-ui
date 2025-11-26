# syntax=docker/dockerfile:1

FROM golang:1.24-alpine AS builder
WORKDIR /src
# Copy shared auth-client first (needed for replace directive)
# Build context should be from workspace root: docker build -f notifications-app/Dockerfile -t notifications-app:local .
COPY shared/auth-client /shared/auth-client
COPY notifications-app/go.mod notifications-app/go.sum ./
RUN go mod download
COPY notifications-app .

RUN CGO_ENABLED=0 go build -o /out/notifications ./cmd/api
RUN CGO_ENABLED=0 go build -o /out/worker ./cmd/worker
RUN CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate
RUN CGO_ENABLED=0 go build -o /out/seed ./cmd/seed

FROM alpine:3.20
RUN apk add --no-cache postgresql-client
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /out/notifications /app/service
COPY --from=builder /out/worker /app/worker
COPY --from=builder /out/migrate /app/migrate
COPY --from=builder /out/seed /app/seed
COPY --from=builder /src/notifications-app/scripts/migrate.sh /app/migrate.sh
RUN chmod +x /app/migrate.sh
# TLS certificates directory (optional, can be mounted as volume)
RUN mkdir -p ./config/certs
USER app
EXPOSE 4000
ENV PORT=4000
ENTRYPOINT ["/app/migrate.sh"]
