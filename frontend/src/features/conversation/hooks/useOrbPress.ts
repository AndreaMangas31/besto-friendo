"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Un ciclo de orb-confused-mark antes de abrir el micro. */
const OOPS_MS = 550;
/** Squash visible al enviar; el hold de silencio no usa este timer. */
const POKE_MS = 480;

type UseOrbPressArgs = {
  isRecording: boolean;
  isSending: boolean;
  startRecording: () => void;
  commitRecording: () => void;
  cancelSpeech: () => void;
  onClearHint: () => void;
  onClearConfused: () => void;
  primeAudio?: () => void;
};

export function useOrbPress({
  isRecording,
  isSending,
  startRecording,
  commitRecording,
  cancelSpeech,
  onClearHint,
  onClearConfused,
  primeAudio,
}: UseOrbPressArgs) {
  const [oopsing, setOopsing] = useState(false);
  const [poked, setPoked] = useState(false);
  const [pokeMark, setPokeMark] = useState<string | null>(null);
  const oopsTimerRef = useRef<number | null>(null);
  const pokeTimerRef = useRef<number | null>(null);
  const voooyHoldRef = useRef(false);

  useEffect(() => {
    return () => {
      if (oopsTimerRef.current !== null) {
        window.clearTimeout(oopsTimerRef.current);
      }
      if (pokeTimerRef.current !== null) {
        window.clearTimeout(pokeTimerRef.current);
      }
    };
  }, []);

  const flashPoke = useCallback((mark: "OOPS" | "VOOOOY") => {
    voooyHoldRef.current = false;
    setPokeMark(mark);
    setPoked(true);
    if (pokeTimerRef.current !== null) {
      window.clearTimeout(pokeTimerRef.current);
    }
    pokeTimerRef.current = window.setTimeout(() => {
      pokeTimerRef.current = null;
      setPoked(false);
      setPokeMark(null);
    }, POKE_MS);
  }, []);

  const setVoooyHold = useCallback((on: boolean) => {
    if (on) {
      if (pokeTimerRef.current !== null) {
        window.clearTimeout(pokeTimerRef.current);
        pokeTimerRef.current = null;
      }
      voooyHoldRef.current = true;
      setPokeMark("VOOOOY");
      setPoked(true);
      return;
    }

    if (!voooyHoldRef.current) {
      return;
    }
    voooyHoldRef.current = false;
    setPoked(false);
    setPokeMark(null);
  }, []);

  function onPress() {
    if (isSending || oopsing) {
      return;
    }

    // Segundo pulso: envío ya. VOOOOY solo lo pone el silencio al acabar la comanda.
    if (isRecording) {
      setVoooyHold(false);
      onClearHint();
      commitRecording();
      return;
    }

    // Primer pulso: OOPS y luego micro (Safari pide gesto + getUserMedia).
    primeAudio?.();
    flashPoke("OOPS");
    onClearHint();
    cancelSpeech();
    onClearConfused();
    setOopsing(true);
    oopsTimerRef.current = window.setTimeout(() => {
      oopsTimerRef.current = null;
      setOopsing(false);
      startRecording();
    }, OOPS_MS);
  }

  return { oopsing, poked, pokeMark, onPress, setVoooyHold, flashPoke };
}
