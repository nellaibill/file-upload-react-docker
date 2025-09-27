# Developer Guide: Migrating to Real AWS S3 and DynamoDB

This guide explains how to configure and run the backend and infrastructure for real AWS S3 and DynamoDB, instead of LocalStack.

---

## 1. Prerequisites
- AWS account with S3 and DynamoDB access
- IAM user with `AmazonS3FullAccess` and `AmazonDynamoDBFullAccess` (or custom policies)
- AWS Access Key ID and Secret Access Key
- S3 bucket already created (e.g., `mdsaleem1804`)
- DynamoDB table already created (e.g., `videos` with `video_id` as the partition key)

---


## 2. Environment Variables
Set these environment variables before running the backend:

- `AWS_ACCESS_KEY_ID` = your AWS access key
- `AWS_SECRET_ACCESS_KEY` = your AWS secret key
- `AWS_REGION` = your AWS region (e.g., `us-east-1`)
- `S3_BUCKET` = your S3 bucket name (e.g., `mdsaleem1804`)
- `DYNAMODB_TABLE` = your DynamoDB table name (e.g., `videos`)
- `SQS_QUEUE_URL` = your SQS queue URL (e.g., `https://sqs.us-east-1.amazonaws.com/643058307778/video-processing-queue`)

**Do NOT set `DYNAMODB_ENDPOINT`** (used only for LocalStack).

---

## 3. Backend Code Changes
- The backend now connects to real AWS S3 and DynamoDB (no custom endpoints).
- The DynamoDB item includes a `status` field set to `file uploaded` when a file is uploaded.

---

## 4. Terraform for AWS Resources
- The Terraform script (`infra/main.tf`) is updated to only create the DynamoDB table.
- The S3 bucket must be created manually or already exist.
- To provision the DynamoDB table:

```powershell
cd infra
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_REGION="us-east-1"
terraform init
terraform plan
terraform apply
```

---

## 5. Running the Backend

**In PowerShell:**
```powershell
cd backend
$env:AWS_ACCESS_KEY_ID="your-access-key-id"
$env:AWS_SECRET_ACCESS_KEY="your-secret-access-key"
$env:AWS_REGION="us-east-1"
$env:S3_BUCKET="mdsaleem1804"
$env:DYNAMODB_TABLE="videos"
go run main.go
```

**Or, if using Docker Compose:**
- Update the `environment` section for the backend service in `docker-compose.yml` with the above variables.
- Rebuild and restart the backend container.

---


## 6. React Native Frontend
- The frontend uploads files to S3 using a pre-signed URL from the backend.
- After upload, the backend sets the status in DynamoDB to `file uploaded`.
- The backend also sends a message to the SQS queue to trigger EC2 processing.
- The frontend can query the backend to get the status of uploaded files.

---

## 7. SQS Integration for EC2 Processing

### SQS Integration Steps
1. **Create an SQS queue** in AWS (e.g., `video-processing-queue`).
2. **Set the `SQS_QUEUE_URL` environment variable** in your backend to the queue's URL. (**Step 2 completed!**)
3. **Backend will send a message** to the SQS queue after each upload (already implemented in Go backend).
4. **EC2 instance** (or Lambda) should poll the SQS queue, process the message, and update DynamoDB status as needed.

**How to test SQS integration:**
- Upload a file using the frontend or `/upload` endpoint.
- Go to AWS Console → SQS → your queue → "Send and receive messages" → "Poll for messages".
- You should see a message with the video ID and filename in the body.
- (Optional) Use AWS CLI: `aws sqs receive-message --queue-url "$env:SQS_QUEUE_URL"`

**Sample SQS message body:**
```json
{"video_id": "abc123", "filename": "myvideo.mp4"}
```

---

## 8. Troubleshooting
- 403 Forbidden from S3: Check IAM user permissions and bucket CORS policy.
- DynamoDB errors: Ensure table exists, region is correct, and credentials are valid.
- ValidationException (tableName): Make sure `DYNAMODB_TABLE` is set and matches the table name in AWS.
- UnrecognizedClientException: Check AWS credentials.

---

## 9. Design Choice: Backend SQS Message (Current Workflow)

### What We Are Doing
After a file is uploaded, the Go backend stores metadata in DynamoDB and then sends a message to the SQS queue. This message triggers further processing (for example, by an EC2 poller).

### Why This Approach?
- **Control:** The backend can add custom logic, validation, or extra data before sending the SQS message.
- **Consistency:** Only uploads handled by the backend will trigger SQS messages, so you always know the message format and timing.
- **Simplicity:** No need to manage S3 event notifications or bucket policies for SQS.

### What Happens
1. User uploads a file using the frontend (or API).
2. Backend receives the upload request and stores metadata in DynamoDB (status: 'file uploaded').
3. Backend sends a message to the SQS queue with the video ID and filename.
4. EC2 poller (or other consumer) receives the SQS message and processes the file, updating DynamoDB as needed.

### Note for Future Developers
If you want to trigger SQS messages for all uploads (even those not handled by the backend), consider using S3 Event Notifications. For now, we use the backend approach for better control and clarity.

---

## 10. Serving an HTML Page and Updating DynamoDB on S3 Upload (Amazon Linux EC2)

This section explains how to:
- Serve an HTML page from your Amazon Linux EC2 instance
- Update DynamoDB when a new file is uploaded to S3

### 10.1 Serve an HTML Page from EC2
1. Copy your HTML file (e.g., `index.html`) to your EC2 instance (use `scp` or create it with `nano`).
2. On your EC2 instance, run:
   ```sh
   python3 -m http.server 8080
   ```
3. In your local browser, go to:
   ```
   http://<your-ec2-public-ip>:8080/index.html
   ```
   (Make sure your EC2 security group allows inbound traffic on port 8080.)

### 10.2 Update DynamoDB When a File is Uploaded to S3
You can use a Python script (similar to your SQS poller) to listen for SQS messages about new uploads and update DynamoDB.

**Example Python Script:**
```python
import boto3
import json

sqs = boto3.client('sqs', region_name='your-region')
dynamodb = boto3.resource('dynamodb', region_name='your-region')
queue_url = 'your-sqs-queue-url'
table = dynamodb.Table('your-dynamodb-table')

while True:
    messages = sqs.receive_message(QueueUrl=queue_url, MaxNumberOfMessages=1, WaitTimeSeconds=20)
    for msg in messages.get('Messages', []):
        body = json.loads(msg['Body'])
        video_id = body['video_id']
        filename = body['filename']
        # Update DynamoDB status
        table.update_item(
            Key={'video_id': video_id},
            UpdateExpression='SET #s = :val',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':val': 'file uploaded'}
        )
        sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=msg['ReceiptHandle'])
```

- Run this script on your EC2 instance to keep DynamoDB in sync with S3 uploads.
- You can modify the HTML page or script to display the latest uploaded files by querying DynamoDB (using JavaScript fetch calls to a backend API, if needed).

---

If you want a more interactive HTML page (showing uploaded files), let me know and I can help you with a simple example!

---

## 11. Summary
- No LocalStack endpoints are used for real AWS.
- All resources are in your AWS account.
- Environment variables and permissions are critical for success.

---

For further help, contact your project maintainer or refer to the AWS documentation.
