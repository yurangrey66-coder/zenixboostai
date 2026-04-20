import { useEffect, useState } from "react";
import logo from "@/assets/zenix-logo.png";

const SPLASH_KEY = "zenix_splash_shown";
const DURATION_MS = 7000;

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Show only once per session
    if (sessionStorage.getItem(SPLASH_KEY)) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    const fadeTimer = setTimeout(() => setFadeOut(true), DURATION_MS - 500);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      playNotificationSound();
    }, DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Glow background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          {/* Rotating ring */}
          <div className="absolute inset-0 -m-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" style={{ animationDuration: "2s" }} />
          <img
            src={logo}
            alt="ZENIX BOOST"
            className="relative h-32 w-32 rounded-2xl object-contain animate-scale-in drop-shadow-[0_0_30px_hsl(var(--primary)/0.6)]"
          />
        </div>

        <div className="flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
          <h1 className="font-display text-3xl font-bold tracking-wider text-gradient-neon">
            ZENIX BOOST
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            AI Powered Ads
          </p>
        </div>

        {/* Loading bar */}
        <div className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-neon"
            style={{
              animation: `splash-progress ${DURATION_MS}ms ease-out forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splash-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // iOS-like "tri-tone" notification: three quick rising tones
    const notes = [
      { freq: 523.25, start: 0, dur: 0.12 },   // C5
      { freq: 659.25, start: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, start: 0.24, dur: 0.22 }, // G5
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    });

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // silent fail — autoplay may be blocked
  }
}
