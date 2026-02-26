# Architecture

## Overview

The Solana Stablecoin Standard (SSS) is built on a three-layer architecture that provides modularity, flexibility, and security.

## Layer Model

### Layer 1: Base SDK
- Token creation with Token-2022
- Mint authority management
- Freeze authority management
- Metadata support
- Role management program
- CLI and TypeScript SDK

### Layer 2: Modules
Composable pieces that add capabilities:

#### Compliance Module
- Transfer hook integration
- Blacklist PDAs
- Permanent delegate
- Token seizure

#### Privacy Module (SSS-3)
- Confidential transfers
- Scoped allowlists

### Layer 3: Standard Presets
Opinionated combinations of Layer 1 + Layer 2:

- **SSS-1:** Minimal Stablecoin (Base only)
- **SSS-2:** Compliant Stablecoin (Base + Compliance)
- **SSS-3:** Private Stablecoin (Base + Privacy)

## Data Flows

### Mint Flow
```
User Request → Mint Service → Verify → SDK.mint() → On-Chain Program → Event → Indexer → Webhook
```

### Compliance Flow (SSS-2)
```
Transfer Attempt → Transfer Hook → Blacklist Check → Allow/Deny → Event → Audit Log
```

### Burn Flow
```
User Request → Burn Service → Verify → SDK.burn() → On-Chain Program → Event → Indexer
```

## PDA Derivations

### Stablecoin Account
```
seeds = [b"stablecoin", mint.key()]
```

### Minter Account
```
seeds = [b"minter", stablecoin.key(), minter.key()]
```

### Blacklist Entry
```
seeds = [b"blacklist", stablecoin.key(), address.key()]
```

## Security Model

### Access Control
- Master authority: Full control
- Minter: Can mint up to quota
- Burner: Can burn own tokens
- Blacklister (SSS-2): Can manage blacklist
- Pauser: Can pause/unpause
- Seizer (SSS-2): Can seize tokens

### Feature Gating
SSS-2 instructions fail gracefully if compliance module not enabled during initialization.

### Audit Trail
All operations emit events for off-chain indexing and audit trail generation.

## Account Structures

### Stablecoin Account
```rust
pub struct Stablecoin {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
    pub is_paused: bool,
    pub total_minted: u64,
    pub total_burned: u64,
    pub bump: u8,
}
```

### Minter Account
```rust
pub struct MinterAccount {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub quota: u64,
    pub minted_amount: u64,
    pub is_active: bool,
    pub bump: u8,
}
```

### Blacklist Entry
```rust
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub reason: String,
    pub timestamp: i64,
    pub bump: u8,
}
```

## Program Architecture

### sss-core Program
Main stablecoin program with all core functionality.

### sss-transfer-hook Program
Separate program for transfer hook that enforces blacklist checks.

## Backend Architecture

### Services
- **Mint/Burn Service:** Coordinates fiat-to-stablecoin lifecycle
- **Indexer Service:** Monitors on-chain events
- **Compliance Service:** Manages blacklist and audit trails
- **Webhook Service:** Delivers event notifications

### Database Schema
TODO: Define schema for indexer and compliance services

## Security Considerations

- All operations use checked arithmetic
- PDA bumps stored, not recalculated
- Role-based access control enforced
- Feature gating prevents unauthorized access
- Emergency pause mechanism
- Audit trail for all operations

## Performance Considerations

- Efficient PDA derivations
- Minimal account sizes
- Optimized instruction data
- Batch operations support (future)

## Upgrade Strategy

TODO: Define upgrade path for programs and SDK
