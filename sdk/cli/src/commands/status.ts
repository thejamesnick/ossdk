import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { error, spinner, displayTable, formatAmount } from '../utils/display';

export const statusCommand = new Command('status')
  .description('Get stablecoin status and supply')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Fetching stablecoin status...');
    
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
      
      const supply = await stablecoin.getTotalSupply();
      
      spin.succeed('Status retrieved!');
      
      displayTable({
        'Mint Address': mintAddress.toBase58(),
        'Total Supply': formatAmount(supply),
        'Stablecoin PDA': stablecoin.stablecoin.toBase58(),
      });
      
    } catch (err: any) {
      spin.fail('Failed to get status');
      error(err.message);
      process.exit(1);
    }
  });
