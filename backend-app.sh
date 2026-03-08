#!/bin/bash

set -e

STACK_NAME="bitburner"
REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME="bitburner.vberkoz.com"
METRICS_DOMAIN="metrics.bitburner.vberkoz.com"
HOSTED_ZONE="vberkoz.com"
PROFILE="basil"

echo "Deploying app backend infrastructure..."
echo "Region: $REGION"
echo "Profile: $PROFILE"

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
    --region us-east-1 \
    --profile $PROFILE \
    --query "CertificateSummaryList[?DomainName=='*.bitburner.vberkoz.com'].CertificateArn | [0]" \
    --output text)

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
    echo "❌ Error: No certificate found. Run ./init.sh first."
    exit 1
fi

echo "Using certificate: $CERT_ARN"

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        DomainName=$DOMAIN_NAME \
        MetricsDomainName=$METRICS_DOMAIN \
        HostedZoneName=$HOSTED_ZONE \
        CertificateArn=$CERT_ARN \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --profile $PROFILE

# Get outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

echo ""
echo "✅ Backend deployment complete!"
echo "🔗 API Endpoint: $API_ENDPOINT"
echo "🌐 Website URL: $WEBSITE_URL"
echo ""
