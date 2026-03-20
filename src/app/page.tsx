"use client";

import Scene from "@/components/Scene";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useState, useEffect, useCallback } from "react";

// ─── Open-source MPFB/MakeHuman models ──────────────────────────────────────
const MODELS = [
  {
    name: "Kofi",
    url: "/mpfb_models/kofi-v2.glb",
    position: [0, -1.45, 0] as [number, number, number],
    scale: 1,
  },
  {
    name: "Yuki",
    url: "/mpfb_models/yuki-v2.glb",
    position: [0, -1.15, 0] as [number, number, number],
    scale: 1,
  },
  {
    name: "Liam",
    url: "/mpfb_models/liam-v2.glb",
    position: [0, -1.45, 0] as [number, number, number],
    scale: 1,
  },
];

// ─── Background options (gradients + photorealistic) ─────────────────────────
const BACKGROUNDS = [
  { name: "Void", key: "void", preview: "#0a0614" },
  { name: "Midnight", key: "midnight", preview: "#0d1117" },
  { name: "Navy", key: "navy", preview: "#0a1628" },
  { name: "Charcoal", key: "charcoal", preview: "#1c1c1e" },
  { name: "Wine", key: "wine", preview: "#1a0a12" },
  { name: "Emerald", key: "emerald", preview: "#0a1a12" },
  { name: "City Night", key: "city-night", preview: "#1a1a30", isImage: true },
  { name: "Office", key: "office", preview: "#1a2030", isImage: true },
  { name: "Nebula", key: "nebula", preview: "#201028", isImage: true },
  { name: "Lounge", key: "lounge", preview: "#2a1a0a", isImage: true },
];

export default function Home() {
  const [cursorHidden, setCursorHidden] = useState(false);
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [currentBg, setCurrentBg] = useState(BACKGROUNDS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [showMobileAlert, setShowMobileAlert] = useState(false);

  // Detect mobile and show alert on first visit
  useEffect(() => {
    const isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
    try {
      if (isMobile && !sessionStorage.getItem("pp-mobile-dismissed")) {
        setShowMobileAlert(true);
        const t = setTimeout(() => {
          setShowMobileAlert(false);
          try { sessionStorage.setItem("pp-mobile-dismissed", "1"); } catch { }
        }, 8000);
        return () => clearTimeout(t);
      }
    } catch { }
  }, []);

  // Clear initial loading state after first model loads
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcuts: I = immersive, M = mouth toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // ignore held-down repeats
      const key = e.key.toLowerCase();
      if (key === "i") {
        setCursorHidden((prev) => !prev);
      } else if (key === "m") {
        window.dispatchEvent(new Event("jaw-toggle"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const switchModel = useCallback((m: typeof MODELS[number]) => {
    if (m.name === currentModel.name) return;
    setIsLoading(true);
    setCurrentModel(m);
    setTimeout(() => setIsLoading(false), 2500);
  }, [currentModel.name]);

  const exitImmersive = useCallback(() => {
    setCursorHidden(false);
  }, []);

  return (
    <ErrorBoundary>
      <main
        className={`w-screen h-dvh overflow-hidden bg-black text-white font-[var(--font-inter)]`}
        style={{ cursor: cursorHidden ? "none" : "auto" }}
      >
        <Scene config={currentModel} bgName={currentBg.key} />

        {/* ─── Loading indicator ─── */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="loading-shimmer text-white/60 font-[var(--font-mono)] text-sm tracking-widest uppercase">
              Loading avatar...
            </div>
          </div>
        )}

        {/* ─── Brand watermark ─── */}
        <div
          className={`absolute bottom-4 left-4 z-10 pointer-events-none transition-opacity duration-500 ${cursorHidden ? "opacity-15" : "opacity-70"}`}
        >
          <h1
            className="brand-glow text-lg font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              color: "#7c5cfc",
              letterSpacing: "-0.02em",
            }}
          >
            PrivacyPuppet
          </h1>
          <p className="text-[10px] text-white/30 font-[var(--font-mono)] mt-0.5 tracking-wider uppercase">
            Interactive 3D Avatar
          </p>
        </div>

        {/* ─── Right sidebar: Model + Background selectors ─── */}
        <div
          className={`absolute top-5 right-5 z-20 flex flex-col gap-4 transition-opacity duration-300 ${cursorHidden ? "opacity-0 pointer-events-none" : ""}`}
        >
          {/* Model pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-[var(--font-mono)] text-white/30 tracking-widest uppercase mb-0.5 px-1">Avatar</span>
            {MODELS.map((m) => (
              <button
                key={m.name}
                onClick={() => switchModel(m)}
                disabled={isLoading}
                style={{ minWidth: "90px" }}
                className={`px-4 py-1.5 rounded-full text-xs font-[var(--font-mono)] tracking-wide transition-all duration-200 border ${currentModel.name === m.name
                  ? "bg-[#7c5cfc] text-white border-[#7c5cfc] shadow-[0_0_12px_rgba(124,92,252,0.4)]"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Background submenu */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setShowBgMenu(!showBgMenu)}
              className="text-[9px] font-[var(--font-mono)] text-white/30 tracking-widest uppercase px-1 text-left cursor-pointer hover:text-white/60 transition-colors flex items-center gap-1"
            >
              Background
              <span className={`transition-transform duration-200 text-[8px] ${showBgMenu ? "rotate-180" : ""}`}>▼</span>
            </button>

            {showBgMenu && (
              <div className="flex flex-col gap-1">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.key}
                    onClick={() => setCurrentBg(bg)}
                    style={{ minWidth: "90px" }}
                    className={`px-3 py-1 rounded-full text-[11px] font-[var(--font-mono)] tracking-wide transition-all duration-200 border flex items-center gap-2 ${currentBg.key === bg.key
                      ? "bg-white/15 text-white border-white/30"
                      : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70"
                      } cursor-pointer active:scale-95`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                      style={{ background: bg.preview }}
                    />
                    {bg.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Bottom controls ─── */}
        <div
          className={`absolute bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3 transition-opacity duration-300 ${cursorHidden ? "opacity-0 pointer-events-none" : ""}`}
        >
          <button
            style={{ minWidth: "170px" }}
            className="px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/25 rounded-full text-white/90 font-[var(--font-mono)] text-xs tracking-wider hover:bg-black/60 hover:text-white hover:border-white/40 transition-all duration-200 active:scale-95 cursor-pointer uppercase"
            onClick={() => window.dispatchEvent(new Event("jaw-toggle"))}
          >
            Toggle Mouth
            <span className="text-white/40 ml-1.5 text-[10px]">M</span>
          </button>
          <button
            style={{ minWidth: "140px" }}
            className="px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/25 rounded-full text-white/90 font-[var(--font-mono)] text-xs tracking-wider hover:bg-black/60 hover:text-white hover:border-white/40 transition-all duration-200 active:scale-95 cursor-pointer uppercase"
            onClick={() => setCursorHidden(true)}
          >
            Immersive
            <span className="text-white/40 ml-1.5 text-[10px]">I</span>
          </button>
        </div>

        {/* ─── Keyboard hint ─── */}
        <div
          className={`absolute top-5 left-5 z-10 pointer-events-none transition-opacity duration-300 hidden md:block ${cursorHidden ? "opacity-0" : "opacity-50"}`}
        >
          <p className="text-[10px] font-[var(--font-mono)] text-white/50 tracking-wider uppercase">
            I = immersive · M = mouth
          </p>
        </div>

        {/* ─── Immersive exit: desktop = click anywhere, mobile = visible button ─── */}
        {cursorHidden && (
          <>
            {/* Desktop: invisible overlay + subtle hint */}
            <div
              className="absolute inset-0 z-40 hidden md:block"
              style={{ cursor: "none" }}
              onClick={exitImmersive}
            >
              <div
                className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/15 font-[var(--font-mono)] tracking-widest uppercase"
                style={{ cursor: "none" }}
              >
                Click or press I to exit
              </div>
            </div>
            {/* Mobile: visible exit button at top */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
              <button
                onClick={exitImmersive}
                onTouchEnd={(e) => { e.preventDefault(); exitImmersive(); }}
                className="px-5 py-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full text-white/80 font-[var(--font-mono)] text-xs tracking-wider uppercase active:scale-95 transition-all duration-200"
              >
                ✕ Exit Immersive
              </button>
            </div>
          </>
        )}

        {/* ─── Mobile alert ─── */}
        {showMobileAlert && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 md:hidden">
            <div className="bg-black/70 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-2.5 flex items-center gap-3 max-w-[340px]">
              <p className="text-[11px] text-white/70 font-[var(--font-mono)] leading-relaxed">
                For the best experience, use a desktop browser
              </p>
              <button
                onClick={() => { setShowMobileAlert(false); try { sessionStorage.setItem("pp-mobile-dismissed", "1"); } catch { } }}
                className="text-white/40 hover:text-white/80 text-lg leading-none flex-shrink-0 cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>
        )}
        {/* ─── Footer Links ─── */}
        <div className={`absolute bottom-4 right-5 z-20 flex items-center gap-4 transition-opacity duration-300 ${cursorHidden ? "opacity-0 pointer-events-none" : ""}`}>
          <a
            href="https://github.com/towynlin/privacypuppet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-[var(--font-mono)] text-white/30 tracking-wider uppercase hover:text-[#7c5cfc] transition-colors duration-200"
          >
            GitHub
          </a>
        </div>
      </main>
    </ErrorBoundary>
  );
}
