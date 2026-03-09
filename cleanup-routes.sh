#!/bin/bash

set -e

PROFILE="basil"
REGION="us-east-1"
API_ID="neit3rzttj"

echo "Cleaning up old API routes..."
echo "API ID: $API_ID"

# Get all routes
echo "Fetching existing routes..."
ROUTES=$(aws apigatewayv2 get-routes \
    --api-id $API_ID \
    --region $REGION \
    --profile $PROFILE \
    --query 'Items[].{RouteId:RouteId,RouteKey:RouteKey}' \
    --output json)

echo "Current routes:"
echo "$ROUTES" | jq -r '.[] | "\(.RouteKey) - \(.RouteId)"'

# Delete each route
echo ""
echo "Deleting routes..."
echo "$ROUTES" | jq -r '.[].RouteId' | while read -r ROUTE_ID; do
    if [ -n "$ROUTE_ID" ]; then
        echo "Deleting route: $ROUTE_ID"
        aws apigatewayv2 delete-route \
            --api-id $API_ID \
            --route-id $ROUTE_ID \
            --region $REGION \
            --profile $PROFILE || echo "Failed to delete route $ROUTE_ID"
    fi
done

echo ""
echo "✅ Routes cleaned up. Now run ./backend-app.sh"
