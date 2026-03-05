# SSS Test Suite

Comprehensive test suite for the Solana Stablecoin Standard.

## Test Structure

```
tests/
├── cli/                    # CLI command tests
│   ├── cli-init.test.ts
│   ├── cli-mint-burn.test.ts
│   ├── cli-freeze-thaw.test.ts
│   ├── cli-pause-unpause.test.ts
│   ├── cli-blacklist.test.ts
│   ├── cli-seize.test.ts
│   └── cli-minters.test.ts
├── integration/            # Full flow integration tests
│   ├── sss-1-integration.test.ts
│   └── sss-2-integration.test.ts
└── SERVICE_TESTING.md     # Service testing guide
```

## Setup

```bash
cd tests
yarn install
```

## Running Tests

### All Tests
```bash
yarn test
```

### CLI Tests Only
```bash
yarn test:cli
```

### Integration Tests Only
```bash
yarn test:integration
```

### SSS-1 Integration Test
```bash
yarn test:sss1
```

### SSS-2 Integration Test
```bash
yarn test:sss2
```

## Test Coverage

### CLI Tests (7 test files)
- **cli-init.test.ts** - Stablecoin initialization with presets
- **cli-mint-burn.test.ts** - Minting and burning tokens
- **cli-freeze-thaw.test.ts** - Account freezing and thawing
- **cli-pause-unpause.test.ts** - Emergency pause/unpause
- **cli-blacklist.test.ts** - Blacklist management (SSS-2)
- **cli-seize.test.ts** - Token seizure (SSS-2)
- **cli-minters.test.ts** - Minter management and quotas

### Integration Tests (2 test files)

#### SSS-1 Integration Test
Full flow for minimal stablecoin:
1. Initialize SSS-1 stablecoin
2. Add minter with quota
3. Mint tokens to multiple users
4. Check total supply
5. Freeze and thaw accounts
6. Burn tokens
7. Verify supply changes
8. Pause and unpause operations

#### SSS-2 Integration Test
Full compliance flow:
1. Initialize SSS-2 stablecoin
2. Add minter with quota
3. Mint tokens to users
4. Add address to blacklist
5. Verify blacklist status
6. Freeze blacklisted account
7. Seize tokens to treasury
8. Verify supply unchanged
9. Remove from blacklist
10. Burn tokens
11. Verify final supply

## Requirements

- Node.js 18+
- Solana devnet access
- SOL for transaction fees (tests request airdrops)

## Notes

- Tests run on Solana devnet
- Each test generates new keypairs
- Airdrops are requested automatically
- Tests have 5-minute timeout for devnet latency
- All tests are independent and can run in parallel

## Troubleshooting

### Airdrop Failures
If airdrops fail on devnet:
```bash
# Use a local validator instead
solana-test-validator
```

Then update connection in tests to:
```typescript
const connection = new Connection('http://localhost:8899', 'confirmed');
```

### Timeout Errors
Increase timeout in test files:
```typescript
this.timeout(120000); // 2 minutes
```

### RPC Rate Limits
Use a private RPC endpoint:
```typescript
const connection = new Connection('YOUR_RPC_URL', 'confirmed');
```
