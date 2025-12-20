/**
 * Auxiteer Tier Configuration
 * Tier sabitleri ve interface'ler
 */

export interface AuxiteerTierConfig {
  id: string;
  name: string;
  spread: number; // Percentage
  fee: number; // Percentage
  requirements: {
    kyc: boolean;
    minBalanceUsd: number;
    minDays: number;
    metalAsset: boolean;
    activeEarnLease: boolean;
    invitation: boolean;
  };
}

export const AUXITEER_TIERS: AuxiteerTierConfig[] = [
  {
    id: 'regular',
    name: 'Regular',
    spread: 1.0,
    fee: 0.35,
    requirements: {
      kyc: false,
      minBalanceUsd: 0,
      minDays: 0,
      metalAsset: false,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'core',
    name: 'Core',
    spread: 0.8,
    fee: 0.25,
    requirements: {
      kyc: true,
      minBalanceUsd: 10000,
      minDays: 7,
      metalAsset: false,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'reserve',
    name: 'Reserve',
    spread: 0.65,
    fee: 0.18,
    requirements: {
      kyc: true,
      minBalanceUsd: 100000,
      minDays: 30,
      metalAsset: true,
      activeEarnLease: false,
      invitation: false,
    },
  },
  {
    id: 'vault',
    name: 'Vault',
    spread: 0.5,
    fee: 0.12,
    requirements: {
      kyc: true,
      minBalanceUsd: 500000,
      minDays: 90,
      metalAsset: true,
      activeEarnLease: true,
      invitation: false,
    },
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    spread: 0, // Custom
    fee: 0, // Custom
    requirements: {
      kyc: true,
      minBalanceUsd: 1000000,
      minDays: 180,
      metalAsset: true,
      activeEarnLease: true,
      invitation: true,
    },
  },
];
