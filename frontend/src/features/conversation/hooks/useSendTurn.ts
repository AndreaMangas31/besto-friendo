"use client";

import { useCallback, useState } from "react";
import { apiPostForm, ApiError } from "@/shared/api/client";
import type {
  ChatMessage,
  ConversationTurnResponse,
  SendTurnStatus,
} from "@/features/conversation/types/turn";

export function useSendTurn() {
  const [status, setStatus] = useState<SendTurnStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const send = useCallback(
    async (
      file: File,
      history: ChatMessage[],
    ): Promise<ConversationTurnResponse | null> => {
      setStatus("sending");
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("audio", file);
      formData.append(
        "history",
        JSON.stringify(history.map(({ role, text }) => ({ role, text }))),
      );

      try {
        const data = await apiPostForm<ConversationTurnResponse>(
          "/conversation/turn",
          formData,
        );
        setStatus("ok");
        return data;
      } catch (error: unknown) {
        setStatus("error");
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "No se pudo completar el turno. ¿Está el backend arrancado?",
        );
        return null;
      }
    },
    [],
  );

  return { status, errorMessage, send };
}
