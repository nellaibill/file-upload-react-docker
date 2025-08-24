package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"io"
)
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max memory
	if err != nil {
		http.Error(w, "Error parsing form data", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// For now, just read the file and discard (integration with MinIO will follow)
	_, err = io.Copy(io.Discard, file)
	if err != nil {
		http.Error(w, "Error reading file", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "File %s uploaded successfully!", handler.Filename)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "OK")
}

func main() {
	// MinIO client initialization
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	minioAccessKey := os.Getenv("MINIO_ACCESS_KEY")
	minioSecretKey := os.Getenv("MINIO_SECRET_KEY")
	useSSL := false

	_, err := minio.New(minioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(minioAccessKey, minioSecretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatalf("Failed to initialize MinIO client: %v", err)
	}
	log.Println("MinIO client initialized successfully.")

	http.HandleFunc("/health", healthHandler)
		http.HandleFunc("/upload", uploadHandler)
	// ...existing code...
	log.Println("Go API server starting on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
