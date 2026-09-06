"use client";

import { useEffect } from "react";

const ART_SRC = "/best-of-friendo-success.png";
const SUCCESS_MS = 2800;
const REDUCED_MS = 1400;

// Posiciones fijas: un random en cada mount haría bailar las ✨ al repetir el comando.
const SPARKS = [
  { top: "14%", left: "18%", delay: "0ms" },
  { top: "22%", left: "78%", delay: "70ms" },
  { top: "38%", left: "10%", delay: "140ms" },
  { top: "44%", left: "88%", delay: "40ms" },
  { top: "58%", left: "16%", delay: "180ms" },
  { top: "62%", left: "82%", delay: "110ms" },
  { top: "18%", left: "48%", delay: "200ms" },
  { top: "72%", left: "28%", delay: "90ms" },
  { top: "76%", left: "70%", delay: "160ms" },
  { top: "32%", left: "36%", delay: "50ms" },
  { top: "50%", left: "54%", delay: "130ms" },
] as const;

type BestoFriendoSuccessAnimationProps = {
  playKey: number;
  onFinished: () => void;
};

export function BestoFriendoSuccessAnimation({
  playKey,
  onFinished,
}: BestoFriendoSuccessAnimationProps) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      onFinished,
      reduced ? REDUCED_MS : SUCCESS_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playKey, onFinished]);

  return (
    <div
      className="bff-success pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      aria-hidden
    >
      {/* key: si llega otro éxito seguido, CSS vuelve a 0ms sin desmontar el overlay. */}
      <div key={playKey} className="absolute inset-0">
        <div className="bff-success-backdrop absolute inset-0 bg-zinc-950/70" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bff-success-orb tutor-orb h-64 w-64 opacity-80 blur-[1px] md:h-80 md:w-80 rounded-full" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bff-success-stage relative w-full max-w-xl">
            {/* Misma PNG dos veces: clip-path parte el bitmap, no un letterbox. */}
            <img
              src={ART_SRC}
              alt=""
              className="bff-success-half bff-success-half--left relative h-auto w-full"
            />
            <img
              src={ART_SRC}
              alt=""
              className="bff-success-half bff-success-half--right absolute inset-0 h-full w-full"
            />

            <div className="bff-success-flash pointer-events-none absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-md" />

            <p className="bff-success-title pointer-events-none absolute left-1/2 top-[4%] w-[90%] -translate-x-1/2 text-center text-3xl font-black tracking-wide text-zinc-100 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] md:text-5xl">
              BESTO FRIENDO!!
            </p>

            {SPARKS.map((spark, index) => (
              <span
                key={index}
                className="bff-success-spark pointer-events-none absolute text-lg md:text-xl"
                style={{
                  top: spark.top,
                  left: spark.left,
                  animationDelay: `calc(1200ms + ${spark.delay})`,
                }}
              >
                ✨
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
