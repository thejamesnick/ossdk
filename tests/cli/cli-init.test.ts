import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { expect } from 'chai';

describe('CLI Init Command', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;

  before(() => {
    authority = Keypair.generate();
  });

  it('should initialize SSS-1 stablecoin with preset', async () => {
    const stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_1,
        name: 'Test SSS-1',
        symbol: 'TST1',
        decimals: 6,
      },
      authority
    );

    expect(stablecoin).to.exist;
    expect(stablecoin.mintAddress).to.exist;
    console.log('✓ SSS-1 initialized:', stablecoin.mintAddress.toBase58());
  });

  it('should initialize SSS-2 stablecoin with preset', async () => {
    const stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_2,
        name: 'Test SSS-2',
        symbol: 'TST2',
        decimals: 6,
      },
      authority
    );

    expect(stablecoin).to.exist;
    expect(stablecoin.mintAddress).to.exist;
    console.log('✓ SSS-2 initialized:', stablecoin.mintAddress.toBase58());
  });

  it('should initialize with custom config', async () => {
    const stablecoin = await SolanaStablecoin.createWithConfig(
      connection,
      {
        name: 'Custom Stable',
        symbol: 'CUST',
        uri: 'https://example.com/metadata.json',
        decimals: 6,
        enablePermanentDelegate: true,
        enableTransferHook: false,
        defaultAccountFrozen: false,
      },
      authority
    );

    expect(stablecoin).to.exist;
    expect(stablecoin.mintAddress).to.exist;
    console.log('✓ Custom config initialized:', stablecoin.mintAddress.toBase58());
  });
});
