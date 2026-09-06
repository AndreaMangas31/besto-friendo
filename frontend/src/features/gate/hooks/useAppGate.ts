"use client";

import { useCallback, useEffect, useState } from "react";
import { GATE_HEADER, clearGateToken, readGateToken, writeGateToken } from "@/features/gate/storage";

type GateStatus = {
  required: boolean;
  ok: boolean;
};

export function useAppGate() {
  const [ready, setReady] = useState(false);
  const [required, setRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const token = readGateToken();
    const headers = new Headers();
    if (token) {
      headers.set(GATE_HEADER, token);
    }
    const response = await fetch("/gate/status", { cache: "no-store", headers });
    const body = (await response.json()) as GateStatus;
    setRequired(body.required);
    setUnlocked(!body.required || body.ok);
    if (body.required && token && !body.ok) {
      // Token viejo o inventado: no vale unlocked=true en DevTools.
      clearGateToken();
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      setReady(true);
      setRequired(false);
      setUnlocked(true);
    });
  }, [refresh]);

  const unlock = useCallback(async (password: string) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/gate/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail =
          body && typeof body === "object" && "detail" in body
            ? String((body as { detail: unknown }).detail)
            : "Contraseña incorrecta";
        setErrorMessage(detail);
        return;
      }
      const token =
        body && typeof body === "object" && "token" in body
          ? String((body as { token: unknown }).token)
          : "";
      if (token) {
        writeGateToken(token);
      }
      setUnlocked(true);
    } catch {
      setErrorMessage("No se pudo comprobar la contraseña");
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(() => {
    clearGateToken();
    setUnlocked(false);
    setErrorMessage(null);
  }, []);

  return { ready, required, unlocked, errorMessage, busy, unlock, lock };
}
