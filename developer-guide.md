# Developer Guide: Local Development Stack for React Native, Go API, and AWS-like Services

## Overview
This guide documents every step in setting up and running the local development stack for a React Native app, Go backend API, and local AWS-like services (MinIO for S3, LocalStack for Lambda), using Docker and Terraform. All errors and troubleshooting steps will be recorded here.

---

## High-Level Overview

### Docker Compose Setup (MinIO & Go API)

- **Docker Compose** allows you to run multiple services (containers) together for local development.
- **MinIO** is an S3-compatible object storage server, used here to mimic AWS S3 for file uploads and storage.
- **Go API** is your backend service, which will handle file uploads and interact with MinIO.

**Goal:**
Run both MinIO and your Go API locally, so you can test file uploads and backend logic without needing AWS.

**Next Steps:**
1. Create a `docker-compose.yml` file in your project root.
2. Define services for MinIO and Go API.
3. Document the setup process in the developer guide.

---

## Table of Contents
1. Project Structure
2. Backend API Setup (Go)
3. Local S3 Storage (MinIO)
4. Docker Compose Setup
5. Frontend Setup (React Native)
6. Local AWS Lambda (LocalStack)
7. Infrastructure as Code (Terraform)
8. Common Errors & Troubleshooting
9. References

---

## 1. Project Structure

```
/ (root)
  /backend      # Go API service
  /frontend     # React Native app
  /infra        # Terraform configs
  developer-guide.md
  docker-compose.yml
```

---

## 2. Backend API Setup (Go)
### Go API Scaffolding

#### 1. Overview
The Go API service handles backend requests and will integrate with MinIO for file uploads.

#### 2. Steps Completed
- Created `/backend/main.go` with a minimal HTTP server and health check endpoint (`GET /health`).
- Created `/backend/go.mod` for Go module definition.
- Added `/backend/README.md` with instructions for running and next steps.

#### 3. How to Run Locally
1. Ensure Go is installed (version 1.23 or later).
2. In the `/backend` directory, run:
  ```powershell
  go run main.go
  ```
3. Access the health check endpoint at [http://localhost:8080/health](http://localhost:8080/health).

#### 4. How to Run in Docker (with Docker Compose)
1. Ensure Docker is installed and running.
2. Confirm `/backend/Dockerfile` exists (created above) and uses `golang:1.23` as the base image.
3. In the project root, run:
  ```powershell
  docker-compose up --build
  ```
4. Access the health check endpoint at [http://localhost:8080/health](http://localhost:8080/health).
5. The Go API will run in a container and be networked with MinIO for future integration.
 6. Access the MinIO web UI at [http://localhost:9001](http://localhost:9001).
 7. If both URLs work, Go API and MinIO are running and networked correctly.

#### 5. Verification
- After running `docker-compose up --build`, verify:
  - Go API is accessible at [http://localhost:8080/health](http://localhost:8080/health) and returns `OK`.
  - MinIO web UI is accessible at [http://localhost:9001](http://localhost:9001) and allows bucket creation/upload.
- This confirms both services are running and networked together for local development.

#### 4. Next Steps
- Integrate MinIO SDK for file upload functionality.
- Add endpoints for uploading and retrieving files.

#### 6. High-Level Integration: Go API & MinIO

**Goal:**
Enable the Go API to upload files to MinIO (local S3-compatible storage) via an HTTP endpoint.

**How it works:**
1. The Go API will use the MinIO Go SDK to connect to the MinIO server using credentials and endpoint from environment variables.
2. A new API endpoint (e.g., `POST /upload`) will accept file uploads from clients (such as the React Native app).
3. The Go API will receive the file, then use the MinIO SDK to store it in a specified bucket on MinIO.
4. The API will return a success response (and optionally, the file URL or metadata).

**Benefits:**
- Allows local development and testing of file uploads without AWS.
- Mimics production S3 workflow using local infrastructure.
- Easy to extend for additional features (metadata, retrieval, etc.).

**Next Implementation Steps:**
1. Install MinIO Go SDK in the backend.
2. Add code to connect to MinIO using environment variables.
3. Implement the file upload endpoint.
4. Test and document the integration and any issues.

#### 5. Troubleshooting
- If the server does not start, check for errors in the terminal and ensure port 8080 is free.
- **YAML syntax errors in docker-compose.yml:**
  - Error: `yaml: line XX: mapping values are not allowed in this context`
  - Cause: Indentation or formatting issues, especially in the `environment` section.
  - Solution: Use list format for environment variables (e.g., `- MINIO_ENDPOINT=minio:9000`).

- **MinIO client initialization error: Endpoint url cannot have fully qualified paths**
  - Error: `Failed to initialize MinIO client: Endpoint url cannot have fully qualified paths.`
  - Cause: MINIO_ENDPOINT was set to a full URL (e.g., `http://minio:9000`).
  - Solution: Set MINIO_ENDPOINT to just `minio:9000` (host:port) in docker-compose.yml.

- **Go build error: declared and not used**
  - Error: `declared and not used: minioClient`
  - Cause: Go does not allow unused variables.
  - Solution: Remove or use the variable. For now, replace `minioClient, err := ...` with `_, err := ...` until the client is used in code.

---

## Current Working State

- MinIO and Go API are both running in Docker containers and networked together.
- Environment variables for Go API are set using list format in docker-compose.yml.
- MINIO_ENDPOINT uses host:port format (`minio:9000`).
- Go API successfully initializes MinIO client and is ready for further integration (file upload endpoint, etc.).

---

## Next Steps
- Implement file upload endpoint in Go API using MinIO SDK.
- Continue documenting each step and any issues for future reference.

- **MinIO client initialization error: Endpoint url cannot have fully qualified paths**
  - Error: `Failed to initialize MinIO client: Endpoint url cannot have fully qualified paths.`
  - Cause: MINIO_ENDPOINT was set to a full URL (e.g., `http://minio:9000`).
  - Solution: Set MINIO_ENDPOINT to just `minio:9000` (host:port) in docker-compose.yml.

- **Go build error: declared and not used**
  - Error: `declared and not used: minioClient`
  - Cause: Go does not allow unused variables.
  - Solution: Remove or use the variable. For now, replace `minioClient, err := ...` with `_, err := ...` until the client is used in code.

- **GLIBC version error in Docker:**
  - Error: `/lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.34' not found`
  - Cause: Go binary built against newer GLIBC than available in the run image.
  - Solution: Use the same base image (`golang:1.21`) for both build and run stages in the Dockerfile.

---

## 3. Local S3 Storage (MinIO)
### MinIO Setup Summary

#### 1. Overview
MinIO is an open-source, S3-compatible object storage server. We use it to mimic AWS S3 for local development and testing file uploads.

#### 2. Steps Completed
- Created a `docker-compose.yml` file with MinIO service definition.
- Exposed MinIO API port (9000) and fixed the web UI port (9001) using:
  ```yaml
  ports:
    - "9000:9000"
    - "9001:9001"
  command: server /data --console-address ":9001"
  ```
- Started MinIO using:
  ```powershell
  docker-compose up minio
  ```
- Accessed MinIO web UI at [http://localhost:9001](http://localhost:9001) with credentials:
  - Username: `minioadmin`
  - Password: `minioadmin`
- Verified MinIO is running and accessible. Successfully viewed the dashboard and can create buckets/upload files.

#### 3. Troubleshooting & Solutions
- **Web UI not accessible:**
  - Issue: MinIO web UI was running on a dynamic port, causing connection errors.
  - Solution: Updated `docker-compose.yml` to use a fixed port (9001) for the web UI with `--console-address ":9001"`.
- **YAML syntax error:**
  - Issue: Indentation or formatting errors in `docker-compose.yml`.
  - Solution: Ensured correct indentation and formatting for all sections.

#### 4. Next Steps
- Document all changes and troubleshooting steps for future reference.
- Proceed to Go API setup and integration with MinIO.

---

## 4. Docker Compose Setup
### Setting Up Docker Compose for MinIO and Go API

#### 1. Overview
We use Docker Compose to run MinIO (S3-compatible storage) and the Go API service together for local development. This allows us to test file uploads and backend logic without AWS.

#### 2. docker-compose.yml
The following configuration is used:

```yaml
version: '3.8'
services:
  minio:
    image: minio/minio
    container_name: minio
    ports:
      - "9000:9000"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data
    volumes:
      - minio-data:/data

  goapi:
    build: ./backend
    container_name: goapi
    ports:
      - "8080:8080"
    environment:
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    depends_on:
      - minio

volumes:
  minio-data:
```

#### 3. Steps to Run
1. Open a terminal in the project root.
2. Run the following command to start the services:
   ```powershell
   docker-compose up
   ```
3. MinIO will be available at [http://localhost:9000](http://localhost:9000) (default credentials: minioadmin/minioadmin).
4. The Go API will be available at [http://localhost:8080](http://localhost:8080).

#### 4. Troubleshooting
- If you encounter errors, check the container logs:
  ```powershell
  docker-compose logs minio
  docker-compose logs goapi
  ```
- Document any errors and solutions in the troubleshooting section below.

---

## 5. Frontend Setup (React Native)
*To be documented in detail in the next steps.*

---

## 6. Local AWS Lambda (LocalStack)
*To be documented in detail in the next steps.*

---

## 7. Infrastructure as Code (Terraform)
*To be documented in detail in the next steps.*

---

## 8. Common Errors & Troubleshooting
*All errors encountered and their solutions will be documented here.*

---

## 9. References
*Links to documentation, guides, and resources.*

---

*This document will be updated as we progress through each step.*
