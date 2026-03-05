import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { expect } from 'chai';

describe('CLI Seize Command (SSS-2)', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter: Keypair;
  let badActor: Keypair;
  let treasury: Keypair;
  let stablecoin: SolanaStablecoin;
  let badActorTokenAccount: any;
  let treasuryTokenAccount: any;

  before(async () => {
    authority = Keypair.generate();
    minter = Keypair.generate();
    badActor = Keypair.generate();
    treasury = Keypair.generate();

    // Airdrop SOL
    const airdropSig = await connection.requestAirdrop(
      authority.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);

    // Initialize SSS-2 stablecoin
    stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_2,
        name: 'Test Seize',
        symbol: 'TSZ',
        decimals: 6,
      },
      authority
    );

    // Add minter
    await stablecoin.updateMinter({
      minter: minter.publicKey,
      quota: 1_000_000_000_000n,
      isActive: true,
    });

    // Mint tokens to bad actor
    await stablecoin.mintTokens({
      recipient: badActor.publicKey,
      amount: 1_000_000n,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    badActorTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      badActor.publicKey
    );

    treasuryTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      treasury.publicKey
    );

    console.log('Setup complete.');
    console.log('Bad actor account:', badActorTokenAccount.toBase58());
    console.log('Treasury account:', treasuryTokenAccount.toBase58());
  });

  it('should freeze bad actor account before seizing', async () => {
    await stablecoin.freeze(badActorTokenAccount);

    console.log('✓ Frozen bad actor account');
  });

  it('should seize tokens from bad actor to treasury', async () => {
    const amount = 1_000_000n;

    await stablecoin.compliance.seize({
      from: badActorTokenAccount,
      to: treasuryTokenAccount,
      amount,
    });

    console.log('✓ Seized', amount.toString(), 'tokens');
    console.log('  From:', badActorTokenAccount.toBase58());
    console.log('  To:', treasuryTokenAccount.toBase58());
  });
});
