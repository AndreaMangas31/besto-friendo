"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/shared/api/client";
import type {
  CommandCatalogResponse,
  CommandHelpItem,
} from "@/features/conversation/types/commands";

export function useCommandCatalog() {
  const [items, setItems] = useState<CommandHelpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await apiGet<CommandCatalogResponse>("/commands/catalog");
        if (!cancelled) {
          setItems(data.items);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "No se pudo cargar la lista de comandos.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, isLoading, errorMessage };
}
