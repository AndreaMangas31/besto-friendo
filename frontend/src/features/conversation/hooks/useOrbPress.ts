"use client";

import { useEffect, useRef, useState } from "react";

/** Un ciclo de orb-confused-mark antes de abrir el micro. */
const OOPS_MS = 550;
/** Squash visible; en ESCUCHANDO no retrasamos el envío. */
const POKE_MS = 480;

type UseOrbPressArgs = {
  isRecording: boolean;
  isSending: boolean;
  startRecording: () => void;
  commitRecording: () => void;
  cancelSpeech: () => void;
  onClearHint: () => void;
  onClearConfused: () => void;
};

export function useOrbPress({
  isRecording,
  isSending,
  startRecording,
  commitRecording,
  cancelSpeech,
  onClearHint,
  onClearConfused,
}: UseOrbPressArgs) {
  const [oopsing, setOopsing] = useState(false);
  const [poked, setPoked] = useState(false);
  const [pokeMark, setPokeMark] = useState<string | null>(null);
  const oopsTimerRef = useRef<number | null>(null);
  const pokeTimerRef = useRef<number | null>(null);

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

  function flashPoke(mark: "OOPS" | "VOOOOY") {
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
  }

  function onPress() {
    if (isSending || oopsing) {
      return;
    }

    // Segundo pulso: ya graba. VOOOOy y envío ya; el squash no espera.
    if (isRecording) {
      flashPoke("VOOOOY");
      onClearHint();
      commitRecording();
      return;
    }

    // Primer pulso: OOPS y luego micro (Safari pide gesto + getUserMedia).
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

  return { oopsing, poked, pokeMark, onPress };
}
