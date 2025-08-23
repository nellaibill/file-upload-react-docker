# Build stage
FROM golang:1.21 as builder
WORKDIR /app
COPY . .
RUN go build -o goapi main.go

# Run stage
FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /app/goapi .
EXPOSE 8080
CMD ["./goapi"]
