import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("sss-core", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SssCore as Program;
  
  let authority: Keypair;
  let mint: PublicKey;
  let stablecoin: PublicKey;
  
  before(async () => {
    authority = Keypair.generate();
    
    // Airdrop SOL to authority
    const signature = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  });

  describe("SSS-1: Minimal Stablecoin", () => {
    it("Initializes a minimal stablecoin (SSS-1)", async () => {
      // Create mint
      mint = await createMint(
        provider.connection,
        authority,
        authority.publicKey,
        authority.publicKey,
        6,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Derive stablecoin PDA
      [stablecoin] = PublicKey.findProgramAddressSync(
        [Buffer.from("stablecoin"), mint.toBuffer()],
        program.programId
      );

      // Initialize stablecoin
      const config = {
        name: "Test Stablecoin",
        symbol: "TEST",
        uri: "https://example.com/metadata.json",
        decimals: 6,
        enablePermanentDelegate: false,
        enableTransferHook: false,
        defaultAccountFrozen: false,
      };

      await program.methods
        .initialize(config)
        .accounts({
          stablecoin,
          mint,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Fetch and verify stablecoin account
      const stablecoinAccount = await program.account.stablecoin.fetch(stablecoin);
      expect(stablecoinAccount.name).to.equal("Test Stablecoin");
      expect(stablecoinAccount.symbol).to.equal("TEST");
      expect(stablecoinAccount.decimals).to.equal(6);
      expect(stablecoinAccount.enablePermanentDelegate).to.equal(false);
      expect(stablecoinAccount.enableTransferHook).to.equal(false);
      expect(stablecoinAccount.isPaused).to.equal(false);
    });

    it("Adds a minter", async () => {
      const minter = Keypair.generate();
      const quota = new anchor.BN(1_000_000_000_000); // 1M tokens

      const [minterAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("minter"),
          stablecoin.toBuffer(),
          minter.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .updateMinter(quota, true)
        .accounts({
          stablecoin,
          minterAccount,
          minter: minter.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Verify minter account
      const minterAccountData = await program.account.minterAccount.fetch(minterAccount);
      expect(minterAccountData.quota.toString()).to.equal(quota.toString());
      expect(minterAccountData.isActive).to.equal(true);
      expect(minterAccountData.mintedAmount.toString()).to.equal("0");
    });

    it("Pauses and unpauses the stablecoin", async () => {
      // Pause
      await program.methods
        .pause()
        .accounts({
          stablecoin,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      let stablecoinAccount = await program.account.stablecoin.fetch(stablecoin);
      expect(stablecoinAccount.isPaused).to.equal(true);

      // Unpause
      await program.methods
        .unpause()
        .accounts({
          stablecoin,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      stablecoinAccount = await program.account.stablecoin.fetch(stablecoin);
      expect(stablecoinAccount.isPaused).to.equal(false);
    });
  });

  describe("SSS-2: Compliant Stablecoin", () => {
    let compliantMint: PublicKey;
    let compliantStablecoin: PublicKey;

    it("Initializes a compliant stablecoin (SSS-2)", async () => {
      // Create mint
      compliantMint = await createMint(
        provider.connection,
        authority,
        authority.publicKey,
        authority.publicKey,
        6,
        Keypair.generate(),
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Derive stablecoin PDA
      [compliantStablecoin] = PublicKey.findProgramAddressSync(
        [Buffer.from("stablecoin"), compliantMint.toBuffer()],
        program.programId
      );

      // Initialize with SSS-2 features
      const config = {
        name: "Compliant Stablecoin",
        symbol: "CUSD",
        uri: "https://example.com/metadata.json",
        decimals: 6,
        enablePermanentDelegate: true,
        enableTransferHook: true,
        defaultAccountFrozen: false,
      };

      await program.methods
        .initialize(config)
        .accounts({
          stablecoin: compliantStablecoin,
          mint: compliantMint,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Verify SSS-2 features enabled
      const stablecoinAccount = await program.account.stablecoin.fetch(compliantStablecoin);
      expect(stablecoinAccount.enablePermanentDelegate).to.equal(true);
      expect(stablecoinAccount.enableTransferHook).to.equal(true);
    });

    it("Adds address to blacklist", async () => {
      const targetAddress = Keypair.generate().publicKey;
      const reason = "OFAC sanctions match";

      const [blacklistEntry] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("blacklist"),
          compliantStablecoin.toBuffer(),
          targetAddress.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .addToBlacklist(reason)
        .accounts({
          stablecoin: compliantStablecoin,
          blacklistEntry,
          targetAddress,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Verify blacklist entry
      const blacklistEntryData = await program.account.blacklistEntry.fetch(blacklistEntry);
      expect(blacklistEntryData.address.toString()).to.equal(targetAddress.toString());
      expect(blacklistEntryData.reason).to.equal(reason);
    });

    it("Removes address from blacklist", async () => {
      const targetAddress = Keypair.generate().publicKey;
      const reason = "Test blacklist";

      const [blacklistEntry] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("blacklist"),
          compliantStablecoin.toBuffer(),
          targetAddress.toBuffer(),
        ],
        program.programId
      );

      // Add to blacklist first
      await program.methods
        .addToBlacklist(reason)
        .accounts({
          stablecoin: compliantStablecoin,
          blacklistEntry,
          targetAddress,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      // Remove from blacklist
      await program.methods
        .removeFromBlacklist()
        .accounts({
          stablecoin: compliantStablecoin,
          blacklistEntry,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Verify account is closed
      try {
        await program.account.blacklistEntry.fetch(blacklistEntry);
        expect.fail("Blacklist entry should be closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });
  });
});
