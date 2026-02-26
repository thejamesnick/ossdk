# What Are We Building? (Simple Explanation)

## The Big Picture

**We're building OpenZeppelin for Solana stablecoins.**

You know how on Ethereum, when someone wants to make a token, they don't write everything from scratch? They use OpenZeppelin - a library with pre-built, tested contracts. You just import it and boom, you have an ERC-20 token.

**This bounty wants the same thing for Solana stablecoins.**

## What We're Building

We're building a **toolkit/library** that makes it super easy for anyone to launch a stablecoin on Solana. Not just ONE stablecoin - a reusable SDK that anyone can use.

### The Three Main Parts:

#### 1. The Programs (Smart Contracts)
- One main program that handles everything: minting, burning, freezing accounts, blacklists, etc.
- One transfer hook program that checks blacklists automatically on every transfer
- These are written in Rust using Anchor
- Think of these as the "engine" that runs on the blockchain

#### 2. The SDK (TypeScript Library)
- A nice JavaScript/TypeScript package that developers can install with `npm install @stbr/sss-token`
- Makes it easy to interact with the programs without dealing with raw Solana stuff
- Like: `await stable.mint({ recipient, amount })` instead of building transactions manually
- Think of this as the "steering wheel" that controls the engine

#### 3. The CLI Tool
- A command-line tool for operators: `sss-token mint <address> <amount>`
- So non-developers can manage stablecoins easily
- Like how you use `solana` CLI or `anchor` CLI
- Think of this as the "dashboard" for managing everything

## The "Standards" (Presets)

We're creating 3 standard configurations that people can choose from:

### SSS-1: Minimal Stablecoin
**What it is:**
- Basic features: mint, burn, freeze
- Simple and lightweight

**Who it's for:**
- DAO treasuries
- Internal company tokens
- Simple ecosystem tokens
- Testing and development

**What it does:**
- Mint tokens
- Burn tokens
- Freeze/unfreeze accounts
- Role management (different people can have different permissions)

**What it DOESN'T do:**
- No automatic blacklist enforcement
- No token seizure
- No fancy compliance stuff

### SSS-2: Compliant Stablecoin
**What it is:**
- Everything from SSS-1 PLUS compliance features
- For serious, regulated stablecoins

**Who it's for:**
- Companies launching public stablecoins (like USDC/USDT)
- Institutions that need regulatory compliance
- Anyone dealing with US regulations

**What it adds:**
- Automatic blacklist enforcement (checks EVERY transfer)
- Token seizure capability (can take tokens from bad actors)
- Permanent delegate (special authority for regulators)
- Transfer hook (no one can bypass the blacklist)
- Complete audit trail

**Why it matters:**
- OFAC sanctions compliance (US Treasury requirements)
- Can't accidentally send money to sanctioned addresses
- Regulators can seize tokens if needed

### SSS-3: Private Stablecoin (Bonus)
**What it is:**
- Confidential transfers (encrypted balances)
- Privacy-focused

**Who it's for:**
- Privacy-conscious users
- Experimental use cases

**Status:**
- Bonus feature (not required for bounty)
- Token-2022 tooling still maturing

## Real-World Example

### Without Our SDK:
```typescript
// A company wants to launch a stablecoin...
// They'd have to:
// 1. Write Rust programs from scratch (weeks)
// 2. Handle Token-2022 extensions manually (complex)
// 3. Build their own CLI tools (days)
// 4. Set up backend services (weeks)
// 5. Figure out compliance (legal nightmare)
// 6. Write all the documentation
// 7. Test everything thoroughly
// = MONTHS of work, $100k+ in dev costs
```

### With Our SDK:
```typescript
import { SolanaStablecoin, Presets } from "@stbr/sss-token";

// Create a compliant stablecoin in 5 lines
const stable = await SolanaStablecoin.create(connection, {
  preset: Presets.SSS_2,  // Compliant version
  name: "My Company USD",
  symbol: "MCUSD",
  decimals: 6,
  authority: myKeypair,
});

// Done! Now they can:
await stable.mint({ recipient, amount });
await stable.compliance.blacklistAdd(address, "OFAC match");
await stable.compliance.seize(frozenAccount, treasury);

// = HOURS of work, just configuration
```

## What We Need to Submit (To Win)

### Required Deliverables:

1. ✅ **Documentation** (8 markdown files)
   - README, Architecture, SDK guide, Operations guide
   - SSS-1 spec, SSS-2 spec, Compliance guide, API docs
   - **Status: DONE!**

2. 🟡 **Working Programs** (Rust/Anchor)
   - sss-core program (main stablecoin logic)
   - sss-transfer-hook program (blacklist enforcement)
   - **Status: Started, needs completion**

3. ❌ **TypeScript SDK** (@stbr/sss-token)
   - NPM package developers can install
   - Easy-to-use API
   - **Status: Not started**

4. ❌ **CLI Tool** (sss-token)
   - Command-line interface
   - For operators to manage stablecoins
   - **Status: Not started**

5. ❌ **Backend Services** (4 microservices)
   - Mint/burn service (handles fiat-to-crypto)
   - Indexer service (tracks all events)
   - Compliance service (manages blacklist)
   - Webhook service (sends notifications)
   - **Status: Not started**

6. ❌ **Tests**
   - Unit tests (test individual functions)
   - Integration tests (test full workflows)
   - Fuzz tests (test with random inputs)
   - **Status: Not started**

7. ❌ **Devnet Deployment**
   - Deploy to Solana's test network
   - Provide program IDs
   - Show example transactions
   - **Status: Not started**

8. ❌ **Docker Setup**
   - Everything runs with `docker compose up`
   - Easy for others to test
   - **Status: Not started**

## The Prize

- 🥇 **1st place:** $2,500 USDC
- 🥈 **2nd place:** $1,500 USDC
- 🥉 **3rd place:** $1,000 USDC

**Total Prize Pool:** $5,000 USDC

Multiple people can submit, best submissions win.

## Why This Matters

### The Problem:
Right now, if you want to launch a stablecoin on Solana, you're on your own. You have to:
- Figure out Token-2022 extensions
- Build everything from scratch
- Handle compliance yourself
- No standards, no best practices
- Expensive and time-consuming

### Our Solution:
After we build this, anyone can launch a stablecoin in hours instead of months. Just like how OpenZeppelin made it easy to launch tokens on Ethereum.

### The Impact:
If we build this well and it gets adopted:
- It becomes THE standard way to launch stablecoins on Solana
- Could be used by dozens or hundreds of projects
- We'd be building critical infrastructure for the Solana ecosystem
- Our code could secure billions of dollars

That's why Superteam Brazil is paying $5k for it - they want this to become production infrastructure.

## What We've Done So Far

- ✅ **Created all documentation** (8 files)
  - So we know exactly what to build
  - Clear specifications for each standard
  - Complete API reference
  
- ✅ **Built core program structure**
  - Main stablecoin program with all instructions
  - Transfer hook program skeleton
  - Role-based access control
  - Blacklist management
  
- ✅ **Made detailed task list** (TASKS.md)
  - 10 phases
  - Every single task broken down
  - 3-week timeline

## What We Need to Do Next

### Week 1: Programs + SDK
1. **Finish the programs**
   - Add seize instruction (token seizure)
   - Implement Token-2022 extensions properly
   - Complete transfer hook logic
   - Add tests

2. **Build the TypeScript SDK**
   - Create NPM package structure
   - Implement all SDK methods
   - Add TypeScript types
   - Write examples

### Week 2: CLI + Backend
3. **Build the CLI tool**
   - Command-line interface
   - All operations (mint, burn, freeze, blacklist, etc.)
   - Config file support
   - Nice output with colors

4. **Build backend services**
   - Mint/burn service (REST API)
   - Indexer service (tracks events)
   - Compliance service (blacklist management)
   - Webhook service (notifications)
   - Docker setup

### Week 3: Testing + Deployment + Submission
5. **Write comprehensive tests**
   - Unit tests for all functions
   - Integration tests for full workflows
   - Test both SSS-1 and SSS-2

6. **Deploy to Devnet**
   - Deploy programs
   - Test everything live
   - Record program IDs and transactions

7. **Final polish**
   - Review all code
   - Update documentation
   - Create demo video/screenshots

8. **Submit PR**
   - Fork their repo
   - Submit pull request
   - Respond to feedback

## Timeline

**Deadline:** 21 days from bounty listing
**Review Period:** 10 days after deadline
**Winner Announcement:** Within 14 days after deadline

## How We'll Be Judged

| Criteria | Weight | What They're Looking For |
|----------|--------|--------------------------|
| SDK Design & Modularity | 20% | Clean code, easy to use, well-organized |
| Completeness | 20% | Everything works, all features implemented |
| Code Quality | 20% | Clean, documented, follows best practices |
| Security | 15% | No vulnerabilities, proper access control |
| Authority/Credentials | 20% | Shows Solana/web3 expertise |
| Usability & Documentation | 5% | Easy to use, well documented |
| Bonus Features | Up to 50% | SSS-3, oracle integration, TUI, frontend |

## The Competition

This is an open bounty - multiple people can submit. We're competing against other Solana developers.

**Our advantages:**
- We have all documentation done (clear vision)
- We have a detailed task list (organized approach)
- We understand the requirements (this document!)

**To win:**
- Build something that actually works
- Make it easy to use
- Write clean, professional code
- Show we know Solana well
- Maybe add bonus features

## Key Concepts to Remember

### What's a "Standard"?
A standard is just a preset configuration. Like:
- SSS-1 = base features only
- SSS-2 = base + compliance features
- SSS-3 = base + privacy features

### What's Token-2022?
The new token program on Solana with extensions:
- Metadata (name, symbol, logo)
- Freeze authority (can freeze accounts)
- Permanent delegate (can seize tokens)
- Transfer hook (runs code on every transfer)
- Confidential transfers (encrypted balances)

### What's a Transfer Hook?
A program that runs automatically on EVERY token transfer. We use it to check the blacklist - if someone tries to send tokens to/from a blacklisted address, the transfer fails. No gaps, no bypasses.

### What's Permanent Delegate?
A special authority that can transfer tokens from ANY account, even without the owner's permission. Used for token seizure when regulators require it.

## Resources

- **Bounty Details:** bounty.txt
- **Task List:** TASKS.md
- **Project Status:** PROJECT_STATUS.md
- **Reference:** [Solana Vault Standard](https://github.com/solanabr/solana-vault-standard)
- **Our Repo:** https://github.com/thejamesnick/ossdk

## Questions to Ask Yourself

When you're confused, ask:
1. **What are we building?** → A toolkit/SDK for launching stablecoins
2. **Who will use it?** → Developers and companies launching stablecoins
3. **Why does it matter?** → Makes it 100x easier to launch stablecoins on Solana
4. **What's the end result?** → Someone can launch a compliant stablecoin in hours, not months

## TL;DR

We're building the "OpenZeppelin for Solana stablecoins" - a complete toolkit that makes it easy for anyone to launch and manage a stablecoin. It's like building LEGO blocks that others can use to build their own stablecoins quickly.

**Current Status:** Documentation done, programs started, SDK/CLI/backend/tests not started yet.

**Next Step:** Finish the programs, then build the SDK.

**Goal:** Win the bounty by building the best stablecoin SDK for Solana.

**Prize:** $2,500 for 1st place (or $1,500 for 2nd, or $1,000 for 3rd).

---

*Keep this file open when you're working - come back to it whenever you need to remember what we're doing and why!*
