import { Connection, Keypair } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { expect } from 'chai';

describe('CLI Blacklist Commands (SSS-2)', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let badActor: Keypair;
  let stablecoin: SolanaStablecoin;

  before(async () => {
    authority = Keypair.generate();
    badActor = Keypair.generate();

    // Airdrop SOL
    const airdropSig = await connection.requestAirdrop(
      authority.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);

    // Initialize SSS-2 stablecoin (with compliance features)
    stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_2,
        name: 'Test Blacklist',
        symbol: 'TBL',
        decimals: 6,
      },
      authority
    );

    console.log('Setup complete. Mint:', stablecoin.mintAddress.toBase58());
  });

  it('should add address to blacklist', async () => {
    await stablecoin.compliance.blacklistAdd({
      address: badActor.publicKey,
      reason: 'OFAC sanctions match',
    });

    console.log('✓ Added to blacklist:', badActor.publicKey.toBase58());
  });

  it('should check if address is blacklisted', async () => {
    const isBlacklisted = await stablecoin.compliance.isBlacklisted(
      badActor.publicKey
    );

    expect(isBlacklisted).to.be.true;
    console.log('✓ Address is blacklisted:', isBlacklisted);
  });

  it('should remove address from blacklist', async () => {
    await stablecoin.compliance.blacklistRemove(badActor.publicKey);

    console.log('✓ Removed from blacklist:', badActor.publicKey.toBase58());
  });

  it('should verify address is no longer blacklisted', async () => {
    const isBlacklisted = await stablecoin.compliance.isBlacklisted(
      badActor.publicKey
    );

    expect(isBlacklisted).to.be.false;
    console.log('✓ Address is not blacklisted:', isBlacklisted);
  });
});
