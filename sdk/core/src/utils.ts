import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Program IDs
 */
export const SSS_CORE_PROGRAM_ID = new PublicKey("SSS1Core11111111111111111111111111111111111");
export const SSS_HOOK_PROGRAM_ID = new PublicKey("SSS1Hook11111111111111111111111111111111111");

/**
 * Derive stablecoin PDA
 */
export function getStablecoinPDA(mint: PublicKey, programId: PublicKey = SSS_CORE_PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin"), mint.toBuffer()],
    programId
  );
}

/**
 * Derive minter account PDA
 */
export function getMinterPDA(
  stablecoin: PublicKey,
  minter: PublicKey,
  programId: PublicKey = SSS_CORE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("minter"), stablecoin.toBuffer(), minter.toBuffer()],
    programId
  );
}

/**
 * Derive blacklist entry PDA
 */
export function getBlacklistPDA(
  stablecoin: PublicKey,
  address: PublicKey,
  programId: PublicKey = SSS_CORE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), stablecoin.toBuffer(), address.toBuffer()],
    programId
  );
}

/**
 * Convert number to BN with decimals
 */
export function toBN(amount: number | BN, decimals: number = 6): BN {
  if (BN.isBN(amount)) {
    return amount;
  }
  return new BN(amount * Math.pow(10, decimals));
}

/**
 * Convert BN to number with decimals
 */
export function fromBN(amount: BN, decimals: number = 6): number {
  return amount.toNumber() / Math.pow(10, decimals);
}

/**
 * Validate public key
 */
export function isValidPublicKey(key: string | PublicKey): boolean {
  try {
    if (typeof key === "string") {
      new PublicKey(key);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
