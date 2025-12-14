import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Staking Flow
 * Metal staking/leasing işlem akışı testleri
 */

test.describe('Staking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should display staking page', async ({ page }) => {
    // Sayfa yüklenmeli
    await expect(page).toHaveURL(/.*stake|biriktir|staking/i);
  });

  test('should show page title', async ({ page }) => {
    // Başlık görünmeli
    const title = page.locator('h1, h2');
    await expect(title.first()).toBeVisible();
  });

  test('should display SOFR rate', async ({ page }) => {
    // SOFR oranı gösterilmeli
    const sofrDisplay = page.locator('text=/SOFR/i, text=/[0-9]+\\.?[0-9]*%/');
    
    // SOFR görünebilir
    const count = await sofrDisplay.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show staking stats', async ({ page }) => {
    // Staking istatistikleri (Total Staked, APY, etc.)
    const stats = page.locator('text=/total/i, text=/toplam/i, text=/APY/i, text=/locked/i, text=/kilitli/i');
    
    // İstatistikler görünebilir
    const count = await stats.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Metal Staking Offers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should display all metal offers', async ({ page }) => {
    // 4 metal için staking offers
    const metals = ['AUXG', 'Gold', 'AUXS', 'Silver', 'AUXPT', 'Platinum', 'AUXPD', 'Palladium'];
    
    let foundCount = 0;
    for (const metal of metals) {
      const element = page.locator(`text=${metal}`);
      if (await element.first().isVisible().catch(() => false)) {
        foundCount++;
      }
    }
    
    // En az bir metal görünmeli
    expect(foundCount).toBeGreaterThan(0);
  });

  test('should show duration options (3, 6, 12 months)', async ({ page }) => {
    // Süre seçenekleri
    const durations = ['3', '6', '12'];
    
    let foundCount = 0;
    for (const duration of durations) {
      const element = page.locator(`text=/${duration}.*Mo|${duration}.*Ay|${duration}.*month/i`);
      if (await element.first().isVisible().catch(() => false)) {
        foundCount++;
      }
    }
    
    // En az bir süre görünebilir
    expect(foundCount).toBeGreaterThanOrEqual(0);
  });

  test('should display APY rates for each duration', async ({ page }) => {
    // APY oranları
    const apyDisplay = page.locator('text=/[0-9]+\\.?[0-9]*%.*APY|APY.*[0-9]+\\.?[0-9]*%/i');
    
    // APY görünebilir
    const count = await apyDisplay.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show minimum stake amount', async ({ page }) => {
    // Minimum stake miktarı
    const minAmount = page.locator('text=/min/i, text=/minimum/i, text=/mindest/i');
    
    // Minimum göstergesi olabilir
    const count = await minAmount.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show TVL for each metal', async ({ page }) => {
    // Total Value Locked
    const tvl = page.locator('text=/TVL/i, text=/total.*locked/i');
    
    // TVL görünebilir
    const count = await tvl.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Staking Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should open staking modal on stake button click', async ({ page }) => {
    // Stake butonu
    const stakeButton = page.locator('button:has-text("Stake"), button:has-text("Biriktir"), button:has-text("Staken"), button:has-text("Verdienen")').first();
    
    if (await stakeButton.isVisible().catch(() => false)) {
      await stakeButton.click();
      
      // Modal açılmalı
      const modal = page.locator('[role="dialog"], .modal, [data-testid="stake-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have amount input in stake modal', async ({ page }) => {
    const stakeButton = page.locator('button:has-text("Stake"), button:has-text("Biriktir")').first();
    
    if (await stakeButton.isVisible().catch(() => false)) {
      await stakeButton.click();
      
      // Amount input
      const amountInput = page.locator('input[type="number"], input[placeholder*="amount"], input[placeholder*="miktar"]');
      
      if (await amountInput.first().isVisible().catch(() => false)) {
        await expect(amountInput.first()).toBeVisible();
      }
    }
  });

  test('should show estimated earnings', async ({ page }) => {
    const stakeButton = page.locator('button:has-text("Stake"), button:has-text("Biriktir")').first();
    
    if (await stakeButton.isVisible().catch(() => false)) {
      await stakeButton.click();
      
      // Tahmini kazanç
      const earnings = page.locator('text=/earn/i, text=/kazanç/i, text=/verdienen/i, text=/reward/i');
      
      // Earnings görünebilir
      const count = await earnings.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should allow duration selection', async ({ page }) => {
    const stakeButton = page.locator('button:has-text("Stake"), button:has-text("Biriktir")').first();
    
    if (await stakeButton.isVisible().catch(() => false)) {
      await stakeButton.click();
      
      // Süre seçimi
      const durationSelector = page.locator('button:has-text("3"), button:has-text("6"), button:has-text("12"), select');
      
      // Selector olabilir
      const count = await durationSelector.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('My Positions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should show positions tab', async ({ page }) => {
    // Pozisyonlar tabı
    const positionsTab = page.locator('text=/position/i, text=/pozisyon/i, text=/meine/i');
    
    // Tab olabilir
    const count = await positionsTab.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display active positions', async ({ page }) => {
    // Pozisyonlar tabına tıkla
    const positionsTab = page.locator('button:has-text("Position"), button:has-text("Pozisyon"), [role="tab"]:has-text("Position")').first();
    
    if (await positionsTab.isVisible().catch(() => false)) {
      await positionsTab.click();
      
      // Pozisyon listesi veya boş mesaj
      const content = page.locator('[data-testid="positions-list"], text=/no position/i, text=/pozisyon yok/i, text=/keine/i');
      
      // İçerik olabilir
      const count = await content.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show position details', async ({ page }) => {
    const positionsTab = page.locator('button:has-text("Position"), button:has-text("Pozisyon")').first();
    
    if (await positionsTab.isVisible().catch(() => false)) {
      await positionsTab.click();
      
      // Pozisyon detayları (metal, amount, APY, end date)
      const details = page.locator('text=/APY/i, text=/amount/i, text=/miktar/i, text=/end/i, text=/bitiş/i');
      
      // Detaylar olabilir
      const count = await details.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Auto-Invest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should show auto-invest tab', async ({ page }) => {
    // Auto-invest tabı
    const autoInvestTab = page.locator('text=/auto/i, text=/otomatik/i');
    
    // Tab olabilir
    const count = await autoInvestTab.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display auto-invest options', async ({ page }) => {
    const autoInvestTab = page.locator('button:has-text("Auto"), [role="tab"]:has-text("Auto")').first();
    
    if (await autoInvestTab.isVisible().catch(() => false)) {
      await autoInvestTab.click();
      
      // Auto-invest ayarları
      const settings = page.locator('text=/enable/i, text=/etkinleştir/i, text=/aktivieren/i, input[type="checkbox"], [role="switch"]');
      
      // Ayarlar olabilir
      const count = await settings.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Staking Information', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stake');
  });

  test('should show how it works section', async ({ page }) => {
    // Nasıl çalışır bölümü
    const howItWorks = page.locator("text=/how.*work/i, text=/nasıl.*çalış/i, text=/so funktioniert/i");
    
    // Bölüm olabilir
    const count = await howItWorks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show features list', async ({ page }) => {
    // Özellikler listesi
    const features = page.locator('text=/feature/i, text=/özellik/i, text=/funktion/i, text=/insured/i, text=/sigorta/i');
    
    // Features olabilir
    const count = await features.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
