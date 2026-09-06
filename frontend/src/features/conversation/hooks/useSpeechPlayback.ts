"use client";

import { useCallback } from "react";

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("ja")) ??
    voices.find((voice) => voice.lang.toLowerCase().includes("jp"))
  );
}

function pickSpanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es-es")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("es"))
  );
}

export function useSpeechPlayback() {
  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
  }, []);

  const speakJapanese = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
        return;
      }

      cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      const voice = pickJapaneseVoice();
      if (voice) {
        utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    },
    [cancel],
  );

  const bark = useCallback(() => {
    // TTS “guau guau”: no hay audio grabado de Luna en el repo.
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    cancel();

    const utterance = new SpeechSynthesisUtterance("guau guau");
    utterance.lang = "es-ES";
    utterance.pitch = 1.45;
    utterance.rate = 1.28;
    const voice = pickSpanishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  }, [cancel]);

  return { speakJapanese, bark, cancel };
}
