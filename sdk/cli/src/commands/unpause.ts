import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner } from '../utils/display';

export const unpauseCommand = new Command('unpause')
  .description('Unpause stablecoin operations')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Unpausing stablecoin...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.unpause();
      
      spin.succeed('Stablecoin unpaused successfully!');
      success('Operations are now resumed');
      
    } catch (err: any) {
      spin.fail('Failed to unpause stablecoin');
      error(err.message);
      process.exit(1);
    }
  });
