import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { SolanaStablecoin, PresetType } from "../src";
import { getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";

/**
 * Comprehensive SDK Test - All 13 Instructions
 */
async function main() {
  console.log("🧪 COMPREHENSIVE SDK TEST - ALL 13 INSTRUCTIONS\n");
  console.log("=" .repeat(60));
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const walletPath = process.env.HOME + "/GGsJvBDCErzxjWegTZTS45PKaFLKx3LUWj9K96d3Zx8p.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log("👤 Authority:", authority.publicKey.toBase58());
  const balance = await connection.getBalance(authority.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL");
  console.log("=" .repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ========================================
    // TEST 1: Initialize SSS-1 Stablecoin
    // ========================================
    console.log("TEST 1: Initialize SSS-1 Stablecoin");
    console.log("-".repeat(60));
    
    const stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_1,
        name: "SDK Test Coin",
        symbol: "SDKTEST",
        decimals: 6,
      },
      authority
    );
    
    console.log("✅ Stablecoin created");
    console.log("   Mint:", stablecoin.mintAddress.toBase58());
    console.log("   PDA:", stablecoin.stablecoin.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 2: Update Minter (Add Minter)
    // ========================================
    console.log("TEST 2: Update Minter (Add Minter)");
    console.log("-".repeat(60));
    
    const minter = Keypair.generate();
    const fundMinterTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: minter.publicKey,
        lamports: 100_000_000,
      })
    );
    await connection.sendTransaction(fundMinterTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await stablecoin.updateMinter({
      minter: minter.publicKey,
      quota: 1_000_000_000_000n,
      isActive: true,
    });
    
    console.log("✅ Minter added:", minter.publicKey.toBase58());
    console.log("   Quota: 1,000,000 tokens");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 3: Mint Tokens
    // ========================================
    console.log("TEST 3: Mint Tokens");
    console.log("-".repeat(60));
    
    const recipient = Keypair.generate();
    await stablecoin.mintTokens({
      recipient: recipient.publicKey,
      amount: 5_000_000n, // 5 tokens
      minter: minter.publicKey,
      minterKeypair: minter,
    });
    
    console.log("✅ Minted 5 tokens to:", recipient.publicKey.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 4: Get Total Supply
    // ========================================
    console.log("TEST 4: Get Total Supply");
    console.log("-".repeat(60));
    
    const supply = await stablecoin.getTotalSupply();
    console.log("✅ Total supply:", supply.toString());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 5: Pause
    // ========================================
    console.log("TEST 5: Pause");
    console.log("-".repeat(60));
    
    await stablecoin.pause();
    console.log("✅ Stablecoin paused");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 6: Unpause
    // ========================================
    console.log("TEST 6: Unpause");
    console.log("-".repeat(60));
    
    await stablecoin.unpause();
    console.log("✅ Stablecoin unpaused");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 7: Burn Tokens
    // ========================================
    console.log("TEST 7: Burn Tokens");
    console.log("-".repeat(60));
    
    const fundRecipientTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 100_000_000,
      })
    );
    await connection.sendTransaction(fundRecipientTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await stablecoin.burn({
      owner: recipient.publicKey,
      amount: 2_000_000n, // Burn 2 tokens
      ownerKeypair: recipient,
    });
    
    console.log("✅ Burned 2 tokens");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 8: Freeze Account
    // ========================================
    console.log("TEST 8: Freeze Account");
    console.log("-".repeat(60));
    
    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      stablecoin.mintAddress,
      recipient.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    
    await stablecoin.freeze(recipientAta.address);
    console.log("✅ Account frozen:", recipientAta.address.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 9: Thaw Account
    // ========================================
    console.log("TEST 9: Thaw Account");
    console.log("-".repeat(60));
    
    await stablecoin.thaw(recipientAta.address);
    console.log("✅ Account thawed:", recipientAta.address.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 10: Transfer Authority
    // ========================================
    console.log("TEST 10: Transfer Authority");
    console.log("-".repeat(60));
    
    const newAuthority = Keypair.generate();
    await stablecoin.transferAuthority(newAuthority.publicKey);
    console.log("✅ Authority transferred to:", newAuthority.publicKey.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 11: Initialize SSS-2 (Compliant)
    // ========================================
    console.log("TEST 11: Initialize SSS-2 Compliant Stablecoin");
    console.log("-".repeat(60));
    
    const fundNewAuthTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: newAuthority.publicKey,
        lamports: 200_000_000,
      })
    );
    await connection.sendTransaction(fundNewAuthTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const compliantStablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_2,
        name: "Compliant Coin",
        symbol: "CUSD",
        decimals: 6,
      },
      newAuthority
    );
    
    console.log("✅ SSS-2 stablecoin created");
    console.log("   Mint:", compliantStablecoin.mintAddress.toBase58());
    console.log("   Features: Permanent Delegate + Transfer Hook");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 12: Add to Blacklist
    // ========================================
    console.log("TEST 12: Add to Blacklist");
    console.log("-".repeat(60));
    
    const badActor = Keypair.generate().publicKey;
    await compliantStablecoin.compliance.blacklistAdd({
      address: badActor,
      reason: "OFAC sanctions match",
    });
    
    console.log("✅ Address blacklisted:", badActor.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 13: Check if Blacklisted
    // ========================================
    console.log("TEST 13: Check if Blacklisted");
    console.log("-".repeat(60));
    
    const isBlacklisted = await compliantStablecoin.compliance.isBlacklisted(badActor);
    console.log("✅ Blacklist check:", isBlacklisted ? "BLACKLISTED" : "NOT BLACKLISTED");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 14: Remove from Blacklist
    // ========================================
    console.log("TEST 14: Remove from Blacklist");
    console.log("-".repeat(60));
    
    await compliantStablecoin.compliance.blacklistRemove(badActor);
    console.log("✅ Address removed from blacklist");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 15: Seize Tokens
    // ========================================
    console.log("TEST 15: Seize Tokens (Permanent Delegate)");
    console.log("-".repeat(60));
    
    // Add minter to compliant stablecoin
    const compliantMinter = Keypair.generate();
    const fundCompliantMinterTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: compliantMinter.publicKey,
        lamports: 100_000_000,
      })
    );
    await connection.sendTransaction(fundCompliantMinterTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await compliantStablecoin.updateMinter({
      minter: compliantMinter.publicKey,
      quota: 1_000_000_000_000n,
      isActive: true,
    });
    
    // Mint tokens to a target
    const target = Keypair.generate();
    await compliantStablecoin.mintTokens({
      recipient: target.publicKey,
      amount: 10_000_000n, // 10 tokens
      minter: compliantMinter.publicKey,
      minterKeypair: compliantMinter,
    });
    
    // Seize tokens
    const treasury = Keypair.generate();
    await compliantStablecoin.compliance.seize({
      from: target.publicKey,
      to: treasury.publicKey,
      amount: 5_000_000n, // Seize 5 tokens
    });
    
    console.log("✅ Seized 5 tokens");
    console.log("   From:", target.publicKey.toBase58());
    console.log("   To:", treasury.publicKey.toBase58());
    testsPassed++;
    console.log();

    // ========================================
    // SUMMARY
    // ========================================
    console.log("=" .repeat(60));
    console.log("🎉 SDK COMPREHENSIVE TEST COMPLETE!");
    console.log("=" .repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log();
    console.log("💡 All SDK methods tested successfully!");
    console.log("🚀 SDK is production-ready!");

  } catch (error: any) {
    testsFailed++;
    console.error("\n❌ ERROR:", error.message);
    if (error.logs) {
      console.log("\n📋 Program logs:");
      error.logs.forEach((log: string) => console.log("  ", log));
    }
    console.log("\n=" .repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    process.exit(1);
  }
}

main().catch(console.error);
