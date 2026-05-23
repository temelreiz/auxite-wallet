// scripts/auxr-launch-content.mjs
// 6-language push copy for the "AUXR is live" launch broadcast.
// Consumed by send-auxr-launch-push.mjs.
//
// AUXR = the basket reserve token (55% Au · 30% Ag · 10% Pt · 5% Pd),
// physically allocated, one position. Title ≤ 60 chars, body ≤ 178.

export const PUSH = {
  en: {
    title: "🧺 Auxite Reserve (AUXR) is live",
    body: "One position, four metals: 55% gold, 30% silver, 10% platinum, 5% palladium. Physically allocated. Buy from $30.",
  },
  tr: {
    title: "🧺 Auxite Reserve (AUXR) yayında",
    body: "Tek pozisyon, dört metal: %55 altın, %30 gümüş, %10 platin, %5 paladyum. Fiziksel tahsisli. $30'dan başlar.",
  },
  de: {
    title: "🧺 Auxite Reserve (AUXR) ist da",
    body: "Eine Position, vier Metalle: 55% Gold, 30% Silber, 10% Platin, 5% Palladium. Physisch hinterlegt. Ab 30 $.",
  },
  fr: {
    title: "🧺 Auxite Reserve (AUXR) est disponible",
    body: "Une position, quatre métaux : 55% or, 30% argent, 10% platine, 5% palladium. Alloué physiquement. Dès 30 $.",
  },
  ar: {
    title: "🧺 Auxite Reserve (AUXR) متاح الآن",
    body: "مركز واحد، أربعة معادن: 55% ذهب، 30% فضة، 10% بلاتين، 5% بلاديوم. مخصص فعلياً. ابتداءً من 30$.",
  },
  ru: {
    title: "🧺 Auxite Reserve (AUXR) доступен",
    body: "Одна позиция, четыре металла: 55% золото, 30% серебро, 10% платина, 5% палладий. Физическое обеспечение. От $30.",
  },
};

export function getPushContent(lang) {
  return PUSH[lang] || PUSH.en;
}
