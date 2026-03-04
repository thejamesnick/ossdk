import { PublicKey, Keypair } from "@solana/web3.js";

/**
 * Configuration for creating a new stablecoin
 */
export interface StablecoinConfig {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
}

/**
 * Preset types for standard stablecoin configurations
 */
export enum PresetType {
  SSS_1 = "sss-1", // Minimal
  SSS_2 = "sss-2", // Compliant
  SSS_3 = "sss-3", // Private (bonus)
}

/**
 * Options for creating a stablecoin with a preset
 */
export interface CreateWithPresetOptions {
  preset: PresetType;
  name: string;
  symbol: string;
  uri?: string;
  decimals?: number;
}

/**
 * Options for minting tokens
 */
export interface MintOptions {
  recipient: PublicKey;
  amount: number | bigint;
  minter: PublicKey;
  minterKeypair?: Keypair; // Optional, defaults to authority
}

/**
 * Options for burning tokens
 */
export interface BurnOptions {
  amount: number | bigint;
  owner: PublicKey;
  ownerKeypair?: Keypair; // Optional, defaults to authority
}

/**
 * Options for adding/updating a minter
 */
export interface MinterOptions {
  minter: PublicKey;
  quota: number | bigint;
  isActive: boolean;
}

/**
 * Options for blacklisting an address
 */
export interface BlacklistAddOptions {
  address: PublicKey;
  reason: string;
}

/**
 * Options for seizing tokens
 */
export interface SeizeOptions {
  from: PublicKey;
  to: PublicKey;
  amount: number | bigint;
}
