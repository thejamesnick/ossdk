import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { expect } from 'chai';

describe('CLI Minters Command', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter1: Keypair;
  let minter2: Keypair;
  let stablecoin: SolanaStablecoin;

  before(async () => {
    authority = Keypair.generate();
    minter1 = Keypair.generate();
    minter2 = Keypair.generate();

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
        name: 'Test Minters',
        symbol: 'TMT',
        decimals: 6,
      },
      authority
    );

    console.log('Setup complete. Mint:', stablecoin.mintAddress.toBase58());
  });

  it('should add first minter with quota', async () => {
    await stablecoin.updateMinter({
      minter: minter1.publicKey,
      quota: 1_000_000_000n,
      isActive: true,
    });

    console.log('✓ Added minter 1:', minter1.publicKey.toBase58());
    console.log('  Quota: 1,000 tokens');
  });

  it('should add second minter with different quota', async () => {
    await stablecoin.updateMinter({
      minter: minter2.publicKey,
      quota: 5_000_000_000n,
      isActive: true,
    });

    console.log('✓ Added minter 2:', minter2.publicKey.toBase58());
    console.log('  Quota: 5,000 tokens');
  });

  it('should update minter quota', async () => {
    await stablecoin.updateMinter({
      minter: minter1.publicKey,
      quota: 2_000_000_000n,
      isActive: true,
    });

    console.log('✓ Updated minter 1 quota to 2,000 tokens');
  });

  it('should deactivate minter', async () => {
    await stablecoin.updateMinter({
      minter: minter2.publicKey,
      quota: 5_000_000_000n,
      isActive: false,
    });

    console.log('✓ Deactivated minter 2');
  });
});
