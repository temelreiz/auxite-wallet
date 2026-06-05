// scripts/deposit-claim-content.mjs
// 6-language push copy for the "deposits now credit instantly" announcement.
// Consumed by send-deposit-live-push.mjs.
// Title ≤ 60 chars, body ≤ 178.

export const PUSH = {
  en: {
    title: "Your deposits now credit instantly",
    body: "Funded from an exchange? Open Auxite, paste your transaction ID, and your balance updates in seconds — no more waiting.",
  },
  tr: {
    title: "Yatırımların artık anında hesabında",
    body: "Borsadan mı gönderdin? Auxite'ı aç, işlem kimliğini (TX ID) yapıştır, bakiyen saniyeler içinde güncellensin — bekleme yok.",
  },
  de: {
    title: "Einzahlungen jetzt sofort gutgeschrieben",
    body: "Von einer Börse gesendet? Öffne Auxite, füge deine Transaktions-ID ein – dein Guthaben wird in Sekunden aktualisiert.",
  },
  fr: {
    title: "Vos dépôts sont crédités instantanément",
    body: "Envoyé depuis une plateforme ? Ouvre Auxite, colle ton ID de transaction, ton solde se met à jour en quelques secondes.",
  },
  ar: {
    title: "إيداعاتك تُضاف الآن فوراً",
    body: "أرسلت من منصة؟ افتح Auxite، الصق معرّف المعاملة، وسيتحدث رصيدك خلال ثوانٍ — دون انتظار.",
  },
  ru: {
    title: "Депозиты теперь зачисляются мгновенно",
    body: "Отправили с биржи? Откройте Auxite, вставьте ID транзакции — баланс обновится за секунды, без ожидания.",
  },
};

export function getPushContent(lang) {
  return PUSH[lang] || PUSH.en;
}
