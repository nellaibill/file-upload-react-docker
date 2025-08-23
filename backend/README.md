# Go API Backend

This folder contains the Go API service for handling requests and integrating with MinIO for file uploads.

## Structure
- `main.go`: Entry point for the Go API. Includes a health check endpoint (`/health`).
- `go.mod`: Go module definition.

## How to Run Locally
1. Ensure Go is installed (version 1.21 or later).
2. In this directory, run:
   ```powershell
   go run main.go
   ```
3. Access the health check endpoint at [http://localhost:8080/health](http://localhost:8080/health).

## Next Steps
- Integrate MinIO SDK for file upload functionality.
- Add endpoints for uploading and retrieving files.

## Troubleshooting
- If the server does not start, check for errors in the terminal and ensure port 8080 is free.
