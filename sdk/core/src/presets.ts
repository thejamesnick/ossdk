import { StablecoinConfig, PresetType } from "./types";

/**
 * SSS-1: Minimal Stablecoin
 * 
 * Features:
 * - Basic mint/burn
 * - Freeze/thaw accounts
 * - Role-based access control
 * - Emergency pause
 * 
 * Use cases:
 * - DAO treasuries
 * - Internal company tokens
 * - Simple settlement tokens
 */
export const SSS_1_CONFIG: Omit<StablecoinConfig, "name" | "symbol" | "uri" | "decimals"> = {
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
};

/**
 * SSS-2: Compliant Stablecoin
 * 
 * Features:
 * - All SSS-1 features
 * - Permanent delegate (token seizure)
 * - Transfer hook (automatic blacklist enforcement)
 * - Blacklist management
 * - Full audit trail
 * 
 * Use cases:
 * - Regulated stablecoins (USDC/USDT-class)
 * - Institutional tokens
 * - Compliance-required applications
 */
export const SSS_2_CONFIG: Omit<StablecoinConfig, "name" | "symbol" | "uri" | "decimals"> = {
  enablePermanentDelegate: true,
  enableTransferHook: true,
  defaultAccountFrozen: false,
};

/**
 * SSS-3: Private Stablecoin (Bonus - Experimental)
 * 
 * Features:
 * - All SSS-1 features
 * - Confidential transfers (encrypted balances)
 * - Allowlist mechanism
 * 
 * Use cases:
 * - Privacy-focused applications
 * - Experimental use cases
 * 
 * Note: Requires Token-2022 confidential transfer extension
 */
export const SSS_3_CONFIG: Omit<StablecoinConfig, "name" | "symbol" | "uri" | "decimals"> = {
  enablePermanentDelegate: false,
  enableTransferHook: false,
  defaultAccountFrozen: false,
  // TODO: Add confidential transfer configuration when implementing SSS-3
};

/**
 * Get preset configuration by type
 */
export function getPresetConfig(
  preset: PresetType,
  name: string,
  symbol: string,
  uri: string = "",
  decimals: number = 6
): StablecoinConfig {
  let baseConfig: Omit<StablecoinConfig, "name" | "symbol" | "uri" | "decimals">;

  switch (preset) {
    case PresetType.SSS_1:
      baseConfig = SSS_1_CONFIG;
      break;
    case PresetType.SSS_2:
      baseConfig = SSS_2_CONFIG;
      break;
    case PresetType.SSS_3:
      baseConfig = SSS_3_CONFIG;
      break;
    default:
      throw new Error(`Unknown preset: ${preset}`);
  }

  return {
    ...baseConfig,
    name,
    symbol,
    uri,
    decimals,
  };
}

/**
 * Preset exports for easy access
 */
export const Presets = {
  SSS_1: PresetType.SSS_1,
  SSS_2: PresetType.SSS_2,
  SSS_3: PresetType.SSS_3,
} as const;
