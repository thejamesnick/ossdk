# @stbr/sss-token

TypeScript SDK for Solana Stablecoin Standard

## Installation

```bash
yarn add @stbr/sss-token
```

## Quick Start

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Connect to Solana
const connection = new Connection("https://api.devnet.solana.com");
const authority = Keypair.generate();

// Create a compliant stablecoin (SSS-2)
const stablecoin = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "My USD Coin",
  symbol: "MUSD",
  decimals: 6,
}, authority);

// Mint tokens
await stablecoin.mint({
  recipient: recipientPublicKey,
  amount: 1000000, // 1 MUSD (6 decimals)
  minter: minterPublicKey,
});

// Compliance features (SSS-2 only)
await stablecoin.compliance.blacklistAdd({
  address: badActorPublicKey,
  reason: "OFAC sanctions match",
});

await stablecoin.compliance.seize({
  from: frozenAccount,
  to: treasuryAccount,
  amount: 1000000,
});
```

## Presets

### SSS-1: Minimal Stablecoin
Basic features for simple use cases:
- Mint/burn
- Freeze/thaw
- Role management
- Emergency pause

```typescript
const stablecoin = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "DAO Token",
  symbol: "DAO",
}, authority);
```

### SSS-2: Compliant Stablecoin
Full compliance features for regulated stablecoins:
- All SSS-1 features
- Automatic blacklist enforcement
- Token seizure capability
- Full audit trail

```typescript
const stablecoin = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Compliant USD",
  symbol: "CUSD",
}, authority);
```

## API Reference

### Core Operations

#### `mint(options)`
Mint new tokens to a recipient.

```typescript
await stablecoin.mint({
  recipient: PublicKey,
  amount: number | BN,
  minter: PublicKey,
});
```

#### `burn(options)`
Burn tokens from an account.

```typescript
await stablecoin.burn({
  amount: number | BN,
  owner: PublicKey,
});
```

#### `freeze(account)`
Freeze a token account.

```typescript
await stablecoin.freeze(tokenAccountPublicKey);
```

#### `thaw(account)`
Unfreeze a token account.

```typescript
await stablecoin.thaw(tokenAccountPublicKey);
```

#### `pause()`
Emergency pause all operations.

```typescript
await stablecoin.pause();
```

#### `unpause()`
Resume operations after pause.

```typescript
await stablecoin.unpause();
```

### Minter Management

#### `updateMinter(options)`
Add or update a minter with quota.

```typescript
await stablecoin.updateMinter({
  minter: PublicKey,
  quota: 1000000000, // 1000 tokens
  isActive: true,
});
```

#### `getMinter(minter)`
Get minter account data.

```typescript
const minterData = await stablecoin.getMinter(minterPublicKey);
console.log(minterData.quota, minterData.mintedAmount);
```

### Compliance Module (SSS-2 only)

#### `compliance.blacklistAdd(options)`
Add address to blacklist.

```typescript
await stablecoin.compliance.blacklistAdd({
  address: PublicKey,
  reason: "OFAC sanctions",
});
```

#### `compliance.blacklistRemove(address)`
Remove address from blacklist.

```typescript
await stablecoin.compliance.blacklistRemove(address);
```

#### `compliance.isBlacklisted(address)`
Check if address is blacklisted.

```typescript
const isBlacklisted = await stablecoin.compliance.isBlacklisted(address);
```

#### `compliance.seize(options)`
Seize tokens from an account.

```typescript
await stablecoin.compliance.seize({
  from: PublicKey,
  to: PublicKey,
  amount: number | BN,
});
```

### Query Methods

#### `getAccount()`
Get stablecoin configuration.

```typescript
const config = await stablecoin.getAccount();
console.log(config.name, config.symbol, config.isPaused);
```

#### `getTotalSupply()`
Get current total supply.

```typescript
const supply = await stablecoin.getTotalSupply();
console.log(`Total supply: ${supply}`);
```

## License

MIT
