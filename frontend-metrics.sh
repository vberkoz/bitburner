#!/bin/bash

set -e

STACK_NAME="bitburner"
REGION=${AWS_REGION:-us-east-1}
PROFILE="basil"

echo "Deploying metrics frontend..."
echo "Region: $REGION"
echo "Profile: $PROFILE"

# Get stack outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text 2>/dev/null)

METRICS_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`MetricsBucketName`].OutputValue' \
    --output text 2>/dev/null)

METRICS_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`MetricsURL`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$API_ENDPOINT" ] || [ -z "$METRICS_BUCKET" ]; then
    echo "❌ Error: Could not get stack outputs. Run ./backend-app.sh first."
    exit 1
fi

echo "API Endpoint: $API_ENDPOINT"
echo "Metrics Bucket: $METRICS_BUCKET"

# Update dashboard.js with API endpoint
echo "Updating dashboard.js..."
cp metrics/js/dashboard.js metrics/js/dashboard.js.backup
sed "s|API_GATEWAY_URL|${API_ENDPOINT}|g" metrics/js/dashboard.js.backup > metrics/js/dashboard.js

# Upload metrics files
echo "Uploading metrics files..."
aws s3 sync metrics/ s3://$METRICS_BUCKET/ \
    --exclude ".DS_Store" \
    --exclude "*.backup" \
    --region $REGION \
    --profile $PROFILE

# Restore original
mv metrics/js/dashboard.js.backup metrics/js/dashboard.js

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --profile $PROFILE \
    --query "DistributionList.Items[?Aliases.Items[?contains(@, 'metrics.bitburner.vberkoz.com')]].Id | [0]" \
    --output text 2>/dev/null)

if [ ! -z "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    aws cloudfront create-invalidation \
        --distribution-id $DISTRIBUTION_ID \
        --paths "/*" \
        --profile $PROFILE > /dev/null 2>&1 || echo "Note: CloudFront invalidation skipped"
fi

echo ""
echo "✅ Metrics frontend deployed!"
echo ""
echo "🌐 Metrics URL: $METRICS_URL"
echo "🔑 Default password: bitburner2024"
echo ""
echo "📝 To change password, edit: metrics/js/login.js"
echo "⚠️  CloudFront may take 15-20 minutes to propagate"
echo ""
