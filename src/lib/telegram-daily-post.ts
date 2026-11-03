// src/lib/telegram-daily-post.ts
// Text for the daily post on the public @auxite channel (EN / AR / RU in one
// post, matching the languages the channel is advertised in).
//   Mon–Fri  app buy prices (spread included, as on vault.auxite.io, hence
//            "Auxite prices", not market prices) with
//            the change since the previous snapshot
//   Sat      weekly recap (change vs. the previous Friday)
//   Sun      a precious-metals fact, rotating weekly
// Pure functions only; the cron route does the I/O. No AUXR, yield, bonus or
// custody claims here: prices and general metal facts.

const OZ = 31.1035;

export type Metal = "gold" | "silver" | "platinum" | "palladium";
export type Spot = Record<Metal, number>; // app buy price, USD per gram

const METALS: { key: Metal; emoji: string; en: string; ar: string; ru: string }[] = [
  { key: "gold", emoji: "🟡", en: "Gold", ar: "الذهب", ru: "Золото" },
  { key: "silver", emoji: "⚪", en: "Silver", ar: "الفضة", ru: "Серебро" },
  { key: "platinum", emoji: "🔘", en: "Platinum", ar: "البلاتين", ru: "Платина" },
  { key: "palladium", emoji: "🟤", en: "Palladium", ar: "البلاديوم", ru: "Палладий" },
];

const LINK = "https://vault.auxite.io/?utm_source=telegram&utm_medium=channel&utm_campaign=daily_post";

function usd(n: number, cents: boolean): string {
  return n.toLocaleString("en-US", cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
}

function pct(now: number, prev?: number): string {
  if (!prev || !(prev > 0)) return "";
  const p = ((now - prev) / prev) * 100;
  const arrow = p > 0.005 ? "▲" : p < -0.005 ? "▼" : "•";
  return ` ${arrow} ${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

function priceLines(spot: Spot, prev?: Spot): string {
  return METALS.map((m) => {
    const g = spot[m.key];
    return `${m.emoji} <b>${m.en}</b> · ${m.ar} · ${m.ru}\n$${usd(g * OZ, g * OZ < 100)}/oz · $${usd(g, true)}/g${pct(g, prev?.[m.key])}`;
  }).join("\n\n");
}

// One line per weekday so the daily post is not identical every morning.
const WEEKDAY_LINES: { en: string; ar: string; ru: string }[] = [
  { en: "Buy precious metals from 1 gram.", ar: "اشترِ المعادن الثمينة بدءاً من غرام واحد.", ru: "Покупайте драгоценные металлы от 1 грамма." },
  { en: "Gold, silver, platinum and palladium in one account.", ar: "الذهب والفضة والبلاتين والبلاديوم في حساب واحد.", ru: "Золото, серебро, платина и палладий в одном аккаунте." },
  { en: "Physical delivery of your metal is available on request.", ar: "إمكانية الاستلام الفعلي لمعادنك عند الطلب.", ru: "Физическая доставка металла доступна по запросу." },
  { en: "Track your metals in the Auxite app or on the web.", ar: "تابع معادنك في تطبيق Auxite أو على الويب.", ru: "Следите за металлами в приложении Auxite или на сайте." },
  { en: "Buy, sell and track your metals in one app.", ar: "اشترِ وبِع وتابع معادنك في تطبيق واحد.", ru: "Покупайте, продавайте и отслеживайте металлы в одном приложении." },
];

const FACTS: { en: string; ar: string; ru: string }[] = [
  { en: "One troy ounce is 31.1035 grams, about 10% heavier than an ordinary ounce.", ar: "الأونصة التروي تساوي 31.1035 غراماً، أي أثقل بنحو 10٪ من الأونصة العادية.", ru: "Тройская унция — 31,1035 грамма, примерно на 10% тяжелее обычной унции." },
  { en: "Silver conducts electricity and heat better than any other metal.", ar: "الفضة أفضل موصل للكهرباء والحرارة بين جميع المعادن.", ru: "Серебро проводит электричество и тепло лучше любого другого металла." },
  { en: "Most palladium mined each year goes into car catalytic converters.", ar: "يذهب معظم البلاديوم المستخرج سنوياً إلى المحولات الحفازة في السيارات.", ru: "Большая часть добываемого палладия идёт на автомобильные катализаторы." },
  { en: "Gold does not rust or tarnish: it barely reacts with air or water.", ar: "الذهب لا يصدأ ولا يفقد بريقه، فهو بالكاد يتفاعل مع الهواء أو الماء.", ru: "Золото не ржавеет и не тускнеет: оно почти не реагирует с воздухом и водой." },
  { en: "A London Good Delivery gold bar weighs roughly 400 troy ounces (about 12.4 kg).", ar: "يزن سبيكة الذهب بمعيار لندن للتسليم الجيد نحو 400 أونصة تروي (حوالي 12.4 كغ).", ru: "Слиток золота стандарта London Good Delivery весит около 400 тройских унций (≈12,4 кг)." },
  { en: "Platinum is denser than gold: a platinum coin feels heavier than a gold one of the same size.", ar: "البلاتين أكثف من الذهب، فعملة بلاتينية أثقل من ذهبية بنفس الحجم.", ru: "Платина плотнее золота: платиновая монета тяжелее золотой того же размера." },
  { en: "All the gold ever mined would fit in a cube of roughly 22 metres per side.", ar: "كل الذهب المستخرج عبر التاريخ يتسع في مكعب طول ضلعه نحو 22 متراً.", ru: "Всё добытое за историю золото поместилось бы в куб со стороной около 22 метров." },
  { en: "Silver is the most widely used precious metal in industry, from solar panels to electronics.", ar: "الفضة أكثر المعادن الثمينة استخداماً في الصناعة، من الألواح الشمسية إلى الإلكترونيات.", ru: "Серебро — самый востребованный в промышленности драгметалл: от солнечных панелей до электроники." },
];

function block(t: { en: string; ar: string; ru: string }): string {
  return `${t.en}\n${t.ar}\n${t.ru}`;
}

/** ISO week number, used to rotate the Sunday fact. */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

export type DailyKind = "prices" | "weekly" | "fact";

export function dailyKind(now: Date): DailyKind {
  const d = now.getUTCDay();
  return d === 0 ? "fact" : d === 6 ? "weekly" : "prices";
}

/**
 * Build the post. `prev` is the last weekday snapshot for "prices" and the previous
 * Friday's for "weekly"; without it the change column is left out. `promo`
 * (e.g. a running campaign) is added above the link on every kind of post.
 */
export function buildDailyPost(now: Date, spot: Spot | null, prev?: Spot, promo?: string): string {
  const kind = dailyKind(now);
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const cta = `${promo ? `\n\n${promo}` : ""}\n\n🔗 <a href="${LINK}">vault.auxite.io</a>`;

  if (kind === "fact" || !spot) {
    const f = FACTS[isoWeek(now) % FACTS.length];
    return `💡 <b>Did you know? · هل تعلم؟ · Знаете ли вы?</b>\n\n${block(f)}${cta}`;
  }

  if (kind === "weekly") {
    return `📊 <b>Weekly recap · ملخص الأسبوع · Итоги недели</b> — ${date}\n\n${priceLines(spot, prev)}\n\n${block({
      en: "Change over the past seven days. Markets reopen Monday.",
      ar: "التغير خلال الأيام السبعة الماضية. تفتح الأسواق يوم الاثنين.",
      ru: "Изменение за последние семь дней. Рынки откроются в понедельник.",
    })}${cta}`;
  }

  const line = WEEKDAY_LINES[(now.getUTCDay() - 1) % WEEKDAY_LINES.length];
  return `📈 <b>Auxite prices today · أسعار Auxite اليوم · Цены Auxite сегодня</b> — ${date}\n\n${priceLines(spot, prev)}\n\n${block(line)}${cta}`;
}

/** Reminder for the AUXR buy campaign while it runs (rules: auxr-buy-reward.ts). */
export function buyRewardPromo(endAt: number, holdUntil: number): string {
  // endAt is exclusive, so the last day shown is the day before it.
  const fmt = (t: number, locale: string) => new Date(t).toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "UTC" });
  const end = (l: string) => fmt(endAt - 1, l);
  const hold = (l: string) => fmt(holdUntil, l);
  return `🎁 ${block({
    en: `AUXR Buy Rewards: 0.05 AUXR for every $100 of AUXR you buy, up to 0.5 AUXR, until ${end("en-GB")}. Hold until ${hold("en-GB")}. Web and Android only (iOS app not available yet) · KYC · not for US/UK persons.`,
    ar: `مكافآت شراء AUXR: ‏0.05 AUXR مقابل كل 100 دولار من مشتريات AUXR، حتى 0.5 AUXR، حتى ${end("ar")}. احتفظ بها حتى ${hold("ar")}. عبر الويب وأندرويد فقط (تطبيق iOS غير متاح بعد) · KYC · غير متاحة لمواطني أو مقيمي الولايات المتحدة والمملكة المتحدة.`,
    ru: `Бонусы за покупку AUXR: 0,05 AUXR за каждые $100 покупки AUXR, до 0,5 AUXR, до ${end("ru-RU")}. Держите до ${hold("ru-RU")}. Только веб и Android (iOS пока недоступно) · KYC · не для лиц из США/Великобритании.`,
  })}`;
}
