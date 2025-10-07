#!/usr/bin/env python3
import boto3
import json
import time
import requests
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')

# Configuration (edit as needed)
REGION = os.environ.get('AWS_REGION', 'us-east-1')
QUEUE_URL = os.environ.get('SQS_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/643058307778/video-processing-queue-ec2')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', 'videos')

sqs = boto3.client('sqs', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

def process_message(msg):
    logging.info('Received message from SQS')
    body_str = msg.get('Body', '')
    if not body_str:
        logging.warning('Empty message body, skipping.')
        return
    try:
        body = json.loads(body_str)
    except json.JSONDecodeError as e:
        logging.error(f'Failed to decode message body as JSON: {e}. Body: {body_str}')
        return
    # S3 event structure from SQS
    records = body.get('Records', [])
    if not records:
        logging.warning('No S3 records in message, skipping.')
        return
    s3_info = records[0]['s3']
    bucket = s3_info['bucket']['name']
    key = s3_info['object']['key']
    logging.info(f'Processing file: s3://{bucket}/{key}')
    # Download file (optional)
    local_path = f'/home/ec2-user/{os.path.basename(key)}'
    try:
        s3.download_file(bucket, key, local_path)
        logging.info('File downloaded to %s', local_path)
    except s3.exceptions.NoSuchKey:
        logging.error(f'S3 object not found: s3://{bucket}/{key}. Skipping message.')
        return
    except Exception as e:
        logging.error(f'Error downloading s3://{bucket}/{key}: {e}. Skipping message.')
        return
    # Mimic processing
    logging.info('Simulating processing... (wait 15 seconds)')
    time.sleep(15)
    # Update DynamoDB (customize as needed)
    video_id = key  # or extract from key/metadata if needed
    table.update_item(
        Key={'video_id': video_id},
        UpdateExpression='SET #s = :val',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':val': 'processed'}
    )
    logging.info('DynamoDB updated! (wait 15 seconds)')
    time.sleep(15)

def stop_instance():
    ec2 = boto3.client('ec2', region_name=REGION)
    try:
        instance_id = requests.get('http://169.254.169.254/latest/meta-data/instance-id', timeout=2).text
        logging.info(f"Instance ID: {instance_id}")
        if instance_id:
            ec2.stop_instances(InstanceIds=[instance_id])
            logging.info('EC2 instance stopping...')
        else:
            logging.warning('Could not retrieve instance ID. Not stopping instance.')
    except Exception as e:
        logging.error(f"Error retrieving instance ID or stopping instance: {e}")

def main():
    logging.info('Starting SQS poller loop')
    max_empty_polls = 3  # 3 polls x 20 seconds = 60 seconds
    empty_polls = 0
    while True:
        logging.info('Polling SQS for messages...')
        resp = sqs.receive_message(QueueUrl=QUEUE_URL, MaxNumberOfMessages=1, WaitTimeSeconds=20)
        messages = resp.get('Messages', [])
        if not messages:
            empty_polls += 1
            logging.info(f'No messages found. Empty poll count: {empty_polls}/{max_empty_polls}')
            if empty_polls >= max_empty_polls:
                logging.info('Waited 1 minute with no messages. Stopping instance...')
                stop_instance()  # Auto-stop EC2 when done
                break
            else:
                continue
        empty_polls = 0  # Reset counter if message found
        for msg in messages:
            process_message(msg)
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
            logging.info('Message deleted from SQS')

if __name__ == '__main__':
    main()
