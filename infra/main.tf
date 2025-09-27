

# Terraform configuration for AWS DynamoDB (real AWS)
provider "aws" {
  region = "us-east-1"
}

# S3 bucket 'mdsaleem1804' is pre-created and will be used by the application.

resource "aws_dynamodb_table" "videos" {
  name           = "videos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "video_id"

  attribute {
    name = "video_id"
    type = "S"
  }
}
