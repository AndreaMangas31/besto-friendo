"use client";

import { useCallback, useRef, useState } from "react";
import { apiPostForm, ApiError } from "@/shared/api/client";
import type { DispatchResponse, DispatchStatus } from "@/features/conversation/types/commands";
import type { ChatMessage, PracticeMode } from "@/features/conversation/types/turn";

const DISPATCH_TIMEOUT_MS = 20_000;
const CONVERSATION_TIMEOUT_MS = 55_000;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

export function useDispatchCommand() {
  const [status, setStatus] = useState<DispatchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const abortKindRef = useRef<"user" | "timeout" | null>(null);

  const clearTimeoutHandle = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortKindRef.current = "user";
    controllerRef.current?.abort();
  }, []);

  const send = useCallback(
    async (
      file: File,
      history: ChatMessage[],
      japaneseEnabled: boolean,
      mode: PracticeMode,
      conversationEnabled = false,
    ): Promise<DispatchResponse | null> => {
      abortKindRef.current = null;
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus("sending");
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("japanese_enabled", japaneseEnabled ? "true" : "false");
      formData.append("conversation_enabled", conversationEnabled ? "true" : "false");
      formData.append("mode", mode);
      formData.append(
        "history",
        JSON.stringify(history.map(({ role, text }) => ({ role, text }))),
      );

      // Casa 20s; conversación ~55s porque web_search tarda.
      const timeoutMs = conversationEnabled
        ? CONVERSATION_TIMEOUT_MS
        : DISPATCH_TIMEOUT_MS;
      timeoutRef.current = window.setTimeout(() => {
        abortKindRef.current = "timeout";
        controller.abort();
      }, timeoutMs);

      try {
        const data = await apiPostForm<DispatchResponse>(
          "/commands/dispatch",
          formData,
          controller.signal,
        );
        setStatus("ok");
        return data;
      } catch (error: unknown) {
        if (isAbortError(error)) {
          if (abortKindRef.current === "user") {
            setStatus("idle");
            setErrorMessage(null);
            return null;
          }
          setStatus("error");
          setErrorMessage("Ha pasado demasiado tiempo.");
          return null;
        }
        setStatus("error");
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "No se pudo interpretar el comando. ¿Está el backend arrancado?",
        );
        return null;
      } finally {
        clearTimeoutHandle();
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [clearTimeoutHandle],
  );

  return { status, errorMessage, send, cancel };
}
