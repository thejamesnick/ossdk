import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, displayTable, formatAmount } from '../utils/display';

export const mintCommand = new Command('mint')
  .description('Mint tokens to an address')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-t, --to <address>', 'Recipient address')
  .requiredOption('-a, --amount <amount>', 'Amount to mint')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Minting tokens...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const recipient = new PublicKey(options.to);
      const amount = BigInt(parseFloat(options.amount) * 1_000_000); // Assuming 6 decimals
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      const signature = await stablecoin.mintTokens({
        recipient,
        amount,
        minter: authority.publicKey,
        minterKeypair: authority,
      });
      
      spin.succeed('Tokens minted successfully!');
      
      displayTable({
        'Mint': mintAddress.toBase58(),
        'Recipient': recipient.toBase58(),
        'Amount': formatAmount(amount),
        'Transaction': signature,
      });
      
    } catch (err: any) {
      spin.fail('Failed to mint tokens');
      error(err.message);
      process.exit(1);
    }
  });
