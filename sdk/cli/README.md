# SSS CLI - Solana Stablecoin Standard CLI

Command-line interface for managing Solana stablecoins using the SSS-1 and SSS-2 standards.

## Installation

```bash
npm install -g @stbr/sss-cli
```

Or use with npx:

```bash
npx @stbr/sss-cli <command>
```

## Quick Start

### Initialize a Stablecoin

```bash
# SSS-1 (Minimal)
sss-token init --preset sss-1 --name "My Stablecoin" --symbol "MSC"

# SSS-2 (Compliant with blacklist)
sss-token init --preset sss-2 --name "Compliant Coin" --symbol "CMP"
```

### Mint Tokens

```bash
sss-token mint \
  --mint <MINT_ADDRESS> \
  --to <RECIPIENT_ADDRESS> \
  --amount 1000
```

### Check Status

```bash
sss-token status --mint <MINT_ADDRESS>
```

## Commands

### `init` - Initialize a new stablecoin

```bash
sss-token init [options]

Options:
  -p, --preset <preset>      Preset to use (sss-1 or sss-2) (default: "sss-1")
  -n, --name <name>          Stablecoin name (default: "My Stablecoin")
  -s, --symbol <symbol>      Stablecoin symbol (default: "MSC")
  -d, --decimals <decimals>  Number of decimals (default: "6")
  -u, --uri <uri>            Metadata URI (default: "")
  -r, --rpc <url>            RPC URL
  -k, --keypair <path>       Keypair path
  --program-id <id>          Program ID
```

### `mint` - Mint tokens

```bash
sss-token mint [options]

Options:
  -m, --mint <address>    Mint address (required)
  -t, --to <address>      Recipient address (required)
  -a, --amount <amount>   Amount to mint (required)
  -r, --rpc <url>         RPC URL
  -k, --keypair <path>    Keypair path
  --program-id <id>       Program ID
```

### `burn` - Burn tokens

```bash
sss-token burn [options]

Options:
  -m, --mint <address>    Mint address (required)
  -a, --amount <amount>   Amount to burn (required)
  -r, --rpc <url>         RPC URL
  -k, --keypair <path>    Keypair path
  --program-id <id>       Program ID
```

### `freeze` - Freeze an account

```bash
sss-token freeze [options]

Options:
  -m, --mint <address>      Mint address (required)
  -a, --account <address>   Account to freeze (required)
  -r, --rpc <url>           RPC URL
  -k, --keypair <path>      Keypair path
  --program-id <id>         Program ID
```

### `thaw` - Unfreeze an account

```bash
sss-token thaw [options]

Options:
  -m, --mint <address>      Mint address (required)
  -a, --account <address>   Account to thaw (required)
  -r, --rpc <url>           RPC URL
  -k, --keypair <path>      Keypair path
  --program-id <id>         Program ID
```

### `pause` - Pause all operations

```bash
sss-token pause --mint <MINT_ADDRESS>
```

### `unpause` - Resume operations

```bash
sss-token unpause --mint <MINT_ADDRESS>
```

### `status` - Get stablecoin status

```bash
sss-token status --mint <MINT_ADDRESS>
```

## SSS-2 Compliance Commands

### `blacklist` - Manage blacklist

```bash
# Add to blacklist
sss-token blacklist add \
  --mint <MINT_ADDRESS> \
  --address <ADDRESS> \
  --reason "Sanctions violation"

# Remove from blacklist
sss-token blacklist remove \
  --mint <MINT_ADDRESS> \
  --address <ADDRESS>

# Check blacklist status
sss-token blacklist check \
  --mint <MINT_ADDRESS> \
  --address <ADDRESS>
```

### `seize` - Seize tokens (SSS-2 only)

```bash
sss-token seize \
  --mint <MINT_ADDRESS> \
  --from <SOURCE_ADDRESS> \
  --to <DESTINATION_ADDRESS> \
  --amount 100
```

### `minters` - Manage minters

```bash
# Add minter
sss-token minters add \
  --mint <MINT_ADDRESS> \
  --address <MINTER_ADDRESS> \
  --quota 1000000

# Remove minter
sss-token minters remove \
  --mint <MINT_ADDRESS> \
  --address <MINTER_ADDRESS>
```

## Configuration

The CLI uses the following default configuration:

- **RPC URL**: `https://api.devnet.solana.com`
- **Program ID**: `4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2`
- **Keypair**: `~/.config/solana/id.json`

You can override these with command-line options or by creating a config file at `~/.sss-cli/config.json`:

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "programId": "YOUR_PROGRAM_ID",
  "keypairPath": "/path/to/keypair.json"
}
```

## Examples

### Complete SSS-2 Workflow

```bash
# 1. Initialize SSS-2 stablecoin
sss-token init --preset sss-2 --name "Compliant USD" --symbol "CUSD"

# 2. Add yourself as a minter
sss-token minters add \
  --mint <MINT_ADDRESS> \
  --address <YOUR_ADDRESS> \
  --quota 1000000

# 3. Mint tokens
sss-token mint \
  --mint <MINT_ADDRESS> \
  --to <RECIPIENT> \
  --amount 1000

# 4. Blacklist an address
sss-token blacklist add \
  --mint <MINT_ADDRESS> \
  --address <BAD_ACTOR> \
  --reason "Sanctions"

# 5. Seize tokens from blacklisted address
sss-token seize \
  --mint <MINT_ADDRESS> \
  --from <BAD_ACTOR> \
  --to <TREASURY> \
  --amount 500
```

## License

MIT
