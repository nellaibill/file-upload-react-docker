# Build stage
FROM golang:1.23 as builder
WORKDIR /app
COPY . .
RUN go build -o goapi main.go

FROM golang:1.23
WORKDIR /app
COPY --from=builder /app/goapi .
EXPOSE 8080
CMD ["./goapi"]
