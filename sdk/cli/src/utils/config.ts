import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  rpcUrl: string;
  programId: string;
  keypairPath: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.sss-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getDefaultConfig(): CliConfig {
  return {
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2',
    keypairPath: path.join(os.homedir(), '.config/solana/id.json'),
  };
}

export function loadConfig(): CliConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return getDefaultConfig();
  }
  
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return getDefaultConfig();
  }
}

export function saveConfig(config: CliConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function loadKeypair(keypairPath?: string): Keypair {
  const path = keypairPath || loadConfig().keypairPath;
  
  if (!fs.existsSync(path)) {
    throw new Error(`Keypair file not found at ${path}`);
  }
  
  const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

export function getConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || loadConfig().rpcUrl;
  return new Connection(url, 'confirmed');
}

export function getProgramId(programId?: string): PublicKey {
  const id = programId || loadConfig().programId;
  return new PublicKey(id);
}
