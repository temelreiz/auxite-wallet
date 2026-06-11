"use client";

// Persistent floating radio widget. Lives in the root layout so playback
// survives client-side navigation (the <audio> element never unmounts on SPA
// route changes). Collapsed = a small pill; expanded = mini player with
// language tabs + live transcript. Off by default — the user taps to listen.

import { useEffect, useRef, useState } from "react";

type Lang = "en" | "de" | "ar";
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "de", label: "DE" },
  { id: "ar", label: "AR" },
];
const TAGLINE: Record<Lang, string> = {
  en: "Live metals radio",
  de: "Edelmetall-Radio",
  ar: "راديو المعادن",
};

export default function RadioWidget() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [script, setScript] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Remember dismissal + last language for the session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("auxite_radio_hidden") === "1") setHidden(true);
    const l = sessionStorage.getItem("auxite_radio_lang") as Lang | null;
    if (l && LANGS.some((x) => x.id === l)) setLang(l);
  }, []);

  // Load transcript when expanded / language changes.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setScript("");
    fetch(`/api/radio?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d.success) setScript(d.script); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, lang]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); return; }
    setBuffering(true);
    a.src = `/api/radio/audio?lang=${lang}&h=${Math.floor(Date.now() / 3600000)}`;
    try { await a.play(); } catch { /* autoplay/gesture */ }
    setBuffering(false);
  };

  const pickLang = (l: Lang) => {
    setLang(l);
    sessionStorage.setItem("auxite_radio_lang", l);
    if (playing && audioRef.current) {
      audioRef.current.pause();
      // play in the new language
      setTimeout(toggle, 50);
    }
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] select-none">
      {/* Expanded card */}
      {open && (
        <div className="mb-2 w-72 rounded-2xl bg-zinc-900/95 backdrop-blur border border-[#BFA181]/30 shadow-2xl shadow-black/40 p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${playing ? "animate-pulse" : ""}`}>📻</span>
              <div>
                <div className="text-sm font-semibold leading-none">Auxite Radio</div>
                <div className="text-[10px] text-[#BFA181] mt-0.5">{TAGLINE[lang]}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm" aria-label="Minimize">▾</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={toggle}
              disabled={buffering}
              className="w-11 h-11 shrink-0 rounded-full bg-[#BFA181] hover:bg-[#cdb393] disabled:opacity-60 text-black flex items-center justify-center transition"
              aria-label={playing ? "Pause" : "Play"}
            >
              {buffering ? (
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <div className="flex gap-1">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => pickLang(l.id)}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${lang === l.id ? "bg-[#BFA181] text-black" : "bg-zinc-800 text-slate-300 hover:bg-zinc-700"}`}
                >{l.label}</button>
              ))}
            </div>
            <span className="ml-auto text-[10px] text-slate-400">{playing ? "● live" : ""}</span>
          </div>

          <p
            className="text-[11px] leading-snug text-slate-300 max-h-20 overflow-y-auto"
            dir={lang === "ar" ? "rtl" : "ltr"}
          >
            {script || "…"}
          </p>
        </div>
      )}

      {/* Collapsed pill */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`group flex items-center gap-2 rounded-full pl-3 pr-4 py-2 bg-zinc-900/95 border border-[#BFA181]/40 shadow-lg text-white hover:border-[#BFA181] transition ${playing ? "ring-2 ring-[#BFA181]/50" : ""}`}
        >
          <span className={`text-base ${playing ? "animate-pulse" : ""}`}>📻</span>
          <span className="text-xs font-medium">{playing ? "On air" : "Radio"}</span>
        </button>
        {!open && (
          <button
            onClick={() => { setHidden(true); sessionStorage.setItem("auxite_radio_hidden", "1"); audioRef.current?.pause(); }}
            className="text-slate-500 hover:text-slate-300 text-xs px-1"
            aria-label="Dismiss radio"
            title="Hide"
          >✕</button>
        )}
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        preload="none"
      />
    </div>
  );
}
