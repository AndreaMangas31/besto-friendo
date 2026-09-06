"use client";

import { type CSSProperties } from "react";
import "@/features/gate/gate-sheet.css";

type GateWatchingOrbProps = {
  gazeX: number;
  gazeY: number;
  confused: boolean;
};

export function GateWatchingOrb({ gazeX, gazeY, confused }: GateWatchingOrbProps) {
  const style = {
    "--gaze-x": `${gazeX}px`,
    "--gaze-y": `${gazeY}px`,
  } as CSSProperties;

  return (
    <div className="relative mb-0.5 h-[4.4rem] w-[4.4rem]" style={style} aria-hidden>
      <div
        className={`gate-watch-body absolute inset-[6%] ${confused ? "gate-watch-body--confused" : ""}`}
      >
        <span className="gate-eye-blink absolute top-[36%] left-[28%] h-[32%] w-[18%] overflow-hidden rounded-full bg-slate-50 shadow-[0_0_8px_rgba(255,255,255,0.8)]">
          <span className="gate-pupil-gaze absolute top-[55%] left-1/2 h-[42%] w-[42%] rounded-full bg-slate-900 transition-transform duration-150" />
        </span>
        <span className="gate-eye-blink absolute top-[36%] right-[28%] h-[32%] w-[18%] overflow-hidden rounded-full bg-slate-50 shadow-[0_0_8px_rgba(255,255,255,0.8)]">
          <span className="gate-pupil-gaze absolute top-[55%] left-1/2 h-[42%] w-[42%] rounded-full bg-slate-900 transition-transform duration-150" />
        </span>
      </div>
    </div>
  );
}
