# Operations Guide

## Operator Runbook

This guide covers common operational tasks for managing a Solana stablecoin using the SSS standard.

## Prerequisites

- `sss-token` CLI installed
- Wallet with authority permissions
- Network access (devnet/mainnet)

## Initial Setup

### 1. Initialize Stablecoin

#### SSS-1 (Minimal)
```bash
sss-token init --preset sss-1 \
  --name "My Stablecoin" \
  --symbol "MYUSD" \
  --decimals 6 \
  --authority ~/.config/solana/id.json
```

#### SSS-2 (Compliant)
```bash
sss-token init --preset sss-2 \
  --name "Compliant USD" \
  --symbol "CUSD" \
  --decimals 6 \
  --authority ~/.config/solana/id.json
```

#### Custom Configuration
```bash
sss-token init --custom config.toml
```

Example `config.toml`:
```toml
name = "Custom Stable"
symbol = "CSTB"
decimals = 6
enable_permanent_delegate = true
enable_transfer_hook = false
default_account_frozen = false
```

### 2. Add Minters

```bash
sss-token minters add <MINTER_ADDRESS> --quota 10000000000
```

## Daily Operations

### Minting Tokens

```bash
# Mint to specific recipient
sss-token mint <RECIPIENT_ADDRESS> <AMOUNT>

# Example: Mint 1000 MYUSD
sss-token mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000000000
```

### Burning Tokens

```bash
# Burn from your account
sss-token burn <AMOUNT>

# Example: Burn 500 MYUSD
sss-token burn 500000000
```

### Checking Status

```bash
# View stablecoin configuration and stats
sss-token status

# Check total supply
sss-token supply
```

## Account Management

### Freezing Accounts

```bash
# Freeze a token account
sss-token freeze <TOKEN_ACCOUNT_ADDRESS>
```

### Thawing Accounts

```bash
# Unfreeze a token account
sss-token thaw <TOKEN_ACCOUNT_ADDRESS>
```

### Listing Holders

```bash
# List all holders
sss-token holders

# List holders with minimum balance
sss-token holders --min-balance 1000000000
```

## Minter Management

### List Minters

```bash
sss-token minters list
```

### Add Minter

```bash
sss-token minters add <MINTER_ADDRESS> --quota <AMOUNT>
```

### Remove Minter

```bash
sss-token minters remove <MINTER_ADDRESS>
```

### Update Minter Quota

```bash
sss-token minters update <MINTER_ADDRESS> --quota <NEW_AMOUNT>
```

## Compliance Operations (SSS-2 Only)

### Blacklist Management

#### Add to Blacklist
```bash
sss-token blacklist add <ADDRESS> --reason "OFAC sanctions match"
```

#### Remove from Blacklist
```bash
sss-token blacklist remove <ADDRESS>
```

#### List Blacklisted Addresses
```bash
sss-token blacklist list
```

### Token Seizure

```bash
sss-token seize <FROZEN_ACCOUNT> --to <TREASURY_ACCOUNT>
```

### Audit Log

```bash
# View all audit logs
sss-token audit-log

# Filter by action type
sss-token audit-log --action mint
sss-token audit-log --action blacklist
sss-token audit-log --action seize
```

## Emergency Procedures

### Pause All Operations

```bash
sss-token pause
```

This immediately stops:
- Minting
- Burning
- Transfers (if transfer hook enabled)

### Unpause Operations

```bash
sss-token unpause
```

### Transfer Authority

```bash
sss-token transfer-authority <NEW_AUTHORITY_ADDRESS>
```

⚠️ **Warning:** This is irreversible. Ensure the new authority address is correct.

## Monitoring

### Real-time Monitoring

```bash
# Watch for events (requires indexer service)
sss-token watch
```

### Check Minter Quotas

```bash
sss-token minters list
```

Look for minters approaching their quota limits.

### Review Recent Transactions

```bash
sss-token audit-log --limit 100
```

## Troubleshooting

### Mint Fails: "Quota Exceeded"

**Problem:** Minter has reached their quota limit.

**Solution:**
```bash
sss-token minters update <MINTER_ADDRESS> --quota <HIGHER_AMOUNT>
```

### Mint Fails: "Contract Paused"

**Problem:** Stablecoin is in paused state.

**Solution:**
```bash
sss-token unpause
```

### Transfer Fails: "Address Blacklisted"

**Problem:** Source or destination is on blacklist (SSS-2).

**Solution:**
```bash
# Check blacklist status
sss-token blacklist list

# Remove if appropriate
sss-token blacklist remove <ADDRESS>
```

### "Insufficient Funds" Error

**Problem:** Not enough SOL for transaction fees.

**Solution:** Add SOL to your wallet.

### "Unauthorized" Error

**Problem:** Wallet doesn't have required permissions.

**Solution:** Ensure you're using the correct authority wallet.

## Best Practices

### Security
- Keep authority keys in hardware wallet or secure key management system
- Use separate keys for different roles (minter, blacklister, etc.)
- Regularly rotate minter keys
- Monitor audit logs daily

### Operations
- Set conservative minter quotas
- Review blacklist additions before executing
- Test operations on devnet first
- Keep backup of all configuration

### Compliance (SSS-2)
- Document all blacklist additions with clear reasons
- Maintain audit trail exports
- Regular compliance reviews
- Coordinate with legal team before seizures

## Configuration Files

### Wallet Configuration

```bash
# Set default wallet
solana config set --keypair ~/.config/solana/id.json

# Set network
solana config set --url devnet
solana config set --url mainnet-beta
```

### Environment Variables

```bash
export SOLANA_RPC_URL="https://api.devnet.solana.com"
export SSS_PROGRAM_ID="SSS1Core11111111111111111111111111111111111"
export SSS_STABLECOIN_ADDRESS="<YOUR_STABLECOIN_ADDRESS>"
```

## Backup and Recovery

### Export Configuration

```bash
sss-token config export > stablecoin-config.json
```

### Export Audit Trail

```bash
sss-token audit-log --export audit-trail.csv
```

### Backup Minter List

```bash
sss-token minters list --export minters.json
```

## Support

For issues or questions:
- GitHub: Open an issue
- Discord: discord.gg/superteambrasil
- Twitter: @SuperteamBR
