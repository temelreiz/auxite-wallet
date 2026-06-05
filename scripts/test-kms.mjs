// scripts/test-kms.mjs — READ-ONLY connectivity test for AWS KMS.
// Encrypts + decrypts a tiny test string to confirm the key is live.
// Prints NO secrets.
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const region = process.env.AWS_REGION;
const keyId = process.env.AWS_KMS_KEY_ID;
console.log(`\nKMS test — region=${region} keyId=${keyId ? keyId.slice(0, 12) + "…" : "(none)"}`);

const kms = new KMSClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function main() {
  try {
    const enc = await kms.send(new EncryptCommand({ KeyId: keyId, Plaintext: Buffer.from("auxite-kms-test") }));
    const dec = await kms.send(new DecryptCommand({ CiphertextBlob: enc.CiphertextBlob }));
    const roundtrip = Buffer.from(dec.Plaintext).toString("utf-8");
    console.log(`encrypt+decrypt roundtrip: ${roundtrip === "auxite-kms-test" ? "✅ KMS IS LIVE" : "⚠️ mismatch"}`);
  } catch (e) {
    console.log(`❌ KMS NOT usable: ${e.name} — ${e.message}`);
    process.exit(2);
  }
}
main();
