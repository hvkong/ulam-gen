#!/bin/bash
# Phase 1 Testing Script
# This script helps verify that Phase 1 changes work correctly

set -e

echo "=========================================="
echo "Phase 1 Testing Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Step 1: Build Docker image
echo "Step 1: Building Docker image..."
if make docker-build; then
    print_status 0 "Docker image built successfully"
else
    print_status 1 "Docker image build failed"
    exit 1
fi
echo ""

# Step 2: Start services
echo "Step 2: Starting services with docker compose..."
print_info "Using compose.grafana-local-stack.monolithic.yaml"
if docker compose -f compose.grafana-local-stack.monolithic.yaml up -d; then
    print_status 0 "Services started"
else
    print_status 1 "Failed to start services"
    exit 1
fi
echo ""

# Step 3: Wait for services to be ready
echo "Step 3: Waiting for services to be ready (30 seconds)..."
sleep 30
print_status 0 "Wait complete"
echo ""

# Step 4: Check service status
echo "Step 4: Checking service status..."
docker compose -f compose.grafana-local-stack.monolithic.yaml ps
echo ""

# Step 5: Check if application is accessible
echo "Step 5: Testing application endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3333 | grep -q "200"; then
    print_status 0 "Application is accessible at http://localhost:3333"
else
    print_status 1 "Application is not accessible"
fi
echo ""

# Step 6: Check health endpoints
echo "Step 6: Checking health endpoints..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/healthz)
READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/ready)

if [ "$HEALTH_CODE" = "200" ]; then
    print_status 0 "Health endpoint responding: $HEALTH_CODE"
else
    print_status 1 "Health endpoint not responding: $HEALTH_CODE"
fi

if [ "$READY_CODE" = "200" ]; then
    print_status 0 "Ready endpoint responding: $READY_CODE"
else
    print_status 1 "Ready endpoint not responding: $READY_CODE"
fi
echo ""

# Step 7: Check metrics endpoint
echo "Step 7: Checking metrics endpoint..."
if curl -s http://localhost:3333/metrics | grep -q "quickfood_server"; then
    print_status 0 "Metrics endpoint is working (quickfood_server metrics found)"
else
    print_status 1 "Metrics endpoint issue or metrics not found"
fi
echo ""

# Step 8: Check logs for errors
echo "Step 8: Checking logs for environment variable errors..."
if docker compose -f compose.grafana-local-stack.monolithic.yaml logs quickfood | grep -i "QUICKPIZZA"; then
    print_status 1 "Found QUICKPIZZA references in logs (should be QUICKFOOD)"
else
    print_status 0 "No QUICKPIZZA references found in logs"
fi
echo ""

# Step 9: Test food recommendation API
echo "Step 9: Testing food recommendation API..."
RESPONSE=$(curl -s -X POST http://localhost:3333/api/food \
  -H "Content-Type: application/json" \
  -H "Authorization: Token test123" \
  -d '{
    "maxCaloriesPerSlice": 500,
    "mustBeVegetarian": false,
    "excludedIngredients": [],
    "excludedTools": [],
    "maxNumberOfToppings": 6,
    "minNumberOfToppings": 2
  }')

if echo "$RESPONSE" | grep -q "pizza"; then
    print_info "API response contains 'pizza' field (expected in Phase 1, will be fixed in Phase 2)"
    print_status 0 "API is responding"
else
    print_status 1 "API response unexpected"
fi
echo ""

echo "=========================================="
echo "Manual Testing Steps:"
echo "=========================================="
echo "1. Open http://localhost:3333 in your browser"
echo "2. Click 'Food, Please!' button and verify it works"
echo "3. Open http://localhost:3000 (Grafana) - login: admin/admin"
echo "4. Go to Explore and check for metrics, logs, and traces"
echo "5. Verify service name appears as 'quickfood' in telemetry"
echo ""
echo "When done testing, run:"
echo "  docker compose -f compose.grafana-local-stack.monolithic.yaml down"
echo "  docker system prune -a --volumes"
echo ""
