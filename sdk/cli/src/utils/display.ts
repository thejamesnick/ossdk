import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function success(message: string): void {
  console.log(chalk.green('✅'), message);
}

export function error(message: string): void {
  console.log(chalk.red('❌'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function warning(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

export function spinner(text: string): Ora {
  return ora(text).start();
}

export function displayTable(data: Record<string, any>): void {
  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));
  
  console.log();
  Object.entries(data).forEach(([key, value]) => {
    const paddedKey = key.padEnd(maxKeyLength);
    console.log(`  ${chalk.cyan(paddedKey)} : ${value}`);
  });
  console.log();
}

export function formatAmount(amount: bigint | number, decimals: number = 6): string {
  const value = typeof amount === 'bigint' ? Number(amount) : amount;
  return (value / Math.pow(10, decimals)).toFixed(decimals);
}

export function formatAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}
