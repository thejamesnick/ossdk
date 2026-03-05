import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaStablecoin, PresetType } from '@stbr/sss-token';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { expect } from 'chai';

describe('SSS-1 Integration Test - Full Flow', () => {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let authority: Keypair;
  let minter: Keypair;
  let alice: Keypair;
  let bob: Keypair;
  let stablecoin: SolanaStablecoin;
  let aliceTokenAccount: PublicKey;
  let bobTokenAccount: PublicKey;

  before(async function() {
    this.timeout(120000);

    authority = Keypair.generate();
    minter = Keypair.generate();
    alice = Keypair.generate();
    bob = Keypair.generate();

    console.log('\n🔧 Setting up SSS-1 Integration Test...');
    console.log('Authority:', authority.publicKey.toBase58());
    console.log('Minter:', minter.publicKey.toBase58());
    console.log('Alice:', alice.publicKey.toBase58());
    console.log('Bob:', bob.publicKey.toBase58());

    const airdropSig = await connection.requestAirdrop(
      authority.publicKey,
      2_000_000_000
    );
    await connection.confirmTransaction(airdropSig);
    console.log('✓ Airdropped SOL to authority');
  });

  it('Step 1: Initialize SSS-1 stablecoin', async function() {
    this.timeout(60000);

    stablecoin = await SolanaStablecoin.create(
      connection,
      {
        preset: PresetType.SSS_1,
        name: 'SSS-1 Integration Test',
        symbol: 'SSS1',
        decimals: 6,
      },
      authority
    );

    expect(stablecoin).to.exist;
    expect(stablecoin.mintAddress).to.exist;
    console.log('✓ SSS-1 initialized:', stablecoin.mintAddress.toBase58());
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
    console.log('  Alice token account:', aliceTokenAccount.toBase58());
  });

  it('Step 4: Mint tokens to Bob', async function() {
    this.timeout(30000);

    const amount = 500_000_000n;

    await stablecoin.mintTokens({
      recipient: bob.publicKey,
      amount,
      minter: minter.publicKey,
      minterKeypair: minter,
    });

    bobTokenAccount = await getAssociatedTokenAddress(
      stablecoin.mintAddress,
      bob.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log('✓ Minted 500 tokens to Bob');
    console.log('  Bob token account:', bobTokenAccount.toBase58());
  });


  it('Step 5: Check total supply', async function() {
    this.timeout(30000);

    const supply = await stablecoin.getTotalSupply();
    
    expect(supply).to.equal(1_500_000_000n);
    console.log('✓ Total supply:', supply.toString(), '(1,500 tokens)');
  });

  it('Step 6: Freeze Alice account', async function() {
    this.timeout(30000);

    await stablecoin.freeze(aliceTokenAccount);

    console.log('✓ Frozen Alice account');
  });

  it('Step 7: Thaw Alice account', async function() {
    this.timeout(30000);

    await stablecoin.thaw(aliceTokenAccount);

    console.log('✓ Thawed Alice account');
  });

  it('Step 8: Burn tokens from Bob', async function() {
    this.timeout(30000);

    const amount = 100_000_000n;

    await stablecoin.burn({
      owner: bob.publicKey,
      amount,
      ownerKeypair: bob,
    });

    console.log('✓ Burned 100 tokens from Bob');
  });

  it('Step 9: Verify final supply', async function() {
    this.timeout(30000);

    const supply = await stablecoin.getTotalSupply();
    
    expect(supply).to.equal(1_400_000_000n);
    console.log('✓ Final supply:', supply.toString(), '(1,400 tokens)');
  });

  it('Step 10: Pause stablecoin', async function() {
    this.timeout(30000);

    await stablecoin.pause();

    console.log('✓ Stablecoin paused');
  });

  it('Step 11: Unpause stablecoin', async function() {
    this.timeout(30000);

    await stablecoin.unpause();

    console.log('✓ Stablecoin unpaused');
  });

  after(() => {
    console.log('\n✅ SSS-1 Integration Test Complete!');
    console.log('Summary:');
    console.log('  - Initialized SSS-1 stablecoin');
    console.log('  - Added minter with quota');
    console.log('  - Minted to 2 users');
    console.log('  - Froze and thawed account');
    console.log('  - Burned tokens');
    console.log('  - Paused and unpaused');
    console.log('  - Final supply: 1,400 tokens');
  });
});
