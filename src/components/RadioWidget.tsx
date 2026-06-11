"use client";

// Persistent floating Auxite Radio. In the root layout → keeps playing across
// client-side navigation. Two layers:
//   • music bed  — continuous Mubert tracks (/api/radio/music), looped with
//     variety; the URL is PREFETCHED so the play tap stays inside the user
//     gesture (otherwise autoplay is blocked after the ~10–30s generation).
//   • voice      — periodic spoken market update (/api/radio/audio) that DUCKS
//     the music while it plays, then restores it. Music is primary; the first
//     market update only comes after a few minutes (or the 📢 button).
// Off by default. The ✕ hides it for the current view (comes back on reload).

import { useCallback, useEffect, useRef, useState } from "react";

type Lang = "en" | "de" | "ar";
const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" }, { id: "de", label: "DE" }, { id: "ar", label: "AR" },
];
const TAGLINE: Record<Lang, string> = {
  en: "Metals radio · live", de: "Edelmetall-Radio", ar: "راديو المعادن",
};
const MUSIC_VOL = 0.5;
const DUCK_VOL = 0.1;
const FIRST_UPDATE_MS = 90 * 1000;     // first spoken update ~1.5 min in
const UPDATE_EVERY_MS = 5 * 60 * 1000; // then every ~5 min

export default function RadioWidget() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [on, setOn] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [script, setScript] = useState("");

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const nextUrl = useRef<string | null>(null);
  const lastUpdate = useRef<number>(0);

  const fetchMusicUrl = useCallback(async (): Promise<string | null> => {
    try {
      const r = await fetch(`/api/radio/music?mood=chill&format=json`);
      const d = await r.json();
      return d?.url || null;
    } catch { return null; }
  }, []);

  // Restore last language + prefetch a music URL so the first play is instant.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const l = sessionStorage.getItem("auxite_radio_lang") as Lang | null;
    if (l && LANGS.some((x) => x.id === l)) setLang(l);
    if (!nextUrl.current) fetchMusicUrl().then((u) => { nextUrl.current = u; });
  }, [fetchMusicUrl]);

  // Transcript for the expanded card.
  useEffect(() => {
    if (!open) return;
    let alive = true; setScript("");
    fetch(`/api/radio?lang=${lang}`).then((r) => r.json())
      .then((d) => { if (alive && d.success) setScript(d.script); }).catch(() => {});
    return () => { alive = false; };
  }, [open, lang]);

  const playUpdate = useCallback(async () => {
    const v = voiceRef.current; if (!v) return;
    lastUpdate.current = Date.now();
    try {
      v.src = `/api/radio/audio?lang=${lang}&h=${Math.floor(Date.now() / 3600000)}`;
      if (musicRef.current) musicRef.current.volume = DUCK_VOL;
      setSpeaking(true);
      await v.play();
    } catch { setSpeaking(false); if (musicRef.current) musicRef.current.volume = MUSIC_VOL; }
  }, [lang]);

  const start = useCallback(async () => {
    const m = musicRef.current; if (!m) return;
    setBuffering(true);
    // Prefer the prefetched URL → m.play() stays in the gesture (autoplay-safe).
    let url = nextUrl.current; nextUrl.current = null;
    if (!url) url = await fetchMusicUrl();
    if (!url) { setBuffering(false); return; }
    m.volume = MUSIC_VOL; m.src = url;
    try { await m.play(); setOn(true); lastUpdate.current = Date.now(); }
    catch { setBuffering(false); return; }
    setBuffering(false);
    fetchMusicUrl().then((u) => { nextUrl.current = u; }); // prefetch next
  }, [fetchMusicUrl]);

  const stop = useCallback(() => {
    musicRef.current?.pause(); voiceRef.current?.pause();
    setOn(false); setSpeaking(false);
  }, []);

  const toggle = () => { if (on) stop(); else start(); };

  const onMusicEnded = useCallback(async () => {
    const m = musicRef.current; if (!m) return;
    const url = nextUrl.current || (await fetchMusicUrl());
    nextUrl.current = null;
    if (url) { m.src = url; m.volume = speaking ? DUCK_VOL : MUSIC_VOL; try { await m.play(); } catch {} }
    fetchMusicUrl().then((u) => { nextUrl.current = u; });
  }, [fetchMusicUrl, speaking]);

  const onVoiceEnded = useCallback(() => {
    setSpeaking(false);
    if (musicRef.current) musicRef.current.volume = MUSIC_VOL;
  }, []);

  // Auto market update: first ~1.5 min in, then every ~5 min, while playing.
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => {
      const since = Date.now() - lastUpdate.current;
      const due = lastUpdate.current === 0 ? FIRST_UPDATE_MS : UPDATE_EVERY_MS;
      if (since >= due && !speaking) playUpdate();
    }, 20000);
    return () => clearInterval(t);
  }, [on, speaking, playUpdate]);

  const pickLang = (l: Lang) => { setLang(l); sessionStorage.setItem("auxite_radio_lang", l); };

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] select-none">
      {open && (
        <div className="mb-2 w-72 rounded-2xl bg-zinc-900/95 backdrop-blur border border-[#BFA181]/30 shadow-2xl shadow-black/40 p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${on ? "animate-pulse" : ""}`}>📻</span>
              <div>
                <div className="text-sm font-semibold leading-none">Auxite Radio</div>
                <div className="text-[10px] text-[#BFA181] mt-0.5">{speaking ? "Market update…" : on ? "♪ Music" : TAGLINE[lang]}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm" aria-label="Minimize">▾</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={toggle} disabled={buffering}
              className="w-11 h-11 shrink-0 rounded-full bg-[#BFA181] hover:bg-[#cdb393] disabled:opacity-60 text-black flex items-center justify-center transition" aria-label={on ? "Pause" : "Play"}>
              {buffering ? <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                : on ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={playUpdate} disabled={!on || speaking}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium" title="Play market update now">📢 Update</button>
            <div className="flex gap-1 ml-auto">
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => pickLang(l.id)}
                  className={`px-1.5 py-1 rounded-md text-[11px] font-medium ${lang === l.id ? "bg-[#BFA181] text-black" : "bg-zinc-800 text-slate-300 hover:bg-zinc-700"}`}>{l.label}</button>
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-snug text-slate-300 max-h-20 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
            {buffering ? "Tuning in…" : (script || "…")}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button onClick={() => setOpen((o) => !o)}
          className={`group flex items-center gap-2 rounded-full pl-3 pr-4 py-2 bg-zinc-900/95 border border-[#BFA181]/40 shadow-lg text-white hover:border-[#BFA181] transition ${on ? "ring-2 ring-[#BFA181]/50" : ""}`}>
          <span className={`text-base ${on ? "animate-pulse" : ""}`}>📻</span>
          <span className="text-xs font-medium">{on ? (speaking ? "Update" : "On air") : "Radio"}</span>
        </button>
        {!open && (
          <button onClick={() => { setHidden(true); stop(); }} className="text-slate-500 hover:text-slate-300 text-xs px-1" aria-label="Dismiss radio" title="Hide">✕</button>
        )}
      </div>

      <audio ref={musicRef} onEnded={onMusicEnded} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} preload="none" />
      <audio ref={voiceRef} onEnded={onVoiceEnded} onPause={() => { if (musicRef.current) musicRef.current.volume = MUSIC_VOL; }} preload="none" />
    </div>
  );
}
