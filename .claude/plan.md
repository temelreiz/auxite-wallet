# KuveytTürk Buy/Sell + Bridge.xyz Crypto→USD Integration Plan

## Overview
Mevcut akış: User crypto → Smart contract trade → On-chain token mint
Yeni akış: **User crypto → Bridge.xyz (USDC→USD) → KuveytTürk hesabı → Metal alım/satım → Token mint**

Şirket **pre-funded model** kullanacak: KuveytTürk USD hesabında bakiye tutulur, metal alımları anında yapılır, gelen kripto Bridge.xyz ile USD'ye çevrilip havuzu doldurur.

## KuveytTürk Hesap Bilgileri (Kullanıcıdan alınan)
- **USD Hesap**: TR870020500009854869900101 (AccountSuffixFrom)
- **AUXG (Altın)**: TR170020500009854869900101
- **AUXS (Gümüş)**: TR600020500009854869900103
- **AUXPT (Platin)**: TR330020500009854869900104
- **AUXPD (Paladyum)**: TR060020500009854869900105

## Bridge.xyz Bilgileri
- Base chain destekli ✅
- USDC/USDT destekli ✅
- USD SWIFT çıkış destekli ✅
- **Liquidation Address** özelliği: Kalıcı on-chain adres, gelen kripto otomatik USD'ye çevrilir ve SWIFT ile KuveytTürk'e gönderilir
- Dashboard: dashboard.bridge.xyz (API key almak için kayıt gerekli)

---

## Phase 1: KuveytTürk Buy/Sell Backend (API Routes)

### Step 1.1: Environment Variables
`.env.local`'a eklenecek KuveytTürk hesap bilgileri:
```
KUVEYTTURK_USD_ACCOUNT_SUFFIX=...
KUVEYTTURK_AUXG_ACCOUNT_SUFFIX=...
KUVEYTTURK_AUXS_ACCOUNT_SUFFIX=...
KUVEYTTURK_AUXPT_ACCOUNT_SUFFIX=...
KUVEYTTURK_AUXPD_ACCOUNT_SUFFIX=...
KUVEYTTURK_CORPORATE_USERNAME=...
```

### Step 1.2: `kuveytturk-service.ts` - Account Config Ekleme
- Metal symbol → account suffix mapping
- `executeBuy(metalSymbol, grams)` - Otomatik rate fetch + buy
- `executeSell(metalSymbol, grams)` - Otomatik rate fetch + sell

### Step 1.3: `/api/trade/kuveytturk` Route (Yeni)
- `POST /api/trade/kuveytturk` → Buy/Sell execution
- Request: `{ action: "buy"|"sell", metal: "AUXG"|"AUXS"|"AUXPT"|"AUXPD", grams: number, walletAddress: string, paymentMethod: "USDC"|"USDT"|"ETH"|"BTC" }`
- Flow:
  1. Validate request + wallet
  2. Get KuveytTürk live rate
  3. Calculate USD cost (gram × USD/gram price)
  4. Check user's crypto balance
  5. Execute KuveytTürk buy via API
  6. Deduct user's crypto balance (Redis)
  7. Credit user's metal balance (Redis + on-chain mint)
  8. Record transaction + Telegram notification
- Response: `{ success, executionPrice, gramsReceived, txHash, kuveytturkRef }`

### Step 1.4: Update Existing `/api/trade/route.ts`
- Metal buy/sell'lerde KuveytTürk execution backend'i olarak ekle
- Mevcut flow'u bozmadan, metal işlemlerini KuveytTürk üzerinden yürüt
- Crypto payment method desteği ekle (USDC, USDT, ETH, BTC → USD conversion via Binance price)

---

## Phase 2: Bridge.xyz Integration (Crypto → USD Pipeline)

### Step 2.1: Bridge.xyz Hesap Kurulumu
- dashboard.bridge.xyz'de hesap aç
- API key al (sandbox + production)
- KuveytTürk USD IBAN'ı external bank account olarak kaydet

### Step 2.2: `bridge-service.ts` (Yeni)
- Bridge.xyz API client
- `createLiquidationAddress()` - Base chain USDC liquidation address oluştur
- `createOffRampTransfer()` - Manuel off-ramp transfer başlat
- `getTransferStatus()` - Transfer durumu sorgula
- `listDrains()` - Liquidation address drain geçmişi
- Webhook handler for transfer status updates

### Step 2.3: `/api/bridge/` Routes
- `POST /api/bridge/offramp` - Crypto → USD off-ramp başlat
- `GET /api/bridge/status/:id` - Transfer durumu
- `POST /api/bridge/webhook` - Bridge.xyz webhook receiver
- `GET /api/bridge/liquidation-address` - Şirketin liquidation adresi

### Step 2.4: Treasury Management
- Şirketin KuveytTürk USD bakiye takibi
- Low balance alert (Telegram)
- Bridge.xyz'den gelen USD'lerin otomatik takibi

---

## Phase 3: UI Updates

### Step 3.1: TradePanel Güncelleme
- Mevcut TradePanel.tsx'te payment method olarak USDC ekle
- KuveytTürk fiyatlarını göster (USD/gram)
- Buy flow'da KuveytTürk confirmation step ekle

### Step 3.2: Price Display
- Vault page'de KuveytTürk live prices göster
- "Powered by KuveytTürk" label

---

## Implementation Order (Önerilen)

1. **Phase 1.1-1.2**: Env vars + service update (~15 min)
2. **Phase 1.3**: KuveytTürk trade route (~30 min)
3. **Phase 1.4**: Mevcut trade route update (~20 min)
4. **Phase 2.1**: Bridge.xyz hesap kurulumu (kullanıcı ile birlikte, browser)
5. **Phase 2.2-2.3**: Bridge service + routes (~30 min)
6. **Phase 3**: UI updates (~20 min)

**Öncelik**: Phase 1 (KuveytTürk Buy/Sell) → Phase 2 (Bridge.xyz) → Phase 3 (UI)
