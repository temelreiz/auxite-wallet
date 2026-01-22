# Auxite Wallet - Geliştirme Yol Haritası

**Son Güncelleme:** 11 Aralık 2024

---

## ✅ Tamamlanan Özellikler

### Core Features
- [x] Next.js 14 App Router, Tailwind CSS, Wagmi, Redis
- [x] Pages: Markets (/), Wallet (/wallet), Earn (/earn), Profile (/profile), Admin (/admin)
- [x] Responsive design (hamburger menus, mobile-optimized)
- [x] Multi-language support (TR/EN)

### Trade System
- [x] Quote system (15s price lock)
- [x] Buy/Sell AUXM ↔ Metal
- [x] Metal ↔ Metal Swap
- [x] Crypto → Metal (on-chain)
- [x] Metal → Crypto (on-chain)
- [x] Crypto → AUXM
- [x] AUXM → Crypto
- [x] Crypto → Crypto BLOCKED (yasak)
- [x] Spread configuration (admin panel)
- [x] **Limit Order System** (11 Aralık 2024)
  - Redis-based off-chain limit orders
  - Cron job for price matching
  - UI integration (TradePanel, TradingDetailPage)
  - Wallet page pending orders display

### Charts & Prices
- [x] Metal price charts (TradingView-style)
- [x] **Binance Integration** (11 Aralık 2024)
  - Real-time crypto prices from Binance API
  - OHLCV chart data for crypto
  - CryptoPriceCard with sparkline charts
  - CryptoTradingDetailPage with Binance candles
- [x] AdvancedChart OHLC always visible
- [x] Spread removed from Trading Data tab

### Security
- [x] 2FA (TOTP + Backup codes)
- [x] 2FA Setup UI (QR code, 6-digit verification)
- [x] Withdraw 2FA requirement
- [x] Rate limiting, audit logging
- [x] Profile Security tab
- [x] **Withdrawal Whitelist** (11 Aralık 2024)
  - 24-hour verification period for new addresses
  - Multi-network support (ETH, BTC, XRP, SOL)
  - WhitelistManager UI component
- [x] **Session Management** (11 Aralık 2024)
  - Active sessions list
  - Device/browser detection
  - Terminate single or all sessions
  - Login notifications
  - SessionManager UI component

### Notifications
- [x] Push Notifications (Service Worker, VAPID)
- [x] Subscribe/Unsubscribe API
- [x] Notification preferences (transactions, priceAlerts, security, marketing)
- [x] Test notification

### Price Alerts
- [x] Price Alerts API (create, list, delete, update)
- [x] Price Alerts UI Panel
- [x] Support for all metals and cryptos
- [x] Direction (above/below), expiration, repeat options

### Recurring Buy (DCA) - Düzenli Yatırım
- [x] DCA API (create, list, delete, pause/resume)
- [x] DCA UI (RecurringBuyManager component)
- [x] Sadece Metal token desteği (AUXG, AUXS, AUXPT, AUXPD)
- [x] Payment sources: USD, USDT, ETH, BTC, XRP, SOL
- [x] Frequency: daily, weekly, biweekly, monthly
- [x] Confirmation modals (pause/resume/delete)
- [x] Success/error popups
- [x] Auto-Stake toggle (Alımları Biriktir)
- [x] Stake duration seçimi (3-6-12 ay)

### Recurring Stake - Düzenli Birikim
- [x] RecurringStake API (create, list, delete, pause/resume)
- [x] RecurringStakeManager component
- [x] Earn sayfasına entegrasyon (modal)
- [x] Metal + fallback payment source desteği
- [x] Stake duration seçimi (3-6-12 ay)

### Cron Jobs
- [x] Limit Order price check (per minute)
- [x] DCA Execute cron job
- [x] Recurring Stake Execute cron job

### Physical Delivery (Fiziksel Teslimat)
- [x] Delivery API (create, list, cancel requests)
- [x] Address management (add, list, delete)
- [x] Minimum gram limits (AUXG: 80g, AUXS: 5000g, AUXPT/AUXPD: 200g)
- [x] Delivery fees
- [x] Request status tracking
- [x] PhysicalDelivery UI component
- [x] Wallet page dropdown menu (İşlemler)

### KYC Service Integration (Sumsub)
- [x] Sumsub API entegrasyonu (lib/sumsub.ts)
- [x] Access token endpoint (/api/kyc/sumsub)
- [x] Webhook endpoint (/api/kyc/webhook)
- [x] KYCVerification bileşeni (Sumsub WebSDK)
- [x] Dark theme desteği
- [x] CSP/Middleware güncellemesi
- [x] Admin KYC yönetim sayfası (/admin/kyc)
- [x] Otomatik seviye güncelleme (none → basic → verified → enhanced)
- [x] Limit yönetimi (günlük/aylık/tek işlem)

### Referral System (11 Aralık 2024)
- [x] Referral codes (auto-generated)
- [x] Tier system (Bronze, Silver, Gold, Platinum)
- [x] Commission rates (10-25% based on tier)
- [x] $10 AUXM bonus for both referrer and referred
- [x] Qualification after $50+ trade
- [x] Pending/Qualified/Rewarded tracking
- [x] ReferralDashboard UI component
- [x] Apply referral code feature
- [x] Withdraw earnings to AUXM balance

---

## 🚧 Yapılacaklar (Sıralı)

### 1. Multi-wallet Support
- [ ] Multiple wallet addresses per account
- [ ] Wallet nicknames
- [ ] Primary wallet selection
- [ ] Cross-wallet balance view

### 2. Advanced Charts Enhancements
- [ ] Drawing tools
- [ ] Save chart preferences
- [ ] More indicators

### 3. Multi-language Expansion
- [ ] German (DE)
- [ ] French (FR)
- [ ] Arabic (AR)
- [ ] Russian (RU)

### 4. Other Improvements
- [ ] Dark/Light theme toggle
- [ ] PWA enhancements (offline support)
- [ ] Email notifications
- [ ] Export transaction history (CSV/PDF)

---

## 📁 Dosya Yapısı (Yeni Eklenenler)

### API Endpoints
```
app/api/
├── orders/
│   └── limit/route.ts              # Limit Order API
├── cron/
│   └── check-limit-orders/route.ts # Limit Order Cron
├── crypto/
│   ├── route.ts                    # Crypto Prices (Binance)
│   └── chart/route.ts              # Crypto Chart Data (Binance)
├── security/
│   ├── whitelist/route.ts          # Withdrawal Whitelist
│   └── sessions/route.ts           # Session Management
└── referral/route.ts               # Referral System
```

### Components
```
components/
├── LimitOrdersList.tsx             # Limit Orders Display
├── CryptoPriceCard.tsx             # Crypto Card with Sparkline
├── CryptoTradingDetailPage.tsx     # Crypto Detail (Binance Charts)
├── WhitelistManager.tsx            # Whitelist UI
├── SessionManager.tsx              # Sessions UI
└── ReferralDashboard.tsx           # Referral UI
```

### Hooks
```
hooks/
├── useLimitOrders.ts               # Limit Orders Hook
└── useCryptoChart.ts               # Binance Chart Hook
```

---

## 📝 Notlar

### Geliştirme Ortamı
- **Testnet:** Sepolia
- **Hot Wallet:** 0x3B76632FF2d382d5f0186B4Cc294392DF431edcA
- **V6 Contracts:** Deployed on Sepolia

### Vercel Cron Configuration
```json
{
  "crons": [
    { "path": "/api/cron/check-limit-orders", "schedule": "* * * * *" }
  ]
}
```
Note: Per-minute cron requires Vercel Pro plan.

---

Son güncelleme: 11 Aralık 2024
