const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Next.js app dizini
  dir: './',
});

// Jest konfigürasyonu
const customJestConfig = {
  // Test ortamı
  testEnvironment: 'jsdom',
  
  // Setup dosyaları
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module aliases (tsconfig paths ile eşleşmeli)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test dosyaları pattern
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Coverage ayarları
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/cypress/',
  ],
  
  // Transform ignore
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

module.exports = createJestConfig(customJestConfig);
