# Solana Stablecoin Standard (SSS)

Open-source SDK and standards for building production-ready stablecoins on Solana.

## Overview

The Solana Stablecoin Standard is a modular SDK with opinionated presets covering the most common stablecoin architectures. Think OpenZeppelin for Solana stablecoins — the SDK is the library, the standards (SSS-1, SSS-2) are the presets.

## Standards

| Standard | Name | Description | Use Case |
|----------|------|-------------|----------|
| **SSS-1** | Minimal Stablecoin | Mint + freeze + metadata | Internal tokens, DAO treasuries, simple settlement |
| **SSS-2** | Compliant Stablecoin | SSS-1 + permanent delegate + transfer hook + blacklist | Regulated stablecoins (USDC/USDT-class) |
| **SSS-3** | Private Stablecoin | Confidential transfers + allowlists | Privacy-focused (experimental) |

## Quick Start

```bash
# Install CLI
npm install -g @stbr/sss-token

# Initialize with preset
sss-token init --preset sss-2 --name "My Stablecoin" --symbol "MYUSD"

# Operations
sss-token mint <recipient> <amount>
sss-token freeze <address>
sss-token blacklist add <address> --reason "OFAC match"
```

## TypeScript SDK

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Create with preset
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: adminKeypair,
});

// Operations
await stable.mint({ recipient, amount: 1_000_000, minter });
await stable.compliance.blacklistAdd(address, "Sanctions match");
await stable.compliance.seize(frozenAccount, treasury);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: Presets                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  SSS-1   │  │    SSS-2     │  │    SSS-3     │         │
│  │ Minimal  │  │  Compliant   │  │   Private    │         │
│  └──────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 2: Modules                          │
│  ┌────────────────────┐  ┌────────────────────┐           │
│  │ Compliance Module  │  │  Privacy Module    │           │
│  │ • Transfer Hook    │  │ • Confidential TX  │           │
│  │ • Blacklist        │  │ • Allowlists       │           │
│  │ • Permanent Del.   │  │                    │           │
│  └────────────────────┘  └────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 1: Base SDK                         │
│  • Token-2022 Creation  • Mint/Freeze Authority            │
│  • Metadata Support     • Role Management                   │
│  • CLI + TypeScript SDK                                     │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1 — Base SDK**
- Token creation with Token-2022
- Mint/freeze authority
- Metadata
- Role management

**Layer 2 — Modules**
- Compliance module (transfer hook, blacklist, permanent delegate)
- Privacy module (confidential transfers, allowlists)

**Layer 3 — Standard Presets**
- SSS-1: Minimal (base only)
- SSS-2: Compliant (base + compliance)
- SSS-3: Private (base + privacy)

## Features

- ✅ Token-2022 with configurable extensions
- ✅ Role-based access control (minter, burner, blacklister, pauser, seizer)
- ✅ Per-minter quotas
- ✅ Transfer hook for blacklist enforcement
- ✅ Permanent delegate for token seizure
- ✅ Emergency pause/unpause
- ✅ Audit trail and event logging
- ✅ Backend services (mint/burn, compliance, webhooks)
- ✅ Docker containerized

## Installation

```bash
# Clone repository
git clone https://github.com/solanabr/solana-stablecoin-standard
cd solana-stablecoin-standard

# Install dependencies
yarn install

# Build programs
anchor build

# Run tests
anchor test
```

## Running Backend Services

The backend services are Docker containerized for easy deployment.

### Prerequisites
- Docker and Docker Compose installed
- Copy `.env.example` to `.env` and configure

### Start All Services

```bash
# Start all backend services
docker compose up

# Or run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Services

The Docker setup includes:

- **Mint/Burn Service** (Port 3001) - Handles mint and burn requests
- **Indexer Service** (Port 3002) - Monitors on-chain events
- **Compliance Service** (Port 3003) - Manages blacklist and compliance
- **Webhook Service** (Port 3004) - Delivers event notifications
- **PostgreSQL** (Port 5432) - Database for indexer and compliance
- **Redis** (Port 6379) - Queue for webhook delivery

### Health Checks

```bash
curl http://localhost:3001/health  # Mint/Burn
curl http://localhost:3002/health  # Indexer
curl http://localhost:3003/health  # Compliance
curl http://localhost:3004/health  # Webhooks
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Layer model, data flows, security
- [SDK Guide](./docs/SDK.md) - TypeScript SDK usage
- [Operations](./docs/OPERATIONS.md) - Operator runbook
- [SSS-1 Spec](./docs/SSS-1.md) - Minimal stablecoin standard
- [SSS-2 Spec](./docs/SSS-2.md) - Compliant stablecoin standard
- [Compliance](./docs/COMPLIANCE.md) - Regulatory considerations
- [API Reference](./docs/API.md) - Backend API documentation

## Project Structure

```
solana-stablecoin-standard/
├── programs/
│   ├── sss-core/              # Main stablecoin program
│   └── sss-transfer-hook/     # Transfer hook for blacklist
├── sdk/
│   ├── core/                  # @stbr/sss-token
│   └── cli/                   # sss-token CLI
├── services/
│   ├── mint-burn/             # Mint/burn service
│   ├── compliance/            # Compliance service
│   ├── indexer/               # Event indexer
│   └── webhooks/              # Webhook service
├── tests/
│   ├── sss-1.ts              # SSS-1 tests
│   ├── sss-2.ts              # SSS-2 tests
│   └── integration.ts         # Integration tests
└── docs/                      # Documentation
```

## Program IDs

| Program | Devnet | Mainnet |
|---------|--------|---------|
| sss-core | `4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2` | TBD |
| sss-transfer-hook | `2pMqj2G5tEiCMoSyWHcoCX383q5ji2hZcVCDxSYiyHje` | TBD |

## Resources

- [Token-2022 Extensions](https://spl.solana.com/token-2022)
- [Permanent Delegate](https://spl.solana.com/token-2022/extensions#permanent-delegate)
- [Transfer Hook](https://spl.solana.com/token-2022/extensions#transfer-hook)
- [GENIUS Act Compliance](https://www.congress.gov/bill/118th-congress/house-bill/4766)
- [Solana Vault Standard](https://github.com/solanabr/solana-vault-standard)

## License

MIT

## Disclaimer

This software is provided "as is" without warranty. Not audited. Use at your own risk.
