import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { expect } from 'chai';

describe('CLI Pause and Unpause Commands', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let stablecoin: SolanaStablecoin;

  before(async () => {
    authority = Keypair.generate();

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
        name: 'Test Pause',
        symbol: 'TPS',
        decimals: 6,
      },
      authority
    );

    console.log('Setup complete. Mint:', stablecoin.mintAddress.toBase58());
  });

  it('should pause stablecoin operations', async () => {
    await stablecoin.pause();

    console.log('✓ Stablecoin paused');
  });

  it('should unpause stablecoin operations', async () => {
    await stablecoin.unpause();

    console.log('✓ Stablecoin unpaused');
  });
});
