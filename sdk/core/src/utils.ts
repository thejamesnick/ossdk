import { PublicKey } from "@solana/web3.js";
import { StablecoinConfig } from "./types";

export const SSS_CORE_PROGRAM_ID = new PublicKey(
  "BBED2cVQ933QETonEdS7XLR7Q99k6cwpfp42113hEt2o"
);

/**
 * Get stablecoin PDA
 */
export function getStablecoinPDA(
  mint: PublicKey,
  programId: PublicKey = SSS_CORE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin"), mint.toBuffer()],
    programId
  );
}

/**
 * Get minter account PDA
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
 * Get blacklist entry PDA
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
 * Compute instruction discriminator (first 8 bytes of SHA256 hash)
 */
export function getInstructionDiscriminator(name: string): Buffer {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

/**
 * Serialize a string (u32 length + bytes)
 */
export function serializeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length);
  return Buffer.concat([len, bytes]);
}

/**
 * Serialize a u64 value
 */
export function serializeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

/**
 * Serialize a u8 value
 */
export function serializeU8(value: number): Buffer {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(value);
  return buf;
}

/**
 * Serialize a boolean (as u8)
 */
export function serializeBool(value: boolean): Buffer {
  return serializeU8(value ? 1 : 0);
}

/**
 * Serialize a PublicKey
 */
export function serializePublicKey(pubkey: PublicKey): Buffer {
  return pubkey.toBuffer();
}

/**
 * Serialize StablecoinConfig struct
 */
export function serializeStablecoinConfig(config: StablecoinConfig): Buffer {
  return Buffer.concat([
    serializeString(config.name),
    serializeString(config.symbol),
    serializeString(config.uri),
    serializeU8(config.decimals),
    serializeBool(config.enablePermanentDelegate),
    serializeBool(config.enableTransferHook),
    serializeBool(config.defaultAccountFrozen),
  ]);
}

/**
 * Convert number to BN-compatible value
 */
export function toBN(value: number): bigint {
  return BigInt(value);
}

/**
 * Convert BN to number with decimals
 */
export function fromBN(value: bigint, decimals: number): number {
  return Number(value) / Math.pow(10, decimals);
}
