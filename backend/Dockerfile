# Build stage
FROM golang:1.21 as builder
WORKDIR /app
COPY . .
RUN go build -o goapi main.go

# Run stage (use same base image to avoid GLIBC errors)
FROM golang:1.21
WORKDIR /app
COPY --from=builder /app/goapi .
EXPOSE 8080
CMD ["./goapi"]
