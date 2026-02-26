# Compliance Guide

## Overview

This guide covers regulatory considerations, compliance requirements, and best practices for operating stablecoins using the Solana Stablecoin Standard.

## Regulatory Framework

### United States

#### GENIUS Act (2025)
The Guiding and Establishing National Innovation for US Stablecoins Act establishes federal standards for stablecoin issuers.

**Key Requirements:**
- Full collateralization (1:1 reserves)
- High-quality liquid assets (HQLA)
- Federal or state licensing
- Regular audits and attestations
- Redemption rights at par value
- AML/CTF compliance
- Cybersecurity standards

**SSS-2 Alignment:**
- ✅ On-chain blacklist enforcement
- ✅ Token seizure capability
- ✅ Complete audit trail
- ✅ Role-based access control
- ✅ Emergency pause mechanism

#### FinCEN Requirements
Financial Crimes Enforcement Network regulations for money services businesses.

**Requirements:**
- Customer due diligence (CDD)
- Suspicious activity reporting (SAR)
- Currency transaction reporting (CTR)
- OFAC sanctions screening
- Record keeping

#### OFAC Sanctions
Office of Foreign Assets Control maintains sanctions lists.

**SSS-2 Features:**
- Automatic blacklist enforcement
- Real-time sanctions screening integration
- Token seizure from sanctioned addresses
- Complete audit trail

### European Union

#### MiCA (Markets in Crypto-Assets)
EU regulation for crypto-assets including stablecoins.

**Key Requirements:**
- Authorization as e-money institution
- Reserve requirements
- Redemption rights
- Transparency obligations
- Governance requirements

### Other Jurisdictions

- **Singapore:** MAS Payment Services Act
- **UK:** Bank of England stablecoin framework
- **Hong Kong:** HKMA stablecoin regime
- **UAE:** VARA regulations

## Compliance Features

### SSS-1 (Minimal)

**Compliance Model:** Reactive

**Features:**
- Freeze/thaw accounts
- Role-based access
- Audit trail via events
- Emergency pause

**Best For:**
- Internal tokens
- Non-regulated use cases
- DAO treasuries

### SSS-2 (Compliant)

**Compliance Model:** Proactive

**Features:**
- Automatic blacklist enforcement
- Transfer hook (no gaps)
- Token seizure capability
- Permanent delegate
- Complete audit trail
- Sanctions screening integration

**Best For:**
- Regulated stablecoins
- Public-facing tokens
- Institutional use
- USDC/USDT-class tokens

## Audit Trail Format

### Event Types

All operations emit events for audit trail:

```typescript
// Mint event
{
  type: "TokensMinted",
  stablecoin: "...",
  recipient: "...",
  minter: "...",
  amount: 1000000000,
  timestamp: 1234567890,
  txSignature: "..."
}

// Blacklist event
{
  type: "AddressBlacklisted",
  stablecoin: "...",
  address: "...",
  reason: "OFAC sanctions match",
  timestamp: 1234567890,
  authority: "...",
  txSignature: "..."
}

// Seize event
{
  type: "TokensSeized",
  stablecoin: "...",
  from: "...",
  to: "...",
  amount: 500000000,
  reason: "Sanctions enforcement",
  timestamp: 1234567890,
  authority: "...",
  txSignature: "..."
}
```

### Export Formats

#### CSV Export
```bash
sss-token audit-log --export audit.csv --format csv
```

```csv
timestamp,type,address,amount,reason,authority,tx_signature
2026-01-15T10:30:00Z,mint,7xKX...,1000000000,,9zYp...,5jKm...
2026-01-15T11:45:00Z,blacklist,3mNb...,,"OFAC match",9zYp...,8pLq...
2026-01-15T12:00:00Z,seize,3mNb...,500000000,"Sanctions",9zYp...,2nMk...
```

#### JSON Export
```bash
sss-token audit-log --export audit.json --format json
```

```json
[
  {
    "timestamp": "2026-01-15T10:30:00Z",
    "type": "mint",
    "address": "7xKX...",
    "amount": 1000000000,
    "authority": "9zYp...",
    "txSignature": "5jKm..."
  }
]
```

#### PDF Report
```bash
sss-token audit-log --export report.pdf --format pdf --from 2026-01-01 --to 2026-12-31
```

## Sanctions Screening Integration

### Real-time Screening

```typescript
import { SanctionsScreeningAPI } from "./sanctions";

// Screen before minting
async function mintWithScreening(recipient: PublicKey, amount: number) {
  // Screen recipient
  const screeningResult = await SanctionsScreeningAPI.screen(recipient);
  
  if (screeningResult.isMatch) {
    // Add to blacklist
    await stable.compliance.blacklistAdd(
      recipient,
      `Sanctions match: ${screeningResult.details}`,
      { authority: complianceKeypair }
    );
    
    throw new Error("Recipient is on sanctions list");
  }
  
  // Proceed with mint
  await stable.mint({ recipient, amount, minter });
}
```

### Batch Screening

```typescript
// Screen all existing holders
async function screenAllHolders() {
  const holders = await stable.getHolders();
  
  for (const holder of holders) {
    const result = await SanctionsScreeningAPI.screen(holder.address);
    
    if (result.isMatch) {
      await stable.compliance.blacklistAdd(
        holder.address,
        `Batch screening match: ${result.details}`,
        { authority: complianceKeypair }
      );
      
      // Freeze and seize
      await stable.freeze({ account: holder.tokenAccount, authority });
      await stable.compliance.seize({
        frozenAccount: holder.tokenAccount,
        destination: treasuryAccount,
        authority,
      });
    }
  }
}
```

## Transaction Monitoring

### Suspicious Activity Detection

```typescript
// Monitor for suspicious patterns
stable.on("transfer", async (event) => {
  const flags = [];
  
  // Large transaction
  if (event.amount > 10_000_000_000) {
    flags.push("large_transaction");
  }
  
  // Rapid succession
  const recentTxs = await getRecentTransactions(event.source);
  if (recentTxs.length > 10) {
    flags.push("rapid_transactions");
  }
  
  // Structuring pattern
  if (isStructuring(recentTxs)) {
    flags.push("potential_structuring");
  }
  
  if (flags.length > 0) {
    await alertComplianceTeam({
      address: event.source,
      flags,
      transaction: event,
    });
  }
});
```

### Suspicious Activity Reporting (SAR)

```typescript
// Generate SAR report
async function generateSAR(address: PublicKey, reason: string) {
  const transactions = await getTransactionHistory(address);
  const profile = await getCustomerProfile(address);
  
  const sar = {
    reportDate: new Date(),
    subject: {
      address: address.toString(),
      profile,
    },
    suspiciousActivity: {
      description: reason,
      transactions,
      totalAmount: sumTransactions(transactions),
    },
    narrative: generateNarrative(transactions, reason),
  };
  
  // Submit to FinCEN
  await submitToFinCEN(sar);
  
  // Add to blacklist if warranted
  if (shouldBlacklist(sar)) {
    await stable.compliance.blacklistAdd(
      address,
      `SAR filed: ${reason}`,
      { authority: complianceKeypair }
    );
  }
}
```

## KYC/AML Integration

### Customer Due Diligence

```typescript
// Verify customer before minting
async function mintWithKYC(recipient: PublicKey, amount: number) {
  // Check KYC status
  const kycStatus = await KYCProvider.getStatus(recipient);
  
  if (kycStatus !== "verified") {
    throw new Error("KYC verification required");
  }
  
  // Check AML screening
  const amlResult = await AMLProvider.screen(recipient);
  
  if (amlResult.riskLevel === "high") {
    await alertComplianceTeam({
      address: recipient,
      reason: "High AML risk",
      details: amlResult,
    });
    throw new Error("AML screening failed");
  }
  
  // Proceed with mint
  await stable.mint({ recipient, amount, minter });
}
```

## Record Keeping

### Required Records

- All transactions (mint, burn, transfer)
- Blacklist additions/removals with reasons
- Token seizures with justification
- Authority changes
- Minter quota updates
- Pause/unpause events
- Customer profiles (off-chain)
- KYC/AML documentation (off-chain)

### Retention Period

- **US:** 5 years minimum
- **EU:** 5 years minimum
- **Best Practice:** 7 years

### Storage

```typescript
// Store in compliance database
await complianceDB.store({
  type: "blacklist_addition",
  address: targetAddress.toString(),
  reason: "OFAC sanctions",
  timestamp: Date.now(),
  authority: authorityAddress.toString(),
  txSignature: signature,
  metadata: {
    sanctionsList: "SDN",
    matchScore: 0.98,
    reviewedBy: "compliance_officer_id",
  },
});
```

## Reporting Requirements

### Regular Reports

#### Monthly Reserve Report
- Total supply
- Reserve composition
- Reserve valuation
- Attestation from auditor

#### Quarterly Compliance Report
- Transaction volume
- Blacklist additions/removals
- SARs filed
- Compliance incidents

#### Annual Audit
- Full financial audit
- Reserve verification
- Compliance review
- Security assessment

### Regulatory Filings

```typescript
// Generate regulatory report
async function generateRegulatoryReport(period: DateRange) {
  const report = {
    period,
    totalSupply: await stable.getTotalSupply(),
    transactions: {
      mints: await getMintsInPeriod(period),
      burns: await getBurnsInPeriod(period),
      volume: await getVolumeInPeriod(period),
    },
    compliance: {
      blacklistAdditions: await getBlacklistAdditions(period),
      seizures: await getSeizures(period),
      sarsFiled: await getSARsInPeriod(period),
    },
    reserves: await getReserveReport(period),
  };
  
  return report;
}
```

## Best Practices

### Operational

1. **Separate Keys:** Use different keys for different roles
2. **Multi-sig:** Use multi-signature for critical operations
3. **Regular Reviews:** Review blacklist and compliance logs regularly
4. **Documentation:** Document all compliance decisions
5. **Training:** Train operators on compliance procedures

### Technical

1. **Automated Screening:** Integrate real-time sanctions screening
2. **Monitoring:** Implement transaction monitoring
3. **Alerts:** Set up alerts for suspicious activity
4. **Backups:** Maintain backups of audit trails
5. **Testing:** Test compliance features on devnet

### Legal

1. **Legal Review:** Have legal team review compliance procedures
2. **Policies:** Maintain written compliance policies
3. **Updates:** Stay current with regulatory changes
4. **Coordination:** Coordinate with regulators
5. **Insurance:** Consider compliance insurance

## Compliance Checklist

### Pre-Launch
- [ ] Legal entity established
- [ ] Licenses obtained
- [ ] Compliance policies written
- [ ] KYC/AML provider selected
- [ ] Sanctions screening integrated
- [ ] Audit trail system tested
- [ ] Compliance team trained
- [ ] Legal review completed

### Ongoing
- [ ] Daily transaction monitoring
- [ ] Weekly blacklist review
- [ ] Monthly reserve reports
- [ ] Quarterly compliance reports
- [ ] Annual audits
- [ ] Regular staff training
- [ ] Policy updates as needed
- [ ] Regulatory coordination

## Resources

### Regulatory
- [GENIUS Act](https://www.congress.gov/bill/118th-congress/house-bill/4766)
- [FinCEN Guidance](https://www.fincen.gov/)
- [OFAC Sanctions Lists](https://home.treasury.gov/policy-issues/office-of-foreign-assets-control-sanctions-programs-and-information)
- [MiCA Regulation](https://www.esma.europa.eu/policy-activities/crypto-assets)

### Technical
- [SSS-2 Specification](./SSS-2.md)
- [Operations Guide](./OPERATIONS.md)
- [SDK Documentation](./SDK.md)

## Support

For compliance questions:
- Email: compliance@superteam.fun
- Discord: discord.gg/superteambrasil
- Legal consultation recommended

## Disclaimer

This guide is for informational purposes only and does not constitute legal advice. Consult with legal counsel for specific compliance requirements in your jurisdiction.
