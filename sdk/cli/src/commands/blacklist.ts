import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, info } from '../utils/display';

export const blacklistCommand = new Command('blacklist')
  .description('Manage blacklist (SSS-2 only)');

blacklistCommand
  .command('add')
  .description('Add address to blacklist')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --address <address>', 'Address to blacklist')
  .requiredOption('-reason, --reason <reason>', 'Reason for blacklisting')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Adding to blacklist...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.compliance.blacklistAdd({
        address,
        reason: options.reason,
      });
      
      spin.succeed('Address added to blacklist!');
      success(`${address.toBase58()} is now blacklisted`);
      info(`Reason: ${options.reason}`);
      
    } catch (err: any) {
      spin.fail('Failed to add to blacklist');
      error(err.message);
      process.exit(1);
    }
  });

blacklistCommand
  .command('remove')
  .description('Remove address from blacklist')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --address <address>', 'Address to remove')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Removing from blacklist...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      await stablecoin.compliance.blacklistRemove(address);
      
      spin.succeed('Address removed from blacklist!');
      success(`${address.toBase58()} is no longer blacklisted`);
      
    } catch (err: any) {
      spin.fail('Failed to remove from blacklist');
      error(err.message);
      process.exit(1);
    }
  });

blacklistCommand
  .command('check')
  .description('Check if address is blacklisted')
  .requiredOption('-m, --mint <address>', 'Mint address')
  .requiredOption('-a, --address <address>', 'Address to check')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Checking blacklist status...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      const mintAddress = new PublicKey(options.mint);
      const address = new PublicKey(options.address);
      
      const stablecoin = await SolanaStablecoin.load(
        connection,
        mintAddress,
        authority,
        programId
      );
      
      const isBlacklisted = await stablecoin.compliance.isBlacklisted(address);
      
      spin.succeed('Status checked!');
      
      if (isBlacklisted) {
        error(`${address.toBase58()} is BLACKLISTED`);
      } else {
        success(`${address.toBase58()} is NOT blacklisted`);
      }
      
    } catch (err: any) {
      spin.fail('Failed to check blacklist status');
      error(err.message);
      process.exit(1);
    }
  });
