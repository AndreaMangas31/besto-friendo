"use client";

import { useCallback, useState } from "react";
import { apiPostForm, ApiError } from "@/shared/api/client";
import type {
  AudioReceivedResponse,
  SendAudioStatus,
} from "@/features/conversation/types/audio";

export function useSendAudio() {
  const [status, setStatus] = useState<SendAudioStatus>("idle");
  const [result, setResult] = useState<AudioReceivedResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = useCallback(async (file: File) => {
    setStatus("sending");
    setResult(null);
    setErrorMessage(null);

    const formData = new FormData();
    // El nombre del campo DEBE ser "audio": es el parámetro de FastAPI.
    // Si cambia, el backend responde 422 (Unprocessable Entity).
    formData.append("audio", file);

    try {
      const data = await apiPostForm<AudioReceivedResponse>(
        "/conversation/audio",
        formData,
      );
      setResult(data);
      setStatus("ok");
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "No se pudo enviar el audio. ¿Está el backend arrancado?",
      );
    }
  }, []);

  return { status, result, errorMessage, send };
}
