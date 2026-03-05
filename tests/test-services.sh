#!/bin/bash

echo "🧪 Testing SSS Services..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name=$1
  local url=$2
  local expected=$3
  
  echo -n "Testing $name... "
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  
  if [ "$response" = "$expected" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected)"
    return 1
  fi
}

# Test health endpoints
echo "=== Health Checks ==="
test_endpoint "Mint/Burn Service" "http://localhost:3001/health" "200"
test_endpoint "Indexer Service" "http://localhost:3002/health" "200"
test_endpoint "Compliance Service" "http://localhost:3003/health" "200"
test_endpoint "Webhook Service" "http://localhost:3004/health" "200"

echo ""
echo "=== API Endpoints ==="

# Test compliance screening
echo -n "Testing compliance screening... "
response=$(curl -s -X POST http://localhost:3003/screen \
  -H "Content-Type: application/json" \
  -d '{"address":"11111111111111111111111111111111"}' \
  -w "%{http_code}" -o /tmp/compliance_response.json)

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  cat /tmp/compliance_response.json | jq '.' 2>/dev/null || cat /tmp/compliance_response.json
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
fi

echo ""

# Test mint request
echo -n "Testing mint request... "
response=$(curl -s -X POST http://localhost:3001/mint/request \
  -H "Content-Type: application/json" \
  -d '{"recipient":"11111111111111111111111111111111","amount":1000000}' \
  -w "%{http_code}" -o /tmp/mint_response.json)

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  cat /tmp/mint_response.json | jq '.' 2>/dev/null || cat /tmp/mint_response.json
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
fi

echo ""

# Test webhook registration
echo -n "Testing webhook registration... "
response=$(curl -s -X POST http://localhost:3004/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/webhook","events":["mint","burn"]}' \
  -w "%{http_code}" -o /tmp/webhook_response.json)

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  cat /tmp/webhook_response.json | jq '.' 2>/dev/null || cat /tmp/webhook_response.json
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
fi

echo ""
echo "=== Test Summary ==="
echo "All basic service tests completed!"
echo "For full integration testing, run: docker-compose up"
