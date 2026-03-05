import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, displayTable, formatAmount } from '../utils/display';

export const burnCommand = new Command('burn')
  .description('Burn tokens from your account')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --amount <amount>', 'Amount to burn')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Burning tokens...');
    
    try {
      const connection = getConnection(options.rpc);
      const user = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const amount = BigInt(parseFloat(options.amount) * 1_000_000);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        user,
        programId
      );
      
      const signature = await stablecoin.burn({
        amount,
        owner: user.publicKey,
      });
      
      spin.succeed('Tokens burned successfully!');
      
      displayTable({
        'Mint': mintAddress.toBase58(),
        'Amount Burned': formatAmount(amount),
        'Transaction': signature,
      });
      
    } catch (err: any) {
      spin.fail('Failed to burn tokens');
      error(err.message);
      process.exit(1);
    }
  });
