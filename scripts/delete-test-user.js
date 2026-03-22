// delete-test-user.js
// Usage: node delete-test-user.js email@example.com

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: "https://guiding-pangolin-30256.upstash.io",
  token: "AXYwAAIncDJlNjE3NGFlOTAyMmM0NzRmYTg3M2E3YWQ4ODk3ZDlhMnAyMzAyNTY",
});

async function deleteUser(email) {
  if (!email) {
    console.log('Usage: node delete-test-user.js email@example.com');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await redis.hgetall(`auth:user:${normalizedEmail}`);

    if (!user || Object.keys(user).length === 0) {
      console.log(`User not found: ${normalizedEmail}`);
      return;
    }

    const userId = user.id;
    const wa = user.walletAddress;
    const vaultId = user.vaultId;
    console.log(`Found: id=${userId}, wallet=${wa}, vault=${vaultId}`);

    const keys = [
      `auth:user:${normalizedEmail}`,
      `auth:email:${normalizedEmail}`,
      `user:${userId}`,
      `user:${userId}:balance:AUXM`,
      `user:${userId}:balance:AUXG`,
      `user:${userId}:balance:AUXS`,
      `user:${userId}:balance:AUXPT`,
      `user:${userId}:balance:AUXPD`,
      `user:${userId}:balance:bonusAUXS`,
      `user:${userId}:earlybird:expiresAt`,
      `user:${userId}:balance:bonusAUXSExpiresAt`,
      `user:${userId}:transactions`,
      `user:${userId}:purchases:auxsEquiv`,
    ];
    if (wa) {
      keys.push(`user:address:${wa.toLowerCase()}`);
      keys.push(`user:${wa.toLowerCase()}:transactions`);
      keys.push(`user:${wa.toLowerCase()}:balance`);
    }
    if (vaultId) keys.push(`vault:${vaultId}`);

    for (const k of keys) {
      const r = await redis.del(k);
      if (r > 0) console.log(`  DEL ${k}`);
    }

    // Decrement early bird counter
    const ebCount = await redis.get("campaign:earlybird:count");
    if (ebCount > 0) {
      await redis.decr("campaign:earlybird:count");
      console.log(`  EB count: ${ebCount} -> ${ebCount - 1}`);
    }

    console.log(`Done: ${normalizedEmail} deleted`);
  } catch (error) {
    console.error('Error:', error);
  }
}

const email = process.argv[2];
deleteUser(email);
