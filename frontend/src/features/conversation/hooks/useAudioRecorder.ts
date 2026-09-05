"use client";

import { useCallback, useRef, useState } from "react";
import type { RecorderStatus } from "@/features/conversation/types/audio";

// Chrome/Firefox suelen grabar webm; Safari a menudo solo mp4.
// Si el MIME no coincide con lo que ves en DevTools → Network, mira este orden.
function pickMimeType(): string | undefined {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }
  if (mimeType.includes("ogg")) {
    return "ogg";
  }
  return "webm";
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);

    if (typeof MediaRecorder === "undefined") {
      setStatus("error");
      setErrorMessage("Este navegador no soporta grabación de audio.");
      return;
    }

    try {
      // Falla aquí si el usuario deniega el micro, o si no estás en localhost/https.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Sin timeslice: un único blob al stop(). Si size_bytes sale 0, el stop
      // se disparó antes de tener datos (grabación demasiado corta).
      recorder.start();
      setStatus("recording");
    } catch {
      stopStream();
      setStatus("error");
      setErrorMessage("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }, [stopStream]);

  const stop = useCallback(async (): Promise<File | null> => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return null;
    }

    const file = await new Promise<File | null>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stopStream();
        recorderRef.current = null;

        if (blob.size === 0) {
          // No enviamos: el backend marcaría received=true con 0 bytes y confundiría.
          resolve(null);
          return;
        }

        resolve(
          new File([blob], `recording.${extensionForMime(mimeType)}`, {
            type: mimeType,
          }),
        );
      };

      recorder.stop();
    });

    setStatus("idle");
    return file;
  }, [stopStream]);

  return { status, errorMessage, start, stop };
}
