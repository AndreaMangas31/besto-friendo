"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { useAppGate } from "@/features/gate/hooks/useAppGate";

type GateShellProps = {
  children: ReactNode;
};

export function GateShell({ children }: GateShellProps) {
  const gate = useAppGate();
  const [password, setPassword] = useState("");

  if (!gate.ready) {
    return <div className="min-h-full bg-zinc-50" />;
  }

  if (gate.required && !gate.unlocked) {
    function onSubmit(event: FormEvent) {
      event.preventDefault();
      void gate.unlock(password);
    }

    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-zinc-900">Besto Friendo</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Contraseña de casa. El teléfono la recuerda.
          </p>
          <label className="mt-4 block text-sm text-zinc-700">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base"
            />
          </label>
          {gate.errorMessage ? (
            <p className="mt-2 text-sm text-red-600">{gate.errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={gate.busy || !password}
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {children}
      {gate.required ? (
        <button
          type="button"
          onClick={gate.lock}
          className="fixed bottom-3 right-3 z-30 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
        >
          Salir
        </button>
      ) : null}
    </div>
  );
}
