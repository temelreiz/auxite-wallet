"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { SUPPORT_CONTACT } from "@/lib/support-knowledge";

type Msg = { role: "user" | "assistant"; content: string };

const T = {
  en: {
    title: "Auxite Support",
    greeting: "Hi! I can help with questions about Auxite — accounts, buying & selling metals, deposits, withdrawals and more.",
    placeholder: "Type your message…",
    human: "Talk to a human",
    open: "Open support chat",
    close: "Close",
    disclaimer: "AI assistant. For account-specific issues we'll connect you to a person.",
  },
  tr: {
    title: "Auxite Destek",
    greeting: "Merhaba! Auxite hakkında sorularınıza yardımcı olabilirim — hesap, maden alım-satımı, para yatırma, çekme ve daha fazlası.",
    placeholder: "Mesajınızı yazın…",
    human: "İnsana bağlan",
    open: "Destek sohbetini aç",
    close: "Kapat",
    disclaimer: "Yapay zekâ asistanı. Hesaba özel konularda sizi bir kişiye bağlarız.",
  },
};

export default function SupportChat() {
  const { lang } = useLanguage();
  const t = lang === "tr" ? T.tr : T.en;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify({ messages: history }),
      });
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
        next[next.length - 1] = {
          role: "assistant",
          content:
            lang === "tr"
              ? "Bağlantı hatası oldu. Lütfen tekrar deneyin veya bize ulaşın."
              : "Something went wrong. Please try again or contact us.",
        };
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
        <div className="fixed bottom-5 right-5 z-[60] flex h-[min(560px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
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

          {/* Human handoff */}
          <div className="border-t border-slate-800 px-4 py-2">
            <a
              href={SUPPORT_CONTACT.whatsappUrl}
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
