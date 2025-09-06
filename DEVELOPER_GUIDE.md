# Developer Guide: LocalStack + Terraform Setup

## 1. Prerequisites
- Docker & Docker Compose installed
- AWS CLI installed (`pip install awscli`)
- Terraform installed (https://www.terraform.io/downloads.html)

## 2. Start LocalStack
```
docker-compose up localstack
```
- LocalStack will be available at http://localhost:9007

## 3. AWS CLI Test (Optional)
Set environment variables in PowerShell:
```
$env:AWS_ACCESS_KEY_ID="test"
$env:AWS_SECRET_ACCESS_KEY="test"
$env:AWS_DEFAULT_REGION="us-east-1"
```
Test S3:
```
aws --endpoint-url=http://localhost:9007 s3 mb s3://mybucket
aws --endpoint-url=http://localhost:9007 s3 ls
```
Test DynamoDB:
```
aws --endpoint-url=http://localhost:9007 dynamodb list-tables
```

## 4. Provision S3 & DynamoDB with Terraform
```
cd infra
terraform init
terraform apply
```
- Accept the plan to create resources in LocalStack.


**Note:**
- The `s3_force_path_style` argument is not needed in the provider block for recent Terraform AWS providers. If you see an error about it, simply remove that line (already done in this project).
- If you get a credentials or STS error, make sure your `endpoints` block in `main.tf` includes:
	```hcl
	endpoints {
		s3       = "http://localhost:9007"
		dynamodb = "http://localhost:9007"
		sts      = "http://localhost:9007"
	}
	```
- If you get an S3 bucket creation error about `no such host` or `mybucket.localhost`, add this to your provider block:
	```hcl
	s3_use_path_style = true
	```

## 5. Project Structure
- `infra/main.tf`: Terraform config for S3 and DynamoDB (LocalStack endpoints)
- `docker-compose.yml`: All service definitions (MinIO, Go API, Frontend, LocalStack)

## 6. Troubleshooting
- If LocalStack fails to start, delete the `localstack-data` folder and try again.
- Make sure ports are not in use by other processes.
- If Terraform errors about unsupported arguments, check the provider block for typos or deprecated options.

---

This guide will help you set up and test your local AWS stack for development.
