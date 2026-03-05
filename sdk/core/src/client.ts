import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getMint,
  getAccount,
  getMintLen,
  ExtensionType,
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeTransferHookInstruction,
} from "@solana/spl-token";
import {
  StablecoinConfig,
  CreateWithPresetOptions,
  MintOptions,
  BurnOptions,
  MinterOptions,
  BlacklistAddOptions,
  SeizeOptions,
} from "./types";
import { getPresetConfig } from "./presets";
import {
  SSS_CORE_PROGRAM_ID,
  getStablecoinPDA,
  getMinterPDA,
  getBlacklistPDA,
  getInstructionDiscriminator,
  serializeStablecoinConfig,
  serializeU64,
  serializeBool,
  serializeString,
  serializePublicKey,
} from "./utils";

/**
 * Main SDK class for interacting with Solana Stablecoin Standard
 */
export class SolanaStablecoin {
  public readonly connection: Connection;
  public readonly mintAddress: PublicKey;
  public readonly stablecoin: PublicKey;
  public readonly authority: Keypair;
  public readonly programId: PublicKey;

  constructor(
    connection: Connection,
    mintAddress: PublicKey,
    stablecoin: PublicKey,
    authority: Keypair,
    programId: PublicKey = SSS_CORE_PROGRAM_ID
  ) {
    this.connection = connection;
    this.mintAddress = mintAddress;
    this.stablecoin = stablecoin;
    this.authority = authority;
    this.programId = programId;
  }

  /**
   * Create a new stablecoin with a preset configuration
   */
  static async create(
    connection: Connection,
    options: CreateWithPresetOptions,
    authority: Keypair,
    programId: PublicKey = SSS_CORE_PROGRAM_ID
  ): Promise<SolanaStablecoin> {
    // Get preset configuration
    const config = getPresetConfig(
      options.preset,
      options.name,
      options.symbol,
      options.uri || "",
      options.decimals || 6
    );

    return await SolanaStablecoin.createWithConfig(
      connection,
      config,
      authority,
      programId
    );
  }

  /**
   * Create a new stablecoin with custom configuration
   */
  static async createWithConfig(
    connection: Connection,
    config: StablecoinConfig,
    authority: Keypair,
    programId: PublicKey = SSS_CORE_PROGRAM_ID
  ): Promise<SolanaStablecoin> {
    const mintKeypair = Keypair.generate();
    const [stablecoin] = getStablecoinPDA(mintKeypair.publicKey, programId);

    // Create mint with appropriate extensions
    if (config.enablePermanentDelegate && config.enableTransferHook) {
      // Create mint with both Permanent Delegate and Transfer Hook for SSS-2
      const transferHookProgramId = new PublicKey("2pMqj2G5tEiCMoSyWHcoCX383q5ji2hZcVCDxSYiyHje");
      await SolanaStablecoin.createMintWithExtensions(
        connection,
        authority,
        stablecoin,
        stablecoin,
        config.decimals,
        stablecoin,
        transferHookProgramId,
        mintKeypair
      );
    } else if (config.enablePermanentDelegate) {
      // Create mint with Permanent Delegate extension only
      await SolanaStablecoin.createMintWithPermanentDelegate(
        connection,
        authority,
        stablecoin,
        stablecoin,
        config.decimals,
        stablecoin,
        mintKeypair
      );
    } else {
      // Create basic Token-2022 mint for SSS-1
      await createMint(
        connection,
        authority,
        stablecoin,
        stablecoin,
        config.decimals,
        mintKeypair,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
    }

    // Initialize stablecoin
    const initData = Buffer.concat([
      getInstructionDiscriminator("initialize"),
      serializeStablecoinConfig(config),
    ]);

    const initIx = new TransactionInstruction({
      keys: [
        { pubkey: stablecoin, isSigner: false, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: initData,
    });

    const transaction = new Transaction().add(initIx);
    await connection.sendTransaction(transaction, [authority]);
    await new Promise(resolve => setTimeout(resolve, 2000));

    return new SolanaStablecoin(
      connection,
      mintKeypair.publicKey,
      stablecoin,
      authority,
      programId
    );
  }

  /**
   * Load an existing stablecoin
   */
  static async load(
    connection: Connection,
    mint: PublicKey,
    authority: Keypair,
    programId: PublicKey = SSS_CORE_PROGRAM_ID
  ): Promise<SolanaStablecoin> {
    const [stablecoin] = getStablecoinPDA(mint, programId);

    return new SolanaStablecoin(
      connection,
      mint,
      stablecoin,
      authority,
      programId
    );
  }

  /**
   * Helper to create Token-2022 mint with Permanent Delegate extension
   */
  private static async createMintWithPermanentDelegate(
    connection: Connection,
    payer: Keypair,
    mintAuthority: PublicKey,
    freezeAuthority: PublicKey,
    decimals: number,
    permanentDelegate: PublicKey,
    mintKeypair: Keypair
  ): Promise<PublicKey> {
    const mintLen = getMintLen([ExtensionType.PermanentDelegate]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializePermanentDelegateInstruction(
        mintKeypair.publicKey,
        permanentDelegate,
        TOKEN_2022_PROGRAM_ID
      ),
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

  /**
   * Helper to create Token-2022 mint with both Permanent Delegate and Transfer Hook extensions
   */
  private static async createMintWithExtensions(
    connection: Connection,
    payer: Keypair,
    mintAuthority: PublicKey,
    freezeAuthority: PublicKey,
    decimals: number,
    permanentDelegate: PublicKey,
    transferHookProgramId: PublicKey,
    mintKeypair: Keypair
  ): Promise<PublicKey> {
    const extensions = [ExtensionType.PermanentDelegate, ExtensionType.TransferHook];
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializePermanentDelegateInstruction(
        mintKeypair.publicKey,
        permanentDelegate,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeTransferHookInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        transferHookProgramId,
        TOKEN_2022_PROGRAM_ID
      ),
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

  /**
   * Send and confirm a transaction
   */
  private async sendAndConfirm(
    instruction: TransactionInstruction,
    signers: Keypair[]
  ): Promise<string> {
    const transaction = new Transaction().add(instruction);
    const signature = await this.connection.sendTransaction(transaction, signers, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  /**
   * Mint tokens
   */
  async mintTokens(options: MintOptions): Promise<string> {
    const [minterAccount] = getMinterPDA(this.stablecoin, options.minter, this.programId);

    const recipientAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.authority,
      this.mintAddress,
      options.recipient,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const mintData = Buffer.concat([
      getInstructionDiscriminator("mint"),
      serializeU64(options.amount),
    ]);

    const mintIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: false },
        { pubkey: this.mintAddress, isSigner: false, isWritable: true },
        { pubkey: recipientAta.address, isSigner: false, isWritable: true },
        { pubkey: minterAccount, isSigner: false, isWritable: true },
        { pubkey: options.minter, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: mintData,
    });

    // Need to get the minter keypair to sign
    // This assumes the minter is passed in options
    const minterKeypair = options.minterKeypair || this.authority;
    return await this.sendAndConfirm(mintIx, [minterKeypair]);
  }

  /**
   * Burn tokens
   */
  async burn(options: BurnOptions): Promise<string> {
    const ownerAta = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.authority,
      this.mintAddress,
      options.owner,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const burnData = Buffer.concat([
      getInstructionDiscriminator("burn"),
      serializeU64(options.amount),
    ]);

    const burnIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: false },
        { pubkey: this.mintAddress, isSigner: false, isWritable: true },
        { pubkey: ownerAta.address, isSigner: false, isWritable: true },
        { pubkey: options.owner, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: burnData,
    });

    const ownerKeypair = options.ownerKeypair || this.authority;
    return await this.sendAndConfirm(burnIx, [ownerKeypair]);
  }

  /**
   * Freeze an account
   */
  async freeze(account: PublicKey): Promise<string> {
    const freezeData = getInstructionDiscriminator("freeze_account");

    const freezeIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: false },
        { pubkey: this.mintAddress, isSigner: false, isWritable: true },
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: freezeData,
    });

    return await this.sendAndConfirm(freezeIx, [this.authority]);
  }

  /**
   * Thaw an account
   */
  async thaw(account: PublicKey): Promise<string> {
    const thawData = getInstructionDiscriminator("thaw_account");

    const thawIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: false },
        { pubkey: this.mintAddress, isSigner: false, isWritable: true },
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: thawData,
    });

    return await this.sendAndConfirm(thawIx, [this.authority]);
  }

  /**
   * Pause all operations
   */
  async pause(): Promise<string> {
    const pauseData = getInstructionDiscriminator("pause");

    const pauseIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: pauseData,
    });

    return await this.sendAndConfirm(pauseIx, [this.authority]);
  }

  /**
   * Unpause operations
   */
  async unpause(): Promise<string> {
    const unpauseData = getInstructionDiscriminator("unpause");

    const unpauseIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: unpauseData,
    });

    return await this.sendAndConfirm(unpauseIx, [this.authority]);
  }

  /**
   * Add or update a minter
   */
  async updateMinter(options: MinterOptions): Promise<string> {
    const [minterAccount] = getMinterPDA(this.stablecoin, options.minter, this.programId);

    const updateMinterData = Buffer.concat([
      getInstructionDiscriminator("update_minter"),
      serializeU64(options.quota),
      serializeBool(options.isActive),
    ]);

    const updateMinterIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: false },
        { pubkey: minterAccount, isSigner: false, isWritable: true },
        { pubkey: options.minter, isSigner: false, isWritable: false },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: updateMinterData,
    });

    return await this.sendAndConfirm(updateMinterIx, [this.authority]);
  }

  /**
   * Transfer authority to a new address
   */
  async transferAuthority(newAuthority: PublicKey): Promise<string> {
    const transferAuthorityData = Buffer.concat([
      getInstructionDiscriminator("transfer_authority"),
      serializePublicKey(newAuthority),
    ]);

    const transferAuthorityIx = new TransactionInstruction({
      keys: [
        { pubkey: this.stablecoin, isSigner: false, isWritable: true },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: transferAuthorityData,
    });

    return await this.sendAndConfirm(transferAuthorityIx, [this.authority]);
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<bigint> {
    const mintInfo = await getMint(
      this.connection,
      this.mintAddress,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    return mintInfo.supply;
  }

  /**
   * Compliance module (SSS-2 only)
   */
  get compliance() {
    return {
      /**
       * Add address to blacklist
       */
      blacklistAdd: async (options: BlacklistAddOptions): Promise<string> => {
        const [blacklistEntry] = getBlacklistPDA(this.stablecoin, options.address, this.programId);

        const addBlacklistData = Buffer.concat([
          getInstructionDiscriminator("add_to_blacklist"),
          serializeString(options.reason),
        ]);

        const addBlacklistIx = new TransactionInstruction({
          keys: [
            { pubkey: this.stablecoin, isSigner: false, isWritable: false },
            { pubkey: blacklistEntry, isSigner: false, isWritable: true },
            { pubkey: options.address, isSigner: false, isWritable: false },
            { pubkey: this.authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: this.programId,
          data: addBlacklistData,
        });

        return await this.sendAndConfirm(addBlacklistIx, [this.authority]);
      },

      /**
       * Remove address from blacklist
       */
      blacklistRemove: async (address: PublicKey): Promise<string> => {
        const [blacklistEntry] = getBlacklistPDA(this.stablecoin, address, this.programId);

        const removeBlacklistData = getInstructionDiscriminator("remove_from_blacklist");

        const removeBlacklistIx = new TransactionInstruction({
          keys: [
            { pubkey: this.stablecoin, isSigner: false, isWritable: false },
            { pubkey: blacklistEntry, isSigner: false, isWritable: true },
            { pubkey: this.authority.publicKey, isSigner: true, isWritable: true },
          ],
          programId: this.programId,
          data: removeBlacklistData,
        });

        return await this.sendAndConfirm(removeBlacklistIx, [this.authority]);
      },

      /**
       * Check if address is blacklisted
       */
      isBlacklisted: async (address: PublicKey): Promise<boolean> => {
        try {
          const [blacklistEntry] = getBlacklistPDA(this.stablecoin, address, this.programId);
          const accountInfo = await this.connection.getAccountInfo(blacklistEntry);
          return accountInfo !== null;
        } catch {
          return false;
        }
      },

      /**
       * Seize tokens from an account
       */
      seize: async (options: SeizeOptions): Promise<string> => {
        const sourceAta = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.authority,
          this.mintAddress,
          options.from,
          false,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const destinationAta = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.authority,
          this.mintAddress,
          options.to,
          false,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const seizeData = Buffer.concat([
          getInstructionDiscriminator("seize"),
          serializeU64(options.amount),
        ]);

        const seizeIx = new TransactionInstruction({
          keys: [
            { pubkey: this.stablecoin, isSigner: false, isWritable: false },
            { pubkey: this.mintAddress, isSigner: false, isWritable: true },
            { pubkey: sourceAta.address, isSigner: false, isWritable: true },
            { pubkey: destinationAta.address, isSigner: false, isWritable: true },
            { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          programId: this.programId,
          data: seizeData,
        });

        return await this.sendAndConfirm(seizeIx, [this.authority]);
      },
    };
  }
}
