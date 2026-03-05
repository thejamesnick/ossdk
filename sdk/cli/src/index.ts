#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { mintCommand } from './commands/mint';
import { burnCommand } from './commands/burn';
import { freezeCommand } from './commands/freeze';
import { thawCommand } from './commands/thaw';
import { pauseCommand } from './commands/pause';
import { unpauseCommand } from './commands/unpause';
import { statusCommand } from './commands/status';
import { blacklistCommand } from './commands/blacklist';
import { seizeCommand } from './commands/seize';
import { mintersCommand } from './commands/minters';

const program = new Command();

console.log(chalk.cyan.bold('\n🪙  Solana Stablecoin Standard CLI\n'));

program
  .name('sss-token')
  .description('CLI for managing Solana stablecoins with SSS-1 and SSS-2 standards')
  .version('0.1.0');

// Add all commands
program.addCommand(initCommand);
program.addCommand(mintCommand);
program.addCommand(burnCommand);
program.addCommand(freezeCommand);
program.addCommand(thawCommand);
program.addCommand(pauseCommand);
program.addCommand(unpauseCommand);
program.addCommand(statusCommand);
program.addCommand(blacklistCommand);
program.addCommand(seizeCommand);
program.addCommand(mintersCommand);

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  if (error.code !== 'commander.help' && error.code !== 'commander.helpDisplayed') {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}
