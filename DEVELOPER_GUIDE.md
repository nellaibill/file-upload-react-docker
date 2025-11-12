# High-Level Architecture Flow

```
	[User Uploads File]
				|
				v
		  [S3 Bucket]
				|
	(S3 Event Notification)
				|
				v
		[SQS Queue 1]
				|
	(SQS Trigger)
				|
				v
	  [Lambda Function]
		  |         \
		  |          \
		  v           v
 [Start EC2]   [Forward Message]
		  |           |
		  |           v
		  |     [SQS Queue 2]
		  |           |
		  |   (EC2 Poller Reads)
		  |           |
		  |           v
		  |   [EC2 Instance]
		  |           |
		  |   (Download, Process, Update)
		  |           |
		  |           v
		  |     [DynamoDB Table]
		  |
	(Auto-stop when idle)
		  |
		  v
	[EC2 Instance Stopped]
```

**Description:**
- User uploads a file to S3.
- S3 triggers an event to SQS Queue 1.
- Lambda is triggered by SQS Queue 1, starts EC2 (if needed), and forwards the message to SQS Queue 2.
- EC2 instance (running the poller as a systemd service) polls SQS Queue 2, downloads the file from S3, processes it, and updates DynamoDB.
- If no messages are received for a set period, the EC2 instance stops itself to save costs.
# Developer Guide: Event-Driven File Processing on AWS (S3 → SQS → Lambda → EC2 → DynamoDB)

## Overview
This project implements a robust, event-driven workflow for file uploads and processing using AWS services. The architecture ensures decoupled, scalable, and automated processing of files uploaded to S3, with results stored in DynamoDB. The workflow is production-ready and follows AWS best practices for permissions, automation, and reliability.

---

## Architecture

1. **S3 Bucket**: Receives file uploads. Triggers an event notification to SQS (Queue 1) on new file upload.
2. **SQS Queue 1**: Receives S3 event notifications. Triggers a Lambda function.
3. **Lambda Function**: 
	- Starts an EC2 instance (if not already running).
	- Forwards the SQS message to SQS Queue 2.
4. **SQS Queue 2**: Receives messages for processing by the EC2 poller.
5. **EC2 Instance**: Runs a Python poller script as a systemd service. The poller:
	- Polls SQS Queue 2 for messages.
	- Downloads the file from S3.
	- Processes the file (simulated with a sleep).
	- Updates DynamoDB with the processing status.
	- Stops itself if no messages are received for a set period.
6. **DynamoDB Table**: Stores file metadata and processing status.

---

## Key Components

### 1. Python Poller Script (`poll_sqs.py`)
- Reads from SQS Queue 2.
- Downloads files from S3.
- Updates DynamoDB.
- Handles missing files and errors gracefully.
- Stops the EC2 instance automatically when idle.

### 2. Systemd Service
- Ensures the poller script runs on every boot and restarts on failure.
- Service file example:
  ```ini
  [Unit]
  Description=Poll SQS and process files

  [Service]
  Type=simple
  User=ec2-user
  WorkingDirectory=/home/ec2-user
  ExecStart=/usr/bin/python3 /home/ec2-user/poll_sqs.py
  Restart=on-failure

  [Install]
  WantedBy=multi-user.target
  ```
- Enable and start with:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl enable poll_sqs
  sudo systemctl start poll_sqs
  ```

### 3. IAM Roles & Policies
- **Lambda Role**: Needs `ec2:StartInstances` and `sqs:SendMessage` for SQS Queue 2.
- **EC2 Role**: Needs `sqs:ReceiveMessage`, `sqs:DeleteMessage` for SQS Queue 2, `s3:GetObject` for the S3 bucket, `dynamodb:UpdateItem` for the table, and `ec2:StopInstances` for itself.

### 4. Lambda Function
- Triggered by SQS Queue 1.
- Starts EC2 and forwards the message to SQS Queue 2.
- Must have proper error handling and logging.

---

## Deployment Steps

1. **Create AWS Resources**
	- S3 bucket, SQS queues, DynamoDB table, EC2 instance, Lambda function.
2. **Set Up IAM Roles**
	- Attach least-privilege policies as described above.
3. **Deploy the Python Poller**
	- Place `poll_sqs.py` in `/home/ec2-user` on the EC2 instance.
	- Create and enable the systemd service as shown above.
4. **Configure Lambda**
	- Ensure it starts EC2 and forwards messages to SQS Queue 2.
	- Set timeout and logging.
5. **Test the Workflow**
	- Upload a file to S3 and verify end-to-end processing.
	- Check logs with `journalctl -u poll_sqs -f` on EC2.

---

## Troubleshooting
- **S3 404 Errors**: Ensure the file exists and the SQS message is not stale.
- **EC2 Stop Permission Error**: Attach `ec2:StopInstances` permission to the EC2 role.
- **Lambda SQS SendMessage Error**: Attach `sqs:SendMessage` permission for SQS Queue 2 to the Lambda role.
- **Systemd Service Not Starting**: Check permissions, paths, and logs with `systemctl status poll_sqs`.

---

## Best Practices
- Use environment variables for configuration (queue URLs, table names, etc.).
- Use systemd for robust, auto-restarting background services.
- Grant only the minimum IAM permissions needed.
- Add logging and error handling throughout.
- Use two SQS queues to decouple Lambda and EC2 poller processing.

---

## Maintenance
- Update the poller script as needed for new processing logic.
- Use `sudo systemctl restart poll_sqs` to restart the service after updates.
- Monitor logs for errors and performance.

bash infra/dynamodb_test_upload.sh
docker-compose up localstack

# Developer Guide: LocalStack + Terraform + Fullstack Video Upload App

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
