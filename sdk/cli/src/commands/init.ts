import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { SolanaStablecoin, Presets } from '@stbr/sss-token';
import { getConnection, loadKeypair, getProgramId } from '../utils/config';
import { success, error, spinner, displayTable } from '../utils/display';

export const initCommand = new Command('init')
  .description('Initialize a new stablecoin')
  .option('-p, --preset <preset>', 'Preset to use (sss-1 or sss-2)', 'sss-1')
  .option('-n, --name <name>', 'Stablecoin name', 'My Stablecoin')
  .option('-s, --symbol <symbol>', 'Stablecoin symbol', 'MSC')
  .option('-d, --decimals <decimals>', 'Number of decimals', '6')
  .option('-u, --uri <uri>', 'Metadata URI', '')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-k, --keypair <path>', 'Keypair path')
  .option('--program-id <id>', 'Program ID')
  .action(async (options) => {
    const spin = spinner('Initializing stablecoin...');
    
    try {
      const connection = getConnection(options.rpc);
      const authority = loadKeypair(options.keypair);
      const programId = getProgramId(options.programId);
      
      // Validate preset
      const preset = options.preset.toLowerCase();
      if (preset !== 'sss-1' && preset !== 'sss-2') {
        throw new Error('Preset must be either sss-1 or sss-2');
      }
      
      spin.text = `Creating ${preset.toUpperCase()} stablecoin...`;
      
      const stablecoin = await SolanaStablecoin.create(
        connection,
        {
          preset: preset === 'sss-1' ? Presets.SSS_1 : Presets.SSS_2,
          name: options.name,
          symbol: options.symbol,
          decimals: parseInt(options.decimals),
          uri: options.uri,
        },
        authority,
        programId
      );
      
      spin.succeed('Stablecoin created successfully!');
      
      displayTable({
        'Preset': preset.toUpperCase(),
        'Name': options.name,
        'Symbol': options.symbol,
        'Decimals': options.decimals,
        'Mint Address': stablecoin.mintAddress.toBase58(),
        'Stablecoin PDA': stablecoin.stablecoin.toBase58(),
        'Authority': authority.publicKey.toBase58(),
      });
      
      success('Save these addresses for future operations!');
      
    } catch (err: any) {
      spin.fail('Failed to initialize stablecoin');
      error(err.message);
      process.exit(1);
    }
  });
