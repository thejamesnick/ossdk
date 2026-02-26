# SSS-2: Compliant Stablecoin Standard

## Overview

SSS-2 is the compliant stablecoin standard for Solana. It extends SSS-1 with regulatory compliance features: permanent delegate, transfer hook, and blacklist enforcement.

## Use Cases

- Regulated stablecoins (USDC/USDT-class)
- Institutional stablecoins
- Stablecoins requiring regulatory compliance
- Tokens subject to sanctions enforcement
- Public-facing stablecoins

## Features

### All SSS-1 Features
- ✅ Mint tokens
- ✅ Burn tokens
- ✅ Freeze/thaw accounts
- ✅ Metadata (name, symbol, URI)
- ✅ Role-based access control
- ✅ Per-minter quotas
- ✅ Emergency pause

### Additional SSS-2 Features
- ✅ Permanent delegate (token seizure)
- ✅ Transfer hook (automatic enforcement)
- ✅ Blacklist management
- ✅ On-chain blacklist enforcement
- ✅ Compliance audit trail
- ✅ Sanctions screening integration points

## Compliance Model

SSS-2 uses **proactive compliance**:
- Automatic transfer restrictions via transfer hook
- Every transfer checked against blacklist
- No gaps in enforcement
- Token seizure capability
- Complete audit trail

## Technical Specification

### Initialization Parameters

```rust
pub struct StablecoinConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub enable_permanent_delegate: true,   // SSS-2: enabled
    pub enable_transfer_hook: true,        // SSS-2: enabled
    pub default_account_frozen: false,     // Optional
}
```

### Token-2022 Extensions

SSS-2 uses these Token-2022 extensions:
- **Metadata Extension:** Name, symbol, URI
- **Freeze Authority:** Can freeze/thaw accounts
- **Mint Authority:** Can mint new tokens
- **Permanent Delegate:** Can seize tokens from any account
- **Transfer Hook:** Enforces blacklist on every transfer

### Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| Master Authority | All operations | Full control over stablecoin |
| Minter | Mint up to quota | Can mint tokens within quota |
| Burner | Burn own tokens | Any token holder can burn |
| Blacklister | Manage blacklist | Add/remove addresses from blacklist |
| Pauser | Pause/unpause | Emergency stop mechanism |
| Seizer | Seize tokens | Can seize tokens via permanent delegate |

### Instructions

#### Core Operations (from SSS-1)
- `initialize` - Create new stablecoin
- `mint` - Mint tokens to recipient
- `burn` - Burn tokens from account
- `freeze_account` - Freeze token account
- `thaw_account` - Unfreeze token account
- `pause` - Emergency pause all operations
- `unpause` - Resume operations
- `update_minter` - Add/update minter with quota
- `transfer_authority` - Transfer master authority

#### SSS-2 Compliance Operations
- `add_to_blacklist` - Add address to blacklist
- `remove_from_blacklist` - Remove address from blacklist
- `seize` - Seize tokens via permanent delegate

### Transfer Hook Program

Separate program that enforces blacklist on every transfer:

```rust
pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
    // Check if source is blacklisted
    if !ctx.accounts.source_blacklist.data_is_empty() {
        return err!(ErrorCode::AddressBlacklisted);
    }
    
    // Check if destination is blacklisted
    if !ctx.accounts.destination_blacklist.data_is_empty() {
        return err!(ErrorCode::AddressBlacklisted);
    }
    
    Ok(())
}
```

## Implementation Guide

### 1. Using CLI

```bash
# Initialize SSS-2 stablecoin
sss-token init --preset sss-2 \
  --name "Compliant USD" \
  --symbol "CUSD" \
  --decimals 6

# Add minter
sss-token minters add <MINTER_ADDRESS> --quota 10000000000

# Mint tokens
sss-token mint <RECIPIENT> 1000000000

# Add to blacklist
sss-token blacklist add <ADDRESS> --reason "OFAC sanctions"

# Seize tokens from blacklisted account
sss-token seize <FROZEN_ACCOUNT> --to <TREASURY>
```

### 2. Using TypeScript SDK

```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Create SSS-2 stablecoin
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Compliant USD",
  symbol: "CUSD",
  decimals: 6,
  authority: authorityKeypair,
});

// Mint tokens
await stable.mint({
  recipient: recipientAddress,
  amount: 1_000_000_000,
  minter: minterKeypair,
});

// Add to blacklist
await stable.compliance.blacklistAdd(
  targetAddress,
  "OFAC sanctions match",
  { authority: authorityKeypair }
);

// Attempt transfer will fail if blacklisted
// Transfer hook automatically enforces

// Seize tokens
await stable.compliance.seize({
  frozenAccount: frozenTokenAccount,
  destination: treasuryAccount,
  authority: authorityKeypair,
});
```

## Compliance Workflows

### Blacklist Enforcement Flow

```
1. Sanctions screening identifies address
2. Operator adds address to blacklist
3. Transfer hook enforces on all future transfers
4. Existing tokens can be seized if needed
5. Audit trail records all actions
```

### Token Seizure Flow

```
1. Address is blacklisted
2. Freeze account (optional, for safety)
3. Execute seize instruction
4. Tokens transferred to treasury
5. Event emitted for audit trail
```

## Security Considerations

### Access Control
- Separate keys for different roles
- Blacklister role separate from minter
- Seizer role requires explicit permission
- All actions logged for audit

### Best Practices
- Document all blacklist additions
- Coordinate with legal team
- Regular compliance reviews
- Test on devnet first
- Maintain comprehensive audit trail

### Regulatory Alignment

SSS-2 aligns with:
- **GENIUS Act** requirements
- **OFAC** sanctions enforcement
- **FinCEN** AML/CTF requirements
- **MiCA** (EU) compliance framework

## Comparison with SSS-1

| Feature | SSS-1 | SSS-2 |
|---------|-------|-------|
| Complexity | Low | Medium |
| Compliance | Reactive | Proactive |
| Transfer Restrictions | Manual freeze | Automatic blacklist |
| Token Seizure | ❌ | ✅ |
| Regulatory Fit | Low | High |
| Operational Overhead | Low | Medium |
| Use Case | Internal/Simple | Regulated/Public |
| Transfer Hook | ❌ | ✅ |
| Permanent Delegate | ❌ | ✅ |

## When to Use SSS-2

✅ **Use SSS-2 when:**
- Building regulated stablecoin
- Need automatic blacklist enforcement
- Require token seizure capability
- Subject to OFAC sanctions
- Building USDC/USDT-class stablecoin
- Institutional requirements

❌ **Don't use SSS-2 when:**
- No regulatory requirements
- Want maximum simplicity
- Internal use only
- Reactive compliance sufficient

## Compliance Service Integration

### Sanctions Screening

```typescript
// Example integration with sanctions screening service
const screeningResult = await sanctionsAPI.screen(address);

if (screeningResult.isMatch) {
  await stable.compliance.blacklistAdd(
    address,
    `OFAC match: ${screeningResult.matchDetails}`,
    { authority: complianceKeypair }
  );
}
```

### Transaction Monitoring

```typescript
// Monitor all transactions
stable.on("transfer", async (event) => {
  // Log for compliance
  await complianceDB.logTransaction({
    from: event.source,
    to: event.destination,
    amount: event.amount,
    timestamp: event.timestamp,
  });
  
  // Check for suspicious patterns
  if (await isSuspicious(event)) {
    await alertComplianceTeam(event);
  }
});
```

### Audit Trail Export

```bash
# Export audit trail for regulators
sss-token audit-log --export audit-trail.csv --format csv

# Export specific date range
sss-token audit-log --from 2026-01-01 --to 2026-12-31 --export annual-audit.pdf
```

## Examples

### Example 1: Institutional Stablecoin

```typescript
// Create institutional-grade stablecoin
const institutional = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,
  name: "Institutional USD",
  symbol: "IUSD",
  decimals: 6,
  authority: institutionMultisig,
});

// Setup compliance team
await institutional.addRole({
  address: complianceTeam,
  role: "blacklister",
  authority: institutionMultisig,
});

// Setup treasury for seized tokens
await institutional.addRole({
  address: treasuryTeam,
  role: "seizer",
  authority: institutionMultisig,
});
```

### Example 2: Sanctions Enforcement

```typescript
// Automated sanctions enforcement
async function enforceSanctions(address: PublicKey) {
  // Screen against OFAC list
  const isOnSanctionsList = await checkOFAC(address);
  
  if (isOnSanctionsList) {
    // Add to blacklist
    await stable.compliance.blacklistAdd(
      address,
      "OFAC SDN List match",
      { authority: complianceKeypair }
    );
    
    // Freeze existing account
    const tokenAccount = await getTokenAccount(address);
    await stable.freeze({
      account: tokenAccount,
      authority: complianceKeypair,
    });
    
    // Seize tokens
    await stable.compliance.seize({
      frozenAccount: tokenAccount,
      destination: treasuryAccount,
      authority: complianceKeypair,
    });
    
    // Notify compliance team
    await notifyCompliance({
      action: "sanctions_enforcement",
      address: address.toString(),
      timestamp: Date.now(),
    });
  }
}
```

## Regulatory Considerations

See [COMPLIANCE.md](./COMPLIANCE.md) for detailed regulatory guidance.

### Key Requirements

- **Reserve Backing:** Maintain 1:1 reserves
- **Audit Trail:** Complete transaction history
- **Sanctions Compliance:** OFAC enforcement
- **AML/CTF:** Know Your Customer (KYC)
- **Reporting:** Regular regulatory reports

## Resources

- [SDK Documentation](./SDK.md)
- [Operations Guide](./OPERATIONS.md)
- [Compliance Guide](./COMPLIANCE.md)
- [Architecture](./ARCHITECTURE.md)
- [GENIUS Act](https://www.congress.gov/bill/118th-congress/house-bill/4766)
- [Token-2022 Extensions](https://spl.solana.com/token-2022)

## License

MIT
