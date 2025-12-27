// lib/certificateAnchor.ts
// Background certificate anchoring
import { anchorCertificate } from './blockchain';
import { redis } from './redis';

// Sertifikayı arka planda anchor et (non-blocking)
export async function anchorCertificateAsync(certNumber: string, certHash: string) {
  // Arka planda çalıştır, hata olursa sessizce logla
  setImmediate(async () => {
    try {
      console.log(`⛓️ Anchoring certificate ${certNumber}...`);
      
      const result = await anchorCertificate(certHash, certNumber);
      
      // Redis'e anchor bilgisini kaydet
      await redis.hset(`certificate:${certNumber}`, {
        txHash: result.txHash,
        anchoredAt: new Date(result.timestamp * 1000).toISOString(),
        anchored: 'true',
      });
      
      console.log(`✅ Certificate ${certNumber} anchored: ${result.txHash}`);
    } catch (error: any) {
      console.error(`❌ Anchor failed for ${certNumber}:`, error.message);
      // Başarısız anchor'ları queue'ya ekle (retry için)
      await redis.lpush('certificate:anchor:failed', JSON.stringify({
        certNumber,
        certHash,
        error: error.message,
        timestamp: new Date().toISOString(),
      }));
    }
  });
}
