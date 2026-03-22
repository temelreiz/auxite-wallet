import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const SEO_KEY = 'website:seo';

const DEFAULT_SEO = [
  { 
    locale: 'en', 
    title: 'Auxite – On-Chain Tokenized Precious Metals', 
    description: 'Buy, sell, and stake physically allocated gold, silver, platinum, and palladium — fully on-chain with real-time proof of reserves.', 
    keywords: 'tokenized gold, tokenized silver, precious metals, blockchain, DeFi, crypto, LBMA, physical backing, staking',
    ogImage: '/og-image.png'
  },
  { 
    locale: 'tr', 
    title: 'Auxite – Zincir Üstü Tokenize Kıymetli Madenler', 
    description: 'Fiziksel olarak desteklenen altın, gümüş, platin ve paladyum tokenlerini alın, satın ve stake edin — tamamen zincir üstü.', 
    keywords: 'tokenize altın, tokenize gümüş, kıymetli madenler, blok zinciri, DeFi, kripto',
    ogImage: '/og-image.png'
  },
  { 
    locale: 'de', 
    title: 'Auxite – On-Chain Tokenisierte Edelmetalle', 
    description: 'Kaufen, verkaufen und staken Sie physisch hinterlegte Gold-, Silber-, Platin- und Palladium-Token — vollständig on-chain.', 
    keywords: 'tokenisiertes Gold, tokenisiertes Silber, Edelmetalle, Blockchain, DeFi',
    ogImage: '/og-image.png'
  },
  { 
    locale: 'fr', 
    title: 'Auxite – Métaux Précieux Tokenisés On-Chain', 
    description: 'Achetez, vendez et stakez des tokens physiquement alloués — entièrement on-chain.', 
    keywords: 'or tokenisé, argent tokenisé, métaux précieux, blockchain, DeFi',
    ogImage: '/og-image.png'
  },
  { 
    locale: 'ar', 
    title: 'Auxite – المعادن الثمينة المرمزة على السلسلة', 
    description: 'اشترِ وبع وراهن على رموز الذهب والفضة المدعومة فعلياً — بالكامل على السلسلة.', 
    keywords: 'ذهب مرمز، فضة مرمزة، معادن ثمينة، بلوكتشين',
    ogImage: '/og-image.png'
  },
  { 
    locale: 'ru', 
    title: 'Auxite – Токенизированные Драгоценные Металлы', 
    description: 'Покупайте, продавайте и стейкайте токены с физическим обеспечением — полностью on-chain.', 
    keywords: 'токенизированное золото, драгоценные металлы, блокчейн, DeFi',
    ogImage: '/og-image.png'
  },
];

export async function GET() {
  try {
    let seo = await redis.get(SEO_KEY);
    if (!seo) {
      await redis.set(SEO_KEY, DEFAULT_SEO);
      seo = DEFAULT_SEO;
    }
    return NextResponse.json(seo);
  } catch (error) {
    console.error('SEO fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch SEO' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const seoData = await req.json();
    await redis.set(SEO_KEY, seoData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SEO save error:', error);
    return NextResponse.json({ error: 'Failed to save SEO' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { locale, ...data } = await req.json();
    const seoList: any[] = await redis.get(SEO_KEY) || DEFAULT_SEO;
    
    const index = seoList.findIndex(s => s.locale === locale);
    if (index === -1) {
      seoList.push({ locale, ...data });
    } else {
      seoList[index] = { locale, ...data };
    }
    
    await redis.set(SEO_KEY, seoList);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SEO update error:', error);
    return NextResponse.json({ error: 'Failed to update SEO' }, { status: 500 });
  }
}
