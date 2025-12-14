import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function DELETE(request: NextRequest) {
  try {
    // Aktif planlar setini sil
    await redis.del('recurring-buy:active');
    
    // Bilinen wallet adreslerini temizle
    const wallets = [
      '0x3b76632ff2d382d5f0186b4cc294392df431edca',
      '0x123',
    ];
    
    for (const wallet of wallets) {
      await redis.del('recurring-buy:' + wallet);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Temizlendi'
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message || 'Cleanup failed' }, { status: 500 });
  }
}
