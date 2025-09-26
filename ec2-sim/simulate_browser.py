import os
import time
import boto3

# Simulate browser opening and file processing
def simulate_browser_and_process(bucket, key, table, region, endpoint):
    print(f"[SIMULATION] Opening browser to process file: s3://{bucket}/{key}")
    # Set status to 'processing' in DynamoDB
    try:
        session = boto3.Session(
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "test"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "test"),
            region_name=region or "us-east-1"
        )
        dynamodb = session.client("dynamodb", endpoint_url=endpoint)
        dynamodb.update_item(
            TableName=table,
            Key={"filename": {"S": key}},
            UpdateExpression="SET #s = :p",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":p": {"S": "processing"}}
        )
        print(f"[SIMULATION] Updated DynamoDB status to 'processing' for {key}")
        # Give DynamoDB a moment to commit the status
        time.sleep(1)
    except Exception as e:
        print(f"[SIMULATION] Failed to update DynamoDB to 'processing': {e}")

    # Simulate processing time (40 seconds)
    print(f"[SIMULATION] Processing... (holding for 40 seconds)")
    time.sleep(40)
    print(f"[SIMULATION] File processed: s3://{bucket}/{key}")

    # Update DynamoDB status to 'completed'
    try:
        dynamodb.update_item(
            TableName=table,
            Key={"filename": {"S": key}},
            UpdateExpression="SET #s = :p",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":p": {"S": "completed"}}
        )
        print(f"[SIMULATION] Updated DynamoDB status to 'completed' for {key}")
    except Exception as e:
        print(f"[SIMULATION] Failed to update DynamoDB to 'completed': {e}")

if __name__ == "__main__":
    # Get bucket, key, and DynamoDB info from environment variables
    bucket = os.environ.get("S3_BUCKET", "test-bucket")
    key = os.environ.get("S3_KEY", "test-file.txt")
    table = os.environ.get("DYNAMODB_TABLE", "videos")
    region = os.environ.get("AWS_REGION", "us-east-1")
    endpoint = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:9007")
    simulate_browser_and_process(bucket, key, table, region, endpoint)
