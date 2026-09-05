"use client";

import { BackendStatus } from "@/features/home/components/BackendStatus";
import { useHealth } from "@/features/home/hooks/useHealth";

export function HomeView() {
  const health = useHealth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6">
      <main className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Fase 1
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Besto Friendo
          </h1>
          <p className="text-zinc-600">
            Base del tutor de conversación en japonés. Esta pantalla solo
            comprueba que el frontend y el backend se hablan.
          </p>
        </div>
        <BackendStatus health={health} />
      </main>
    </div>
  );
}
