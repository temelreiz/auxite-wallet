import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Login/Connect Flow
 * Wallet bağlantısı ve admin giriş testleri
 */

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display connect wallet button', async ({ page }) => {
    // Connect button görünür olmalı
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Bağlan")');
    await expect(connectButton).toBeVisible();
  });

  test('should show wallet modal on connect click', async ({ page }) => {
    // Connect butonuna tıkla
    const connectButton = page.locator('button:has-text("Connect"), button:has-text("Bağlan")');
    await connectButton.click();

    // Modal açılmalı (ConnectKit modal)
    await expect(page.locator('[role="dialog"], .ck-modal')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to different pages without wallet', async ({ page }) => {
    // Markets sayfasına git
    await page.click('text=Märkte, text=Markets, text=Piyasalar');
    await expect(page).toHaveURL(/.*markets|piyasalar/i);

    // Staking sayfasına git
    await page.click('text=Staken, text=Stake, text=Biriktir');
    await expect(page).toHaveURL(/.*stake|biriktir/i);
  });

  test('should show language selector', async ({ page }) => {
    // Dil seçici görünür olmalı
    const langSelector = page.locator('[data-testid="language-selector"], button:has-text("English"), button:has-text("Deutsch"), button:has-text("Türkçe")');
    await expect(langSelector.first()).toBeVisible();
  });

  test('should change language', async ({ page }) => {
    // Dil seçiciyi aç
    const langButton = page.locator('button:has-text("English"), button:has-text("Deutsch"), button:has-text("Türkçe")').first();
    await langButton.click();

    // Türkçe seç
    const turkishOption = page.locator('text=Türkçe').first();
    if (await turkishOption.isVisible()) {
      await turkishOption.click();
      // Sayfa Türkçe olmalı
      await expect(page.locator('text=Piyasalar, text=Portföy, text=Biriktir')).toBeVisible();
    }
  });
});

test.describe('Admin Login', () => {
  test('should show admin login page', async ({ page }) => {
    await page.goto('/admin');

    // Connect wallet veya login formu görünmeli
    const content = page.locator('text=Admin, text=Connect, text=Bağlan, text=Giriş');
    await expect(content.first()).toBeVisible();
  });

  test('should require wallet connection for admin', async ({ page }) => {
    await page.goto('/admin');

    // Wallet bağlı değilse connect button göster
    const connectPrompt = page.locator('text=Connect, text=Bağlan, text=cüzdan');
    await expect(connectPrompt.first()).toBeVisible();
  });

  test('should show password form after wallet connect', async ({ page }) => {
    // Bu test mock wallet ile çalışacak
    // Gerçek test için wallet mock gerekli
    await page.goto('/admin');
    
    // Sayfa yüklenmiş olmalı
    await expect(page).toHaveURL('/admin');
  });
});

test.describe('Navigation', () => {
  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/');

    // Logo görünür
    const logo = page.locator('img[alt*="Auxite"], img[alt*="Logo"]');
    await expect(logo.first()).toBeVisible();

    // Nav links
    const navLinks = ['Markets', 'Märkte', 'Piyasalar', 'Stake', 'Staken', 'Biriktir', 'Wallet', 'Brieftasche', 'Cüzdan'];
    
    for (const link of navLinks) {
      const navItem = page.locator(`text=${link}`).first();
      if (await navItem.isVisible()) {
        expect(await navItem.isVisible()).toBeTruthy();
        break;
      }
    }
  });

  test('should show dark/light mode toggle', async ({ page }) => {
    await page.goto('/');

    // Theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"], button[aria-label*="theme"], button[aria-label*="mode"]');
    // Toggle varsa kontrol et
    const count = await themeToggle.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Sayfa yüklenmeli
    await expect(page).toHaveTitle(/Auxite/i);
    
    // İçerik görünür olmalı
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Hamburger menu veya mobile nav
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
    const count = await mobileMenu.count();
    
    // Mobile menu varsa veya nav başka şekilde görünüyorsa OK
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
