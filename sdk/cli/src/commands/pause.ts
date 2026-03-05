import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner } from '../utils/display';

export const pauseCommand = new Command('pause')
  .description('Pause all stablecoin operations')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Pausing stablecoin...');
    
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
      
      await stablecoin.pause();
      
      spin.succeed('Stablecoin paused successfully!');
      success('All operations are now paused');
      
    } catch (err: any) {
      spin.fail('Failed to pause stablecoin');
      error(err.message);
      process.exit(1);
    }
  });
