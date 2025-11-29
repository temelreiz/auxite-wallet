import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'tr';
  
  const now = new Date();
  
  const articles = lang === 'tr' ? [
    {
      title: "Altin fiyatlari yukseliste - Merkez Bankasi kararlari bekleniyor",
      description: "Kuresel piyasalarda altin ons fiyati yeni rekor seviyelere yaklasiyor.",
      source: "Bloomberg HT",
      publishedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
      url: "https://www.bloomberght.com"
    },
    {
      title: "Gumus piyasasinda hareketlilik - Endustriyel talep artiyor",
      description: "Yesil enerji yatirimlari gumus talebini destekliyor.",
      source: "Dunya",
      publishedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      url: "https://www.dunya.com"
    },
    {
      title: "Bitcoin 100.000 dolar sinirinda",
      description: "Kripto para piyasasinda yogun islem hacmi gozlemleniyor.",
      source: "Ekonomi",
      publishedAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      url: "https://www.ekonomi.com"
    }
  ] : [
    {
      title: "Gold Prices Hit New Highs Amid Central Bank Buying",
      description: "Global gold prices surge as central banks continue accumulating reserves.",
      source: "Reuters",
      publishedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
      url: "https://www.reuters.com"
    },
    {
      title: "Silver Demand Boosted by Green Energy Investments",
      description: "Industrial demand for silver rises with solar panel production growth.",
      source: "Bloomberg",
      publishedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      url: "https://www.bloomberg.com"
    },
    {
      title: "Bitcoin Approaches 100K Milestone",
      description: "Cryptocurrency markets see increased institutional interest.",
      source: "CoinDesk",
      publishedAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      url: "https://www.coindesk.com"
    }
  ];
  
  return NextResponse.json({ articles });
}
