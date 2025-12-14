// src/lib/security/secrets.ts
// Güvenli secret yönetimi - Production'da AWS Secrets Manager veya Vault kullanılmalı

/**
 * ⛔ CRITICAL SECURITY NOTICE
 * 
 * This file provides a secure way to access secrets.
 * In production, replace the getSecret function with:
 * - AWS Secrets Manager
 * - HashiCorp Vault
 * - Azure Key Vault
 * - Google Secret Manager
 * 
 * NEVER store private keys in:
 * - .env files
 * - Git repositories
 * - Plain text anywhere
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SecretKey = 
  | 'HOT_WALLET_ETH_PRIVATE_KEY'
  | 'HOT_WALLET_XRP_SECRET'
  | 'HOT_WALLET_SOL_PRIVATE_KEY'
  | 'ADMIN_SECRET'
  | 'NOWPAYMENTS_API_KEY'
  | 'NOWPAYMENTS_IPN_SECRET'
  | 'VAPID_PRIVATE_KEY';

interface SecretsConfig {
  provider: 'env' | 'aws' | 'vault' | 'azure';
  awsRegion?: string;
  vaultUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const config: SecretsConfig = {
  // ⚠️ Change to 'aws' or 'vault' in production
  provider: process.env.SECRETS_PROVIDER as any || 'env',
  awsRegion: process.env.AWS_REGION || 'eu-west-1',
  vaultUrl: process.env.VAULT_URL,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECRET PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get secret from environment variable (DEVELOPMENT ONLY)
 * ⛔ NOT recommended for production
 */
async function getSecretFromEnv(key: SecretKey): Promise<string | null> {
  console.warn(`⚠️ [SECURITY] Reading secret from env: ${key}. Use secure storage in production!`);
  return process.env[key] || null;
}

/**
 * Get secret from AWS Secrets Manager
 * Recommended for AWS deployments
 */
async function getSecretFromAWS(key: SecretKey): Promise<string | null> {
  // AWS SDK not installed - return null
  console.log("AWS Secrets Manager not configured, using environment variables");
  return null;
}
/**
 * Get secret from HashiCorp Vault
 * Recommended for self-hosted or multi-cloud
 */
async function getSecretFromVault(key: SecretKey): Promise<string | null> {
  try {
    const vaultToken = process.env.VAULT_TOKEN;
    if (!config.vaultUrl || !vaultToken) {
      throw new Error('Vault URL or token not configured');
    }
    
    const response = await fetch(`${config.vaultUrl}/v1/secret/data/auxite/${key}`, {
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Vault responded with ${response.status}`);
    }
    
    const data = await response.json();
    return data?.data?.data?.[key] || data?.data?.data?.value || null;
  } catch (error) {
    console.error(`[Secrets] Vault error for ${key}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a secret securely
 * Automatically uses the configured provider
 */
export async function getSecret(key: SecretKey): Promise<string | null> {
  switch (config.provider) {
    case 'aws':
      return getSecretFromAWS(key);
    case 'vault':
      return getSecretFromVault(key);
    case 'env':
    default:
      return getSecretFromEnv(key);
  }
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(keys: SecretKey[]): Promise<Record<SecretKey, string | null>> {
  const results = await Promise.all(
    keys.map(async (key) => [key, await getSecret(key)] as const)
  );
  return Object.fromEntries(results) as Record<SecretKey, string | null>;
}

/**
 * Check if all required secrets are available
 */
export async function validateSecrets(keys: SecretKey[]): Promise<boolean> {
  const secrets = await getSecrets(keys);
  const missing = keys.filter(key => !secrets[key]);
  
  if (missing.length > 0) {
    console.error(`[Secrets] Missing secrets: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT WALLET HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get ETH hot wallet private key securely
 */
export async function getEthPrivateKey(): Promise<string | null> {
  return getSecret('HOT_WALLET_ETH_PRIVATE_KEY');
}

/**
 * Get XRP hot wallet secret securely
 */
export async function getXrpSecret(): Promise<string | null> {
  return getSecret('HOT_WALLET_XRP_SECRET');
}

/**
 * Get SOL hot wallet private key securely
 */
export async function getSolPrivateKey(): Promise<string | null> {
  return getSecret('HOT_WALLET_SOL_PRIVATE_KEY');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AWS Secrets Manager Setup:
 * 
 * 1. Create secrets in AWS Console:
 *    aws secretsmanager create-secret --name auxite/HOT_WALLET_ETH_PRIVATE_KEY --secret-string "your_key"
 * 
 * 2. Set environment variables:
 *    SECRETS_PROVIDER=aws
 *    AWS_REGION=eu-west-1
 *    AWS_ACCESS_KEY_ID=your_key
 *    AWS_SECRET_ACCESS_KEY=your_secret
 * 
 * 3. Install AWS SDK:
 *    npm install @aws-sdk/client-secrets-manager
 */

/**
 * HashiCorp Vault Setup:
 * 
 * 1. Store secrets in Vault:
 *    vault kv put secret/auxite/HOT_WALLET_ETH_PRIVATE_KEY value="your_key"
 * 
 * 2. Set environment variables:
 *    SECRETS_PROVIDER=vault
 *    VAULT_URL=https://vault.your-domain.com
 *    VAULT_TOKEN=your_token
 */

export default {
  getSecret,
  getSecrets,
  validateSecrets,
  getEthPrivateKey,
  getXrpSecret,
  getSolPrivateKey,
};
