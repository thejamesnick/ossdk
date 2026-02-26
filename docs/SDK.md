# SDK Guide

## Installation

```bash
npm install @stbr/sss-token
```

## Quick Start

### Using Presets

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const authority = Keypair.generate();

// Create SSS-1 (Minimal) stablecoin
const minimal = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority,
});

// Create SSS-2 (Compliant) stablecoin
const compliant = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Compliant USD",
  symbol: "CUSD",
  decimals: 6,
  authority,
});
```

### Custom Configuration

```typescript
const custom = await SolanaStablecoin.create(connection, {
  name: "Custom Stable",
  symbol: "CSTB",
  decimals: 6,
  authority,
  extensions: {
    permanentDelegate: true,
    transferHook: false,
    defaultAccountFrozen: false,
  },
});
```

## Core Operations

### Minting Tokens

```typescript
await stable.mint({
  recipient: recipientAddress,
  amount: 1_000_000, // 1 MYUSD (6 decimals)
  minter: minterKeypair,
});
```

### Burning Tokens

```typescript
await stable.burn({
  amount: 500_000, // 0.5 MYUSD
  owner: ownerKeypair,
});
```

### Freezing Accounts

```typescript
await stable.freeze({
  account: targetTokenAccount,
  authority: authorityKeypair,
});
```

### Thawing Accounts

```typescript
await stable.thaw({
  account: targetTokenAccount,
  authority: authorityKeypair,
});
```

### Pausing Operations

```typescript
await stable.pause({ authority: authorityKeypair });
await stable.unpause({ authority: authorityKeypair });
```

## Role Management

### Adding Minters

```typescript
await stable.addMinter({
  minter: minterAddress,
  quota: 10_000_000_000, // 10,000 MYUSD
  authority: authorityKeypair,
});
```

### Removing Minters

```typescript
await stable.removeMinter({
  minter: minterAddress,
  authority: authorityKeypair,
});
```

### Updating Minter Quota

```typescript
await stable.updateMinterQuota({
  minter: minterAddress,
  newQuota: 20_000_000_000,
  authority: authorityKeypair,
});
```

## Compliance Operations (SSS-2)

### Blacklist Management

```typescript
// Add to blacklist
await stable.compliance.blacklistAdd(
  targetAddress,
  "OFAC sanctions match",
  { authority: authorityKeypair }
);

// Remove from blacklist
await stable.compliance.blacklistRemove(
  targetAddress,
  { authority: authorityKeypair }
);

// Check if blacklisted
const isBlacklisted = await stable.compliance.isBlacklisted(targetAddress);
```

### Token Seizure

```typescript
await stable.compliance.seize({
  frozenAccount: frozenTokenAccount,
  destination: treasuryAccount,
  authority: authorityKeypair,
});
```

## Query Methods

### Get Total Supply

```typescript
const supply = await stable.getTotalSupply();
console.log(`Total supply: ${supply}`);
```

### Get Configuration

```typescript
const config = await stable.getConfig();
console.log(config);
```

### Get Minter Info

```typescript
const minterInfo = await stable.getMinterInfo(minterAddress);
console.log(`Quota: ${minterInfo.quota}, Minted: ${minterInfo.minted_amount}`);
```

### List All Minters

```typescript
const minters = await stable.listMinters();
minters.forEach(m => {
  console.log(`${m.address}: ${m.quota} quota, ${m.minted} minted`);
});
```

### Get Token Holders

```typescript
const holders = await stable.getHolders({ minBalance: 1_000_000 });
holders.forEach(h => {
  console.log(`${h.address}: ${h.balance}`);
});
```

## Loading Existing Stablecoins

```typescript
const existing = await SolanaStablecoin.load(
  connection,
  stablecoinAddress,
  programId
);
```

## Preset Comparison

| Feature | SSS-1 | SSS-2 | SSS-3 |
|---------|-------|-------|-------|
| Mint/Burn | ✅ | ✅ | ✅ |
| Freeze/Thaw | ✅ | ✅ | ✅ |
| Metadata | ✅ | ✅ | ✅ |
| Role Management | ✅ | ✅ | ✅ |
| Permanent Delegate | ❌ | ✅ | ✅ |
| Transfer Hook | ❌ | ✅ | ❌ |
| Blacklist | ❌ | ✅ | ❌ |
| Token Seizure | ❌ | ✅ | ✅ |
| Confidential Transfers | ❌ | ❌ | ✅ |
| Allowlists | ❌ | ❌ | ✅ |

## Advanced Usage

### Custom RPC Endpoint

```typescript
const connection = new Connection("https://my-custom-rpc.com", {
  commitment: "confirmed",
});
```

### Transaction Options

```typescript
await stable.mint({
  recipient,
  amount,
  minter,
  options: {
    skipPreflight: false,
    commitment: "confirmed",
  },
});
```

### Event Listening

```typescript
stable.on("mint", (event) => {
  console.log(`Minted ${event.amount} to ${event.recipient}`);
});

stable.on("blacklist", (event) => {
  console.log(`Address ${event.address} blacklisted: ${event.reason}`);
});
```

## Error Handling

```typescript
try {
  await stable.mint({ recipient, amount, minter });
} catch (error) {
  if (error.code === 6002) {
    console.error("Contract is paused");
  } else if (error.code === 6003) {
    console.error("Minter quota exceeded");
  } else {
    console.error("Unknown error:", error);
  }
}
```

## TypeScript Types

```typescript
import type {
  StablecoinConfig,
  MinterInfo,
  BlacklistEntry,
  Preset,
} from "@stbr/sss-token";
```

## Examples

See the [examples](../examples/) directory for complete working examples:
- [Basic SSS-1 Usage](../examples/sss-1-basic.ts)
- [SSS-2 Compliance](../examples/sss-2-compliance.ts)
- [Custom Configuration](../examples/custom-config.ts)
- [Role Management](../examples/role-management.ts)
