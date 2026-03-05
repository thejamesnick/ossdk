import { Connection, PublicKey } from "@solana/web3.js";
import { getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Replace with your mint address from the test output
const mintAddress = new PublicKey("4gDTBq1MsusJGquL8sUVL5k2DJA2EACfht6zEwVhZZr1");

async function checkMint() {
  try {
    const mintInfo = await getMint(
      connection,
      mintAddress,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log("Mint Info:");
    console.log("  Address:", mintAddress.toBase58());
    console.log("  Supply:", mintInfo.supply.toString());
    console.log("  Decimals:", mintInfo.decimals);
    console.log("  Mint Authority:", mintInfo.mintAuthority?.toBase58());
    console.log("  Freeze Authority:", mintInfo.freezeAuthority?.toBase58());
    console.log("  TLV Data Length:", mintInfo.tlvData.length);
    console.log("\nExtensions found:", mintInfo.tlvData.length > 0 ? "Yes" : "No");
    
    if (mintInfo.tlvData.length > 0) {
      console.log("TLV Data (hex):", mintInfo.tlvData.toString("hex").slice(0, 200));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkMint();
