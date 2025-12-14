import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test dizini
  testDir: './e2e',
  
  // Timeout
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Paralel çalıştırma
  fullyParallel: true,
  
  // CI'da retry
  retries: process.env.CI ? 2 : 0,
  
  // Worker sayısı
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // Shared settings
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'on-first-retry',
  },

  // Projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Opsiyonel: diğer browserlar
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // Mobile
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
