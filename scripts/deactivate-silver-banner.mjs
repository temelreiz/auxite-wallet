// One-off: deactivate the "Trade & Earn — 1g Silver Bonus" campaign banner.
// Sets active=false (reversible) on the mobile:banners Redis record.
// Run: node --env-file=.env.local scripts/deactivate-silver-banner.mjs
import { kv } from "@vercel/kv";

const KEY = "mobile:banners";
const TARGET = "vb-campaign-1780737760146";

const data = await kv.get(KEY);
if (!data || !Array.isArray(data.banners)) {
  console.error("No banners record found at", KEY);
  process.exit(1);
}

let touched = false;
for (const b of data.banners) {
  if (b.id === TARGET) {
    console.log("Before:", b.id, "active=", b.active, "| EN:", b.title?.en);
    b.active = false;
    b.updatedAt = new Date().toISOString();
    touched = true;
  }
}

if (!touched) {
  console.error("Target banner not found:", TARGET);
  process.exit(1);
}

data.lastUpdated = new Date().toISOString();
await kv.set(KEY, data);

console.log("✓ Deactivated", TARGET);
console.log("Remaining ACTIVE banners:", data.banners.filter((b) => b.active).map((b) => b.id));
