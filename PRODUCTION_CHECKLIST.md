# Auxite Wallet - Production Checklist

## 🔐 Güvenlik

- [ ] **Middleware** - Under Construction gate production'da nasıl olacak?
  - Şu an devre dışı, production'da da kapalı kalacak mı?
- [ ] **CRON_SECRET** - Production'da güçlü bir secret ayarlandı mı?
- [ ] **ADMIN_SECRET** - Production'da değiştirildi mi? (varsayılan: auxite2024secret)
- [ ] **API Rate Limiting** - API endpoint'leri rate limit koruması altında mı?
- [ ] **CSP Headers** - Content Security Policy production domain'leri içeriyor mu?
- [ ] **CORS** - API CORS ayarları production domain'leri için yapılandırıldı mı?

## 🌐 Environment Variables

- [ ] `NEXT_PUBLIC_APP_CHAIN_ID` - Production için doğru chain (1 = Mainnet, 11155111 = Sepolia)
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Production project ID
- [ ] `NEXT_PUBLIC_APP_ENV` - "production" olarak ayarlandı mı?
- [ ] Database bağlantı bilgileri (Redis, vs.)
- [ ] Sentry DSN (hata takibi için)
- [ ] Sumsub API keys (KYC için)

## ⛓️ Blockchain & Contracts

- [ ] **Contract Adresleri** - `src/contracts/leasingContracts.ts` production contract'ları içeriyor mu?
- [ ] **RPC Endpoints** - Production için güvenilir RPC provider (Alchemy, Infura, vs.)
- [ ] **Chain Konfigürasyonu** - `src/config/chains.ts` doğru ayarlandı mı?
- [ ] **Token Adresleri** - AUXG, AUXS, AUXPT, AUXPD mainnet adresleri doğru mu?

## 🎨 UI/UX

- [ ] **ChainGuard** - Yanlış ağ uyarısı çalışıyor mu?
- [ ] **RainbowKit** - Wallet bağlantı modal'ı düzgün görünüyor mu?
- [ ] **Responsive** - Mobil ve tablet görünümleri test edildi mi?
- [ ] **Dark/Light Mode** - Her iki tema da düzgün çalışıyor mu?
- [ ] **Çoklu Dil** - Tüm dil çevirileri tamamlandı mı?
- [ ] **Loading States** - Yükleme durumları kullanıcıya gösteriliyor mu?
- [ ] **Error States** - Hata durumları kullanıcıya anlaşılır şekilde gösteriliyor mu?

## 📱 Wallet Fonksiyonları

- [ ] **Wallet Bağlantısı** - MetaMask, WalletConnect, Coinbase çalışıyor mu?
- [ ] **Ağ Değiştirme** - Switch to network butonu çalışıyor mu?
- [ ] **Bakiye Görüntüleme** - Token bakiyeleri doğru gösteriliyor mu?
- [ ] **Token Transfer** - Gönderim işlemleri çalışıyor mu?
- [ ] **Transaction History** - İşlem geçmişi doğru görüntüleniyor mu?

## 💰 İşlem Fonksiyonları

- [ ] **Al/Sat** - Metal token alım/satım işlemleri
- [ ] **Yatır/Çek** - Fiat/Crypto yatırma ve çekme
- [ ] **Dönüştür** - Token swap işlemleri
- [ ] **Biriktir (Staking)** - Leasing/staking fonksiyonları
- [ ] **Fiyat Güncellemeleri** - Canlı fiyatlar doğru çekiliyor mu?

## 🔌 API Endpoints

- [ ] `/api/user/balance` - Bakiye API'si çalışıyor mu?
- [ ] `/api/user/blockchain-balance` - Blockchain bakiye API'si
- [ ] `/api/allocations` - Allocation API'si
- [ ] `/api/transactions/export` - İşlem export'u
- [ ] `/api/cron/*` - CRON job'ları (Vercel cron ile)
- [ ] `/api/auth/*` - Authentication endpoint'leri

## 📊 Monitoring & Analytics

- [ ] **Sentry** - Error tracking yapılandırıldı mı?
- [ ] **Vercel Analytics** - Kullanıcı analytics'i aktif mi?
- [ ] **Logging** - Önemli işlemler loglanıyor mu?

## 🚀 Deployment

- [ ] **Domain** - Production domain DNS ayarları yapıldı mı?
- [ ] **SSL** - HTTPS sertifikası aktif mi?
- [ ] **Vercel Environment** - Production environment variables eklendi mi?
- [ ] **Build Test** - `npm run build` hatasız tamamlanıyor mu?
- [ ] **Preview Deploy** - Vercel preview'da test edildi mi?

## 📝 Dokümantasyon

- [ ] **README** - Kurulum ve geliştirme talimatları güncel mi?
- [ ] **API Docs** - API endpoint'leri dokümante edildi mi?
- [ ] **Change Log** - Son değişiklikler kayıt altında mı?

## ✅ Final Kontroller

- [ ] **Console Errors** - Tarayıcı console'da hata yok mu?
- [ ] **Network Errors** - Network tab'da başarısız request yok mu?
- [ ] **Performance** - Sayfa yükleme hızı kabul edilebilir mi?
- [ ] **SEO** - Meta tag'ler ve Open Graph ayarları tamam mı?
- [ ] **PWA** - Manifest ve service worker çalışıyor mu?

---

## Notlar

### Bugün Düzeltilen Sorunlar (16 Ocak 2026)

1. ✅ Under Construction gate devre dışı bırakıldı
2. ✅ ChainGuard - Ağ değişikliği algılama (polling ile)
3. ✅ RainbowKit CSS import eklendi
4. ✅ Duplicate WalletProvider kaldırıldı
5. ✅ useWallet hook - reaktif chainId takibi

### Eksik Dosyalar (Eklenmesi Gerekenler)

- `src/contracts/leasingContracts.ts`
- `src/contracts/ERC20.ts`
- `src/contracts/AllocationABI.ts`

### Bilinen Sorunlar

- WalletConnect "Core is already initialized" uyarısı (fonksiyonelliği etkilemiyor)
- Multiple versions of Lit uyarısı (fonksiyonelliği etkilemiyor)

---

**Son Güncelleme:** 16 Ocak 2026
