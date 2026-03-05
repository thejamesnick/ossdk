import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { expect } from 'chai';

describe('CLI Freeze and Thaw Commands', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter: Keypair;
  let user: Keypair;
  let stablecoin: SolanaStablecoin;
  let userTokenAccount: any;

  before(async () => {
    authority = Keypair.generate();
    minter = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL
    const airdropSig = await connection.requestAirdrop(
      authority.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);

    // Initialize stablecoin
    stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_1,
        name: 'Test Freeze',
        symbol: 'TFZ',
        decimals: 6,
      },
      authority
    );

    // Add minter and mint tokens
    await stablecoin.updateMinter({
      minter: minter.publicKey,
      quota: 1_000_000_000_000n,
      isActive: true,
    });

    await stablecoin.mintTokens({
      recipient: user.publicKey,
      amount: 1_000_000n,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    userTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      user.publicKey
    );

    console.log('Setup complete. User token account:', userTokenAccount.toBase58());
  });

  it('should freeze user account', async () => {
    await stablecoin.freeze(userTokenAccount);

    console.log('✓ Frozen account:', userTokenAccount.toBase58());
  });

  it('should thaw user account', async () => {
    await stablecoin.thaw(userTokenAccount);

    console.log('✓ Thawed account:', userTokenAccount.toBase58());
  });
});
