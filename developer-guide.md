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
*To be documented in detail in the next steps.*

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
