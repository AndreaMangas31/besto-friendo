"use client";

import { useCallback } from "react";

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("ja")) ??
    voices.find((voice) => voice.lang.toLowerCase().includes("jp"))
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

  return { speakJapanese, cancel };
}
