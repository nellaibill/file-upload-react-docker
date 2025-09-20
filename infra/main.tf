# Terraform configuration for LocalStack S3 and DynamoDB

provider "aws" {
  access_key = "test"
  secret_key = "test"
  region     = "us-east-1"
  endpoints {
    s3       = "http://localhost:9007"
    dynamodb = "http://localhost:9007"
    sts      = "http://localhost:9007"
  }
  # Force path-style URLs for S3 (required for LocalStack)
  s3_use_path_style = true
}

resource "aws_s3_bucket" "video_bucket" {
  bucket = "mybucket"
  force_destroy = true
}

resource "aws_dynamodb_table" "videos" {
  name           = "videos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "video_id"

  attribute {
    name = "video_id"
    type = "S"
  }
}
