# syntax=docker/dockerfile:1

FROM golang:1.23-bookworm AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/notifications ./cmd/api
RUN CGO_ENABLED=0 go build -o /out/worker ./cmd/worker

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /out/notifications /app/service
COPY --from=builder /out/worker /app/worker
USER nonroot:nonroot
EXPOSE 4000
ENV PORT=4000
ENTRYPOINT ["/app/service"]
