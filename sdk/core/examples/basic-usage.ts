import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { SolanaStablecoin, PresetType } from "../src";
import * as fs from "fs";

/**
 * Example: Create and use a stablecoin with the SDK
 */
async function main() {
  console.log("🚀 Testing SDK with Basic Usage Example\n");
  console.log("=" .repeat(60));
  
  // Setup connection
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load your authority keypair
  const walletPath = process.env.HOME + "/GGsJvBDCErzxjWegTZTS45PKaFLKx3LUWj9K96d3Zx8p.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log("👤 Authority:", authority.publicKey.toBase58());
  const balance = await connection.getBalance(authority.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL");
  console.log("=" .repeat(60) + "\n");
  
  console.log("TEST 1: Creating SSS-1 Minimal Stablecoin");
  console.log("-".repeat(60));
  
  // Create a new stablecoin with SSS-1 preset
  const stablecoin = await SolanaStablecoin.create(
    connection,
    {
      preset: PresetType.SSS_1,
      name: "SDK Test Stablecoin",
      symbol: "SDKTEST",
      decimals: 6,
    },
    authority
  );
  
  console.log("✅ Stablecoin created!");
  console.log("   Mint:", stablecoin.mintAddress.toBase58());
  console.log("   Stablecoin PDA:", stablecoin.stablecoin.toBase58());
  console.log();
  
  // Add a minter
  console.log("TEST 2: Adding Minter");
  console.log("-".repeat(60));
  const minter = Keypair.generate();
  
  // Fund minter from authority wallet (avoid airdrop rate limits)
  const fundMinterTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: minter.publicKey,
      lamports: 100_000_000, // 0.1 SOL
    })
  );
  await connection.sendTransaction(fundMinterTx, [authority]);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await stablecoin.updateMinter({
    minter: minter.publicKey,
    quota: 1_000_000_000_000n, // 1M tokens
    isActive: true,
  });
  console.log("✅ Minter added:", minter.publicKey.toBase58());
  console.log("   Quota: 1,000,000 tokens");
  console.log();
  
  // Mint tokens
  console.log("TEST 3: Minting Tokens");
  console.log("-".repeat(60));
  const recipient = Keypair.generate();
  await stablecoin.mintTokens({
    recipient: recipient.publicKey,
    amount: 1_000_000n, // 1 token (6 decimals)
    minter: minter.publicKey,
    minterKeypair: minter,
  });
  console.log("✅ Minted 1 token to:", recipient.publicKey.toBase58());
  console.log();
  
  // Check total supply
  console.log("TEST 4: Checking Total Supply");
  console.log("-".repeat(60));
  const supply = await stablecoin.getTotalSupply();
  console.log("✅ Total supply:", supply.toString(), "tokens");
  console.log();
  
  // Pause operations
  console.log("TEST 5: Pausing Stablecoin");
  console.log("-".repeat(60));
  await stablecoin.pause();
  console.log("✅ Stablecoin paused");
  console.log();
  
  // Unpause
  console.log("TEST 6: Unpausing Stablecoin");
  console.log("-".repeat(60));
  await stablecoin.unpause();
  console.log("✅ Stablecoin unpaused");
  console.log();
  
  console.log("=" .repeat(60));
  console.log("🎉 All SDK tests passed!");
  console.log("=" .repeat(60));
  console.log("\n💡 The SDK is working perfectly with raw web3.js!");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  if (error.logs) {
    console.log("\n📋 Program logs:");
    error.logs.forEach((log: string) => console.log("  ", log));
  }
  process.exit(1);
});
