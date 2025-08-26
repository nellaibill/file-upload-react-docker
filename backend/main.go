package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"context"
	"io"
	"strings"
)

var minioClient *minio.Client

func downloadHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get filename from URL
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 3 {
		http.Error(w, "Missing filename", http.StatusBadRequest)
		return
	}
	filename := parts[2]
	bucketName := "uploads"
	ctx := context.Background()
	obj, err := minioClient.GetObject(ctx, bucketName, filename, minio.GetObjectOptions{})
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusInternalServerError)
		return
	}
	stat, err := obj.Stat()
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", stat.ContentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size))
	_, err = io.Copy(w, obj)
	if err != nil {
		http.Error(w, "Error streaming file", http.StatusInternalServerError)
		return
	}
}
func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
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

	// Upload to MinIO
	bucketName := "uploads"
	objectName := handler.Filename
	contentType := handler.Header.Get("Content-Type")

	ctx := context.Background()
	exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
	if errBucketExists != nil {
		http.Error(w, "Error checking bucket", http.StatusInternalServerError)
		return
	}
	if !exists {
		err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			http.Error(w, "Error creating bucket", http.StatusInternalServerError)
			return
		}
	}

	_, err = minioClient.PutObject(ctx, bucketName, objectName, file, handler.Size, minio.PutObjectOptions{ContentType: contentType})
	if err != nil {
		http.Error(w, "Error uploading to MinIO", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "File %s uploaded to MinIO bucket '%s' successfully!", objectName, bucketName)
}

func filesHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	bucketName := "uploads"
	ctx := context.Background()
	var files []string
	for object := range minioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{Recursive: true}) {
		if object.Err != nil {
			http.Error(w, "Error listing objects", http.StatusInternalServerError)
			return
		}
		files = append(files, object.Key)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	fmt.Fprintln(w, "OK")
}

func main() {
	http.HandleFunc("/download/", downloadHandler)
	// MinIO client initialization
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	minioAccessKey := os.Getenv("MINIO_ACCESS_KEY")
	minioSecretKey := os.Getenv("MINIO_SECRET_KEY")
	useSSL := false

	var err error
	minioClient, err = minio.New(minioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(minioAccessKey, minioSecretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatalf("Failed to initialize MinIO client: %v", err)
	}
	log.Println("MinIO client initialized successfully.")

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/upload", uploadHandler)
	http.HandleFunc("/files", filesHandler)
	// ...existing code...
	log.Println("Go API server starting on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
