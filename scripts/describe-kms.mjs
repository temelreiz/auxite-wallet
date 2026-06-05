// scripts/describe-kms.mjs — READ-ONLY. Reports the KMS key's identity + state
// so it can be located/checked in the AWS console. Prints no secret material
// (key IDs/ARNs/aliases are resource identifiers, not secrets).
import { KMSClient, DescribeKeyCommand, ListAliasesCommand, GetKeyRotationStatusCommand } from "@aws-sdk/client-kms";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const region = process.env.AWS_REGION;
const keyId = process.env.AWS_KMS_KEY_ID;
const kms = new KMSClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function main() {
  console.log(`\nRegion: ${region}`);
  const d = await kms.send(new DescribeKeyCommand({ KeyId: keyId }));
  const m = d.KeyMetadata || {};
  console.log(`Key ID:        ${m.KeyId}`);
  console.log(`ARN:           ${m.Arn}`);
  console.log(`State:         ${m.KeyState}   (want: Enabled)`);
  console.log(`Enabled:       ${m.Enabled}`);
  console.log(`Usage:         ${m.KeyUsage} / ${m.KeySpec || m.CustomerMasterKeySpec}`);
  console.log(`Manager:       ${m.KeyManager}`);
  console.log(`DeletionDate:  ${m.DeletionDate || "(none — not scheduled for deletion ✅)"}`);
  try {
    const al = await kms.send(new ListAliasesCommand({ KeyId: keyId }));
    const names = (al.Aliases || []).map((a) => a.AliasName).join(", ");
    console.log(`Alias(es):     ${names || "(none)"}`);
  } catch {}
  try {
    const rot = await kms.send(new GetKeyRotationStatusCommand({ KeyId: keyId }));
    console.log(`Key rotation:  ${rot.KeyRotationEnabled}`);
  } catch {}
  console.log("");
}
main().catch((e) => { console.error("KMS describe failed:", e.name, e.message); process.exit(1); });
