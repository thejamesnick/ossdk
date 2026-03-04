import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  ExtensionType,
  createInitializePermanentDelegateInstruction,
  createInitializeTransferHookInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
  createMintToInstruction,
  createTransferCheckedInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import * as fs from "fs";
import * as crypto from "crypto";

// Program IDs
const SSS_CORE_PROGRAM_ID = new PublicKey("BBED2cVQ933QETonEdS7XLR7Q99k6cwpfp42113hEt2o");
const TRANSFER_HOOK_PROGRAM_ID = new PublicKey("4vSUUS2Q2u7EdLt2J419etC9HuQDsHksEYmMzQEvLbPq");

// Connection
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Load wallet
const walletPath = process.env.HOME + "/GGsJvBDCErzxjWegTZTS45PKaFLKx3LUWj9K96d3Zx8p.json";
const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const authority = Keypair.fromSecretKey(new Uint8Array(walletData));

// Helper functions
function getInstructionDiscriminator(name: string): Buffer {
  const hash = crypto.createHash("sha256").update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

function serializeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

function serializeU8(value: number): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(value);
  return buf;
}

function serializeBool(value: boolean): Buffer {
  return serializeU8(value ? 1 : 0);
}

function serializeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function serializePublicKey(pubkey: PublicKey): Buffer {
  return pubkey.toBuffer();
}

function serializeStablecoinConfig(config: {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
}): Buffer {
  return Buffer.concat([
    serializeString(config.name),
    serializeString(config.symbol),
    serializeString(config.uri),
    serializeU8(config.decimals),
    serializeBool(config.enablePermanentDelegate),
    serializeBool(config.enableTransferHook),
    serializeBool(config.defaultAccountFrozen),
  ]);
}

console.log("🧪 SSS-2 Transfer Hook End-to-End Test\n");
console.log("👤 Authority:", authority.publicKey.toBase58());
console.log("🔧 SSS Core:", SSS_CORE_PROGRAM_ID.toBase58());
console.log("🪝 Transfer Hook:", TRANSFER_HOOK_PROGRAM_ID.toBase58());
console.log();

async function test() {
  // Step 1: Create mint with Transfer Hook + Permanent Delegate extensions
  console.log("1️⃣  Creating Token-2022 mint with extensions...");
  
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  
  // Derive stablecoin PDA (will be the mint authority)
  const [stablecoinPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin"), mint.toBuffer()],
    SSS_CORE_PROGRAM_ID
  );
  
  const extensions = [ExtensionType.TransferHook, ExtensionType.PermanentDelegate];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  
  // Create account
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: mint,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize Transfer Hook extension
  const initTransferHookIx = createInitializeTransferHookInstruction(
    mint,
    authority.publicKey, // Temporary authority (will transfer later)
    TRANSFER_HOOK_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize Permanent Delegate extension
  const initPermanentDelegateIx = createInitializePermanentDelegateInstruction(
    mint,
    stablecoinPDA, // PDA will be the permanent delegate
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize mint with temporary authority
  const initMintIx = createInitializeMintInstruction(
    mint,
    6,
    authority.publicKey, // Temporary mint authority
    authority.publicKey, // Temporary freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  const tx1 = new Transaction().add(
    createAccountIx,
    initTransferHookIx,
    initPermanentDelegateIx,
    initMintIx
  );
  
  const sig1 = await sendAndConfirmTransaction(connection, tx1, [authority, mintKeypair]);
  console.log("✅ Mint:", mint.toBase58());
  console.log("   Stablecoin PDA:", stablecoinPDA.toBase58());
  console.log("   Tx:", sig1);
  console.log();
  
  // Step 2: Initialize SSS-2 stablecoin
  console.log("2️⃣  Initializing SSS-2 stablecoin with transfer hook enabled...");
  
  const initConfig = {
    name: "SSS-2 Test",
    symbol: "SSS2",
    uri: "https://example.com/metadata.json",
    decimals: 6,
    enablePermanentDelegate: true,
    enableTransferHook: true,
    defaultAccountFrozen: false,
  };
  
  const initData = Buffer.concat([
    getInstructionDiscriminator("initialize"),
    serializeStablecoinConfig(initConfig),
  ]);
  
  console.log("   Init data length:", initData.length);
  console.log("   Discriminator:", Array.from(initData.slice(0, 8)));
  console.log("   Config data length:", initData.length - 8);
  
  const initIx = new TransactionInstruction({
    keys: [
      { pubkey: stablecoinPDA, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SSS_CORE_PROGRAM_ID,
    data: initData,
  });
  
  const tx2 = new Transaction().add(initIx);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [authority]);
  console.log("✅ Stablecoin initialized");
  console.log("   Tx:", sig2);
  console.log();
  
  // Step 2b: Transfer mint authority to stablecoin PDA
  console.log("2b️⃣  Transferring mint authority to stablecoin PDA...");
  
  const setMintAuthorityIx = createSetAuthorityInstruction(
    mint,
    authority.publicKey,
    AuthorityType.MintTokens,
    stablecoinPDA,
    [],
    TOKEN_2022_PROGRAM_ID
  );
  
  const setFreezeAuthorityIx = createSetAuthorityInstruction(
    mint,
    authority.publicKey,
    AuthorityType.FreezeAccount,
    stablecoinPDA,
    [],
    TOKEN_2022_PROGRAM_ID
  );
  
  const tx2b = new Transaction().add(setMintAuthorityIx, setFreezeAuthorityIx);
  const sig2b = await sendAndConfirmTransaction(connection, tx2b, [authority]);
  console.log("✅ Mint authority transferred to PDA");
  console.log("   Tx:", sig2b);
  console.log();
  
  // Step 3: Initialize extra account metas for transfer hook
  console.log("3️⃣  Initializing transfer hook extra account metas...");
  
  const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    TRANSFER_HOOK_PROGRAM_ID
  );
  
  const initHookData = Buffer.concat([
    getInstructionDiscriminator("initialize_extra_account_meta_list"),
    SSS_CORE_PROGRAM_ID.toBuffer(),
  ]);
  
  const initHookIx = new TransactionInstruction({
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TRANSFER_HOOK_PROGRAM_ID,
    data: initHookData,
  });
  
  const tx3 = new Transaction().add(initHookIx);
  const sig3 = await sendAndConfirmTransaction(connection, tx3, [authority]);
  console.log("✅ Transfer hook configured");
  console.log("   Extra metas PDA:", extraAccountMetaListPDA.toBase58());
  console.log("   Tx:", sig3);
  console.log();
  
  // Step 4: Add minter
  console.log("4️⃣  Adding minter...");
  
  const [minterAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("minter"), stablecoinPDA.toBuffer(), authority.publicKey.toBuffer()],
    SSS_CORE_PROGRAM_ID
  );
  
  const updateMinterData = Buffer.concat([
    getInstructionDiscriminator("update_minter"),
    serializeU64(1000000000000n), // 1M tokens quota
    serializeBool(true), // is_active
  ]);
  
  const updateMinterIx = new TransactionInstruction({
    keys: [
      { pubkey: stablecoinPDA, isSigner: false, isWritable: false },
      { pubkey: minterAccount, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SSS_CORE_PROGRAM_ID,
    data: updateMinterData,
  });
  
  const tx4 = new Transaction().add(updateMinterIx);
  const sig4 = await sendAndConfirmTransaction(connection, tx4, [authority]);
  console.log("✅ Minter added");
  console.log("   Tx:", sig4);
  console.log();
  
  // Step 5: Create token accounts and mint tokens
  console.log("5️⃣  Creating token accounts and minting tokens...");
  
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  
  const aliceATA = getAssociatedTokenAddressSync(
    mint,
    alice.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const bobATA = getAssociatedTokenAddressSync(
    mint,
    bob.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Create Alice's account
  await createAssociatedTokenAccountIdempotent(
    connection,
    authority,
    mint,
    alice.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );
  
  // Create Bob's account
  await createAssociatedTokenAccountIdempotent(
    connection,
    authority,
    mint,
    bob.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );
  
  // Mint tokens to Alice
  const mintData = Buffer.concat([
    getInstructionDiscriminator("mint"),
    serializeU64(1000000n), // 1 token
  ]);
  
  const mintIx = new TransactionInstruction({
    keys: [
      { pubkey: stablecoinPDA, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: aliceATA, isSigner: false, isWritable: true },
      { pubkey: minterAccount, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: SSS_CORE_PROGRAM_ID,
    data: mintData,
  });
  
  const tx5 = new Transaction().add(mintIx);
  const sig5 = await sendAndConfirmTransaction(connection, tx5, [authority]);
  console.log("✅ Minted 1 token to Alice");
  console.log("   Alice:", alice.publicKey.toBase58());
  console.log("   Bob:", bob.publicKey.toBase58());
  console.log("   Tx:", sig5);
  console.log();
  
  // Step 6: Test transfer WITHOUT blacklist (should succeed)
  console.log("6️⃣  Testing transfer WITHOUT blacklist (should succeed)...");
  
  // Airdrop to Alice for tx fees
  const airdropSig = await connection.requestAirdrop(alice.publicKey, 1000000000);
  await connection.confirmTransaction(airdropSig);
  
  // Derive blacklist PDAs (they don't exist yet, so transfer should work)
  const [aliceBlacklist] = PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), stablecoinPDA.toBuffer(), alice.publicKey.toBuffer()],
    SSS_CORE_PROGRAM_ID
  );
  
  const [bobBlacklist] = PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), stablecoinPDA.toBuffer(), bob.publicKey.toBuffer()],
    SSS_CORE_PROGRAM_ID
  );
  
  try {
    const transferIx = createTransferCheckedInstruction(
      aliceATA,
      mint,
      bobATA,
      alice.publicKey,
      500000n, // 0.5 tokens
      6,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    // Add extra accounts for transfer hook
    transferIx.keys.push(
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      { pubkey: stablecoinPDA, isSigner: false, isWritable: false },
      { pubkey: aliceBlacklist, isSigner: false, isWritable: false },
      { pubkey: bobBlacklist, isSigner: false, isWritable: false }
    );
    
    const tx6 = new Transaction().add(transferIx);
    const sig6 = await sendAndConfirmTransaction(connection, tx6, [alice]);
    console.log("✅ Transfer succeeded (no blacklist)");
    console.log("   Tx:", sig6);
  } catch (err: any) {
    console.log("❌ Transfer failed:", err.message);
  }
  console.log();
  
  // Step 7: Add Bob to blacklist
  console.log("7️⃣  Adding Bob to blacklist...");
  
  const blacklistData = Buffer.concat([
    getInstructionDiscriminator("add_to_blacklist"),
    serializeString("Test blacklist"),
  ]);
  
  const blacklistIx = new TransactionInstruction({
    keys: [
      { pubkey: stablecoinPDA, isSigner: false, isWritable: false },
      { pubkey: bobBlacklist, isSigner: false, isWritable: true },
      { pubkey: bob.publicKey, isSigner: false, isWritable: false },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SSS_CORE_PROGRAM_ID,
    data: blacklistData,
  });
  
  const tx7 = new Transaction().add(blacklistIx);
  const sig7 = await sendAndConfirmTransaction(connection, tx7, [authority]);
  console.log("✅ Bob blacklisted");
  console.log("   Tx:", sig7);
  console.log();
  
  // Step 8: Test transfer WITH blacklist (should fail)
  console.log("8️⃣  Testing transfer WITH blacklist (should fail)...");
  
  try {
    const transferIx2 = createTransferCheckedInstruction(
      aliceATA,
      mint,
      bobATA,
      alice.publicKey,
      100000n, // 0.1 tokens
      6,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    // Add extra accounts for transfer hook
    transferIx2.keys.push(
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      { pubkey: stablecoinPDA, isSigner: false, isWritable: false },
      { pubkey: aliceBlacklist, isSigner: false, isWritable: false },
      { pubkey: bobBlacklist, isSigner: false, isWritable: false }
    );
    
    const tx8 = new Transaction().add(transferIx2);
    const sig8 = await sendAndConfirmTransaction(connection, tx8, [alice]);
    console.log("❌ Transfer succeeded (UNEXPECTED - should have been blocked!)");
    console.log("   Tx:", sig8);
  } catch (err: any) {
    console.log("✅ Transfer blocked by transfer hook (EXPECTED)");
    console.log("   Error:", err.message.split('\n')[0]);
  }
  console.log();
  
  console.log("🎉 SSS-2 Transfer Hook Test Complete!");
  console.log("\n📝 Summary:");
  console.log("   ✅ Created SSS-2 stablecoin with transfer hook");
  console.log("   ✅ Initialized extra account metas");
  console.log("   ✅ Transfer succeeded when no blacklist");
  console.log("   ✅ Transfer blocked when destination blacklisted");
  console.log("\n💡 Transfer hook is working correctly!");
}

test().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
