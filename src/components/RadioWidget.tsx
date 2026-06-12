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
const SEGMENT_EVERY_MS = 2 * 60 * 60 * 1000; // a programmed segment every ~2h
const STATION_EVERY_MS = 30 * 60 * 1000;     // station ID ("You're listening to Auxite Radio") every ~30 min
const VOICE_BUFFER_MS = 5 * 60 * 1000;       // never two voice clips within 5 min (no clash with the flow)

export default function RadioWidget() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [on, setOn] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [segTitle, setSegTitle] = useState("");
  // Deep-link from ads/campaigns: ?radio=1 auto-opens the widget and pulses the
  // play button ("tap to listen"). Browsers block autoplay with sound, so the
  // listener must tap once — this gets them one tap away.
  const [highlight, setHighlight] = useState(false);

  const musicRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const nextUrl = useRef<string | null>(null);
  const lastUpdate = useRef<number>(0);   // last ANY voice clip
  const lastSegment = useRef<number>(0);  // last programmed segment
  const lastStation = useRef<number>(0);  // last station ID

  const fetchMusicUrl = useCallback(async (): Promise<string | null> => {
    try {
      const r = await fetch(`/api/radio/music?mood=chill&format=json`);
      const d = await r.json();
      return d?.url || null;
    } catch { return null; }
  }, []);

  // Restore last language + prefetch a music URL so the first play is instant.
  // Also honor the ?radio=1 deep-link (open + highlight the play button).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const l = sessionStorage.getItem("auxite_radio_lang") as Lang | null;
    if (l && LANGS.some((x) => x.id === l)) setLang(l);
    if (!nextUrl.current) fetchMusicUrl().then((u) => { nextUrl.current = u; });
    const r = new URLSearchParams(window.location.search).get("radio");
    if (r === "1" || r === "open" || r === "true") { setOpen(true); setHighlight(true); }
  }, [fetchMusicUrl]);

  // When embedded in an iframe (auxite.io etc.), tell the parent to resize the
  // iframe so it only covers the pill when collapsed and the card when expanded.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ auxiteRadio: open ? "expanded" : "collapsed" }, "*");
  }, [open]);

  const playVoice = useCallback(async (src: string) => {
    const v = voiceRef.current; if (!v) return;
    lastUpdate.current = Date.now();
    try {
      v.src = src;
      if (musicRef.current) musicRef.current.volume = DUCK_VOL;
      setSpeaking(true);
      await v.play();
    } catch { setSpeaking(false); if (musicRef.current) musicRef.current.volume = MUSIC_VOL; }
  }, []);

  const playWelcome = useCallback(() => playVoice(`/api/radio/audio?kind=welcome&lang=${lang}`), [lang, playVoice]);
  const playStationId = useCallback(() => { setSegTitle(""); return playVoice(`/api/radio/audio?kind=stationid&lang=${lang}`); }, [lang, playVoice]);
  // Programmed segment: fetch its title, then play it over ducked music.
  const playSegment = useCallback(async () => {
    try {
      const m = await fetch(`/api/radio/segment?lang=${lang}&meta=1`).then((r) => r.json());
      if (m?.title) setSegTitle(m.title);
    } catch {}
    playVoice(`/api/radio/segment?lang=${lang}&t=${Math.floor(Date.now() / 600000)}`);
  }, [lang, playVoice]);

  const start = useCallback(async () => {
    const m = musicRef.current; if (!m) return;
    setBuffering(true);
    // Prefer the prefetched URL → m.play() stays in the gesture (autoplay-safe).
    let url = nextUrl.current; nextUrl.current = null;
    if (!url) url = await fetchMusicUrl();
    if (!url) { setBuffering(false); return; }
    m.volume = MUSIC_VOL; m.src = url;
    setHighlight(false);
    try { await m.play(); setOn(true); const t = Date.now(); lastUpdate.current = t; lastSegment.current = t; lastStation.current = t; }
    catch { setBuffering(false); return; }
    setBuffering(false);
    fetchMusicUrl().then((u) => { nextUrl.current = u; }); // prefetch next
    playWelcome(); // greet on every open, ducking the music
  }, [fetchMusicUrl, playWelcome]);

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

  // Voice scheduler: a programmed segment every ~2h and a short station ID every
  // ~30 min, with a 5-min buffer so two clips never play back-to-back (segments
  // take priority — the station ID is skipped if anything aired recently).
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => {
      if (speaking) return;
      const now = Date.now();
      if (now - lastUpdate.current < VOICE_BUFFER_MS) return;
      if (now - lastSegment.current >= SEGMENT_EVERY_MS) { lastSegment.current = now; playSegment(); return; }
      if (now - lastStation.current >= STATION_EVERY_MS) { lastStation.current = now; playStationId(); return; }
    }, 60000);
    return () => clearInterval(t);
  }, [on, speaking, playSegment, playStationId]);

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
                <div className="text-[10px] text-[#BFA181] mt-0.5">{speaking ? (segTitle || "On air…") : on ? "♪ Music" : highlight ? "👇 Tap play to listen" : TAGLINE[lang]}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm" aria-label="Minimize">▾</button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={toggle} disabled={buffering}
              className={`w-11 h-11 shrink-0 rounded-full bg-[#BFA181] hover:bg-[#cdb393] disabled:opacity-60 text-black flex items-center justify-center transition ${highlight && !on ? "ring-4 ring-[#BFA181]/60 animate-pulse" : ""}`} aria-label={on ? "Pause" : "Play"}>
              {buffering ? <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                : on ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={playStationId} disabled={!on || speaking}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium" title="Station ID">📢 Now</button>
            <div className="flex gap-1 ml-auto">
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => pickLang(l.id)}
                  className={`px-1.5 py-1 rounded-md text-[11px] font-medium ${lang === l.id ? "bg-[#BFA181] text-black" : "bg-zinc-800 text-slate-300 hover:bg-zinc-700"}`}>{l.label}</button>
              ))}
            </div>
          </div>
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
