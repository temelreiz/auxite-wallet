# Araç Kiralama Pilotu — Tasarım

**Sürüm:** 0.2 (2026-10-28) — saatlik paylaşımlı araç (car-sharing) modeline göre revize edildi
**Durum:** Taslak. Hukuki yapı ve token sınıflandırması avukat görüşüne tabi.
**Yol haritası:** 1. aşama (Temel). Kapı 1 kriteri: *"Araç pilotu 6 ay veri verdi."*

İlgili: `contracts/ReserveAttestation.sol`, `src/lib/leasing/*` (metal leasing motoru),
`~/Desktop/maritime-rwa/SPEC_tokenomics_nav.md` (Ostris — model alınan yapı).

---

## 1. Pilotun amacı

Pilotun ürünü **token satışı değil, veridir.** Kapı 1'i geçmek için 6 ay boyunca
araç başına güvenilir gelir, gider, kullanım ve değer kaybı verisi üretmesi gerekir.
2. aşamada "2–3 segment"e genişleme kararı bu veriye dayanacak.

İkinci bir kısıt da aynı kapıdan geliyor: Kapı 1 **hukuki görüşlerin alınmış olmasını**
da şart koşuyor. Yani pilot süresince yatırımcıya halka açık bir menkul kıymet satmak
mümkün değil. Bu yüzden önerilen yapı:

> **Gerçek filo, gölge (shadow) token.** Araçlar gerçek, gelir gerçek; NAV ve dağıtım
> her gün gerçekmiş gibi hesaplanıp yayınlanıyor, ama token ya hiç basılmıyor ya da
> yalnızca şirket/ilişkili taraf cüzdanlarında, transfer kısıtlı olarak duruyor.

Böylece 6. ayın sonunda elimizde "bu token 6 ay önce satılsaydı yatırımcı şunu alırdı"
diyen, denetlenebilir bir geçmiş performans kaydı olur. Bu, hem Kapı 1'in verisi hem
de 2. aşamadaki satışın en güçlü pazarlama materyalidir.

## 2. Kapsam

| Konu | Pilot için öneri | Gerekçe |
|---|---|---|
| Segment | **Saatlik paylaşımlı araç (car-sharing, "kullan-bırak")** | Kullanıcı uygulamadan aracı bulur, telefonla açar, saat/dakika bazlı öder, bırakır. Gelir sözleşmeye değil talebe bağlı; pilotun asıl ölçeceği şey bu talep. |
| Bırakma modeli | **Bölge içi serbest bırakma (free-floating), tek şehir, sınırlı bölge** | İstasyon tabanlı model daha kolay işletilir ama kullanıcı deneyimi zayıf. Pilotta bölgeyi dar tutup (ör. 2–3 ilçe) dağılma ve yeniden konumlandırma maliyetini sınırlarız. |
| Filo büyüklüğü | **30–50 araç** | Saatlik modelde gelir araç başına değil, bölgedeki **araç yoğunluğuna** bağlıdır: kullanıcı 5 dakika yürüme mesafesinde araç bulamazsa uygulamayı bırakır. 20 aracın altı talebi ölçmeye yetmez. Buna karşılık yolculuk sayısı yüksek olduğundan hasar/kullanım istatistiği hızlı oluşur. |
| Araç tipi | Tek model, B/C segment hatchback; **EV veya hibrit tercihli** | Kısa şehir içi yolculuk profili. EV'de şarj operasyonu ek maliyet ama yakıt kartı suistimali yok; karar §9'da. |
| Operatör / teknoloji | **Kendi filomuz + hazır car-sharing yazılımı** (white-label kullanıcı uygulaması + telematik kutusu + operatör paneli) — **karar verildi** | Operasyonu biz yürütüyoruz; uygulama, anahtarsız açma, rezervasyon ve faturalama sıfırdan yazılmıyor (§10). Auxite'in işi: veri hattı, NAV, rezervler ve yatırım yapısı. |
| Para birimi | Muhasebe: yerel para; NAV ve raporlama: **USD** | Token USD bazlı olacak. Kur riskini pilotta ölçmek, 2. aşamada hedge kararının girdisi. |

## 3. Yapı — güçler ayrılığı (Ostris'ten)

| Görev | Taraf |
|---|---|
| Araçların mülkiyeti | **Filo SPV'si** (araç ruhsatları SPV adına) |
| Operasyon (kiralama, saha, bakım, sigorta, müşteri desteği) | **Operasyon şirketi (OpCo)** — bizim kuracağımız/grubumuzdaki şirket; araçları SPV'den kiralar |
| Yolculuk ve araç verisi (kaynak kayıt) | **Car-sharing yazılım sağlayıcısı** (üçüncü taraf sistem) |
| Araç değerlemesi | Bağımsız kaynak: ikinci el fiyat endeksi + ekspertiz (aylık) |
| NAV hesaplama ve yayınlama | Auxite platformu (pilotta); 2. aşamada bağımsız fon yöneticisi |
| Rezerv beyanı (PoR) | Bağımsız attestor, `ReserveAttestation` benzeri sözleşme üzerinden |

**İlke:** Aracı işleten, aracın değerini belirlemez. NAV'ı ne OpCo ne Auxite
"ayarlayabilir"; dış referanslardan türetilir.

**Kendi filomuzu işletmenin bedeli:** Operatör artık biz olduğumuz için, Ostris'teki
"operatör ≠ değerleyen ≠ yönetici" ayrımı daha da önemli. Üç önlem:
1. **Gelirin kaynak kaydı yazılım sağlayıcısındadır**, bizim veritabanımızda değil.
   Auxite ledger'ı sağlayıcı verisinin kopyasıdır; denetçi ikisini doğrudan karşılaştırabilir.
   Admin panelinden yolculuk geliri elle girilemez, düzeltilemez.
2. **Nakit ayrı hesapta.** Yolculuk ödemeleri SPV'ye ait ayrı bir tahsilat hesabına
   düşer; OpCo'nun giderleri faturayla bu hesaptan ödenir. OpCo ile SPV arasındaki
   ücret, sözleşmede sabitlenmiş bir orandır (ilişkili taraf işlemi olarak raporlanır).
3. **Araç değeri dışarıdan gelir** (endeks + ekspertiz); OpCo değerleme girişi yapamaz.

**SPV ile OpCo'yu neden ayırıyoruz:** Araçlar SPV'de durursa OpCo'nun operasyonel riskleri
(kaza davaları, personel, vergi borcu) yatırımcının aracına sıçramaz; 2. aşamada başka
bir OpCo ile de çalışılabilir. Hangi ülkede bu ayrımın nasıl kurulacağı avukat konusu.

## 4. Token modeli — Ostris'ten farkı

Araç gemi değildir. İki temel fark modeli değiştiriyor:

1. **Hızlı ve öngörülebilir değer kaybı.** Araç 3–4 yılda değerinin büyük kısmını
   kaybeder. Kârı NAV'da tutmak (Ostris modeli) burada anlamsız; NAV zaten eriyecek.
2. **Likit ikinci el piyasası.** Araç birkaç haftada satılabilir. Kapalı uçlu yapı
   şart değil.

Bu yüzden öneri: **amortismanlı, dağıtım yapan, vadeli bir token.**

Saatlik modelin ek etkisi: araçlar yılda uzun dönem kiralamanın 2–3 katı km yapabilir,
yani değer kaybı daha hızlıdır ve vade daha kısa olmalıdır (öneri **24 ay**). Günlük gelir
de hava, tatil, hafta içi/sonu gibi etkenlerle dalgalanır; dağıtım bu yüzden aylık ve
rezervle yumuşatılmış yapılır.

```
Aylık net gelir   = yolculuk geliri + ceza/ücret geri tahsilatı
                    − (yakıt/şarj + temizlik + yeniden konumlandırma + park + bakım
                       + sigorta + hasar + trafik cezası (tahsil edilemeyen) + telematik/yazılım
                       + ödeme komisyonu + vergi + operatör ücreti + platform ücreti)
Aylık dağıtım     = net gelir − rezerv katkısı
Filo NAV          = Σ araç_piyasa_değeri + nakit + alacaklar + rezervler − borçlar
Token başına NAV  = Filo NAV / token arzı
Vade sonu         = araçlar satılır → satış hasılatı dağıtılır → token yakılır
```

Yatırımcının getirisi iki parçadan gelir: aylık dağıtım (kira) + vade sonu satış
hasılatı (artık değer). Pilotun ölçeceği kritik risk, ikincisinin tahmine ne kadar
uyduğudur.

**Rezervler** (NAV içinde, PoR'da ayrı satır):
- Hasar rezervi: aylık net gelirin %X'i (saatlik modelde hasar sıklığı uzun dönemin çok üstünde)
- Bakım/lastik rezervi: km başına sabit tutar
- Gelir dengeleme rezervi: talebin düşük olduğu aylarda dağıtımı yumuşatmak için

**Çalışma adı:** **Itera** (`$ITR`) — yatırım tarafının markası (2026-10-29). Latince *iter*
"yolculuk"; Ostris gibi Auxite'ten bağımsız marka. Kullanıcı uygulamasının markası ayrıdır
(öneriler: Bin, Vira). Tescil öncesi riskler:
- **Itera ASA** (Oslo Børs'te işlem gören Norveç BT şirketi, 1989) aynı adı kullanıyor.
  Sektör farklı (BT hizmetleri vs. finans/taşımacılık), ama Avrupa'da sınıf 9/36/42
  çakışması avukatla kontrol edilmeli.
- `itera.com`, `itera.io`, `itera.com.tr` alınmış. **Seçilen alan adları** (2026-10-29 whois'te boş):
  `iterafleet.com` → kullanıcılara yönelik site, `iterafleet.io` → token/yatırımcı tarafı.
  `iterafilo.com.tr` → Türkiye kullanıcı sitesi (Türkçe). `iterafleet.com.tr` ve `iterafilo.com`
  savunma amaçlı alınıp ana siteye yönlendirilir. **Beşi de kayıt edildi (2026-10-29).**
- `$ITR` ticker'ının başka bir token tarafından kullanılıp kullanılmadığı CoinGecko /
  CoinMarketCap'te kontrol edilmeli.

## 5. Veri modeli

Pilotun değeri bu tablolarda. Her kayıt kaynağıyla (operatör sistemi, telematik,
fatura, ekspertiz) birlikte saklanır ve değiştirilemez bir log'a yazılır.

**Araç (`Vehicle`)**
- `vehicleId`, plaka, şasi no (VIN), marka/model/yıl, alış tarihi, alış bedeli (USD + yerel)
- `status`: `acquiring | available | in_trip | reserved | servicing | maintenance | damaged | disposed`
  (`servicing` = temizlik, şarj/yakıt, yeniden konumlandırma)
- Güncel km, yakıt/şarj seviyesi, son değerleme, son değerleme tarihi ve kaynağı

**Yolculuk (`Trip`)** — pilotun ana kaydı; operatör/telematik sisteminden gelir
- `tripId`, `vehicleId`, kullanıcı (anonimleştirilmiş ID — kişisel veri bizde tutulmaz)
- Başlangıç/bitiş zamanı, başlangıç/bitiş bölgesi (grid/mahalle düzeyi, tam konum değil), km
- Ücret kalemleri: süre ücreti, km ücreti, indirim/kampanya, ek ücret (bölge dışı bırakma, temizlik cezası)
- Tahsilat durumu: `paid | failed | refunded | disputed`
- Bitişteki yakıt/şarj seviyesi, kullanıcı hasar bildirimi var mı

**Araç durum aralığı (`VehicleStatusSpan`)** — kullanım oranının hesaplandığı kayıt
- `vehicleId`, durum, başlangıç, bitiş, bölge. Her durum değişikliği yeni aralık açar;
  saatlik/günlük kullanım oranı bu aralıklardan hesaplanır.

**Saha operasyonu (`OpsTask`)**
- `vehicleId`, tür (`cleaning | refuel | charge | relocate | inspection | damage_check`), süre, maliyet, personel/taşeron

**Olay (`Incident`)**
- `vehicleId`, ilgili `tripId`, tür (`damage | accident | fine | theft | breakdown`), tutar,
  kullanıcıdan geri tahsil edilen tutar, sigortadan tahsil edilen tutar, durum

**Nakit hareketi (`CashEvent`)**
- `vehicleId` (filo geneli için boş), ilgili `tripId`/`incidentId`, tür
  (`trip_revenue | user_fee | fuel | charging | cleaning | relocation | parking | maintenance | insurance | damage | fine | software | payment_fee | tax | operator_fee | disposal`),
  tutar (yerel + USD + kullanılan kur), tarih, belge referansı

**Değerleme (`Valuation`)**
- `vehicleId`, tarih, değer, kaynak (`index | appraisal | sale`), değerleyen

**NAV kaydı (`NavSnapshot`)** — günlük
- Filo NAV, araç değerleri toplamı, nakit, rezervler, borçlar, gölge arz, token başına NAV,
  ilgili dönemin dağıtılabilir tutarı

## 6. Kapı 1 metrikleri

6. ayın sonunda şu tablo doldurulmuş olmalı. Hedefler örnektir; pilot öncesinde
iş planına göre kesinleşmeli.

| Metrik | Tanım | Örnek hedef |
|---|---|---|
**Talep ve kullanım**

| Metrik | Tanım | Örnek hedef |
|---|---|---|
| Zaman kullanım oranı | `in_trip` saat / filonun kullanılabilir saati | ≥ %25 |
| Araç başına günlük yolculuk | yolculuk / araç-gün | ≥ 3 |
| Ortalama yolculuk | süre (dk) ve km | ölçülecek |
| Saat/gün/bölge talep haritası | yolculuk başlangıçları | ölçülecek (genişleme kararının ana girdisi) |
| Boşta bekleme | yolculuklar arası ortalama süre, bölge bazında | ölçülecek |
| Tekrar kullanım | 30 günde 2+ yolculuk yapan kullanıcı oranı | ölçülecek |

**Gelir ve gider**

| Metrik | Tanım | Örnek hedef |
|---|---|---|
| Araç başına günlük brüt gelir | USD / araç-gün | iş planı ± %15 |
| Araç başına aylık net gelir | USD | iş planı ± %20 |
| Gider oranı | toplam gider / brüt gelir | ölçülecek |
| Saha operasyon maliyeti | (temizlik + yakıt/şarj + konumlandırma) / yolculuk | ölçülecek |
| Tahsilat kaybı | başarısız ödeme + itiraz / brüt gelir | ≤ %2 |

**Risk**

| Metrik | Tanım | Örnek hedef |
|---|---|---|
| Hasar sıklığı | hasar olayı / 1.000 yolculuk | ölçülecek |
| Hasar geri tahsilat oranı | (kullanıcı + sigorta tahsilatı) / hasar maliyeti | ≥ %70 |
| Trafik cezası geri tahsilat oranı | kullanıcıya yansıtılan / toplam ceza | ≥ %95 |
| Değer kaybı sapması | gerçek değer kaybı − modellenen | ± %5 |
| Araç kullanılamazlık | `maintenance + damaged` saat / toplam saat | ≤ %8 |

**Yatırım yapısı**

| Metrik | Tanım | Örnek hedef |
|---|---|---|
| Dağıtım istikrarı | aylık dağıtımın standart sapması | ölçülecek |
| Kur etkisi | USD NAV'daki kur kaynaklı değişim | ölçülecek |
| Veri bütünlüğü | operatör verisiyle mutabakatı tutmayan yolculuk / nakit hareketi | %0 |

## 7. Repoya yerleşim

Metal leasing motorunun (`src/lib/leasing/`) yapısı aynen izlenir: Upstash Redis,
isim alanlı anahtarlar, her modül tek sorumluluk.

```
src/lib/rental/
  fleet-registry.ts       araç kayıtları ve durum geçişleri (VehicleStatusSpan)
  trip-ledger.ts          yolculuklar (Trip), operatör verisiyle mutabakat
  ops-ledger.ts           saha operasyonları (OpsTask) ve olaylar (Incident)
  cash-ledger.ts          nakit hareketleri, değiştirilemez log
  valuation-engine.ts     değerleme girişleri, araç başına güncel değer
  nav-engine.ts           günlük NavSnapshot
  distribution-engine.ts  aylık dağıtım ve rezerv hesabı (pilotta gölge)
  metrics.ts              §6 tablosu

src/app/api/rental/              public: NAV, filo özeti, metrikler (PoR sayfası için)
src/app/api/admin/rental/        admin: araç/sözleşme/nakit/değerleme girişi
src/app/admin/page.tsx           yeni "Araç Kiralama" sekmesi (LeasingEngineTab gibi)
```

Redis anahtarları `rental:*` altında: `rental:vehicle:{id}`, `rental:trip:{id}`,
`rental:trips:{vehicleId}:{yyyy-mm}`, `rental:status:{vehicleId}`, `rental:cash:log`,
`rental:nav:daily`, vb.

**Hacim notu:** 40 araç × günde 3–5 yolculuk ≈ ayda 4.000–6.000 yolculuk, 6 ayda
~30.000. Redis'te sorun değil, ama metrik sorguları (bölge/saat kırılımı) için
yolculuklar ayrıca aylık dosya olarak (CSV/Parquet, ör. Vercel Blob/S3) arşivlenmeli.

**Yazılım sağlayıcı entegrasyonu:** Saatlik modelde manuel CSV pratik değil; yolculuk
verisi **baştan otomatik** gelmeli:
- `POST /api/rental/webhooks/trip` — yolculuk bitişi (imzalı webhook)
- `POST /api/rental/webhooks/vehicle` — durum değişikliği, hasar bildirimi, düşük yakıt/şarj
- Gece mutabakatı: `src/app/api/cron/` altında, günün yolculuklarını sağlayıcı API'sinden
  tekrar çekip webhook'la gelenlerle karşılaştıran job (kayıp/çift kayıt tespiti)
- Sağlayıcıya özgü kod tek bir adaptörde: `src/lib/rental/provider/` — sağlayıcı
  değişirse yalnızca bu klasör değişir
- Saha operasyonları, olaylar ve faturalar: sağlayıcının operatör paneli destekliyorsa
  oradan, desteklemiyorsa Auxite admin panelinden giriş + belge yükleme

**Zincir tarafı (pilotta minimal):**
- Token sözleşmesi pilotta **gerekmiyor**. Gölge arz Redis'te tutulur.
- Şeffaflık için aylık NAV ve rezerv özeti, `ReserveAttestation` benzeri append-only
  bir sözleşmeye (Base) yazılabilir. Metal sembolleri yerine `AUXV-NAV`, `AUXV-RESERVE`
  gibi kalemlerle mevcut sözleşme yeniden kullanılabilir mi, yoksa ayrı bir
  `FleetAttestation` mı gerektiği §9'da açık konu.
- 2. aşamada gerçek token: ERC-3643 (KYC + transfer kontrolü), Auxite Chain'e
  taşınabilir şekilde (bkz. yol haritası göç notu).

## 8. Zaman planı

| Hafta | İş |
|---|---|
| 0–3 | Yazılım sağlayıcı seçimi (§10), SPV + OpCo kurulumu, sigorta, avukatla yapı görüşmesi başlar |
| 2–6 | `src/lib/rental` veri modeli, sağlayıcı adaptörü, webhook + gece mutabakatı, admin paneli |
| 3–5 | Sağlayıcıyla kurulum: uygulama markalama, fiyat tarifesi, bölge sınırları, ödeme ve ehliyet doğrulama |
| 4–8 | Araç alımı, telematik kutusu montajı (sağlayıcının desteklediği modelde), saha ekibi/taşeron, müşteri destek hattı |
| 8–10 | Kapalı beta (çalışanlar + davetli kullanıcılar); veri hattı test edilir |
| 10 | **Pilotun 0. günü** — halka açık kullanım ve resmi veri toplama başlar |
| 10–36 | Günlük NAV, aylık gölge dağıtım, aylık değerleme, aylık metrik raporu |
| ~36 | 6 aylık rapor → Kapı 1 değerlendirmesi |

Not: Car-sharing'de ilk 1–2 ay kullanıcı kazanımı dönemidir; talep bu sürede düşük
kalır. Bu aylar raporda ayrı gösterilmeli, olgun dönem performansıyla karıştırılmamalı.
Kurulum dahil gerçekçi süre ~8–9 ay.

## 9. Açık konular (karar gerekiyor)

- [x] **Operatör modeli:** Kendi filo + hazır car-sharing yazılımı (2026-10-28)
- [ ] **Yazılım sağlayıcı:** §10'daki kriterlerle 2–3 aday değerlendirilip seçilecek
- [ ] **OpCo:** Yeni şirket mi, grup içi mevcut bir şirket mi? Kiralama/car-sharing için gereken ruhsat/izinler (avukat)
- [ ] **Saha operasyonu:** Kendi ekip mi, taşeron mu? (temizlik, şarj/yakıt, konumlandırma, hasar kontrolü)
- [ ] **Şehir ve bölge:** Hangi şehir, hangi ilçeler? Park izinleri (belediye anlaşması) gerekli mi?
- [ ] **Ülke ve SPV yapısı:** Araçlar hangi ülkede, SPV nerede kurulacak?
- [ ] **EV mi, yakıtlı mı:** Şarj altyapısı ve operasyonu vs. yakıt maliyeti/suistimal riski
- [ ] **Sigorta:** Saatlik paylaşımlı kullanım için poliçe (birçok standart filo poliçesi bunu kapsamaz)
- [ ] **Pilot sermayesi:** Şirket kaynağı mı, ilişkili taraflar mı? (Dış yatırımcı → hukuki görüş öncesi risk)
- [ ] **Fiyatlandırma:** Dakika/saat/km ücreti, paketler; operatör mü belirliyor biz mi?
- [ ] **Değerleme kaynağı:** Hangi ikinci el endeksi + hangi ekspertiz firması?
- [ ] **Kişisel veri:** Kullanıcı verisi operatörde kalır, bize anonim ID + bölge düzeyi konum gelir (KVKK/GDPR); veri işleme sözleşmesi
- [ ] **Zincir üstü şeffaflık:** `ReserveAttestation` yeniden kullanımı vs. yeni sözleşme
- [x] **Token adı:** Itera (`$ITR`) çalışma adı olarak seçildi (2026-10-29); tescil ve ticker kontrolü bekliyor
- [ ] **Kullanıcı uygulaması markası:** Bin / Vira / başka
- [ ] **Vade:** 24 ay mı?
- [ ] **Ücretler:** Operatör ve platform ücret oranları

## 10. Car-sharing yazılım sağlayıcısı seçimi

Kendi filomuzu işleteceğimiz için kullanıcı uygulaması, anahtarsız açma, rezervasyon,
faturalama ve operatör paneli hazır bir sağlayıcıdan gelecek. Seçimde belirleyici olan,
**pilotun asıl ürünü olan verinin bize eksiksiz ve doğrulanabilir şekilde gelmesi.**

**Zorunlu kriterler (birini karşılamayan elenir):**

| # | Kriter | Neden |
|---|---|---|
| 1 | Yolculuk bitişi ve araç durum değişikliği için **webhook** | Gerçek zamanlı ledger |
| 2 | Geçmiş yolculukları tarih aralığıyla çeken **API** | Gece mutabakatı |
| 3 | Yolculuk başına **ücret kalemleri** (süre, km, indirim, ek ücret) ve tahsilat durumu | Gelir kırılımı ve tahsilat kaybı metriği |
| 4 | Ham veri dışa aktarma (CSV/JSON), sözleşmede **veri sahipliği bizde** | Denetim; sağlayıcı değişirse veri kaybı olmaması |
| 5 | Telematik: anahtarsız açma/kilitleme, km, yakıt/şarj, konum, **seçtiğimiz araç modeliyle uyum** | Araç seçimi yazılıma bağlı olabilir |
| 6 | Bölge sınırı (geofence) ve bölge dışı bırakma ücreti | Free-floating modeli |
| 7 | Hedef ülkede çalışan **ödeme** ve **ehliyet doğrulama** | Yasal zorunluluk |
| 8 | White-label (kendi markamızla) uygulama, iOS + Android | |

**Değerlendirme kriterleri:**
- Fiyatlandırma: kurulum ücreti + araç başına aylık ücret + yolculuk başına komisyon. 40 araçlık pilotta ve 2. aşamadaki filo büyüklüğünde toplam maliyet ayrı hesaplanmalı.
- Saha operasyon modülü (temizlik/şarj/konumlandırma görevleri ve maliyetleri) var mı? Varsa `OpsTask` verisi de API'den gelir.
- Hasar fotoğrafı (yolculuk öncesi/sonrası) ve hasar olayı kaydı
- Dinamik fiyatlandırma (saat/bölge bazında)
- Türkçe dil desteği ve yerel destek
- Referans müşteriler, özellikle bizim hedef ülkemizde

**Auxite tarafında yeniden kullanılabilecekler:** Repoda Sumsub KYC ve Stripe entegrasyonu
zaten var. Sağlayıcının ehliyet doğrulaması veya ödeme altyapısı hedef ülkede yetersizse,
bunlar sağlayıcıya bağlanabilir mi diye sorulmalı. Varsayılan tercih yine de sağlayıcının
kendi akışı: pilotta entegrasyon yüzeyini küçük tutmak daha önemli.

### 10.1 Pazar taraması (2026-10-28)

Kaynakların çoğu satıcıların kendi blogları veya rakip karşılaştırmaları; fiyatlar ve
özellikler **satıcıdan teyit edilmeli.** Hedef ülke Türkiye varsayıldı.

**Platformlar (uygulama + rezervasyon + faturalama + operatör paneli):**

| Platform | Pilot ölçeğine uygunluk | Fiyat (bilinen) | API / webhook | Not |
|---|---|---|---|---|
| **Wunder Mobility** | ❌ Elenir | €36,50/araç/ay, **€18.250/ay asgari** (500 araç), ≥36 ay sözleşme | En geniş API + webhook iddiası, sandbox var | 40 araçta araç başı efektif ~€450/ay. Ancak özel pilot fiyatı sorulabilir. |
| **Ridecell** | ❌ Elenir | Kurumsal teklif | Belirtilmemiş | 100+ araç, leasing/büyük filo odaklı |
| **Vulog** | ⚠️ Sorulmalı | Teklif | Belirtilmemiş | Free-floating'de en olgun; OEM entegrasyonları, dinamik fiyatlandırma. Kurumsal; pilot fiyatı belirsiz. |
| **ATOM Mobility** | ✅ Aday | Kurulum + araç/yolculuk başı aylık; araç planları teklifle | **API yalnız Premium planda**; webhook teyit edilmedi, kaynaklar çelişkili | Küçük operatörlere uygun, ~20 günde kurulum iddiası, white-label. Veri erişimi bizim için en büyük soru işareti. |
| **MOQO** | ✅ Aday | Teklif | API **Pro** planından itibaren | 5 araçtan başlayan projeler; markalı uygulama Plus'tan itibaren ek ücretli |
| **Zemtu** | ✅ Aday | Teklif | Belirtilmemiş | 10 araçtan küçük projeler; istasyon/bölge tabanlı, markalama var |
| **Levy Fleets** | ⚠️ Aday | Gelir paylaşımı, ön ödeme yok | Webhook kategorileri dokümante (rezervasyon, oturum, araç, hasar, ihlal, faturalama) | Gelir paylaşımı marjı yer; Türkiye/Avrupa varlığı belirsiz |

**Telematik (araca takılan kutu; platformdan bağımsız seçilebilir):**

| Donanım | Fiyat (bilinen) | Not |
|---|---|---|
| **INVERS CloudBoxx** | ~$500–635/araç + ~$10–20/ay | Sektör standardı; Vulog ve Ridecell entegre. **OneAPI kamuya açık dokümante** (OAuth 2.0, Events API). Kapalı otoparkta çalışma iddiası. |
| **Teltonika** | Daha düşük (teklif) | Türkiye'de yaygın, Türkçe car-sharing çözüm sayfası var. Platformun desteklemesi gerekir. |
| **Smartcar** | Araç/istek başı | Donanım yok, aracın fabrika telematiğini kullanır. Türkiye'de desteklenen marka/model kapsamı teyit edilmeli. |

Uyarı: Getaround'un ABD'den çekilmesi, operatörleri kullanılamayan özel donanımla bıraktı.
**Platforma kilitli donanım yerine birden çok platformun desteklediği bir kutu** (ör. INVERS)
tercih edilmeli; platform değişirse araçlar yeniden donatılmaz.

### 10.2 Türkiye'ye özgü boşluklar

- **Ödeme:** Yabancı platformların varsayılan ödeme sağlayıcıları (çoğunlukla Stripe/Adyen)
  Türk şirketine TL tahsilat için uygun olmayabilir. **iyzico veya PayTR entegrasyonu var mı**
  her adaya ilk soru olmalı. Yoksa özel entegrasyon maliyeti ve süresi istenir.
- **Ehliyet doğrulama:** Platformun yerleşik doğrulaması Türk ehliyetini tanıyor mu?
  Tanımıyorsa repodaki Sumsub entegrasyonu bağlanabilir mi?
- **Dil ve destek:** Türkçe uygulama arayüzü, Türkiye saat diliminde destek.
- **Rekabet:** Pazarda Martı (20 şehir), TikTak (Getir Araç'ı satın aldı), Yoyo ve Sharingo
  var. Bölge seçimi bunların yoğun olduğu yerlerden kaçınarak veya özellikle oralara
  girerek bilinçli yapılmalı.

### 10.3 Öneri

1. **Kısa liste:** ATOM Mobility, MOQO, Vulog (pilot fiyatı için) + telematikte INVERS.
   Zemtu ve Levy yedek.
2. Her adaya §10'daki 8 zorunlu kriter + §10.2 soruları **bilgi talebi (RFI)** olarak gönderilir;
   API dokümantasyonu, sandbox erişimi ve 40 araç / 24 ay için toplam maliyet teklifi istenir.
3. Ağırlık: **veri erişimi > Türkiye uyumu > maliyet > özellik.** Pilotun ürünü veri olduğu
   için ucuz ama webhook/API'si zayıf bir platform yanlış seçimdir.
4. Seçimden önce sandbox'tan gelen örnek webhook ile `src/lib/rental/provider/` adaptörünün
   prototipi yazılır; adaptör yazılamıyorsa aday elenir.

**Kaynaklar:**
[Wunder — Best carsharing software 2026](https://www.wundermobility.com/en/resources/blog/best-car-sharing-software-platforms-2026) ·
[Levy Fleets — 80+ platform karşılaştırması](https://fleets.levyelectric.com/blog/best-car-rental-car-sharing-software) ·
[Levy — API & webhooks](https://fleets.levyelectric.com/help/car-sharing/api-and-webhooks) ·
[INVERS developers](https://developers.invers.com/overview/) ·
[INVERS CloudBoxx](https://invers.com/cloudboxx) ·
[Teltonika — kurumsal araç paylaşımı (TR)](https://www.teltonika-gps.com/tr/use-cases/car-sharing-rental/advanced-corporate-car-sharing-solution) ·
[TikTak — Getir Araç satın alımı](https://www.globalfleet.com/fr/node/781181)
