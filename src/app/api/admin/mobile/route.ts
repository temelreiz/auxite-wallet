// Mobile Management API
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Redis Keys
const KEYS = {
  APP_CONFIG: 'mobile:app:config',
  MAINTENANCE: 'mobile:maintenance',
  FEATURE_FLAGS: 'mobile:features',
  PUSH_HISTORY: 'mobile:push:history',
  REMOTE_CONFIG: 'mobile:remote:config',
};

// Default configurations
const DEFAULT_APP_CONFIG = {
  ios: {
    minVersion: '1.0.0',
    currentVersion: '1.0.0',
    forceUpdate: false,
    storeUrl: 'https://apps.apple.com/app/auxite-wallet',
  },
  android: {
    minVersion: '1.0.0',
    currentVersion: '1.0.0',
    forceUpdate: false,
    storeUrl: 'https://play.google.com/store/apps/details?id=com.auxite.wallet',
  },
};

const DEFAULT_MAINTENANCE = {
  enabled: false,
  message: {
    tr: 'Bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyin.',
    en: 'Maintenance in progress. Please try again later.',
  },
  estimatedEnd: null,
  allowedVersions: [], // Bypass için izin verilen versiyonlar
};

const DEFAULT_FEATURE_FLAGS = {
  cryptoTrading: true,
  metalTrading: true,
  leasing: true,
  staking: false,
  p2pTransfer: true,
  fiatDeposit: true,
  fiatWithdraw: true,
  cryptoDeposit: true,
  cryptoWithdraw: true,
  biometricAuth: true,
  darkMode: true,
  priceAlerts: true,
  referralProgram: false,
  nftSupport: false,
};

const DEFAULT_REMOTE_CONFIG = {
  theme: {
    primaryColor: '#F59E0B',
    accentColor: '#A855F7',
  },
  limits: {
    minTradeUSD: 10,
    maxTradeUSD: 100000,
    dailyWithdrawLimit: 50000,
  },
  announcements: {
    banner: null,
    modal: null,
  },
  support: {
    email: 'support@auxite.com',
    whatsapp: '+1234567890',
    telegram: '@auxitesupport',
  },
};

// GET - Get mobile config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    switch (type) {
      case 'app-config': {
        const config = await redis.get(KEYS.APP_CONFIG);
        return NextResponse.json({ 
          success: true, 
          config: config || DEFAULT_APP_CONFIG 
        });
      }
      
      case 'maintenance': {
        const maintenance = await redis.get(KEYS.MAINTENANCE);
        return NextResponse.json({ 
          success: true, 
          maintenance: maintenance || DEFAULT_MAINTENANCE 
        });
      }
      
      case 'features': {
        const features = await redis.get(KEYS.FEATURE_FLAGS);
        return NextResponse.json({ 
          success: true, 
          features: features || DEFAULT_FEATURE_FLAGS 
        });
      }
      
      case 'remote-config': {
        const config = await redis.get(KEYS.REMOTE_CONFIG);
        return NextResponse.json({ 
          success: true, 
          config: config || DEFAULT_REMOTE_CONFIG 
        });
      }
      
      case 'push-history': {
        const history = await redis.lrange(KEYS.PUSH_HISTORY, 0, 49);
        return NextResponse.json({ 
          success: true, 
          history: history || [] 
        });
      }
      
      case 'all':
      default: {
        const [appConfig, maintenance, features, remoteConfig] = await Promise.all([
          redis.get(KEYS.APP_CONFIG),
          redis.get(KEYS.MAINTENANCE),
          redis.get(KEYS.FEATURE_FLAGS),
          redis.get(KEYS.REMOTE_CONFIG),
        ]);
        
        return NextResponse.json({
          success: true,
          appConfig: appConfig || DEFAULT_APP_CONFIG,
          maintenance: maintenance || DEFAULT_MAINTENANCE,
          features: features || DEFAULT_FEATURE_FLAGS,
          remoteConfig: remoteConfig || DEFAULT_REMOTE_CONFIG,
        });
      }
    }
  } catch (error: any) {
    console.error('Mobile config GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update mobile config
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'update-app-config': {
        const { ios, android } = body;
        const current = ((await redis.get(KEYS.APP_CONFIG)) || DEFAULT_APP_CONFIG) as typeof DEFAULT_APP_CONFIG;
        const updated = {
          ios: { ...current.ios, ...ios },
          android: { ...current.android, ...android },
        };
        await redis.set(KEYS.APP_CONFIG, JSON.stringify(updated));
        return NextResponse.json({ success: true, config: updated });
      }
      
      case 'set-maintenance': {
        const { enabled, message, estimatedEnd, allowedVersions } = body;
        const maintenance = {
          enabled: enabled ?? false,
          message: message || DEFAULT_MAINTENANCE.message,
          estimatedEnd: estimatedEnd || null,
          allowedVersions: allowedVersions || [],
          updatedAt: new Date().toISOString(),
        };
        await redis.set(KEYS.MAINTENANCE, JSON.stringify(maintenance));
        return NextResponse.json({ success: true, maintenance });
      }
      
      case 'update-features': {
        const { features } = body;
        const current = (await redis.get(KEYS.FEATURE_FLAGS)) || DEFAULT_FEATURE_FLAGS;
        const updated = { ...current, ...features };
        await redis.set(KEYS.FEATURE_FLAGS, JSON.stringify(updated));
        return NextResponse.json({ success: true, features: updated });
      }
      
      case 'update-remote-config': {
        const { config } = body;
        const current = ((await redis.get(KEYS.REMOTE_CONFIG)) || DEFAULT_REMOTE_CONFIG) as typeof DEFAULT_REMOTE_CONFIG;
        const updated = {
          theme: { ...current.theme, ...config?.theme },
          limits: { ...current.limits, ...config?.limits },
          announcements: { ...current.announcements, ...config?.announcements },
          support: { ...current.support, ...config?.support },
        };
        await redis.set(KEYS.REMOTE_CONFIG, JSON.stringify(updated));
        return NextResponse.json({ success: true, config: updated });
      }
      
      case 'send-push': {
        const { title, body: pushBody, target, data } = body;
        
        if (!title || !pushBody) {
          return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
        }
        
        // Push notification gönderme (Firebase/OneSignal entegrasyonu gerekir)
        // Şimdilik simüle ediyoruz ve history'e kaydediyoruz
        const pushRecord = {
          id: `push_${Date.now()}`,
          title,
          body: pushBody,
          target: target || 'all', // all, ios, android, segment, userId
          data: data || {},
          sentAt: new Date().toISOString(),
          status: 'sent',
          // Gerçek entegrasyonda: sentCount, failedCount, etc.
        };
        
        await redis.lpush(KEYS.PUSH_HISTORY, JSON.stringify(pushRecord));
        await redis.ltrim(KEYS.PUSH_HISTORY, 0, 99); // Son 100 kaydı tut
        
        // TODO: Firebase Cloud Messaging / OneSignal API call
        // const fcmResult = await sendFCMNotification(title, pushBody, target, data);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Push notification sent',
          push: pushRecord,
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Mobile config POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
