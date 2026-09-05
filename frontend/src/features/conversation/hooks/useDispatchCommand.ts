"use client";

import { useCallback, useState } from "react";
import { apiPostForm, ApiError } from "@/shared/api/client";
import type { DispatchResponse, DispatchStatus } from "@/features/conversation/types/commands";
import type { ChatMessage, PracticeMode } from "@/features/conversation/types/turn";

export function useDispatchCommand() {
  const [status, setStatus] = useState<DispatchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = useCallback(
    async (
      file: File,
      history: ChatMessage[],
      japaneseEnabled: boolean,
      mode: PracticeMode,
    ): Promise<DispatchResponse | null> => {
      setStatus("sending");
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("japanese_enabled", japaneseEnabled ? "true" : "false");
      formData.append("mode", mode);
      formData.append(
        "history",
        JSON.stringify(history.map(({ role, text }) => ({ role, text }))),
      );

      try {
        const data = await apiPostForm<DispatchResponse>(
          "/commands/dispatch",
          formData,
        );
        setStatus("ok");
        return data;
      } catch (error: unknown) {
        setStatus("error");
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "No se pudo interpretar el comando. ¿Está el backend arrancado?",
        );
        return null;
      }
    },
    [],
  );

  return { status, errorMessage, send };
}
