"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CommandHelpItem } from "@/features/conversation/types/commands";

type CommandHelpProps = {
  items: CommandHelpItem[];
  isLoading: boolean;
  errorMessage: string | null;
};

const GROUP_LABEL = {
  tutor: "Tutor",
  tv: "Tele",
} as const;

export function CommandHelp({ items, isLoading, errorMessage }: CommandHelpProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const tutorItems = items.filter((item) => item.group === "tutor");
  const tvItems = items.filter((item) => item.group === "tv");

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Comandos de voz"
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-1/2 top-[calc(100%+0.5rem)] z-20 w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-lg"
        >
          <div className="max-h-80 overflow-y-auto p-3">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Cargando comandos…</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-red-700" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {!isLoading && !errorMessage ? (
              <div className="space-y-4">
                <HelpGroup label={GROUP_LABEL.tutor} items={tutorItems} />
                <HelpGroup label={GROUP_LABEL.tv} items={tvItems} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HelpGroup({
  label,
  items,
}: {
  label: string;
  items: CommandHelpItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <p className="text-sm font-medium text-zinc-800">{item.title}</p>
            <p className="text-xs italic text-zinc-500">“{item.example}”</p>
            <p className="text-xs text-zinc-600">{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
