"use client";

import { useCallback, useEffect, useState } from "react";
import { GateWatchingOrb } from "@/features/gate/components/GateWatchingOrb";
import "@/features/gate/gate-sheet.css";

export const GATE_PIN_LENGTH = 6;

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

// Hacia dónde mira el mini-orbe según la tecla (rejilla 3x4).
const GAZE: Record<string, { x: number; y: number }> = {
  "1": { x: -3, y: -2.5 },
  "2": { x: 0, y: -2.5 },
  "3": { x: 3, y: -2.5 },
  "4": { x: -3, y: 0 },
  "5": { x: 0, y: 0 },
  "6": { x: 3, y: 0 },
  "7": { x: -3, y: 2 },
  "8": { x: 0, y: 2 },
  "9": { x: 3, y: 2 },
  "0": { x: 0, y: 3.2 },
  del: { x: 3, y: 3.2 },
};

const keyClass =
  "flex h-[4.6rem] w-[4.6rem] cursor-pointer flex-col items-center justify-center rounded-full border border-white/70 bg-white/10 p-0 text-white [-webkit-tap-highlight-color:transparent] active:bg-white/20 disabled:opacity-45";

type GatePinSheetProps = {
  busy: boolean;
  errorMessage: string | null;
  onUnlock: (pin: string) => void;
};

export function GatePinSheet({ busy, errorMessage, onUnlock }: GatePinSheetProps) {
  const [pin, setPin] = useState("");
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [shake, setShake] = useState(false);
  const [confused, setConfused] = useState(false);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    setPin("");
    setShake(true);
    setConfused(true);
    const shakeTimer = window.setTimeout(() => setShake(false), 420);
    const confuseTimer = window.setTimeout(() => setConfused(false), 900);
    return () => {
      window.clearTimeout(shakeTimer);
      window.clearTimeout(confuseTimer);
    };
  }, [errorMessage]);

  const pushDigit = useCallback(
    (digit: string) => {
      if (busy) {
        return;
      }
      setGaze(GAZE[digit] ?? { x: 0, y: 0 });
      setPin((current) => {
        if (current.length >= GATE_PIN_LENGTH) {
          return current;
        }
        const next = `${current}${digit}`;
        if (next.length === GATE_PIN_LENGTH) {
          // El 6º dígito envía; el servidor compara el string entero.
          queueMicrotask(() => onUnlock(next));
        }
        return next;
      });
    },
    [busy, onUnlock],
  );

  const erase = useCallback(() => {
    if (busy) {
      return;
    }
    setGaze(GAZE.del);
    setPin((current) => current.slice(0, -1));
  }, [busy]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        pushDigit(event.key);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        erase();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [erase, pushDigit]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-zinc-950/30">
      <div className="gate-sheet-in flex flex-col items-center rounded-t-3xl border border-b-0 border-white/35 bg-zinc-950/30 px-6 pt-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-slate-50 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] backdrop-blur-[22px] backdrop-saturate-150">
        <GateWatchingOrb gazeX={gaze.x} gazeY={gaze.y} confused={confused} />
        <p className="mt-1.5 text-[1.05rem] font-light tracking-wide">Introduzca el código</p>
        <p className="mt-1.5 min-h-5 text-sm text-red-200">{errorMessage ?? ""}</p>
        <div className={`mb-5 mt-4 flex gap-3.5 ${shake ? "gate-pin-shake" : ""}`} aria-hidden>
          {Array.from({ length: GATE_PIN_LENGTH }, (_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full border-[1.5px] border-white/90 transition-colors ${
                index < pin.length ? "bg-white" : "bg-transparent"
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(3,4.6rem)] grid-rows-[repeat(4,4.6rem)] justify-center gap-x-[1.1rem] gap-y-3.5">
          {KEYS.map((key) => (
            <button
              key={key.digit}
              type="button"
              className={keyClass}
              disabled={busy}
              onClick={() => pushDigit(key.digit)}
            >
              <span className="text-[1.7rem] leading-none font-light">{key.digit}</span>
              {key.letters ? (
                <span className="mt-0.5 text-[0.55rem] font-medium tracking-[0.12em] opacity-85">
                  {key.letters}
                </span>
              ) : null}
            </button>
          ))}
          <span aria-hidden />
          <button type="button" className={keyClass} disabled={busy} onClick={() => pushDigit("0")}>
            <span className="text-[1.7rem] leading-none font-light">0</span>
          </button>
          <button
            type="button"
            className={`${keyClass} border-transparent bg-transparent active:bg-white/10`}
            disabled={busy}
            onClick={erase}
          >
            <span className="text-[0.55rem] font-medium tracking-[0.12em] opacity-85">Borrar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
