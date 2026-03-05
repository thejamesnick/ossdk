import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { expect } from 'chai';

describe('SSS-2 Integration Test - Full Compliance Flow', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter: Keypair;
  let alice: Keypair;
  let badActor: Keypair;
  let treasury: Keypair;
  let stablecoin: SolanaStablecoin;
  let aliceTokenAccount: PublicKey;
  let badActorTokenAccount: PublicKey;
  let treasuryTokenAccount: PublicKey;

  before(async function() {
    this.timeout(120000);

    authority = Keypair.generate();
    minter = Keypair.generate();
    alice = Keypair.generate();
    badActor = Keypair.generate();
    treasury = Keypair.generate();

    console.log('\n🔧 Setting up SSS-2 Integration Test...');
    console.log('Authority:', authority.publicKey.toBase58());
    console.log('Minter:', minter.publicKey.toBase58());
    console.log('Alice:', alice.publicKey.toBase58());
    console.log('Bad Actor:', badActor.publicKey.toBase58());
    console.log('Treasury:', treasury.publicKey.toBase58());

    const airdropSig = await connection.requestAirdrop(
      authority.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);
    console.log('✓ Airdropped SOL to authority');
  });

  it('Step 1: Initialize SSS-2 stablecoin with compliance', async function() {
    this.timeout(60000);

    stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_2,
        name: 'SSS-2 Integration Test',
        symbol: 'SSS2',
        decimals: 6,
      },
      authority
    );

    expect(stablecoin).to.exist;
    expect(stablecoin.mintAddress).to.exist;
    console.log('✓ SSS-2 initialized:', stablecoin.mintAddress.toBase58());
  });

  it('Step 2: Add minter with quota', async function() {
    this.timeout(30000);

    await stablecoin.updateMinter({
      minter: minter.publicKey,
      quota: 10_000_000_000n,
      isActive: true,
    });

    console.log('✓ Minter added with 10,000 token quota');
  });

  it('Step 3: Mint tokens to Alice', async function() {
    this.timeout(30000);

    const amount = 1_000_000_000n;

    await stablecoin.mintTokens({
      recipient: alice.publicKey,
      amount,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    aliceTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      alice.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('✓ Minted 1,000 tokens to Alice');
  });

  it('Step 4: Mint tokens to bad actor', async function() {
    this.timeout(30000);

    const amount = 500_000_000n;

    await stablecoin.mintTokens({
      recipient: badActor.publicKey,
      amount,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    badActorTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      badActor.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('✓ Minted 500 tokens to bad actor');
  });


  it('Step 5: Add bad actor to blacklist', async function() {
    this.timeout(30000);

    await stablecoin.compliance.blacklistAdd({
      address: badActor.publicKey,
      reason: 'OFAC sanctions match - test scenario',
    });

    console.log('✓ Added bad actor to blacklist');
  });

  it('Step 6: Verify bad actor is blacklisted', async function() {
    this.timeout(30000);

    const isBlacklisted = await stablecoin.compliance.isBlacklisted(
      badActor.publicKey
    );

    expect(isBlacklisted).to.be.true;
    console.log('✓ Verified bad actor is blacklisted');
  });

  it('Step 7: Freeze bad actor account', async function() {
    this.timeout(30000);

    await stablecoin.freeze(badActorTokenAccount);

    console.log('✓ Frozen bad actor account');
  });

  it('Step 8: Seize tokens from bad actor to treasury', async function() {
    this.timeout(30000);

    treasuryTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      treasury.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const amount = 500_000_000n;

    await stablecoin.compliance.seize({
      from: badActorTokenAccount,
      to: treasuryTokenAccount,
      amount,
    });

    console.log('✓ Seized 500 tokens from bad actor to treasury');
  });

  it('Step 9: Verify total supply unchanged', async function() {
    this.timeout(30000);

    const supply = await stablecoin.getTotalSupply();
    
    expect(supply).to.equal(1_500_000_000n);
    console.log('✓ Total supply unchanged:', supply.toString(), '(1,500 tokens)');
  });

  it('Step 10: Remove bad actor from blacklist', async function() {
    this.timeout(30000);

    await stablecoin.compliance.blacklistRemove(badActor.publicKey);

    console.log('✓ Removed bad actor from blacklist');
  });

  it('Step 11: Verify bad actor is no longer blacklisted', async function() {
    this.timeout(30000);

    const isBlacklisted = await stablecoin.compliance.isBlacklisted(
      badActor.publicKey
    );

    expect(isBlacklisted).to.be.false;
    console.log('✓ Verified bad actor is no longer blacklisted');
  });

  it('Step 12: Burn tokens from Alice', async function() {
    this.timeout(30000);

    const amount = 200_000_000n;

    await stablecoin.burn({
      owner: alice.publicKey,
      amount,
      ownerKeypair: alice,
    });

    console.log('✓ Burned 200 tokens from Alice');
  });

  it('Step 13: Verify final supply', async function() {
    this.timeout(30000);

    const supply = await stablecoin.getTotalSupply();
    
    expect(supply).to.equal(1_300_000_000n);
    console.log('✓ Final supply:', supply.toString(), '(1,300 tokens)');
  });

  after(() => {
    console.log('\n✅ SSS-2 Integration Test Complete!');
    console.log('Summary:');
    console.log('  - Initialized SSS-2 stablecoin with compliance');
    console.log('  - Added minter with quota');
    console.log('  - Minted to 2 users');
    console.log('  - Blacklisted bad actor');
    console.log('  - Froze and seized tokens');
    console.log('  - Removed from blacklist');
    console.log('  - Burned tokens');
    console.log('  - Final supply: 1,300 tokens');
  });
});
