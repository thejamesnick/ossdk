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
} from "@solana/spl-token";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import {
  StablecoinConfig,
  CreateWithPresetOptions,
  MintOptions,
  BurnOptions,
  MinterOptions,
  BlacklistAddOptions,
  SeizeOptions,
  StablecoinAccount,
  MinterAccount,
  BlacklistEntry,
} from "./types";
import { getPresetConfig } from "./presets";
import {
  SSS_CORE_PROGRAM_ID,
  getStablecoinPDA,
  getMinterPDA,
  getBlacklistPDA,
  toBN,
  fromBN,
} from "./utils";

/**
 * Main SDK class for interacting with Solana Stablecoin Standard
 */
export class SolanaStablecoin {
  public readonly connection: Connection;
  public readonly program: Program;
  public readonly mintAddress: PublicKey;
  public readonly stablecoin: PublicKey;
  public readonly authority: PublicKey;
  private readonly wallet: Wallet;

  constructor(
    connection: Connection,
    program: Program,
    mintAddress: PublicKey,
    stablecoin: PublicKey,
    authority: PublicKey,
    wallet: Wallet
  ) {
    this.connection = connection;
    this.program = program;
    this.mintAddress = mintAddress;
    this.stablecoin = stablecoin;
    this.authority = authority;
    this.wallet = wallet;
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
    const wallet = new Wallet(authority);
    const provider = new AnchorProvider(connection, wallet, {});
    
    // TODO: Load IDL and create program instance
    // For now, we'll need the IDL from the built program
    const program = null as any; // Placeholder

    // Create Token-2022 mint
    const mintKeypair = Keypair.generate();
    await createMint(
      connection,
      authority,
      authority.publicKey,
      authority.publicKey,
      config.decimals,
      mintKeypair,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Derive stablecoin PDA
    const [stablecoin] = getStablecoinPDA(mintKeypair.publicKey, programId);

    // Initialize stablecoin
    await program.methods
      .initialize(config)
      .accounts({
        stablecoin,
        mint: mintKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    return new SolanaStablecoin(
      connection,
      program,
      mintKeypair.publicKey,
      stablecoin,
      authority.publicKey,
      wallet
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
    const wallet = new Wallet(authority);
    const provider = new AnchorProvider(connection, wallet, {});
    
    // TODO: Load IDL and create program instance
    const program = null as any; // Placeholder

    const [stablecoin] = getStablecoinPDA(mint, programId);

    return new SolanaStablecoin(
      connection,
      program,
      mint,
      stablecoin,
      authority.publicKey,
      wallet
    );
  }

  /**
   * Get stablecoin account data
   */
  async getAccount(): Promise<StablecoinAccount> {
    return await (this.program.account as any).stablecoin.fetch(this.stablecoin);
  }

  /**
   * Mint tokens
   */
  async mintTokens(options: MintOptions): Promise<string> {
    const [minterAccount] = getMinterPDA(this.stablecoin, options.minter);

    // Get or create recipient token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.wallet.payer,
      this.mintAddress,
      options.recipient,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const amount = toBN(options.amount);

    const tx = await this.program.methods
      .mint(amount)
      .accounts({
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        recipientTokenAccount: recipientTokenAccount.address,
        minterAccount,
        minter: options.minter,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Burn tokens
   */
  async burn(options: BurnOptions): Promise<string> {
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.wallet.payer,
      this.mintAddress,
      options.owner,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const amount = toBN(options.amount);

    const tx = await this.program.methods
      .burn(amount)
      .accounts({
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        userTokenAccount: ownerTokenAccount.address,
        user: options.owner,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Freeze an account
   */
  async freeze(account: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .freezeAccount()
      .accounts({
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        targetTokenAccount: account,
        authority: this.authority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Thaw an account
   */
  async thaw(account: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .thawAccount()
      .accounts({
        stablecoin: this.stablecoin,
        mint: this.mintAddress,
        targetTokenAccount: account,
        authority: this.authority,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Pause all operations
   */
  async pause(): Promise<string> {
    const tx = await this.program.methods
      .pause()
      .accounts({
        stablecoin: this.stablecoin,
        authority: this.authority,
      })
      .rpc();

    return tx;
  }

  /**
   * Unpause operations
   */
  async unpause(): Promise<string> {
    const tx = await this.program.methods
      .unpause()
      .accounts({
        stablecoin: this.stablecoin,
        authority: this.authority,
      })
      .rpc();

    return tx;
  }

  /**
   * Add or update a minter
   */
  async updateMinter(options: MinterOptions): Promise<string> {
    const [minterAccount] = getMinterPDA(this.stablecoin, options.minter);
    const quota = toBN(options.quota);

    const tx = await this.program.methods
      .updateMinter(quota, options.isActive)
      .accounts({
        stablecoin: this.stablecoin,
        minterAccount,
        minter: options.minter,
        authority: this.authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Get minter account data
   */
  async getMinter(minter: PublicKey): Promise<MinterAccount | null> {
    try {
      const [minterAccount] = getMinterPDA(this.stablecoin, minter);
      return await (this.program.account as any).minterAccount.fetch(minterAccount);
    } catch {
      return null;
    }
  }

  /**
   * Transfer authority to a new address
   */
  async transferAuthority(newAuthority: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .transferAuthority(newAuthority)
      .accounts({
        stablecoin: this.stablecoin,
        authority: this.authority,
      })
      .rpc();

    return tx;
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<number> {
    const mintInfo = await getMint(
      this.connection,
      this.mintAddress,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    return fromBN(new BN(mintInfo.supply.toString()), mintInfo.decimals);
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
        const [blacklistEntry] = getBlacklistPDA(this.stablecoin, options.address);

        const tx = await this.program.methods
          .addToBlacklist(options.reason)
          .accounts({
            stablecoin: this.stablecoin,
            blacklistEntry,
            targetAddress: options.address,
            authority: this.authority,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      },

      /**
       * Remove address from blacklist
       */
      blacklistRemove: async (address: PublicKey): Promise<string> => {
        const [blacklistEntry] = getBlacklistPDA(this.stablecoin, address);

        const tx = await this.program.methods
          .removeFromBlacklist()
          .accounts({
            stablecoin: this.stablecoin,
            blacklistEntry,
            authority: this.authority,
          })
          .rpc();

        return tx;
      },

      /**
       * Check if address is blacklisted
       */
      isBlacklisted: async (address: PublicKey): Promise<boolean> => {
        try {
          const [blacklistEntry] = getBlacklistPDA(this.stablecoin, address);
          await (this.program.account as any).blacklistEntry.fetch(blacklistEntry);
          return true;
        } catch {
          return false;
        }
      },

      /**
       * Get blacklist entry
       */
      getBlacklistEntry: async (address: PublicKey): Promise<BlacklistEntry | null> => {
        try {
          const [blacklistEntry] = getBlacklistPDA(this.stablecoin, address);
          return await (this.program.account as any).blacklistEntry.fetch(blacklistEntry);
        } catch {
          return null;
        }
      },

      /**
       * Seize tokens from an account
       */
      seize: async (options: SeizeOptions): Promise<string> => {
        const sourceAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.wallet.payer,
          this.mintAddress,
          options.from,
          false,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const destinationAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.wallet.payer,
          this.mintAddress,
          options.to,
          false,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const amount = toBN(options.amount);

        const tx = await this.program.methods
          .seize(amount)
          .accounts({
            stablecoin: this.stablecoin,
            mint: this.mintAddress,
            sourceAccount: sourceAccount.address,
            destinationAccount: destinationAccount.address,
            authority: this.authority,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();

        return tx;
      },
    };
  }
}
