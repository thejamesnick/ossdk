import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, displayTable, formatAmount } from '../utils/display';

export const mintersCommand = new Command('minters')
  .description('Manage minters');

mintersCommand
  .command('add')
  .description('Add a minter')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --address <address>', 'Minter address')
  .requiredOption('-q, --quota <amount>', 'Minting quota')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Adding minter...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const minter = new PublicKey(options.address);
      const quota = BigInt(parseFloat(options.quota) * 1_000_000);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.updateMinter({
        minter,
        quota,
        isActive: true,
      });
      
      spin.succeed('Minter added successfully!');
      
      displayTable({
        'Minter': minter.toBase58(),
        'Quota': formatAmount(quota),
        'Status': 'Active',
      });
      
    } catch (err: any) {
      spin.fail('Failed to add minter');
      error(err.message);
      process.exit(1);
    }
  });

mintersCommand
  .command('remove')
  .description('Remove a minter')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --address <address>', 'Minter address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Removing minter...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const minter = new PublicKey(options.address);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.updateMinter({
        minter,
        quota: 0n,
        isActive: false,
      });
      
      spin.succeed('Minter removed successfully!');
      success(`${minter.toBase58()} is no longer a minter`);
      
    } catch (err: any) {
      spin.fail('Failed to remove minter');
      error(err.message);
      process.exit(1);
    }
  });
