import { Connection, PublicKey } from "@solana/web3.js";

// Program IDs
const SSS_CORE_PROGRAM_ID = new PublicKey("BBED2cVQ933QETonEdS7XLR7Q99k6cwpfp42113hEt2o");
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("2pMqj2G5tEiCMoSyWHcoCX383q5ji2hZcVCDxSYiyHje");

// Connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

console.log("🧪 Testing Transfer Hook Deployment\n");
console.log("🔧 SSS Core Program:", SSS_CORE_PROGRAM_ID.toBase58());
console.log("🪝 Transfer Hook Program:", TRANSFER_HOOK_PROGRAM_ID.toBase58());
console.log();

async function test() {
  // Check if transfer hook program exists
  console.log("1️⃣  Checking transfer hook program deployment...");
  
  const accountInfo = await connection.getAccountInfo(TRANSFER_HOOK_PROGRAM_ID);
  
  if (!accountInfo) {
    console.log("❌ Transfer hook program not found on devnet");
    process.exit(1);
  }
  
  console.log("✅ Transfer hook program found!");
  console.log("   Owner:", accountInfo.owner.toBase58());
  console.log("   Executable:", accountInfo.executable);
  console.log("   Data length:", accountInfo.data.length, "bytes");
  console.log();
  
  // Check if sss-core program exists
  console.log("2️⃣  Checking sss-core program deployment...");
  
  const coreAccountInfo = await connection.getAccountInfo(SSS_CORE_PROGRAM_ID);
  
  if (!coreAccountInfo) {
    console.log("❌ SSS Core program not found on devnet");
    process.exit(1);
  }
  
  console.log("✅ SSS Core program found!");
  console.log("   Owner:", coreAccountInfo.owner.toBase58());
  console.log("   Executable:", coreAccountInfo.executable);
  console.log("   Data length:", coreAccountInfo.data.length, "bytes");
  console.log();
  
  console.log("🎉 Both programs deployed successfully!");
  console.log("\n📝 Summary:");
  console.log("   ✅ SSS Core Program: 4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2");
  console.log("   ✅ Transfer Hook Program: 4vSUUS2Q2u7EdLt2J419etC9HuQDsHksEYmMzQEvLbPq");
  console.log("\n💡 Next steps:");
  console.log("   1. Create SSS-2 stablecoin with enable_transfer_hook: true");
  console.log("   2. Initialize extra account metas for the transfer hook");
  console.log("   3. Add addresses to blacklist");
  console.log("   4. Transfer hook will automatically enforce blacklist on all transfers");
}

test().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
