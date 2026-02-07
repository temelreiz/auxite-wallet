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
    // Check if user exists
    const user = await redis.hgetall(`auth:user:${normalizedEmail}`);

    if (!user || Object.keys(user).length === 0) {
      console.log(`❌ User not found: ${normalizedEmail}`);
      return;
    }

    console.log(`Found user: ${normalizedEmail}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Created: ${new Date(parseInt(user.createdAt)).toISOString()}`);

    // Delete user data
    await redis.del(`auth:user:${normalizedEmail}`);
    await redis.del(`auth:email:${normalizedEmail}`);

    console.log(`✅ User deleted: ${normalizedEmail}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

const email = process.argv[2];
deleteUser(email);
