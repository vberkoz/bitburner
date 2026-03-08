#!/bin/bash

set -e

STACK_NAME="bitburner"
REGION=${AWS_REGION:-us-east-1}
PROFILE="basil"

echo "Deploying app frontend..."
echo "Region: $REGION"
echo "Profile: $PROFILE"

# Get stack outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null)

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$API_ENDPOINT" ] || [ -z "$BUCKET_NAME" ]; then
    echo "❌ Error: Could not get stack outputs. Run ./backend-app.sh first."
    exit 1
fi

echo "API Endpoint: $API_ENDPOINT"
echo "Bucket: $BUCKET_NAME"

# Update app.js with API endpoint
echo "Updating app.js..."
sed "s|API_GATEWAY_URL|${API_ENDPOINT}|g" app/app.js > app/app.js.tmp
mv app/app.js.tmp app/app.js

# Upload files
echo "Uploading files to S3..."
aws s3 cp app/index.html s3://$BUCKET_NAME/ --content-type "text/html" --region $REGION --profile $PROFILE
aws s3 cp app/style.css s3://$BUCKET_NAME/ --content-type "text/css" --region $REGION --profile $PROFILE
aws s3 cp app/app.js s3://$BUCKET_NAME/ --content-type "application/javascript" --region $REGION --profile $PROFILE

# Restore original
git checkout app/app.js 2>/dev/null || sed "s|${API_ENDPOINT}|API_GATEWAY_URL|g" app/app.js > app/app.js.tmp && mv app/app.js.tmp app/app.js

echo ""
echo "✅ Frontend deployment complete!"
echo ""
