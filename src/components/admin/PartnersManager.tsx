// PartnersManager — admin tab for Auxite Partners.
//
// Partners place orders from their own wallets, so this screen doesn't buy or sell.
// It shows what they did and controls the terms: stop a partner, change its spread,
// add a new one. All data comes from the Partners engine via /api/admin/partners.
//
// Auth: parent admin page already gates rendering; we only forward the admin
// Bearer token on each fetch.

'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

interface TokenRecon {
  metal: string;
  lockedMg: string;
  supplyMg: string;
  certifiedMg: string;
  ok: boolean;
}

interface PartnerRow {
  id: string;
  brand: string;
  wallet: string;
  spreadBps: number;
  quotesHalted: boolean;
  stats: { buys: number; buyUsdc: string; sells: number; sellUsdc: string };
  reconciliation: TokenRecon[];
}

interface MetalRow {
  metal: string;
  inventoryGrams: string;
  boughtTodayGrams: string;
  dailyBuyCapGrams: string;
  soldTodayGrams: string;
  dailySellCapGrams: string;
  barsFreeGrams: string | null;
}

interface OrderRow {
  orderId: string;
  partnerId: string;
  metal: string;
  side: string;
  grams: string;
  usdc: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

interface CertificateRow {
  number: string;
  holder: string;
  metal: string;
  grams: string;
  remainingGrams: string;
  status: string;
  issuedAt: string;
}

interface ApplicationRow {
  wallet: string;
  company: string;
  brand: string;
  prefix: string;
  email: string;
  country: string;
  status: string;
  note: string | null;
  created_at: number;
}

interface FiatOrderRow {
  reference: string;
  partnerId: string;
  metal: string;
  requestedTry: string;
  receivedTry: string | null;
  grams: string | null;
  status: string;
  note: string | null;
  txHash: string | null;
  bankReference: string | null;
  createdAt: string;
}

interface PartnersData {
  overview: {
    environment: string;
    chainId: string;
    desk: { paused: boolean; usdc: string };
    metals: MetalRow[];
    partners: PartnerRow[];
  };
  orders: OrderRow[];
  certificates: CertificateRow[];
  applications: ApplicationRow[];
  fiatOrders: FiatOrderRow[];
}

const METAL_LABEL: Record<string, string> = { gold: 'Altın', silver: 'Gümüş', platinum: 'Platin', palladium: 'Paladyum' };
const STATUS_LABEL: Record<string, string> = {
  settled: 'Tamamlandı',
  quoted: 'Teklif verildi',
  expired: 'Süresi doldu',
  active: 'Aktif',
  partially_released: 'Kısmen düştü',
  released: 'Kapandı',
  awaiting_funds: 'Havale bekleniyor',
  funded: 'Para geldi, teslim edilmedi',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

const CARD = 'bg-slate-800/50 border border-slate-700 rounded-xl p-4';
const TH = 'px-3 py-2 font-medium whitespace-nowrap';
const TD = 'px-3 py-2 whitespace-nowrap';
const INPUT = 'bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white';

function shortHash(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function explorer(chainId: string): string {
  return chainId === '8453' ? 'https://basescan.org' : 'https://sepolia.basescan.org';
}

export default function PartnersManager({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<PartnersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [spreadDrafts, setSpreadDrafts] = useState<Record<string, string>>({});
  const [newPartner, setNewPartner] = useState({ id: '', brand: '', wallet: '', spreadPercent: '1' });
  const [transfers, setTransfers] = useState<Record<string, { amountTry: string; bankReference: string }>>({});
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [createdKey, setCreatedKey] = useState<{ id: string; apiKey: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/partners', {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`);
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veriler alınamadı');
    }
  }, [adminToken]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (payload: Record<string, unknown>, success: string): Promise<any | null> => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`);
      setNotice(success);
      await load();
      return body;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem yapılamadı');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveSpread = (partner: PartnerRow) => {
    const percent = Number(spreadDrafts[partner.id]);
    if (!Number.isFinite(percent)) {
      setError('Spread için geçerli bir oran girin');
      return;
    }
    act({ action: 'spread', partnerId: partner.id, spreadBps: Math.round(percent * 100) }, `${partner.brand} spread'i %${percent} oldu`);
  };

  const addPartner = async (event: FormEvent) => {
    event.preventDefault();
    const body = await act(
      {
        action: 'add',
        id: newPartner.id.trim(),
        brand: newPartner.brand.trim(),
        wallet: newPartner.wallet.trim(),
        spreadBps: Math.round(Number(newPartner.spreadPercent) * 100),
      },
      'Şirket eklendi',
    );
    if (body?.apiKey) {
      setCreatedKey({ id: newPartner.id.trim(), apiKey: body.apiKey });
      setNewPartner({ id: '', brand: '', wallet: '', spreadPercent: '1' });
    }
  };

  const overview = data?.overview;
  const explorerUrl = overview ? explorer(overview.chainId) : '';

  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Auxite Partners</h2>
          <p className="text-sm text-slate-400">
            Şirketler alım satımı kendi cüzdanlarından yapar. Buradan izler ve şartları yönetirsiniz.
          </p>
        </div>
        <button onClick={load} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg">
          Yenile
        </button>
      </div>

      {overview?.environment === 'test' && (
        <div className="bg-amber-950 border border-amber-700 text-amber-200 px-4 py-3 rounded-lg text-sm">
          Test ortamı: Base Sepolia, test tokenları ve test bar kayıtları. Burada görülen hiçbir işlem gerçek metal veya para değildir.
        </div>
      )}
      {error && <div className="bg-red-950 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="bg-emerald-950 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg text-sm">{notice}</div>}
      {!data && !error && <div className="text-slate-400">Yükleniyor…</div>}

      {createdKey && (
        <div className="bg-slate-800 border border-amber-500 rounded-xl p-4 text-sm space-y-2">
          <div className="font-medium">{createdKey.id} için API anahtarı. Bir daha gösterilmez, şimdi kaydedin:</div>
          <code className="block break-all bg-slate-950 rounded p-2">{createdKey.apiKey}</code>
          <button onClick={() => setCreatedKey(null)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg">
            Kaydettim, kapat
          </button>
        </div>
      )}

      {data && data.applications.some((a) => a.status === 'pending') && (
        <section className="space-y-3">
          <h3 className="font-semibold">Bekleyen başvurular</h3>
          {data.applications
            .filter((a) => a.status === 'pending')
            .map((a) => (
              <div key={a.wallet} className={`${CARD} border-amber-600`}>
                <div className="grid md:grid-cols-4 gap-3 text-sm">
                  <div><div className="text-slate-400">Şirket</div>{a.company}</div>
                  <div><div className="text-slate-400">Marka</div>{a.brand}</div>
                  <div><div className="text-slate-400">Token kodu</div>{a.prefix}</div>
                  <div><div className="text-slate-400">Ülke</div>{a.country}</div>
                  <div className="md:col-span-2"><div className="text-slate-400">E-posta</div>{a.email}</div>
                  <div className="md:col-span-2"><div className="text-slate-400">Cüzdan</div><span className="break-all">{a.wallet}</span></div>
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    disabled={busy}
                    onClick={() => act({ action: 'approve', wallet: a.wallet }, `${a.brand} onaylandı, tokenları açıldı`)}
                    className="px-3 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 rounded-lg disabled:opacity-50"
                  >
                    Onayla ve tokenları aç
                  </button>
                  <input
                    aria-label={`${a.brand} ret sebebi`}
                    placeholder="Ret sebebi (şirket görür)"
                    className={`${INPUT} flex-1 min-w-48`}
                    value={rejectNotes[a.wallet] ?? ''}
                    onChange={(e) => setRejectNotes({ ...rejectNotes, [a.wallet]: e.target.value })}
                  />
                  <button
                    disabled={busy}
                    onClick={() => act({ action: 'reject', wallet: a.wallet, note: rejectNotes[a.wallet] }, `${a.brand} reddedildi`)}
                    className="px-3 py-1.5 text-sm bg-red-800 hover:bg-red-700 rounded-lg disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            ))}
        </section>
      )}

      {data && data.fiatOrders.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold">Havale siparişleri</h3>
          <p className="text-sm text-slate-400">
            Alıcı: Auxite Kıymetli Madenler Ticaret A.Ş. Gelen tutarı ve banka referansını yalnızca hesap hareketinde gördükten sonra girin: teslim hemen yapılır ve geri alınamaz.
          </p>
          {data.fiatOrders.map((order) => {
            const draft = transfers[order.reference] ?? { amountTry: order.requestedTry, bankReference: '' };
            const setDraft = (patch: Partial<typeof draft>) =>
              setTransfers({ ...transfers, [order.reference]: { ...draft, ...patch } });
            return (
              <div key={order.reference} className={CARD}>
                <div className="grid md:grid-cols-5 gap-3 text-sm">
                  <div><div className="text-slate-400">Referans</div><span className="font-mono text-xs">{order.reference}</span></div>
                  <div><div className="text-slate-400">Şirket</div>{order.partnerId}</div>
                  <div><div className="text-slate-400">Metal</div>{METAL_LABEL[order.metal] ?? order.metal}</div>
                  <div><div className="text-slate-400">Tutar</div>{order.receivedTry ?? order.requestedTry} TL{order.grams ? ` · ${order.grams} g` : ''}</div>
                  <div><div className="text-slate-400">Durum</div>{STATUS_LABEL[order.status] ?? order.status}</div>
                </div>
                {order.note && <div className="text-sm text-amber-300 mt-2">{order.note}</div>}
                {order.status === 'awaiting_funds' && (
                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <input aria-label={`${order.reference} gelen tutar`} placeholder="Gelen tutar (TL)" className={`${INPUT} w-36`} inputMode="decimal"
                      value={draft.amountTry} onChange={(e) => setDraft({ amountTry: e.target.value })} />
                    <input aria-label={`${order.reference} banka referansı`} placeholder="Banka işlem referansı" className={`${INPUT} flex-1 min-w-48`}
                      value={draft.bankReference} onChange={(e) => setDraft({ bankReference: e.target.value })} />
                    <button disabled={busy || !draft.bankReference.trim()}
                      onClick={() => act({ action: 'fiat-confirm', reference: order.reference, amountTry: draft.amountTry.trim().replace(',', '.'), bankReference: draft.bankReference.trim() }, `${order.reference} işlendi`)}
                      className="px-3 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 rounded-lg disabled:opacity-50">
                      Para geldi, teslim et
                    </button>
                    <button disabled={busy} onClick={() => act({ action: 'fiat-cancel', reference: order.reference }, `${order.reference} iptal edildi`)}
                      className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50">
                      İptal
                    </button>
                  </div>
                )}
                {order.status === 'funded' && (
                  <button disabled={busy} onClick={() => act({ action: 'fiat-retry', reference: order.reference }, `${order.reference} yeniden denendi`)}
                    className="mt-3 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black rounded-lg disabled:opacity-50">
                    Teslimi yeniden dene
                  </button>
                )}
                {order.txHash && overview && (
                  <a className="block mt-2 text-sm text-amber-400 hover:underline" href={`${explorerUrl}/tx/${order.txHash}`} target="_blank" rel="noreferrer">
                    {shortHash(order.txHash)}
                  </a>
                )}
              </div>
            );
          })}
        </section>
      )}

      {overview && (
        <>
          <section className="space-y-3">
            <h3 className="font-semibold">Şirketler</h3>
            {overview.partners.length === 0 && <div className="text-slate-400 text-sm">Henüz şirket yok.</div>}
            {overview.partners.map((partner) => {
              const unhealthy = partner.reconciliation.filter((r) => !r.ok);
              return (
                <div key={partner.id} className={CARD}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {partner.brand}
                        {partner.quotesHalted && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">Durduruldu</span>}
                        {unhealthy.length > 0 && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">Mutabakat hatası</span>}
                      </div>
                      <a
                        className="text-xs text-slate-400 hover:text-white break-all"
                        href={`${explorerUrl}/address/${partner.wallet}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {partner.wallet}
                      </a>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(
                          { action: partner.quotesHalted ? 'resume' : 'halt', partnerId: partner.id },
                          partner.quotesHalted ? `${partner.brand} yeniden açıldı` : `${partner.brand} durduruldu`,
                        )
                      }
                      className={`px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 ${
                        partner.quotesHalted ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-red-800 hover:bg-red-700'
                      }`}
                    >
                      {partner.quotesHalted ? 'Yeniden aç' : 'Yeni siparişleri durdur'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                    <div><div className="text-slate-400">Alım</div>{partner.stats.buys} işlem · {partner.stats.buyUsdc} USDC</div>
                    <div><div className="text-slate-400">Geri satım</div>{partner.stats.sells} işlem · {partner.stats.sellUsdc} USDC</div>
                    <div>
                      <div className="text-slate-400">Mutabakat</div>
                      {unhealthy.length === 0 ? 'Tutuyor' : unhealthy.map((r) => METAL_LABEL[r.metal] ?? r.metal).join(', ')}
                    </div>
                    <div>
                      <div className="text-slate-400">Spread (%)</div>
                      <div className="flex gap-2 mt-1">
                        <input
                          aria-label={`${partner.brand} spread yüzdesi`}
                          className={`${INPUT} w-20`}
                          inputMode="decimal"
                          value={spreadDrafts[partner.id] ?? String(partner.spreadBps / 100)}
                          onChange={(e) => setSpreadDrafts({ ...spreadDrafts, [partner.id]: e.target.value })}
                        />
                        <button
                          disabled={busy || spreadDrafts[partner.id] === undefined}
                          onClick={() => saveSpread(partner)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Masa stoğu ve günlük limitler</h3>
            <div className="text-sm text-slate-400">
              Masa durumu: {overview.desk.paused ? 'Durduruldu' : 'Açık'} · Geri alım için USDC: {overview.desk.usdc}
            </div>
            <div className="overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-left text-slate-300">
                  <tr>
                    <th className={TH}>Metal</th>
                    <th className={TH}>Masa stoğu (g)</th>
                    <th className={TH}>Boş bar (g)</th>
                    <th className={TH}>Bugün alım / limit (g)</th>
                    <th className={TH}>Bugün geri satım / limit (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.metals.map((m) => (
                    <tr key={m.metal} className="border-t border-slate-800">
                      <td className={TD}>{METAL_LABEL[m.metal] ?? m.metal}</td>
                      <td className={TD}>{m.inventoryGrams}</td>
                      <td className={TD}>{m.barsFreeGrams ?? '—'}</td>
                      <td className={TD}>{m.boughtTodayGrams} / {m.dailyBuyCapGrams}</td>
                      <td className={TD}>{m.soldTodayGrams} / {m.dailySellCapGrams}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {data && (
        <>
          <section className="space-y-3">
            <h3 className="font-semibold">Son siparişler</h3>
            {data.orders.length === 0 && <div className="text-slate-400 text-sm">Henüz sipariş yok.</div>}
            {data.orders.length > 0 && (
              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-left text-slate-300">
                    <tr>
                      <th className={TH}>Tarih</th>
                      <th className={TH}>Şirket</th>
                      <th className={TH}>İşlem</th>
                      <th className={TH}>Metal</th>
                      <th className={TH}>Gram</th>
                      <th className={TH}>USDC</th>
                      <th className={TH}>Durum</th>
                      <th className={TH}>Zincir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.orderId} className="border-t border-slate-800">
                        <td className={TD}>{new Date(o.createdAt).toLocaleString('tr-TR')}</td>
                        <td className={TD}>{o.partnerId}</td>
                        <td className={TD}>{o.side === 'buy' ? 'Alım' : 'Geri satım'}</td>
                        <td className={TD}>{METAL_LABEL[o.metal] ?? o.metal}</td>
                        <td className={TD}>{o.grams}</td>
                        <td className={TD}>{o.usdc}</td>
                        <td className={TD}>{STATUS_LABEL[o.status] ?? o.status}</td>
                        <td className={TD}>
                          {o.txHash ? (
                            <a className="text-amber-400 hover:underline" href={`${explorerUrl}/tx/${o.txHash}`} target="_blank" rel="noreferrer">
                              {shortHash(o.txHash)}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Son sertifikalar</h3>
            {data.certificates.length === 0 && <div className="text-slate-400 text-sm">Henüz sertifika yok.</div>}
            {data.certificates.length > 0 && (
              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-left text-slate-300">
                    <tr>
                      <th className={TH}>Numara</th>
                      <th className={TH}>Sahibi</th>
                      <th className={TH}>Metal</th>
                      <th className={TH}>Gram</th>
                      <th className={TH}>Kalan</th>
                      <th className={TH}>Durum</th>
                      <th className={TH}>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.certificates.map((c) => (
                      <tr key={c.number} className="border-t border-slate-800">
                        <td className={`${TD} font-mono text-xs`}>{c.number}</td>
                        <td className={TD}>{c.holder}</td>
                        <td className={TD}>{METAL_LABEL[c.metal] ?? c.metal}</td>
                        <td className={TD}>{c.grams}</td>
                        <td className={TD}>{c.remainingGrams}</td>
                        <td className={TD}>{STATUS_LABEL[c.status] ?? c.status}</td>
                        <td className={TD}>{new Date(c.issuedAt).toLocaleString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={CARD}>
            <h3 className="font-semibold">Şirket ekle</h3>
            <p className="text-sm text-slate-400 mt-1">
              Şirketin dört tokenı önce kontratta açılmış olmalı (factory sahibi işlemi). Burada motora kaydedilir ve API anahtarı üretilir.
            </p>
            <form onSubmit={addPartner} className="grid md:grid-cols-5 gap-3 mt-3">
              <input required aria-label="Kısa ad" placeholder="kısa-ad" className={INPUT} value={newPartner.id}
                onChange={(e) => setNewPartner({ ...newPartner, id: e.target.value })} />
              <input required aria-label="Marka" placeholder="Marka" className={INPUT} value={newPartner.brand}
                onChange={(e) => setNewPartner({ ...newPartner, brand: e.target.value })} />
              <input required aria-label="Cüzdan" placeholder="Cüzdan 0x…" className={`${INPUT} md:col-span-2`} value={newPartner.wallet}
                onChange={(e) => setNewPartner({ ...newPartner, wallet: e.target.value })} />
              <div className="flex gap-2">
                <input required aria-label="Spread yüzdesi" className={`${INPUT} w-16`} inputMode="decimal" value={newPartner.spreadPercent}
                  onChange={(e) => setNewPartner({ ...newPartner, spreadPercent: e.target.value })} />
                <button disabled={busy} className="flex-1 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-medium disabled:opacity-50">
                  Ekle
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
