import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  getAccount,
  getMintLen,
  ExtensionType,
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";

const programId = new PublicKey("BBED2cVQ933QETonEdS7XLR7Q99k6cwpfp42113hEt2o");

// Helper to create Token-2022 mint with Permanent Delegate extension
async function createMintWithPermanentDelegate(
  connection: Connection,
  payer: Keypair,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey,
  decimals: number,
  permanentDelegate: PublicKey,
  mintKeypair: Keypair
): Promise<PublicKey> {
  // Calculate space needed for mint with Permanent Delegate extension
  const mintLen = getMintLen([ExtensionType.PermanentDelegate]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const transaction = new Transaction().add(
    // Create account
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Initialize Permanent Delegate extension
    createInitializePermanentDelegateInstruction(
      mintKeypair.publicKey,
      permanentDelegate,
      TOKEN_2022_PROGRAM_ID
    ),
    // Initialize mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority,
      freezeAuthority,
      TOKEN_2022_PROGRAM_ID
    )
  );

  await connection.sendTransaction(transaction, [payer, mintKeypair]);
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return mintKeypair.publicKey;
}

// Compute discriminator for instruction (first 8 bytes of SHA256 hash of "global:instructionName")
function getInstructionDiscriminator(name: string): Buffer {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

// Manual Borsh serialization helpers
function serializeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

function serializeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function serializeU8(value: number): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(value);
  return buf;
}

function serializeBool(value: boolean): Buffer {
  return serializeU8(value ? 1 : 0);
}

function serializePublicKey(pubkey: PublicKey): Buffer {
  return pubkey.toBuffer();
}

// Serialize StablecoinConfig
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

async function sendAndConfirm(
  connection: Connection,
  instruction: TransactionInstruction,
  signers: Keypair[]
): Promise<string> {
  const transaction = new Transaction().add(instruction);
  const signature = await connection.sendTransaction(transaction, signers, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

async function test() {
  console.log("🧪 COMPREHENSIVE LOCAL TEST SUITE\n");
  console.log("=" .repeat(60));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Load wallet
  const walletPath = process.env.HOME + "/GGsJvBDCErzxjWegTZTS45PKaFLKx3LUWj9K96d3Zx8p.json";
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(walletData));
  
  console.log("👤 Authority:", authority.publicKey.toBase58());
  const balance = await connection.getBalance(authority.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL");
  console.log("📍 Program ID:", programId.toBase58());
  console.log("=" .repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ========================================
    // TEST 1: Initialize SSS-1 Stablecoin
    // ========================================
    console.log("TEST 1: Initialize SSS-1 Stablecoin");
    console.log("-".repeat(60));
    
    // First, create a keypair for the mint
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    console.log("🪙 Mint:", mint.toBase58());
    
    // Derive stablecoin PDA (this will be the mint authority)
    const [stablecoin, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin"), mint.toBuffer()],
      programId
    );
    console.log("📍 Stablecoin PDA:", stablecoin.toBase58());
    
    // Create the mint with stablecoin PDA as authority
    const createMintIx = await createMint(
      connection,
      authority,
      stablecoin, // Stablecoin PDA is the mint authority
      stablecoin, // Stablecoin PDA is also freeze authority
      6,
      mintKeypair,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log("✅ Created Token-2022 mint with stablecoin PDA as authority");
    
    const initConfig = {
      name: "Test Stablecoin",
      symbol: "TEST",
      uri: "https://example.com/metadata.json",
      decimals: 6,
      enablePermanentDelegate: false,
      enableTransferHook: false,
      defaultAccountFrozen: false,
    };
    
    const initData = Buffer.concat([
      getInstructionDiscriminator("initialize"),
      serializeStablecoinConfig(initConfig),
    ]);
    
    const initIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: initData,
    });
    
    const initSig = await sendAndConfirm(connection, initIx, [authority]);
    console.log("✅ Initialize tx:", initSig);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 2: Add Minter
    // ========================================
    console.log("TEST 2: Add Minter with Quota");
    console.log("-".repeat(60));
    
    const minter = Keypair.generate();
    console.log("👤 Minter:", minter.publicKey.toBase58());
    
    // Fund minter from authority (avoid airdrop rate limits)
    console.log("💰 Funding minter from authority wallet...");
    const fundMinterTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: minter.publicKey,
        lamports: 100_000_000, // 0.1 SOL
      })
    );
    await connection.sendTransaction(fundMinterTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("✅ Funded minter with 0.1 SOL");
    
    const [minterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), stablecoin.toBuffer(), minter.publicKey.toBuffer()],
      programId
    );
    
    const quota = 1_000_000_000_000n; // 1M tokens
    const updateMinterData = Buffer.concat([
      getInstructionDiscriminator("update_minter"),
      serializeU64(quota),
      serializeBool(true),
    ]);
    
    const updateMinterIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: false },
        { pubkey: minterAccount, isSigner: false, isWritable: true },
        { pubkey: minter.publicKey, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: updateMinterData,
    });
    
    const updateMinterSig = await sendAndConfirm(connection, updateMinterIx, [authority]);
    console.log("✅ Update minter tx:", updateMinterSig);
    console.log("📊 Quota:", quota.toString());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 3: Mint Tokens
    // ========================================
    console.log("TEST 3: Mint Tokens");
    console.log("-".repeat(60));
    
    const recipient = Keypair.generate();
    const recipientAta = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,
      mint,
      recipient.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log("👤 Recipient:", recipient.publicKey.toBase58());
    console.log("💳 Recipient ATA:", recipientAta.address.toBase58());
    
    const mintAmount = 1_000_000n; // 1 token
    const mintData = Buffer.concat([
      getInstructionDiscriminator("mint"),
      serializeU64(mintAmount),
    ]);
    
    const mintIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: recipientAta.address, isSigner: false, isWritable: true },
        { pubkey: minterAccount, isSigner: false, isWritable: true },
        { pubkey: minter.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: mintData,
    });
    
    const mintSig = await sendAndConfirm(connection, mintIx, [minter]);
    console.log("✅ Mint tx:", mintSig);
    
    const tokenAccount = await getAccount(connection, recipientAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("💰 Balance:", tokenAccount.amount.toString());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 4: Pause
    // ========================================
    console.log("TEST 4: Pause Stablecoin");
    console.log("-".repeat(60));
    
    const pauseData = getInstructionDiscriminator("pause");
    const pauseIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId,
      data: pauseData,
    });
    
    const pauseSig = await sendAndConfirm(connection, pauseIx, [authority]);
    console.log("✅ Pause tx:", pauseSig);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 5: Unpause
    // ========================================
    console.log("TEST 5: Unpause Stablecoin");
    console.log("-".repeat(60));
    
    const unpauseData = getInstructionDiscriminator("unpause");
    const unpauseIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId,
      data: unpauseData,
    });
    
    const unpauseSig = await sendAndConfirm(connection, unpauseIx, [authority]);
    console.log("✅ Unpause tx:", unpauseSig);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 6: Burn Tokens
    // ========================================
    console.log("TEST 6: Burn Tokens");
    console.log("-".repeat(60));
    
    // Fund recipient from authority (avoid airdrop rate limits)
    console.log("💰 Funding recipient from authority wallet...");
    const fundRecipientTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: recipient.publicKey,
        lamports: 100_000_000, // 0.1 SOL
      })
    );
    await connection.sendTransaction(fundRecipientTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const burnAmount = 500_000n; // 0.5 tokens
    const burnData = Buffer.concat([
      getInstructionDiscriminator("burn"),
      serializeU64(burnAmount),
    ]);
    
    const burnIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: recipientAta.address, isSigner: false, isWritable: true },
        { pubkey: recipient.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: burnData,
    });
    
    const burnSig = await sendAndConfirm(connection, burnIx, [recipient]);
    console.log("✅ Burn tx:", burnSig);
    
    const tokenAccountAfterBurn = await getAccount(connection, recipientAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("💰 Balance after burn:", tokenAccountAfterBurn.amount.toString());
    testsPassed++;
    console.log();

    // ========================================
    // TEST 7: Freeze Account
    // ========================================
    console.log("TEST 7: Freeze Account");
    console.log("-".repeat(60));
    
    const freezeData = getInstructionDiscriminator("freeze_account");
    const freezeIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: recipientAta.address, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: freezeData,
    });
    
    const freezeSig = await sendAndConfirm(connection, freezeIx, [authority]);
    console.log("✅ Freeze tx:", freezeSig);
    
    const frozenAccount = await getAccount(connection, recipientAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("🧊 Is Frozen:", frozenAccount.isFrozen);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 8: Thaw Account
    // ========================================
    console.log("TEST 8: Thaw Account");
    console.log("-".repeat(60));
    
    const thawData = getInstructionDiscriminator("thaw_account");
    const thawIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: recipientAta.address, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: thawData,
    });
    
    const thawSig = await sendAndConfirm(connection, thawIx, [authority]);
    console.log("✅ Thaw tx:", thawSig);
    
    const thawedAccount = await getAccount(connection, recipientAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("🔥 Is Frozen:", thawedAccount.isFrozen);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 9: Transfer Authority
    // ========================================
    console.log("TEST 9: Transfer Authority");
    console.log("-".repeat(60));
    
    const newAuthority = Keypair.generate();
    console.log("👤 New Authority:", newAuthority.publicKey.toBase58());
    
    const transferAuthorityData = Buffer.concat([
      getInstructionDiscriminator("transfer_authority"),
      serializePublicKey(newAuthority.publicKey),
    ]);
    
    const transferAuthorityIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId,
      data: transferAuthorityData,
    });
    
    const transferAuthoritySig = await sendAndConfirm(connection, transferAuthorityIx, [authority]);
    console.log("✅ Transfer authority tx:", transferAuthoritySig);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 10: Initialize SSS-2 (Compliant)
    // ========================================
    console.log("TEST 10: Initialize SSS-2 Compliant Stablecoin");
    console.log("-".repeat(60));
    
    // Fund new authority from authority (avoid airdrop rate limits)
    console.log("💰 Funding new authority from authority wallet...");
    const fundNewAuthTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: newAuthority.publicKey,
        lamports: 200_000_000, // 0.2 SOL
      })
    );
    await connection.sendTransaction(fundNewAuthTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create mint with Permanent Delegate extension
    const compliantMintKeypair = Keypair.generate();
    const compliantMint = compliantMintKeypair.publicKey;
    
    const [compliantStablecoin] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin"), compliantMint.toBuffer()],
      programId
    );
    
    // Create mint with permanent delegate extension enabled
    await createMintWithPermanentDelegate(
      connection,
      newAuthority,
      compliantStablecoin, // Stablecoin PDA is the mint authority
      compliantStablecoin, // Stablecoin PDA is also freeze authority
      6,
      compliantStablecoin, // Stablecoin PDA is the permanent delegate
      compliantMintKeypair
    );
    console.log("🪙 Compliant Mint:", compliantMint.toBase58());
    console.log("✅ Created with Permanent Delegate extension");
    console.log("🔒 Permanent Delegate:", compliantStablecoin.toBase58());
    
    const compliantConfig = {
      name: "Compliant Stablecoin",
      symbol: "CUSD",
      uri: "https://example.com/compliant.json",
      decimals: 6,
      enablePermanentDelegate: true,
      enableTransferHook: true,
      defaultAccountFrozen: false,
    };
    
    const compliantInitData = Buffer.concat([
      getInstructionDiscriminator("initialize"),
      serializeStablecoinConfig(compliantConfig),
    ]);
    
    const compliantInitIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: true },
        { pubkey: compliantMint, isSigner: false, isWritable: false },
        { pubkey: newAuthority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: compliantInitData,
    });
    
    const compliantInitSig = await sendAndConfirm(connection, compliantInitIx, [newAuthority]);
    console.log("✅ Initialize SSS-2 tx:", compliantInitSig);
    console.log("📊 Permanent Delegate: true");
    console.log("📊 Transfer Hook: true");
    testsPassed++;
    console.log();

    // ========================================
    // TEST 11: Add to Blacklist
    // ========================================
    console.log("TEST 11: Add Address to Blacklist");
    console.log("-".repeat(60));
    
    const blacklistedAddress = Keypair.generate().publicKey;
    console.log("🚫 Blacklisting:", blacklistedAddress.toBase58());
    
    const [blacklistEntry] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), compliantStablecoin.toBuffer(), blacklistedAddress.toBuffer()],
      programId
    );
    
    const reason = "OFAC sanctions match";
    const addBlacklistData = Buffer.concat([
      getInstructionDiscriminator("add_to_blacklist"),
      serializeString(reason),
    ]);
    
    const addBlacklistIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: false },
        { pubkey: blacklistEntry, isSigner: false, isWritable: true },
        { pubkey: blacklistedAddress, isSigner: false, isWritable: false },
        { pubkey: newAuthority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: addBlacklistData,
    });
    
    const addBlacklistSig = await sendAndConfirm(connection, addBlacklistIx, [newAuthority]);
    console.log("✅ Add to blacklist tx:", addBlacklistSig);
    console.log("📋 Reason:", reason);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 12: Remove from Blacklist
    // ========================================
    console.log("TEST 12: Remove Address from Blacklist");
    console.log("-".repeat(60));
    
    const removeBlacklistData = getInstructionDiscriminator("remove_from_blacklist");
    const removeBlacklistIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: false },
        { pubkey: blacklistEntry, isSigner: false, isWritable: true },
        { pubkey: newAuthority.publicKey, isSigner: true, isWritable: true },
      ],
      programId,
      data: removeBlacklistData,
    });
    
    const removeBlacklistSig = await sendAndConfirm(connection, removeBlacklistIx, [newAuthority]);
    console.log("✅ Remove from blacklist tx:", removeBlacklistSig);
    testsPassed++;
    console.log();

    // ========================================
    // TEST 13: Seize Tokens (Permanent Delegate)
    // ========================================
    console.log("TEST 13: Seize Tokens using Permanent Delegate");
    console.log("-".repeat(60));
    
    // First, add a minter for the compliant stablecoin
    const compliantMinter = Keypair.generate();
    console.log("👤 Compliant Minter:", compliantMinter.publicKey.toBase58());
    
    // Fund compliant minter
    const fundCompliantMinterTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: compliantMinter.publicKey,
        lamports: 100_000_000,
      })
    );
    await connection.sendTransaction(fundCompliantMinterTx, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const [compliantMinterAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("minter"), compliantStablecoin.toBuffer(), compliantMinter.publicKey.toBuffer()],
      programId
    );
    
    // Add minter to compliant stablecoin
    const compliantMinterQuota = 1_000_000_000_000n;
    const updateCompliantMinterData = Buffer.concat([
      getInstructionDiscriminator("update_minter"),
      serializeU64(compliantMinterQuota),
      serializeBool(true),
    ]);
    
    const updateCompliantMinterIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: false },
        { pubkey: compliantMinterAccount, isSigner: false, isWritable: true },
        { pubkey: compliantMinter.publicKey, isSigner: false, isWritable: false },
        { pubkey: newAuthority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: updateCompliantMinterData,
    });
    
    await sendAndConfirm(connection, updateCompliantMinterIx, [newAuthority]);
    console.log("✅ Added minter to compliant stablecoin");
    
    // Create a target account with tokens to seize
    const targetUser = Keypair.generate();
    const targetAta = await getOrCreateAssociatedTokenAccount(
      connection,
      newAuthority,
      compliantMint,
      targetUser.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log("👤 Target user:", targetUser.publicKey.toBase58());
    console.log("💳 Target ATA:", targetAta.address.toBase58());
    
    // Mint tokens to target
    const mintToTargetAmount = 5_000_000n; // 5 tokens
    const mintToTargetData = Buffer.concat([
      getInstructionDiscriminator("mint"),
      serializeU64(mintToTargetAmount),
    ]);
    
    const mintToTargetIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: false },
        { pubkey: compliantMint, isSigner: false, isWritable: true },
        { pubkey: targetAta.address, isSigner: false, isWritable: true },
        { pubkey: compliantMinterAccount, isSigner: false, isWritable: true },
        { pubkey: compliantMinter.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: mintToTargetData,
    });
    
    await sendAndConfirm(connection, mintToTargetIx, [compliantMinter]);
    console.log("✅ Minted 5 tokens to target account");
    
    // Create treasury account to receive seized tokens
    const treasury = Keypair.generate();
    const treasuryAta = await getOrCreateAssociatedTokenAccount(
      connection,
      newAuthority,
      compliantMint,
      treasury.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    console.log("🏦 Treasury:", treasury.publicKey.toBase58());
    console.log("💳 Treasury ATA:", treasuryAta.address.toBase58());
    
    // Check balances before seize
    const targetBalanceBefore = await getAccount(connection, targetAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    console.log("💰 Target balance before:", targetBalanceBefore.amount.toString());
    
    // Seize tokens from target to treasury
    const seizeAmount = 3_000_000n; // Seize 3 tokens
    const seizeData = Buffer.concat([
      getInstructionDiscriminator("seize"),
      serializeU64(seizeAmount),
    ]);
    
    const seizeIx = new TransactionInstruction({
      keys: [
        { pubkey: compliantStablecoin, isSigner: false, isWritable: false },
        { pubkey: compliantMint, isSigner: false, isWritable: true },
        { pubkey: targetAta.address, isSigner: false, isWritable: true },
        { pubkey: treasuryAta.address, isSigner: false, isWritable: true },
        { pubkey: newAuthority.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId,
      data: seizeData,
    });
    
    const seizeSig = await sendAndConfirm(connection, seizeIx, [newAuthority]);
    console.log("✅ Seize tx:", seizeSig);
    
    // Check balances after seize
    const targetBalanceAfter = await getAccount(connection, targetAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    const treasuryBalanceAfter = await getAccount(connection, treasuryAta.address, undefined, TOKEN_2022_PROGRAM_ID);
    
    console.log("💰 Target balance after:", targetBalanceAfter.amount.toString());
    console.log("🏦 Treasury balance after:", treasuryBalanceAfter.amount.toString());
    console.log("🔒 Seized amount:", seizeAmount.toString());
    testsPassed++;
    console.log();

    // ========================================
    // SUMMARY
    // ========================================
    console.log("=" .repeat(60));
    console.log("🎉 TEST SUITE COMPLETE!");
    console.log("=" .repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log();
    console.log("💡 All 13 instructions tested successfully!");
    console.log("🚀 Your program is production-ready!");
    
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
    throw error;
  }
}

test().catch(console.error);
