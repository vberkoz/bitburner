#!/bin/bash

set -e

STACK_NAME="bitburner"
REGION=${AWS_REGION:-us-east-1}
DOMAIN_NAME="bitburner.vberkoz.com"
METRICS_DOMAIN="metrics.bitburner.vberkoz.com"
WILDCARD_DOMAIN="*.bitburner.vberkoz.com"
HOSTED_ZONE="vberkoz.com"
HOSTED_ZONE_ID="Z0938756375Q47T4PTZG2"
PROFILE="basil"

echo "=========================================="
echo "  One-Time Infrastructure Setup"
echo "=========================================="
echo ""
echo "Region: $REGION"
echo "App Domain: $DOMAIN_NAME"
echo "Metrics Domain: $METRICS_DOMAIN"
echo "Profile: $PROFILE"
echo ""

# Step 1: Check/Create Wildcard Certificate
echo "Step 1: Checking ACM certificate for *.bitburner.vberkoz.com..."
CERT_ARN=$(aws acm list-certificates \
    --region us-east-1 \
    --profile $PROFILE \
    --query "CertificateSummaryList[?DomainName=='$WILDCARD_DOMAIN'].CertificateArn | [0]" \
    --output text)

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
    echo "Creating wildcard certificate for $WILDCARD_DOMAIN..."
    
    CERT_ARN=$(aws acm request-certificate \
        --domain-name "$WILDCARD_DOMAIN" \
        --subject-alternative-names "$DOMAIN_NAME" \
        --validation-method DNS \
        --region us-east-1 \
        --profile $PROFILE \
        --query 'CertificateArn' \
        --output text)
    
    echo "Certificate requested: $CERT_ARN"
    sleep 2
    
    VALIDATION_RECORD=$(aws acm describe-certificate \
        --certificate-arn $CERT_ARN \
        --region us-east-1 \
        --profile $PROFILE \
        --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
        --output json)
    
    RECORD_NAME=$(echo $VALIDATION_RECORD | jq -r '.Name')
    RECORD_VALUE=$(echo $VALIDATION_RECORD | jq -r '.Value')
    
    echo "Adding DNS validation record..."
    cat > /tmp/cert-validation.json <<EOF
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "$RECORD_NAME",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$RECORD_VALUE"}]
    }
  }]
}
EOF
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --change-batch file:///tmp/cert-validation.json \
        --profile $PROFILE > /dev/null
    
    rm /tmp/cert-validation.json
    
    echo "Waiting for certificate validation (5-10 minutes)..."
    aws acm wait certificate-validated \
        --certificate-arn $CERT_ARN \
        --region us-east-1 \
        --profile $PROFILE
    
    echo "✅ Certificate validated!"
else
    echo "✅ Certificate exists: $CERT_ARN"
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Certificate ARN: $CERT_ARN"
echo ""
echo "Next steps:"
echo "  1. Deploy backend: ./backend-app.sh"
echo "  2. Deploy app frontend: ./frontend-app.sh"
echo "  3. Deploy metrics frontend: ./frontend-metrics.sh"
echo ""
