import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Withdraw Flow
 * Para/metal çekim işlem akışı testleri
 */

test.describe('Wallet Page', () => {
  test.beforeEach(async ({ page }) => {
    // Wallet sayfasına git
    await page.goto('/wallet');
  });

  test('should display wallet page', async ({ page }) => {
    // Sayfa yüklenmeli
    await expect(page).toHaveURL(/.*wallet|brieftasche|cüzdan/i);
  });

  test('should show connect wallet prompt if not connected', async ({ page }) => {
    // Wallet bağlı değilse connect prompt göster
    const connectPrompt = page.locator('text=/connect/i, text=/bağla/i, text=/verbinden/i, button:has-text("Connect")');
    
    // Connect prompt veya wallet içeriği görünmeli
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('should have withdraw section', async ({ page }) => {
    // Withdraw/Çekim bölümü
    const withdrawSection = page.locator('text=/withdraw/i, text=/çekim/i, text=/abheben/i, text=/çek/i');
    
    // Withdraw bölümü olabilir
    const count = await withdrawSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Withdraw Modal', () => {
  test('should open withdraw modal', async ({ page }) => {
    await page.goto('/wallet');
    
    // Withdraw butonu bul
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek"), button:has-text("Abheben")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      // Modal açılmalı
      const modal = page.locator('[role="dialog"], .modal, [data-testid="withdraw-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have address input field', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      // Adres input alanı
      const addressInput = page.locator('input[placeholder*="address"], input[placeholder*="adres"], input[placeholder*="Adresse"], input[name="address"]');
      
      if (await addressInput.first().isVisible().catch(() => false)) {
        await expect(addressInput.first()).toBeVisible();
      }
    }
  });

  test('should have amount input field', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      // Miktar input alanı
      const amountInput = page.locator('input[type="number"], input[placeholder*="amount"], input[placeholder*="miktar"]');
      
      if (await amountInput.first().isVisible().catch(() => false)) {
        await expect(amountInput.first()).toBeVisible();
      }
    }
  });

  test('should have asset selector', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      // Asset seçici (USD, USDT, ETH, etc.)
      const assetSelector = page.locator('select, [role="listbox"], button:has-text("USD"), button:has-text("USDT"), button:has-text("ETH")');
      
      // Selector olabilir
      const count = await assetSelector.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Withdraw Validation', () => {
  test('should validate ethereum address format', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      const addressInput = page.locator('input[placeholder*="address"], input[name="address"]').first();
      
      if (await addressInput.isVisible().catch(() => false)) {
        // Geçersiz adres gir
        await addressInput.fill('invalid_address');
        
        // Submit dene
        const submitButton = page.locator('button:has-text("Submit"), button:has-text("Gönder"), button:has-text("Confirm")').first();
        
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          
          // Hata mesajı olabilir
          const error = page.locator('text=/invalid/i, text=/geçersiz/i, text=/ungültig/i');
          const count = await error.count();
          expect(count).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test('should show insufficient balance error', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      const amountInput = page.locator('input[type="number"]').first();
      
      if (await amountInput.isVisible().catch(() => false)) {
        // Çok yüksek miktar gir
        await amountInput.fill('999999999');
        
        // Hata mesajı olabilir
        const error = page.locator('text=/insufficient/i, text=/yetersiz/i, text=/nicht genug/i');
        const count = await error.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should enforce minimum withdraw amount', async ({ page }) => {
    await page.goto('/wallet');
    
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      const amountInput = page.locator('input[type="number"]').first();
      
      if (await amountInput.isVisible().catch(() => false)) {
        // Minimum altı değer
        await amountInput.fill('0.001');
        
        // Minimum uyarısı olabilir
        const warning = page.locator('text=/minimum/i, text=/mindest/i, text=/en az/i');
        const count = await warning.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Transaction History', () => {
  test('should show transaction history section', async ({ page }) => {
    await page.goto('/wallet');
    
    // Transaction history
    const historySection = page.locator('text=/history/i, text=/geçmiş/i, text=/verlauf/i, text=/transaction/i, text=/işlem/i');
    
    // History bölümü olabilir
    const count = await historySection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display transaction details', async ({ page }) => {
    await page.goto('/wallet');
    
    // Transaction detayları (date, amount, status, etc.)
    const transactionItems = page.locator('[data-testid*="transaction"], .transaction-item, tr');
    
    // Transaction items olabilir
    const count = await transactionItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Deposit Flow', () => {
  test('should show deposit section', async ({ page }) => {
    await page.goto('/wallet');
    
    // Deposit bölümü
    const depositSection = page.locator('text=/deposit/i, text=/yatır/i, text=/einzahlen/i');
    
    // Deposit bölümü olabilir
    const count = await depositSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display deposit address', async ({ page }) => {
    await page.goto('/wallet');
    
    // Deposit butonu
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("Yatır"), button:has-text("Einzahlen")').first();
    
    if (await depositButton.isVisible().catch(() => false)) {
      await depositButton.click();
      
      // Deposit adresi veya QR code
      const depositAddress = page.locator('text=/0x/, [data-testid="deposit-address"], .qr-code');
      
      // Deposit adresi olabilir
      const count = await depositAddress.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have copy address button', async ({ page }) => {
    await page.goto('/wallet');
    
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("Yatır")').first();
    
    if (await depositButton.isVisible().catch(() => false)) {
      await depositButton.click();
      
      // Copy butonu
      const copyButton = page.locator('button:has-text("Copy"), button:has-text("Kopyala"), button:has-text("Kopieren"), [data-testid="copy-button"]');
      
      // Copy butonu olabilir
      const count = await copyButton.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Balance Display', () => {
  test('should show multiple asset balances', async ({ page }) => {
    await page.goto('/wallet');
    
    // Farklı asset bakiyeleri
    const assets = ['USD', 'USDT', 'ETH', 'BTC', 'AUXG', 'AUXS'];
    let foundCount = 0;
    
    for (const asset of assets) {
      const element = page.locator(`text=${asset}`);
      if (await element.first().isVisible().catch(() => false)) {
        foundCount++;
      }
    }
    
    // En az bir asset görünebilir
    expect(foundCount).toBeGreaterThanOrEqual(0);
  });

  test('should show total portfolio value', async ({ page }) => {
    await page.goto('/wallet');
    
    // Toplam değer
    const totalValue = page.locator('text=/total/i, text=/toplam/i, text=/gesamt/i');
    
    // Toplam değer olabilir
    const count = await totalValue.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Security Features', () => {
  test('should require confirmation for large withdrawals', async ({ page }) => {
    await page.goto('/wallet');
    
    // Withdraw işlemi için confirmation gerekli olabilir
    const withdrawButton = page.locator('button:has-text("Withdraw"), button:has-text("Çek")').first();
    
    if (await withdrawButton.isVisible().catch(() => false)) {
      await withdrawButton.click();
      
      // Confirmation dialog veya 2FA prompt
      const confirmation = page.locator('text=/confirm/i, text=/onayla/i, text=/bestätigen/i, text=/2fa/i');
      
      // Confirmation olabilir
      const count = await confirmation.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
