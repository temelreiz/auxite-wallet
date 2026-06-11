"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "en" | "de" | "ar";
const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "ar", label: "العربية", flag: "🇸🇦" },
];
const LOADING_MSG: Record<Lang, string> = {
  en: "Preparing the broadcast…",
  de: "Sendung wird vorbereitet…",
  ar: "جارٍ تحضير البث…",
};

export default function RadioPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [script, setScript] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [err, setErr] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load the script text for the selected language.
  useEffect(() => {
    let alive = true;
    setLoadingScript(true); setErr(""); setScript("");
    fetch(`/api/radio?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => { if (alive) d.success ? setScript(d.script) : setErr(d.error || "Failed"); })
      .catch(() => alive && setErr("Connection error"))
      .finally(() => alive && setLoadingScript(false));
    // stop audio on language change
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
    return () => { alive = false; };
  }, [lang]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    setBuffering(true); setErr("");
    a.src = `/api/radio/audio?lang=${lang}&t=${Math.floor(Date.now() / 3600000)}`;
    try {
      await a.play();
      setPlaying(true);
    } catch {
      setErr("Playback failed");
    } finally {
      setBuffering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1420] to-[#070d16] text-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📻</div>
          <h1 className="text-3xl font-bold tracking-tight">Auxite Radio</h1>
          <p className="text-sm text-slate-400 mt-2">
            Live precious-metals update · <span className="text-[#BFA181]">refreshes hourly</span>
          </p>
        </div>

        {/* Language tabs */}
        <div className="flex gap-2 justify-center mb-8">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                lang === l.id ? "bg-[#BFA181] text-black" : "bg-slate-800/70 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        {/* Player */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={toggle}
            disabled={buffering || loadingScript}
            className="w-24 h-24 rounded-full bg-[#BFA181] hover:bg-[#cdb393] disabled:opacity-60 text-black flex items-center justify-center shadow-lg shadow-[#BFA181]/20 transition"
            aria-label={playing ? "Pause" : "Play"}
          >
            {buffering ? (
              <span className="w-6 h-6 border-2 border-black/40 border-t-black rounded-full animate-spin" />
            ) : playing ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div className="mt-4 h-5 text-sm text-slate-400">
            {buffering ? LOADING_MSG[lang] : playing ? "● On air" : "Tap to listen"}
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 min-h-[160px]">
          {loadingScript ? (
            <p className="text-slate-500 text-sm">{LOADING_MSG[lang]}</p>
          ) : err ? (
            <p className="text-red-400 text-sm">{err}</p>
          ) : (
            <p
              className="text-slate-200 leading-relaxed whitespace-pre-wrap"
              dir={lang === "ar" ? "rtl" : "ltr"}
              style={{ textAlign: lang === "ar" ? "right" : "left" }}
            >
              {script}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Generated from live Auxite prices &amp; market news · spoken by ElevenLabs
        </p>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setPlaying(true); }}
        preload="none"
      />
    </div>
  );
}
