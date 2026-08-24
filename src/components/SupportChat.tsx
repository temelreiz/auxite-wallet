"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { SUPPORT_CONTACT } from "@/lib/support-knowledge";

type Msg = { role: "user" | "assistant"; content: string };

type Strings = {
  title: string;
  greeting: string;
  placeholder: string;
  human: string;
  open: string;
  close: string;
  disclaimer: string;
  error: string;
  rateLimited: string;
};

const T: Record<string, Strings> = {
  en: {
    title: "Auxite Support",
    greeting: "Hi! I can help with questions about Auxite — accounts, buying & selling metals, deposits, withdrawals and more.",
    placeholder: "Type your message…",
    human: "Talk to a human",
    open: "Open support chat",
    close: "Close",
    disclaimer: "AI assistant. For account-specific issues we'll connect you to a person.",
    error: "Something went wrong. Please try again or contact us.",
    rateLimited: "You're sending messages too quickly. Please wait a moment and try again.",
  },
  tr: {
    title: "Auxite Destek",
    greeting: "Merhaba! Auxite hakkında sorularınıza yardımcı olabilirim — hesap, maden alım-satımı, para yatırma, çekme ve daha fazlası.",
    placeholder: "Mesajınızı yazın…",
    human: "İnsana bağlan",
    open: "Destek sohbetini aç",
    close: "Kapat",
    disclaimer: "Yapay zekâ asistanı. Hesaba özel konularda sizi bir kişiye bağlarız.",
    error: "Bir hata oluştu. Lütfen tekrar deneyin veya bize ulaşın.",
    rateLimited: "Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.",
  },
  de: {
    title: "Auxite Support",
    greeting: "Hallo! Ich helfe bei Fragen zu Auxite – Konten, Kauf & Verkauf von Edelmetallen, Einzahlungen, Auszahlungen und mehr.",
    placeholder: "Nachricht eingeben…",
    human: "Mit einem Menschen sprechen",
    open: "Support-Chat öffnen",
    close: "Schließen",
    disclaimer: "KI-Assistent. Bei kontospezifischen Anliegen verbinden wir Sie mit einer Person.",
    error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder kontaktieren Sie uns.",
    rateLimited: "Sie senden zu schnell Nachrichten. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
  },
  fr: {
    title: "Support Auxite",
    greeting: "Bonjour ! Je peux répondre à vos questions sur Auxite — comptes, achat & vente de métaux, dépôts, retraits et plus encore.",
    placeholder: "Écrivez votre message…",
    human: "Parler à un humain",
    open: "Ouvrir le chat d'assistance",
    close: "Fermer",
    disclaimer: "Assistant IA. Pour les questions liées à votre compte, nous vous mettrons en relation avec une personne.",
    error: "Une erreur s'est produite. Veuillez réessayer ou nous contacter.",
    rateLimited: "Vous envoyez des messages trop rapidement. Veuillez patienter un instant et réessayer.",
  },
  ar: {
    title: "دعم Auxite",
    greeting: "مرحبًا! يمكنني المساعدة في الأسئلة حول Auxite — الحسابات، شراء وبيع المعادن، الإيداعات، عمليات السحب والمزيد.",
    placeholder: "اكتب رسالتك…",
    human: "التحدث إلى شخص",
    open: "فتح محادثة الدعم",
    close: "إغلاق",
    disclaimer: "مساعد ذكاء اصطناعي. للمسائل المتعلقة بحسابك، سنوصلك بشخص.",
    error: "حدث خطأ ما. يرجى المحاولة مرة أخرى أو الاتصال بنا.",
    rateLimited: "أنت ترسل الرسائل بسرعة كبيرة. يرجى الانتظار قليلاً والمحاولة مرة أخرى.",
  },
  ru: {
    title: "Поддержка Auxite",
    greeting: "Здравствуйте! Помогу с вопросами об Auxite — аккаунты, покупка и продажа металлов, пополнения, выводы и не только.",
    placeholder: "Введите сообщение…",
    human: "Связаться с человеком",
    open: "Открыть чат поддержки",
    close: "Закрыть",
    disclaimer: "ИИ-ассистент. По вопросам, связанным с аккаунтом, мы свяжем вас с человеком.",
    error: "Произошла ошибка. Пожалуйста, попробуйте снова или свяжитесь с нами.",
    rateLimited: "Вы отправляете сообщения слишком быстро. Пожалуйста, подождите немного и повторите попытку.",
  },
};

type LeadStrings = {
  prompt: string;
  placeholder: string;
  consent: string; // MUST match CONSENT_TEXT in src/lib/marketing-lead.ts
  submit: string;
  thanks: string;
  invalid: string;
};

const LEAD_T: Record<string, LeadStrings> = {
  en: {
    prompt: "Want us to follow up? Leave your email.",
    placeholder: "you@email.com",
    consent: "I agree to receive product news and marketing updates from Auxite by email. I can unsubscribe anytime.",
    submit: "Send",
    thanks: "Thanks! We'll be in touch.",
    invalid: "Please enter a valid email.",
  },
  tr: {
    prompt: "Sizinle iletişime geçelim mi? E-postanızı bırakın.",
    placeholder: "siz@eposta.com",
    consent: "Auxite'ten ürün haberleri ve pazarlama güncellemelerini e-posta ile almayı kabul ediyorum. İstediğim zaman abonelikten çıkabilirim.",
    submit: "Gönder",
    thanks: "Teşekkürler! Sizinle iletişime geçeceğiz.",
    invalid: "Lütfen geçerli bir e-posta girin.",
  },
  de: {
    prompt: "Sollen wir uns melden? Hinterlassen Sie Ihre E-Mail.",
    placeholder: "sie@email.com",
    consent: "Ich stimme zu, Produktneuigkeiten und Marketing-Updates von Auxite per E-Mail zu erhalten. Ich kann mich jederzeit abmelden.",
    submit: "Senden",
    thanks: "Danke! Wir melden uns.",
    invalid: "Bitte geben Sie eine gültige E-Mail ein.",
  },
  fr: {
    prompt: "Vous voulez qu'on vous recontacte ? Laissez votre e-mail.",
    placeholder: "vous@email.com",
    consent: "J'accepte de recevoir des actualités produits et des offres marketing d'Auxite par e-mail. Je peux me désabonner à tout moment.",
    submit: "Envoyer",
    thanks: "Merci ! Nous vous recontacterons.",
    invalid: "Veuillez saisir un e-mail valide.",
  },
  ar: {
    prompt: "هل تريد أن نتواصل معك؟ اترك بريدك الإلكتروني.",
    placeholder: "you@email.com",
    consent: "أوافق على تلقي أخبار المنتجات وتحديثات التسويق من Auxite عبر البريد الإلكتروني. يمكنني إلغاء الاشتراك في أي وقت.",
    submit: "إرسال",
    thanks: "شكرًا! سنتواصل معك.",
    invalid: "يرجى إدخال بريد إلكتروني صالح.",
  },
  ru: {
    prompt: "Хотите, чтобы мы связались с вами? Оставьте e-mail.",
    placeholder: "you@email.com",
    consent: "Я согласен получать новости о продуктах и маркетинговые рассылки от Auxite по электронной почте. Я могу отписаться в любое время.",
    submit: "Отправить",
    thanks: "Спасибо! Мы свяжемся с вами.",
    invalid: "Пожалуйста, введите корректный e-mail.",
  },
};

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export default function SupportChat() {
  const { lang } = useLanguage();
  const t = T[lang] ?? T.en;
  const lt = LEAD_T[lang] ?? LEAD_T.en;
  const rtl = lang === "ar";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Optional lead capture (Phase 2): email + explicit marketing consent.
  const [leadEmail, setLeadEmail] = useState("");
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadSending, setLeadSending] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  async function submitLead() {
    const email = leadEmail.trim();
    if (!EMAIL_RE.test(email)) {
      setLeadError(lt.invalid);
      return;
    }
    setLeadError(null);
    setLeadSending(true);
    try {
      const res = await fetch("/api/support-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          marketingConsent: leadConsent,
          lang,
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) throw new Error("failed");
      setLeadDone(true);
    } catch {
      setLeadError(t.error);
    } finally {
      setLeadSending(false);
    }
  }

  // Stable id for this conversation so the server can group turns into one
  // transcript. Generated lazily on the first send.
  const sessionIdRef = useRef<string>("");
  function getSessionId(): string {
    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    return sessionIdRef.current;
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, sessionId: getSessionId(), lang }),
      });
      if (res.status === 429) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: t.rateLimited };
          return next;
        });
        return;
      }
      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: t.error };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t.open}
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg shadow-black/30 transition hover:bg-gold-600"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div dir={rtl ? "rtl" : "ltr"} className="fixed bottom-5 right-5 z-[60] flex h-[min(560px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-white">A</span>
              <div>
                <p className="text-sm font-semibold text-white">{t.title}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t.close} className="text-slate-400 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            <div className="rounded-lg bg-slate-800 px-3 py-2 text-slate-200">{t.greeting}</div>
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-lg bg-gold-500 px-3 py-2 text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-lg bg-slate-800 px-3 py-2 text-slate-200"
                  }
                >
                  {m.content || (busy && i === messages.length - 1 ? "…" : "")}
                </div>
              </div>
            ))}
          </div>

          {/* Optional lead capture — appears after the first exchange, hides once sent */}
          {messages.length > 0 && !leadDone && (
            <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-3">
              <p className="mb-2 text-xs text-slate-300">{lt.prompt}</p>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder={lt.placeholder}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none"
                />
                <button
                  onClick={() => void submitLead()}
                  disabled={leadSending || !leadEmail.trim()}
                  className="shrink-0 rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-40"
                >
                  {lt.submit}
                </button>
              </div>
              <label className="mt-2 flex items-start gap-2 text-[11px] leading-tight text-slate-400">
                <input
                  type="checkbox"
                  checked={leadConsent}
                  onChange={(e) => setLeadConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-gold-500"
                />
                <span>{lt.consent}</span>
              </label>
              {leadError && <p className="mt-1 text-[11px] text-red-400">{leadError}</p>}
            </div>
          )}
          {leadDone && (
            <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-2 text-xs text-gold-300">
              {lt.thanks}
            </div>
          )}

          {/* Human handoff */}
          <div className="border-t border-slate-800 px-4 py-2">
            <a
              href={SUPPORT_CONTACT.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-gold-400 hover:text-gold-300"
            >
              {t.human} →
            </a>
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-slate-700 bg-slate-800/60 px-3 py-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={t.placeholder}
              className="max-h-28 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-white hover:bg-gold-600 disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
            </button>
          </div>
          <p className="bg-slate-800/60 px-3 pb-2 text-[10px] leading-tight text-slate-500">{t.disclaimer}</p>
        </div>
      )}
    </>
  );
}
