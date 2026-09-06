"use client";

import { useCallback, useRef } from "react";

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

function blobUrlFromBase64(base64: string, mime: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime || "audio/mpeg" }));
}

export function useSpeechPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const playModelAudio = useCallback(
    (base64: string, mime = "audio/mpeg") => {
      if (typeof window === "undefined" || !base64.trim()) {
        return;
      }
      cancel();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      const url = blobUrlFromBase64(base64, mime);
      objectUrlRef.current = url;
      const player = new Audio(url);
      audioRef.current = player;
      void player.play().catch(() => {
        // Autoplay bloqueado: el usuario ya pulsó Hablar; el texto sigue en el chat.
      });
    },
    [cancel],
  );

  const playAudioSrc = useCallback(
    (src: string) => {
      if (typeof window === "undefined" || !src.trim()) {
        return;
      }
      cancel();
      const player = new Audio(src);
      audioRef.current = player;
      void player.play().catch(() => undefined);
    },
    [cancel],
  );

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

  return { speakJapanese, playModelAudio, playAudioSrc, bark, cancel };
}
