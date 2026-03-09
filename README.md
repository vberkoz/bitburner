# One-Time Secret Message

A secure application to share encrypted messages via one-time URLs. Messages are encrypted client-side, stored in DynamoDB, and automatically deleted after viewing.

## Features

- Client-side AES-256-GCM encryption
- One-time URL access (message deleted after viewing)
- Configurable expiration (1h, 6h, 24h)
- Optional password protection
- Serverless architecture (Lambda + API Gateway + DynamoDB + S3)

## Architecture

- Frontend: Plain HTML/CSS/JS hosted on S3 + CloudFront
- Backend: Lambda function with API Gateway at https://api.bitburner.vberkoz.com
- Storage: DynamoDB with TTL enabled
- Encryption: Web Crypto API (AES-256-GCM)

## Prerequisites

- AWS CLI configured with credentials
- AWS account with appropriate permissions
- ACM certificate for *.bitburner.vberkoz.com in us-east-1 region
- Route53 hosted zone for vberkoz.com
- Node.js (for Lambda dependencies)

## Deployment

### First-Time Setup

1. Run the initialization script:
```bash
chmod +x init.sh
./init.sh
```

2. Deploy the backend:
```bash
chmod +x backend-app.sh
./backend-app.sh
```

3. Deploy the frontend:
```bash
chmod +x frontend-app.sh
./frontend-app.sh
```

4. Deploy the metrics dashboard:
```bash
chmod +x frontend-metrics.sh
./frontend-metrics.sh
```

### Subsequent Deployments

For backend changes (Lambda, DynamoDB, API Gateway):
```bash
./backend-app.sh
```

For frontend changes (HTML, CSS, JS):
```bash
./frontend-app.sh
```

For metrics dashboard changes:
```bash
./frontend-metrics.sh
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
