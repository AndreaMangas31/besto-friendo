"use client";

import { type ReactNode } from "react";
import { GatePinSheet } from "@/features/gate/components/GatePinSheet";
import { useAppGate } from "@/features/gate/hooks/useAppGate";

type GateShellProps = {
  children: ReactNode;
};

export function GateShell({ children }: GateShellProps) {
  const gate = useAppGate();
  const showPin = gate.ready && gate.required && !gate.unlocked;

  return (
    <div className="relative min-h-full">
      {children}
      {showPin ? (
        <GatePinSheet
          busy={gate.busy}
          errorMessage={gate.errorMessage}
          onUnlock={gate.unlock}
        />
      ) : null}
      {gate.ready && gate.required && gate.unlocked ? (
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
