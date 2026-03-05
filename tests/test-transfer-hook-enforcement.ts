import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  createTransferCheckedInstruction,
  addExtraAccountMetasForExecute,
} from "@solana/spl-token";
import { SolanaStablecoin } from "../sdk/core/src/client";
import { Presets } from "../sdk/core/src/presets";
import * as fs from "fs";
import { createHash } from "crypto";

// Program IDs
const SSS_CORE_PROGRAM_ID = new PublicKey("4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2");
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("2pMqj2G5tEiCMoSyWHcoCX383q5ji2hZcVCDxSYiyHje");

// Connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load wallet
const walletPath = process.env.HOME + "/GGsJvBDCErzxjWegTZTS45PKaFLKx3LUWj9K96d3Zx8p.json";
const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const authority = Keypair.fromSecretKey(new Uint8Array(walletData));

console.log("🧪 Testing Transfer Hook Enforcement\n");
console.log("👤 Authority:", authority.publicKey.toBase58());
console.log("🔧 SSS Core:", SSS_CORE_PROGRAM_ID.toBase58());
console.log("🪝 Transfer Hook:", TRANSFER_HOOK_PROGRAM_ID.toBase58());
console.log();

async function test() {
  try {
    // Step 1: Create SSS-2 stablecoin with transfer hook enabled
    console.log("1️⃣  Creating SSS-2 stablecoin with transfer hook...");
    
    const stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: Presets.SSS_2,
        name: "Transfer Hook Test",
        symbol: "THT",
        decimals: 6,
      },
      authority,
      SSS_CORE_PROGRAM_ID
    );
    
    console.log("✅ SSS-2 stablecoin created");
    console.log("   Mint:", stablecoin.mintAddress.toBase58());
    console.log("   Stablecoin PDA:", stablecoin.stablecoin.toBase58());
    
    // Check mint extensions
    const mintInfo = await connection.getAccountInfo(stablecoin.mintAddress);
    console.log("   Mint account size:", mintInfo?.data.length, "bytes");
    console.log();
    
    // Step 2: Initialize transfer hook extra account metas
    console.log("2️⃣  Initializing transfer hook extra account metas...");
    
    const [extraAccountMetaList] = PublicKey.findProgramAddressSync(
      [Buffer.from("extra-account-metas"), stablecoin.mintAddress.toBuffer()],
      TRANSFER_HOOK_PROGRAM_ID
    );
    
    const discriminator = createHash("sha256")
      .update("global:initialize_extra_account_meta_list")
      .digest()
      .slice(0, 8);
    
    const initializeData = discriminator; // No parameters needed now
    
    const initializeIx = new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: extraAccountMetaList, isSigner: false, isWritable: true },
        { pubkey: stablecoin.mintAddress, isSigner: false, isWritable: false },
        { pubkey: SSS_CORE_PROGRAM_ID, isSigner: false, isWritable: false }, // Add SSS Core program
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: TRANSFER_HOOK_PROGRAM_ID,
      data: initializeData,
    });
    
    const initTx = new Transaction().add(initializeIx);
    await connection.sendTransaction(initTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the extra account meta list was created
    const extraAccountMetaInfo = await connection.getAccountInfo(extraAccountMetaList);
    console.log("   Extra Account Meta List created:", extraAccountMetaInfo !== null);
    if (extraAccountMetaInfo) {
      console.log("   Size:", extraAccountMetaInfo.data.length, "bytes");
      console.log("   Owner:", extraAccountMetaInfo.owner.toBase58());
    }
    
    console.log("✅ Transfer hook initialized");
    console.log();
    
    // Step 3: Add minter
    console.log("3️⃣  Adding minter...");
    
    await stablecoin.updateMinter({
      minter: authority.publicKey,
      quota: 1000000000000n,
      isActive: true,
    });
    
    console.log("✅ Minter added");
    console.log();
    
    // Step 4: Create test users
    console.log("4️⃣  Creating test users...");
    
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    const charlie = Keypair.generate();
    
    // Fund users with smaller amounts
    for (const user of [alice, bob, charlie]) {
      const fundTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: user.publicKey,
          lamports: 5000000, // 0.005 SOL (reduced from 0.1)
        })
      );
      await connection.sendTransaction(fundTx, [authority]);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("✅ Test users created and funded");
    console.log("   Alice:", alice.publicKey.toBase58());
    console.log("   Bob:", bob.publicKey.toBase58());
    console.log("   Charlie:", charlie.publicKey.toBase58());
    console.log();
    
    // Step 5: Create token accounts and mint tokens
    console.log("5️⃣  Creating token accounts and minting tokens...");
    
    // Create token accounts
    const aliceAta = await createAssociatedTokenAccountIdempotent(
      connection,
      authority,
      stablecoin.mintAddress,
      alice.publicKey,
      {},
      TOKEN_2022_PROGRAM_ID
    );
    
    const bobAta = await createAssociatedTokenAccountIdempotent(
      connection,
      authority,
      stablecoin.mintAddress,
      bob.publicKey,
      {},
      TOKEN_2022_PROGRAM_ID
    );
    
    const charlieAta = await createAssociatedTokenAccountIdempotent(
      connection,
      authority,
      stablecoin.mintAddress,
      charlie.publicKey,
      {},
      TOKEN_2022_PROGRAM_ID
    );
    
    // Mint tokens to Alice and Bob
    await stablecoin.mintTokens({
      recipient: alice.publicKey,
      amount: 1000000n, // 1 token
      minter: authority.publicKey,
      minterKeypair: authority,
    });
    
    await stablecoin.mintTokens({
      recipient: bob.publicKey,
      amount: 1000000n, // 1 token
      minter: authority.publicKey,
      minterKeypair: authority,
    });
    
    console.log("✅ Token accounts created and tokens minted");
    console.log();
    
    // Step 6: Test transfer between clean addresses (should succeed)
    console.log("6️⃣  Testing transfer from Alice to Charlie (both clean)...");
    
    try {
      // Create base transfer instruction
      const transferIx = createTransferCheckedInstruction(
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        500000n,
        6,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      
      // Add extra accounts for transfer hook
      await addExtraAccountMetasForExecute(
        connection,
        transferIx,
        TRANSFER_HOOK_PROGRAM_ID,
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        500000n,
        "confirmed"
      );
      
      const transferTx = new Transaction().add(transferIx);
      const sig = await connection.sendTransaction(transferTx, [alice]);
      await connection.confirmTransaction(sig);
      
      console.log("✅ Transfer succeeded (as expected)");
      console.log("   Signature:", sig);
      console.log();
    } catch (error: any) {
      console.log("❌ Transfer failed unexpectedly:", error.message);
      if (error.logs) {
        console.log("   Logs:", error.logs);
      }
      throw error;
    }
    
    // Step 7: Blacklist Charlie
    console.log("7️⃣  Blacklisting Charlie...");
    
    await stablecoin.compliance.blacklistAdd({
      address: charlie.publicKey,
      reason: "Test blacklist for transfer hook enforcement",
    });
    
    const isBlacklisted = await stablecoin.compliance.isBlacklisted(charlie.publicKey);
    console.log("✅ Charlie blacklisted:", isBlacklisted);
    console.log();
    
    // Step 8: Test transfer to blacklisted address (should fail)
    console.log("8️⃣  Testing transfer from Alice to Charlie (Charlie blacklisted)...");
    
    try {
      const transferIx = createTransferCheckedInstruction(
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        100000n,
        6,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      
      await addExtraAccountMetasForExecute(
        connection,
        transferIx,
        TRANSFER_HOOK_PROGRAM_ID,
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        100000n,
        "confirmed"
      );
      
      const transferTx = new Transaction().add(transferIx);
      const sig = await connection.sendTransaction(transferTx, [alice]);
      await connection.confirmTransaction(sig);
      
      console.log("❌ Transfer succeeded but should have failed!");
      process.exit(1);
    } catch (error: any) {
      console.log("✅ Transfer blocked (as expected)");
      console.log("   Error:", error.message);
      console.log();
    }
    
    // Step 9: Test transfer from blacklisted address (should fail)
    console.log("9️⃣  Testing transfer from Charlie to Bob (Charlie blacklisted)...");
    
    try {
      const transferIx = createTransferCheckedInstruction(
        charlieAta,
        stablecoin.mintAddress,
        bobAta,
        charlie.publicKey,
        100000n,
        6,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      
      await addExtraAccountMetasForExecute(
        connection,
        transferIx,
        TRANSFER_HOOK_PROGRAM_ID,
        charlieAta,
        stablecoin.mintAddress,
        bobAta,
        charlie.publicKey,
        100000n,
        "confirmed"
      );
      
      const transferTx = new Transaction().add(transferIx);
      const sig = await connection.sendTransaction(transferTx, [charlie]);
      await connection.confirmTransaction(sig);
      
      console.log("❌ Transfer succeeded but should have failed!");
      process.exit(1);
    } catch (error: any) {
      console.log("✅ Transfer blocked (as expected)");
      console.log("   Error:", error.message);
      console.log();
    }
    
    // Step 10: Remove Charlie from blacklist
    console.log("🔟 Removing Charlie from blacklist...");
    
    await stablecoin.compliance.blacklistRemove(charlie.publicKey);
    
    const stillBlacklisted = await stablecoin.compliance.isBlacklisted(charlie.publicKey);
    console.log("✅ Charlie removed from blacklist:", !stillBlacklisted);
    console.log();
    
    // Step 11: Test transfer after removal (should succeed)
    console.log("1️⃣1️⃣  Testing transfer from Alice to Charlie (Charlie removed from blacklist)...");
    
    try {
      const transferIx = createTransferCheckedInstruction(
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        100000n,
        6,
        [],
        TOKEN_2022_PROGRAM_ID
      );
      
      await addExtraAccountMetasForExecute(
        connection,
        transferIx,
        TRANSFER_HOOK_PROGRAM_ID,
        aliceAta,
        stablecoin.mintAddress,
        charlieAta,
        alice.publicKey,
        100000n,
        "confirmed"
      );
      
      const transferTx = new Transaction().add(transferIx);
      const sig = await connection.sendTransaction(transferTx, [alice]);
      await connection.confirmTransaction(sig);
      
      console.log("✅ Transfer succeeded (as expected)");
      console.log("   Signature:", sig);
      console.log();
    } catch (error: any) {
      console.log("❌ Transfer failed unexpectedly:", error.message);
      throw error;
    }
    
    console.log("🎉 Transfer Hook Enforcement Test Complete!");
    console.log("\n📝 Test Results:");
    console.log("   ✅ Transfer between clean addresses: PASSED");
    console.log("   ✅ Transfer to blacklisted address blocked: PASSED");
    console.log("   ✅ Transfer from blacklisted address blocked: PASSED");
    console.log("   ✅ Transfer after blacklist removal: PASSED");
    console.log("\n💡 The transfer hook is working correctly!");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.logs) {
      console.error("   Logs:", error.logs);
    }
    throw error;
  }
}

test().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
