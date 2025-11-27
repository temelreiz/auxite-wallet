"use client";

/**
 * Şimdilik Reown / WalletConnect entegrasyonunu devre dışı bırakıyoruz.
 * Bu helper sadece "yakında" mesajı gösteren sahte bir modal döndürüyor.
 */

export function getAppKit() {
  return {
    open() {
      alert(
        "Çoklu cüzdan (WalletConnect / QR) entegrasyonu ileride eklenecek. Şu an MetaMask / tarayıcı cüzdanı ile devam edebilirsiniz.",
      );
    },
  };
}
