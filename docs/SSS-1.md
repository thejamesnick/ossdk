# SSS-1: Minimal Stablecoin Standard

## Overview

SSS-1 is the minimal stablecoin standard for Solana. It provides the essential features needed for any stablecoin: minting, burning, freezing, and metadata — nothing more.

## Use Cases

- Internal tokens for organizations
- DAO treasury tokens
- Ecosystem settlement tokens
- Simple stablecoins without regulatory requirements
- Testing and development

## Features

### Core Capabilities
- ✅ Mint tokens
- ✅ Burn tokens
- ✅ Freeze/thaw accounts
- ✅ Metadata (name, symbol, URI)
- ✅ Role-based access control
- ✅ Per-minter quotas
- ✅ Emergency pause

### What's NOT Included
- ❌ Permanent delegate
- ❌ Transfer hook
- ❌ Blacklist enforcement
- ❌ Token seizure
- ❌ Confidential transfers

## Compliance Model

SSS-1 uses **reactive compliance**:
- Freeze accounts as needed
- No automatic transfer restrictions
- Simpler, more flexible
- Lower operational overhead

## Technical Specification

### Initialization Parameters

```rust
pub struct StablecoinConfig {
    pub name: String,              // Token name
    pub symbol: String,            // Token symbol
    pub uri: String,               // Metadata URI
    pub decimals: u8,              // Token decimals (typically 6)
    pub enable_permanent_delegate: false,  // SSS-1: disabled
    pub enable_transfer_hook: false,       // SSS-1: disabled
    pub default_account_frozen: false,     // SSS-1: disabled
}
```

### Token-2022 Extensions

SSS-1 uses these Token-2022 extensions:
- **Metadata Extension:** Name, symbol, URI
- **Freeze Authority:** Can freeze/thaw accounts
- **Mint Authority:** Can mint new tokens

### Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| Master Authority | All operations | Full control over stablecoin |
| Minter | Mint up to quota | Can mint tokens within quota |
| Burner | Burn own tokens | Any token holder can burn |
| Pauser | Pause/unpause | Emergency stop mechanism |

### Instructions

#### Core Operations
- `initialize` - Create new stablecoin
- `mint` - Mint tokens to recipient
- `burn` - Burn tokens from account
- `freeze_account` - Freeze token account
- `thaw_account` - Unfreeze token account
- `pause` - Emergency pause all operations
- `unpause` - Resume operations

#### Management
- `update_minter` - Add/update minter with quota
- `transfer_authority` - Transfer master authority

## Implementation Guide

### 1. Using CLI

```bash
# Initialize SSS-1 stablecoin
sss-token init --preset sss-1 \
  --name "My Stablecoin" \
  --symbol "MYUSD" \
  --decimals 6

# Add minter
sss-token minters add <MINTER_ADDRESS> --quota 10000000000

# Mint tokens
sss-token mint <RECIPIENT> 1000000000

# Freeze account if needed
sss-token freeze <TOKEN_ACCOUNT>
```

### 2. Using TypeScript SDK

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Create SSS-1 stablecoin
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "My Stablecoin",
  symbol: "MYUSD",
  decimals: 6,
  authority: authorityKeypair,
});

// Add minter
await stable.addMinter({
  minter: minterAddress,
  quota: 10_000_000_000,
  authority: authorityKeypair,
});

// Mint tokens
await stable.mint({
  recipient: recipientAddress,
  amount: 1_000_000_000,
  minter: minterKeypair,
});

// Freeze account if needed
await stable.freeze({
  account: tokenAccount,
  authority: authorityKeypair,
});
```

### 3. Using Anchor (Direct)

```rust
// Initialize
let config = StablecoinConfig {
    name: "My Stablecoin".to_string(),
    symbol: "MYUSD".to_string(),
    uri: "https://example.com/metadata.json".to_string(),
    decimals: 6,
    enable_permanent_delegate: false,
    enable_transfer_hook: false,
    default_account_frozen: false,
};

program.methods()
    .initialize(config)
    .accounts(/* ... */)
    .rpc()?;
```

## Security Considerations

### Access Control
- Master authority has full control
- Minters limited by quotas
- Freeze authority can stop individual accounts
- Pause mechanism for emergencies

### Best Practices
- Use hardware wallet for master authority
- Set conservative minter quotas
- Monitor minting activity
- Regular security audits
- Test on devnet first

## Comparison with SSS-2

| Feature | SSS-1 | SSS-2 |
|---------|-------|-------|
| Complexity | Low | Medium |
| Compliance | Reactive | Proactive |
| Transfer Restrictions | Manual freeze | Automatic blacklist |
| Token Seizure | ❌ | ✅ |
| Regulatory Fit | Low | High |
| Operational Overhead | Low | Medium |
| Use Case | Internal/Simple | Regulated/Public |

## When to Use SSS-1

✅ **Use SSS-1 when:**
- Building internal tokens
- No regulatory requirements
- Want simplicity and flexibility
- Reactive compliance is sufficient
- Lower operational overhead preferred

❌ **Don't use SSS-1 when:**
- Need regulatory compliance
- Require automatic blacklist enforcement
- Need token seizure capability
- Building USDC/USDT-class stablecoin

## Migration Path

### Upgrading to SSS-2

SSS-1 stablecoins cannot be upgraded to SSS-2. The compliance features must be enabled at initialization.

To migrate:
1. Create new SSS-2 stablecoin
2. Implement token swap mechanism
3. Migrate users gradually
4. Deprecate SSS-1 token

## Examples

### Example 1: DAO Treasury Token

```typescript
// Create DAO treasury stablecoin
const daoToken = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "DAO Treasury USD",
  symbol: "DAOUSD",
  decimals: 6,
  authority: daoMultisig,
});

// DAO can mint for treasury operations
await daoToken.mint({
  recipient: treasuryAccount,
  amount: 1_000_000_000_000, // 1M DAOUSD
  minter: daoMultisig,
});
```

### Example 2: Ecosystem Settlement Token

```typescript
// Create settlement token for ecosystem
const settlement = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_1,
  name: "Ecosystem Settlement",
  symbol: "ESUSD",
  decimals: 6,
  authority: ecosystemAuthority,
});

// Add multiple minters for different services
await settlement.addMinter({
  minter: service1,
  quota: 10_000_000_000,
  authority: ecosystemAuthority,
});

await settlement.addMinter({
  minter: service2,
  quota: 5_000_000_000,
  authority: ecosystemAuthority,
});
```

## Resources

- [SDK Documentation](./SDK.md)
- [Operations Guide](./OPERATIONS.md)
- [Architecture](./ARCHITECTURE.md)
- [Token-2022 Extensions](https://spl.solana.com/token-2022)

## License

MIT
