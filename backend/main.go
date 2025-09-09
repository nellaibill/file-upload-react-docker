package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var s3Client *s3.Client
var dynamoClient *dynamodb.Client


func downloadHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse filename from URL: /download/{filename}
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 3 || parts[2] == "" {
		http.Error(w, "Missing filename", http.StatusBadRequest)
		return
	}
	filename := parts[2]

	bucket := os.Getenv("S3_BUCKET")
	presignClient := s3.NewPresignClient(s3Client)
	presignParams := &s3.GetObjectInput{
		Bucket: &bucket,
		Key:    &filename,
	}
	presignResult, err := presignClient.PresignGetObject(r.Context(), presignParams)
	if err != nil {
		log.Printf("Failed to generate pre-signed download URL: %v", err)
		http.Error(w, "Failed to generate download URL", http.StatusInternalServerError)
		return
	}

	resp := map[string]string{
		"download_url": presignResult.URL,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
	return
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

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse JSON body: expects { "video_id": "...", "filename": "...", "content_type": "..." }
	type UploadRequest struct {
		VideoID     string `json:"video_id"`
		Filename    string `json:"filename"`
		ContentType string `json:"content_type"`
	}
	var req UploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	if req.VideoID == "" || req.Filename == "" || req.ContentType == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Store metadata in DynamoDB
	tableName := os.Getenv("DYNAMODB_TABLE")
	_, err := dynamoClient.PutItem(r.Context(), &dynamodb.PutItemInput{
		TableName: &tableName,
		Item: map[string]types.AttributeValue{
			"video_id":     &types.AttributeValueMemberS{Value: req.VideoID},
			"filename":     &types.AttributeValueMemberS{Value: req.Filename},
			"content_type": &types.AttributeValueMemberS{Value: req.ContentType},
			"created_at":   &types.AttributeValueMemberS{Value: time.Now().Format(time.RFC3339)},
		},
	})
	if err != nil {
		log.Printf("DynamoDB PutItem error: %v", err)
		http.Error(w, "Failed to store metadata in DynamoDB", http.StatusInternalServerError)
		return
	}

	// Generate pre-signed S3 upload URL
	bucket := os.Getenv("S3_BUCKET")
	presignClient := s3.NewPresignClient(s3Client)
	presignParams := &s3.PutObjectInput{
		Bucket:      &bucket,
		Key:         &req.Filename,
		ContentType: &req.ContentType,
	}
	presignResult, err := presignClient.PresignPutObject(r.Context(), presignParams)
	if err != nil {
		http.Error(w, "Failed to generate pre-signed URL", http.StatusInternalServerError)
		return
	}

	resp := map[string]string{
		"upload_url": presignResult.URL,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
	return
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
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tableName := os.Getenv("DYNAMODB_TABLE")
	input := &dynamodb.ScanInput{
		TableName: &tableName,
	}
	result, err := dynamoClient.Scan(r.Context(), input)
	if err != nil {
		log.Printf("DynamoDB Scan error: %v", err)
		http.Error(w, "Failed to list files", http.StatusInternalServerError)
		return
	}

	type VideoItem struct {
		VideoID     string `json:"video_id"`
		Filename    string `json:"filename"`
		ContentType string `json:"content_type"`
		CreatedAt   string `json:"created_at"`
	}

	items := []VideoItem{}
	for _, v := range result.Items {
		item := VideoItem{}
		if val, ok := v["video_id"].(*types.AttributeValueMemberS); ok {
			item.VideoID = val.Value
		}
		if val, ok := v["filename"].(*types.AttributeValueMemberS); ok {
			item.Filename = val.Value
		}
		if val, ok := v["content_type"].(*types.AttributeValueMemberS); ok {
			item.ContentType = val.Value
		}
		if val, ok := v["created_at"].(*types.AttributeValueMemberS); ok {
			item.CreatedAt = val.Value
		}
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
	return
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
	// AWS SDK client initialization for LocalStack
	awsAccessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	awsSecretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	awsRegion := os.Getenv("AWS_REGION")
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	dynamodbEndpoint := os.Getenv("DYNAMODB_ENDPOINT")

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(awsRegion),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(awsAccessKey, awsSecretKey, "")),
	)
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.EndpointResolver = s3.EndpointResolverFromURL(s3Endpoint)
		o.UsePathStyle = true
	})
	dynamoClient = dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
		o.EndpointResolver = dynamodb.EndpointResolverFromURL(dynamodbEndpoint)
	})

	http.HandleFunc("/download/", downloadHandler)
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/upload", uploadHandler)
	http.HandleFunc("/files", filesHandler)

	log.Println("Go API server starting on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
