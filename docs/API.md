# Backend API Reference

## Overview

The SSS backend services provide REST APIs for mint/burn operations, compliance management, event indexing, and webhooks.

## Base URL

```
Development: http://localhost:3000
Production: https://api.yourdomain.com
```

## Authentication

All API requests require authentication via API key or JWT token.

```http
Authorization: Bearer <API_KEY>
```

## Services

### 1. Mint/Burn Service

Port: 3001

#### POST /mint/request

Request to mint tokens.

**Request:**
```json
{
  "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 1000000000,
  "reference": "order-12345"
}
```

**Response:**
```json
{
  "requestId": "req_abc123",
  "status": "pending",
  "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 1000000000,
  "createdAt": "2026-01-15T10:30:00Z"
}
```

#### POST /burn/request

Request to burn tokens.

**Request:**
```json
{
  "owner": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 500000000,
  "reference": "redemption-67890"
}
```

**Response:**
```json
{
  "requestId": "req_def456",
  "status": "pending",
  "owner": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 500000000,
  "createdAt": "2026-01-15T11:00:00Z"
}
```

#### GET /mint/status/:requestId

Get mint request status.

**Response:**
```json
{
  "requestId": "req_abc123",
  "status": "completed",
  "recipient": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "amount": 1000000000,
  "txSignature": "5jKm...",
  "createdAt": "2026-01-15T10:30:00Z",
  "completedAt": "2026-01-15T10:31:00Z"
}
```

**Status Values:**
- `pending` - Request received, awaiting verification
- `verifying` - Verification in progress
- `executing` - Transaction being sent
- `completed` - Successfully completed
- `failed` - Failed (see error field)

### 2. Indexer Service

Port: 3002

#### GET /events

Query on-chain events.

**Query Parameters:**
- `type` - Event type filter
- `address` - Address filter
- `from` - Start timestamp
- `to` - End timestamp
- `limit` - Max results (default: 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "type": "TokensMinted",
      "stablecoin": "...",
      "data": {
        "recipient": "...",
        "amount": 1000000000,
        "minter": "..."
      },
      "timestamp": "2026-01-15T10:30:00Z",
      "txSignature": "5jKm...",
      "slot": 123456789
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

#### GET /supply

Get current total supply.

**Response:**
```json
{
  "totalSupply": 1000000000000,
  "decimals": 6,
  "formatted": "1,000,000.00",
  "lastUpdated": "2026-01-15T12:00:00Z"
}
```

#### GET /holders

Get token holders.

**Query Parameters:**
- `minBalance` - Minimum balance filter
- `limit` - Max results
- `offset` - Pagination offset

**Response:**
```json
{
  "holders": [
    {
      "address": "7xKX...",
      "balance": 1000000000,
      "formatted": "1,000.00",
      "percentage": 0.1
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### GET /transactions

Get transaction history.

**Query Parameters:**
- `address` - Filter by address
- `type` - Filter by type (mint, burn, transfer)
- `from` - Start timestamp
- `to` - End timestamp
- `limit` - Max results
- `offset` - Pagination offset

**Response:**
```json
{
  "transactions": [
    {
      "signature": "5jKm...",
      "type": "mint",
      "from": null,
      "to": "7xKX...",
      "amount": 1000000000,
      "timestamp": "2026-01-15T10:30:00Z",
      "slot": 123456789
    }
  ],
  "total": 1000,
  "limit": 100,
  "offset": 0
}
```

### 3. Compliance Service (SSS-2)

Port: 3003

#### POST /blacklist/add

Add address to blacklist.

**Request:**
```json
{
  "address": "3mNb...",
  "reason": "OFAC sanctions match",
  "metadata": {
    "sanctionsList": "SDN",
    "matchScore": 0.98
  }
}
```

**Response:**
```json
{
  "success": true,
  "address": "3mNb...",
  "reason": "OFAC sanctions match",
  "timestamp": "2026-01-15T11:45:00Z",
  "txSignature": "8pLq..."
}
```

#### POST /blacklist/remove

Remove address from blacklist.

**Request:**
```json
{
  "address": "3mNb...",
  "reason": "False positive, cleared by compliance"
}
```

**Response:**
```json
{
  "success": true,
  "address": "3mNb...",
  "timestamp": "2026-01-15T12:00:00Z",
  "txSignature": "2nMk..."
}
```

#### GET /blacklist/check/:address

Check if address is blacklisted.

**Response:**
```json
{
  "address": "3mNb...",
  "isBlacklisted": true,
  "reason": "OFAC sanctions match",
  "addedAt": "2026-01-15T11:45:00Z",
  "addedBy": "9zYp..."
}
```

#### GET /blacklist/list

List all blacklisted addresses.

**Query Parameters:**
- `limit` - Max results
- `offset` - Pagination offset

**Response:**
```json
{
  "blacklist": [
    {
      "address": "3mNb...",
      "reason": "OFAC sanctions match",
      "addedAt": "2026-01-15T11:45:00Z",
      "addedBy": "9zYp..."
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

#### POST /seize

Seize tokens from account.

**Request:**
```json
{
  "frozenAccount": "...",
  "destination": "...",
  "reason": "Sanctions enforcement"
}
```

**Response:**
```json
{
  "success": true,
  "from": "...",
  "to": "...",
  "amount": 500000000,
  "timestamp": "2026-01-15T12:00:00Z",
  "txSignature": "2nMk..."
}
```

#### GET /audit-log

Get compliance audit log.

**Query Parameters:**
- `action` - Filter by action type
- `address` - Filter by address
- `from` - Start timestamp
- `to` - End timestamp
- `limit` - Max results
- `offset` - Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123",
      "action": "blacklist_add",
      "address": "3mNb...",
      "reason": "OFAC sanctions match",
      "performedBy": "9zYp...",
      "timestamp": "2026-01-15T11:45:00Z",
      "txSignature": "8pLq...",
      "metadata": {
        "sanctionsList": "SDN"
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### GET /audit-log/export

Export audit log.

**Query Parameters:**
- `format` - Export format (csv, json, pdf)
- `from` - Start timestamp
- `to` - End timestamp

**Response:**
- CSV: `text/csv`
- JSON: `application/json`
- PDF: `application/pdf`

### 4. Webhook Service

Port: 3004

#### POST /webhooks/register

Register a webhook endpoint.

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["mint", "burn", "blacklist"],
  "secret": "your_webhook_secret"
}
```

**Response:**
```json
{
  "webhookId": "wh_abc123",
  "url": "https://your-app.com/webhook",
  "events": ["mint", "burn", "blacklist"],
  "createdAt": "2026-01-15T10:00:00Z",
  "status": "active"
}
```

#### DELETE /webhooks/:webhookId

Delete a webhook.

**Response:**
```json
{
  "success": true,
  "webhookId": "wh_abc123",
  "deletedAt": "2026-01-15T12:00:00Z"
}
```

#### GET /webhooks/list

List all webhooks.

**Response:**
```json
{
  "webhooks": [
    {
      "webhookId": "wh_abc123",
      "url": "https://your-app.com/webhook",
      "events": ["mint", "burn"],
      "status": "active",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### GET /webhooks/:webhookId/deliveries

Get webhook delivery history.

**Response:**
```json
{
  "deliveries": [
    {
      "id": "del_123",
      "event": "mint",
      "status": "delivered",
      "attempts": 1,
      "timestamp": "2026-01-15T10:30:00Z",
      "responseCode": 200
    }
  ],
  "total": 100
}
```

## Webhook Payload Format

When an event occurs, the webhook service sends a POST request to your registered URL:

```json
{
  "webhookId": "wh_abc123",
  "event": "mint",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "stablecoin": "...",
    "recipient": "...",
    "amount": 1000000000,
    "minter": "...",
    "txSignature": "5jKm..."
  },
  "signature": "sha256_hmac_signature"
}
```

### Webhook Signature Verification

```typescript
import crypto from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid recipient address",
    "details": {
      "field": "recipient",
      "reason": "Invalid public key format"
    }
  }
}
```

### Error Codes

- `INVALID_REQUEST` - Invalid request parameters
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limits

- **Default:** 100 requests per minute per API key
- **Burst:** 20 requests per second
- **Headers:**
  - `X-RateLimit-Limit` - Request limit
  - `X-RateLimit-Remaining` - Remaining requests
  - `X-RateLimit-Reset` - Reset timestamp

## Health Checks

Each service exposes a health check endpoint:

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "mint-burn-service",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-01-15T12:00:00Z"
}
```

## Environment Variables

```bash
# Mint/Burn Service
MINT_BURN_PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=SSS1Core11111111111111111111111111111111111
MINTER_KEYPAIR_PATH=/keys/minter.json

# Indexer Service
INDEXER_PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/sss
WEBSOCKET_URL=wss://api.devnet.solana.com

# Compliance Service
COMPLIANCE_PORT=3003
SANCTIONS_API_KEY=your_api_key
AUDIT_LOG_PATH=/data/audit

# Webhook Service
WEBHOOK_PORT=3004
REDIS_URL=redis://localhost:6379
MAX_RETRY_ATTEMPTS=3
```

## Docker Deployment

```bash
# Start all services
docker compose up

# Start specific service
docker compose up mint-burn-service

# View logs
docker compose logs -f indexer-service
```

## SDK Integration

```typescript
import { SSSBackendClient } from "@stbr/sss-backend-client";

const client = new SSSBackendClient({
  baseUrl: "http://localhost:3000",
  apiKey: "your_api_key",
});

// Request mint
const mintRequest = await client.mint.request({
  recipient: recipientAddress,
  amount: 1_000_000_000,
  reference: "order-123",
});

// Check status
const status = await client.mint.getStatus(mintRequest.requestId);

// Query events
const events = await client.indexer.getEvents({
  type: "mint",
  limit: 10,
});
```

## Support

For API support:
- GitHub: Open an issue
- Discord: discord.gg/superteambrasil
- Email: api@superteam.fun
