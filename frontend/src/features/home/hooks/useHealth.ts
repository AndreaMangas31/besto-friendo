"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/shared/api/client";
import type { HealthResponse, HealthState } from "@/features/home/types/health";

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    apiGet<HealthResponse>("/health")
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ok", service: data.service });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof ApiError
            ? error.message
            : "No se pudo conectar con el backend. ¿Está arrancado en el puerto 8000?";

        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
