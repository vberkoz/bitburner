# One-Time Secret Message

A secure application to share encrypted messages via one-time URLs. Messages are encrypted client-side, stored in DynamoDB, and automatically deleted after viewing.

## Features

- Client-side AES-256-GCM encryption
- One-time URL access (message deleted after viewing)
- 24-hour TTL for unviewed messages
- Serverless architecture (Lambda + API Gateway + DynamoDB + S3)

## Prerequisites

- AWS CLI configured with credentials
- AWS account with appropriate permissions
- ACM certificate for *.vberkoz.com in us-east-1 region
- Route53 hosted zone for vberkoz.com

## Setup Certificate (First Time Only)

If you don't have a certificate yet:

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
    --domain-name '*.vberkoz.com' \
    --validation-method DNS \
    --region us-east-1

# Follow the DNS validation instructions in the AWS Console
```

## Deployment

### First-Time Setup

Run this once to set up everything:
```bash
chmod +x first-time.sh
./first-time.sh dev
```

This will:
- Create and validate SSL certificate
- Deploy all AWS infrastructure
- Upload frontend files
- Configure DNS

### Subsequent Deployments

For backend changes (Lambda, DynamoDB, API Gateway):
```bash
chmod +x deploy-backend.sh
./deploy-backend.sh dev
```

For frontend changes only (HTML, CSS, JS):
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

The application will be deployed to: https://bitburner.vberkoz.com/

Note: CloudFront distribution takes 15-20 minutes to fully deploy on first-time setup.

## Architecture

- Frontend: Plain HTML/CSS/JS hosted on S3
- Backend: Lambda function with API Gateway
- Storage: DynamoDB with TTL enabled
- Encryption: Web Crypto API (AES-256-GCM)

## How It Works

1. User enters a message
2. Message is encrypted in the browser using AES-256-GCM
3. Encrypted message stored in DynamoDB (key stays in URL)
4. One-time URL is generated
5. When URL is accessed, message is retrieved and deleted from DynamoDB
6. Message is decrypted in the browser using the key from URL

## Cleanup

```bash
aws cloudformation delete-stack --stack-name dev-secrets-stack
```
