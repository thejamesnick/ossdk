# Service Testing Guide

## Quick Test Options

### Option 1: Test Individual Service Locally (Fastest)

Test a single service without Docker:

```bash
# 1. Start compliance service
cd services/compliance
yarn dev

# 2. In another terminal, test it
curl http://localhost:3003/health
```

### Option 2: Docker Compose (Full Stack)

Test all services together:

```bash
# Start all services
docker-compose up

# Run test script (in another terminal)
./tests/test-services.sh
```

### Option 3: Manual API Testing

#### Compliance Service

```bash
# Health check
curl http://localhost:3003/health

# Screen an address
curl -X POST http://localhost:3003/screen \
  -H "Content-Type: application/json" \
  -d '{"address":"11111111111111111111111111111111"}'

# Store compliance event
curl -X POST http://localhost:3003/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "address_screened",
    "address": "11111111111111111111111111111111",
    "timestamp": 1234567890
  }'

# Get audit log
curl "http://localhost:3003/audit-log?address=11111111111111111111111111111111"
```

#### Mint/Burn Service

```bash
# Health check
curl http://localhost:3001/health

# Request mint
curl -X POST http://localhost:3001/mint/request \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "11111111111111111111111111111111",
    "amount": 1000000
  }'

# Check status
curl http://localhost:3001/mint/status/req_123456
```

#### Indexer Service

```bash
# Health check
curl http://localhost:3002/health

# Get events
curl "http://localhost:3002/events?limit=10"

# Get supply
curl http://localhost:3002/supply

# Get holders
curl "http://localhost:3002/holders?limit=50"
```

#### Webhook Service

```bash
# Health check
curl http://localhost:3004/health

# Register webhook
curl -X POST http://localhost:3004/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhook",
    "events": ["mint", "burn", "transfer"],
    "secret": "your-secret-key"
  }'

# List webhooks
curl http://localhost:3004/webhooks/list
```

## Testing with Database

If you need PostgreSQL for compliance/indexer:

```bash
# Start just the database
docker-compose up postgres -d

# Set environment variable
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sss_compliance"

# Run service
cd services/compliance
yarn dev
```

## Expected Results

All health endpoints should return:
```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0",
  "uptime": 123.456,
  "timestamp": "2026-03-05T..."
}
```

## Troubleshooting

- **Port already in use**: Change PORT in .env or kill existing process
- **Database connection failed**: Start postgres with `docker-compose up postgres -d`
- **Redis connection failed**: Start redis with `docker-compose up redis -d`
- **Build errors**: Run `yarn build` in the service directory first
