import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

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
  amount: number | BN;
  minter: PublicKey;
}

/**
 * Options for burning tokens
 */
export interface BurnOptions {
  amount: number | BN;
  owner: PublicKey;
}

/**
 * Options for adding/updating a minter
 */
export interface MinterOptions {
  minter: PublicKey;
  quota: number | BN;
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
  amount: number | BN;
}

/**
 * Stablecoin account data
 */
export interface StablecoinAccount {
  authority: PublicKey;
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  defaultAccountFrozen: boolean;
  isPaused: boolean;
  totalMinted: BN;
  totalBurned: BN;
  bump: number;
}

/**
 * Minter account data
 */
export interface MinterAccount {
  stablecoin: PublicKey;
  minter: PublicKey;
  quota: BN;
  mintedAmount: BN;
  isActive: boolean;
  bump: number;
}

/**
 * Blacklist entry data
 */
export interface BlacklistEntry {
  stablecoin: PublicKey;
  address: PublicKey;
  reason: string;
  timestamp: BN;
  bump: number;
}
