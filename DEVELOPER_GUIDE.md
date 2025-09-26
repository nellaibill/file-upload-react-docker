bash infra/dynamodb_test_upload.sh
docker-compose up localstack

# Developer Guide: LocalStack + Terraform + Fullstack Video Upload App

## EC2 Simulation with Docker
This project simulates the EC2 processing step using a Docker container (`ec2-sim`). After a file is uploaded to S3 (LocalStack), you can trigger the EC2 simulation container to process the file as if it were an EC2 instance opening a browser.

### How it works
- The `ec2-sim` Docker container acts as a mock EC2 instance.
- It runs a Python script that simulates opening a browser and processing the uploaded S3 file.
- You can pass the S3 bucket and key to the container via environment variables.

### Usage
To run the EC2 simulation container manually:
```sh
docker build -t ec2-sim ./ec2-sim
docker run --rm -e S3_BUCKET=<your-bucket> -e S3_KEY=<your-file-key> ec2-sim
```
Replace `<your-bucket>` and `<your-file-key>` with the actual S3 bucket and file key.

You can automate this step from the backend in the future.

## 1. Prerequisites
- Docker & Docker Compose installed
- AWS CLI installed (`pip install awscli`)
- Terraform installed (https://www.terraform.io/downloads.html)
- Node.js and npm (for frontend local dev, optional)

## 2. Start All Services
From the project root, run:
```
docker-compose up --build
```
This will start:
- LocalStack (S3, DynamoDB, STS)
- Go API backend (port 8080)
- React Native (Expo web) frontend (port 19006)

## 3. Provision S3 & DynamoDB with Terraform
In a new terminal:
```
cd infra
terraform init
terraform apply
```
Accept the plan to create the S3 bucket and DynamoDB table in LocalStack.

## 4. Verify LocalStack Resources
Check that your resources exist:
```
aws --endpoint-url=http://localhost:9007 s3 ls
aws --endpoint-url=http://localhost:9007 dynamodb list-tables
```
You should see your bucket (e.g., `mybucket`) and table (e.g., `videos`).

## 5. Set S3 CORS Policy (for browser uploads)
Ensure `cors.json` exists in your project root:
```json
{
	"CORSRules": [
		{
			"AllowedHeaders": ["*"],
			"AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
			"AllowedOrigins": ["*"],
			"ExposeHeaders": ["ETag"],
			"MaxAgeSeconds": 3000
		}
	]
}
```
Apply it:
```
aws --endpoint-url=http://localhost:9007 s3api put-bucket-cors --bucket mybucket --cors-configuration file://cors.json
```

## 6. Test the App
- Open http://localhost:19006 in your browser.
- Upload a video file. The flow is:
	1. Frontend POSTs to `/upload` to get a pre-signed S3 URL.
	2. Frontend PUTs the file to S3 using the pre-signed URL.
	3. Metadata is stored in DynamoDB.
	4. `/files` lists all uploaded videos.
	5. `/download/{filename}` returns a pre-signed download URL.

## 7. Troubleshooting

- **DynamoDB table or S3 bucket not found:**  
	Run `terraform apply` after LocalStack is up.  
	Check with `aws --endpoint-url=http://localhost:9007 dynamodb list-tables`.

- **CORS or 403 errors on upload:**  
	Make sure the S3 CORS policy is set (see step 5).

- **Go API returns 500 errors:**  
	Check the Go API logs. Most common cause: missing DynamoDB table or S3 bucket.

- **Frontend upload fails with double port in URL:**  
	The frontend now replaces any `localstack:PORT` with `localhost:9007` in pre-signed URLs.

- **Resetting LocalStack:**  
	If you have persistent issues, stop all containers, delete the `localstack-data` folder, and restart everything.

## 8. Project Structure
- `infra/main.tf`: Terraform config for S3 and DynamoDB (LocalStack endpoints)
- `docker-compose.yml`: All service definitions (Go API, Frontend, LocalStack)
- `backend/main.go`: Go API for upload, list, and download
- `frontend/App.js`: React Native (Expo web) frontend
- `cors.json`: S3 CORS policy

---
