import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, displayTable, formatAmount } from '../utils/display';

export const seizeCommand = new Command('seize')
  .description('Seize tokens from an account (SSS-2 only)')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-f, --from <address>', 'Account to seize from')
  .requiredOption('-t, --to <address>', 'Account to send seized tokens to')
  .requiredOption('-a, --amount <amount>', 'Amount to seize')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Seizing tokens...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const from = new PublicKey(options.from);
      const to = new PublicKey(options.to);
      const amount = BigInt(parseFloat(options.amount) * 1_000_000);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      const signature = await stablecoin.compliance.seize({
        from,
        to,
        amount,
      });
      
      spin.succeed('Tokens seized successfully!');
      
      displayTable({
        'From': from.toBase58(),
        'To': to.toBase58(),
        'Amount Seized': formatAmount(amount),
        'Transaction': signature,
      });
      
    } catch (err: any) {
      spin.fail('Failed to seize tokens');
      error(err.message);
      process.exit(1);
    }
  });
