import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { expect } from 'chai';

describe('CLI Mint and Burn Commands', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter: Keypair;
  let recipient: Keypair;
  let stablecoin: SolanaStablecoin;

  before(async () => {
    authority = Keypair.generate();
    minter = Keypair.generate();
    recipient = Keypair.generate();

    // Airdrop SOL for fees
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
        name: 'Test Mint Burn',
        symbol: 'TMB',
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

    console.log('Setup complete. Mint:', stablecoin.mintAddress.toBase58());
  });

  it('should mint tokens to recipient', async () => {
    const amount = 1_000_000n; // 1 token

    await stablecoin.mintTokens({
      recipient: recipient.publicKey,
      amount,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    console.log('✓ Minted', amount.toString(), 'tokens to', recipient.publicKey.toBase58());
  });

  it('should burn tokens from owner', async () => {
    const amount = 500_000n; // 0.5 token

    await stablecoin.burn({
      owner: recipient.publicKey,
      amount,
      ownerKeypair: recipient,
    });

    console.log('✓ Burned', amount.toString(), 'tokens from', recipient.publicKey.toBase58());
  });

  it('should get total supply', async () => {
    const supply = await stablecoin.getTotalSupply();
    
    expect(supply).to.be.a('bigint');
    console.log('✓ Total supply:', supply.toString());
  });
});
