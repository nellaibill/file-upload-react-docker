import boto3
import json

def lambda_handler(event, context):
    print("Received SQS event:", json.dumps(event))
    ec2 = boto3.client('ec2', region_name='us-east-1')
    instance_id = 'i-00b75e75b9d4fc7df'  # User's actual EC2 instance ID

    for record in event['Records']:
        # SQS message body contains the S3 event as JSON
        s3_event = json.loads(record['body'])
        for s3_record in s3_event.get('Records', []):
            bucket = s3_record['s3']['bucket']['name']
            key = s3_record['s3']['object']['key']
            print(f"S3 upload detected: {bucket}/{key}")
            # Start EC2 instance with logging
            try:
                response = ec2.start_instances(InstanceIds=[instance_id])
                starting_states = response['StartingInstances']
                for state in starting_states:
                    current = state['CurrentState']['Name']
                    previous = state['PreviousState']['Name']
                    print(f"EC2 instance {instance_id} state changed from {previous} to {current}")
                print(f"Successfully started EC2 instance: {instance_id}")
            except Exception as e:
                print(f"Failed to start EC2 instance {instance_id}: {e}")

    return {'status': 'Processed S3 upload event'}
