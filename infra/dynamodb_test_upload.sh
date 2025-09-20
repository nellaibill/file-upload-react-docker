# Test DynamoDB table creation and upload using AWS CLI (LocalStack)
# Usage: Run from project root with: bash infra/dynamodb_test_upload.sh

# Set AWS CLI env vars for LocalStack
env AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
aws --endpoint-url=http://localhost:9007 dynamodb list-tables

echo "Creating test item in DynamoDB table 'videos'..."
env AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
aws --endpoint-url=http://localhost:9007 dynamodb put-item \
  --table-name videos \
  --item '{"video_id": {"S": "test123"}, "title": {"S": "Sample Video"}}'

echo "Fetching item from DynamoDB..."
env AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
aws --endpoint-url=http://localhost:9007 dynamodb get-item \
  --table-name videos \
  --key '{"video_id": {"S": "test123"}}'
