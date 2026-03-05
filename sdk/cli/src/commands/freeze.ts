import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner } from '../utils/display';

export const freezeCommand = new Command('freeze')
  .description('Freeze a token account')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --account <address>', 'Account to freeze')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Freezing account...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const account = new PublicKey(options.account);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.freeze(account);
      
      spin.succeed('Account frozen successfully!');
      success(`Account ${account.toBase58()} is now frozen`);
      
    } catch (err: any) {
      spin.fail('Failed to freeze account');
      error(err.message);
      process.exit(1);
    }
  });
