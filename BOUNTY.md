# Solana Stablecoin Standard - Bounty Submission

## Bounty Details

- **Organizer:** Superteam Brazil
- **Repository:** github.com/solanabr/solana-stablecoin-standard
- **Prize Pool:** $5,000 USDC
  - 🥇 1st: $2,500 USDC
  - 🥈 2nd: $1,500 USDC
  - 🥉 3rd: $1,000 USDC
- **Deadline:** 21 days from listing
- **Reference:** [Solana Vault Standard](https://github.com/solanabr/solana-vault-standard)

## Deliverables Checklist

### Core Requirements

#### Layer 1 - Base SDK
- [x] Token creation with Token-2022
- [x] Mint authority
- [x] Freeze authority
- [x] Metadata support
- [x] Role management program
- [ ] CLI implementation
- [ ] TypeScript SDK

#### Layer 2 - Modules
- [x] Compliance module structure
  - [x] Transfer hook program
  - [x] Blacklist PDAs
  - [x] Permanent delegate support
- [ ] Privacy module (SSS-3 bonus)
  - [ ] Confidential transfers
  - [ ] Allowlists

#### Layer 3 - Standard Presets
- [x] SSS-1: Minimal Stablecoin
  - [x] Mint + freeze + metadata
- [x] SSS-2: Compliant Stablecoin
  - [x] SSS-1 features
  - [x] Permanent delegate
  - [x] Transfer hook
  - [x] Blacklist enforcement
- [ ] SSS-3: Private Stablecoin (bonus)

### On-Chain Program

- [x] Single configurable program
- [x] Initialization with config
- [x] Core instructions
  - [x] initialize
  - [x] mint
  - [x] burn
  - [x] freeze_account
  - [x] thaw_account
  - [x] pause
  - [x] unpause
  - [x] update_minter
  - [x] transfer_authority
- [x] SSS-2 instructions
  - [x] add_to_blacklist
  - [x] remove_from_blacklist
  - [x] seize (via permanent delegate)
- [x] Transfer hook program
- [x] Role-based access control
- [x] Per-minter quotas
- [x] Graceful feature gating

### Backend Services

- [ ] Mint/burn service
  - [ ] Fiat-to-stablecoin lifecycle
  - [ ] Request verification
  - [ ] Execution logging
- [ ] Event listener/indexer
  - [ ] On-chain event monitoring
  - [ ] Off-chain state maintenance
  - [ ] Webhook notifications
- [ ] Compliance service (SSS-2)
  - [ ] Blacklist management
  - [ ] Sanctions screening integration
  - [ ] Transaction monitoring
  - [ ] Audit trail export
- [ ] Webhook service
  - [ ] Configurable notifications
  - [ ] Retry logic
- [ ] Docker containerization
- [ ] Environment-based config
- [ ] Structured logging
- [ ] Health checks

### Admin CLI

- [ ] Preset initialization
  - [ ] `sss-token init --preset sss-1`
  - [ ] `sss-token init --preset sss-2`
  - [ ] `sss-token init --custom config.toml`
- [ ] Operations
  - [ ] mint
  - [ ] burn
  - [ ] freeze
  - [ ] thaw
  - [ ] pause/unpause
  - [ ] status/supply
- [ ] SSS-2 compliance
  - [ ] blacklist add/remove
  - [ ] seize
- [ ] Management
  - [ ] minters list/add/remove
  - [ ] holders
  - [ ] audit-log

### TypeScript SDK

- [ ] Core SDK package (@stbr/sss-token)
- [ ] Preset initialization
- [ ] Custom configuration
- [ ] Operations API
- [ ] Compliance module (SSS-2)
- [ ] Type definitions
- [ ] Examples

### Documentation

- [x] README.md - Overview, quick start
- [ ] ARCHITECTURE.md - Layer model, data flows
- [ ] SDK.md - TypeScript SDK guide
- [ ] OPERATIONS.md - Operator runbook
- [ ] SSS-1.md - Minimal standard spec
- [ ] SSS-2.md - Compliant standard spec
- [ ] COMPLIANCE.md - Regulatory considerations
- [ ] API.md - Backend API reference

### Tests

- [ ] Unit tests
  - [ ] All instructions
  - [ ] SDK functions
- [ ] Integration tests
  - [ ] SSS-1 flow
  - [ ] SSS-2 flow
- [ ] Fuzz tests (Trident)
- [ ] Preset config tests
- [ ] Devnet deployment
  - [ ] Program IDs
  - [ ] Example transactions

### Bonus Features

- [ ] SSS-3 Private Stablecoin
  - [ ] Confidential transfers
  - [ ] Scoped allowlists
  - [ ] Proof-of-concept documentation
- [ ] Oracle Integration Module
  - [ ] Switchboard integration
  - [ ] Non-USD pegs (EUR, BRL, CPI)
- [ ] Interactive Admin TUI
  - [ ] Real-time monitoring
  - [ ] Terminal UI operations
- [ ] Example Frontend
  - [ ] Stablecoin creation UI
  - [ ] Management dashboard

## Evaluation Criteria

| Criteria | Weight | Status |
|----------|--------|--------|
| SDK Design & Modularity | 20% | 🟡 In Progress |
| Completeness | 20% | 🟡 In Progress |
| Code Quality | 20% | 🟢 Good |
| Security | 15% | 🟡 Needs Review |
| Authority/Credentials | 20% | - |
| Usability & Documentation | 5% | 🔴 Needs Work |
| Bonus Features | Up to 50% | 🔴 Not Started |

## Submission Requirements

- [ ] PR to github.com/solanabr/solana-stablecoin-standard
- [ ] All source code
- [ ] Working tests
- [ ] Devnet deployment proof
- [ ] Documentation
- [ ] Docker setup (docker compose up)

## Timeline

- **Submission Deadline:** 21 days from listing
- **Review Period:** 10 days after deadline
- **Winner Announcement:** Within 14 days after deadline

## Next Steps

1. Complete CLI implementation
2. Build TypeScript SDK
3. Implement backend services
4. Write comprehensive documentation
5. Add integration tests
6. Deploy to Devnet
7. Add bonus features (SSS-3, Oracle, TUI)
8. Submit PR

## Resources

- [Solana Vault Standard](https://github.com/solanabr/solana-vault-standard)
- [Token-2022 Extensions](https://spl.solana.com/token-2022)
- [Permanent Delegate](https://spl.solana.com/token-2022/extensions#permanent-delegate)
- [Transfer Hook](https://spl.solana.com/token-2022/extensions#transfer-hook)
- [GENIUS Act](https://www.congress.gov/bill/118th-congress/house-bill/4766)
- [Anchor Docs](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)

## Contact

- **GitHub:** Tag @kauenet in PR
- **Discord:** discord.gg/superteambrasil
- **Twitter:** @SuperteamBR @kauenet
