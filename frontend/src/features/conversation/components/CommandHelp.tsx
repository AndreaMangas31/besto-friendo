"use client";

import { Menu as MenuIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type {
  CommandHelpGroup,
  CommandHelpItem,
} from "@/features/conversation/types/commands";

type CommandHelpProps = {
  items: CommandHelpItem[];
  isLoading: boolean;
  errorMessage: string | null;
};

const CAPABILITIES: {
  group: CommandHelpGroup;
  emoji: string;
  label: string;
}[] = [
  { group: "tutor", emoji: "🇯🇵", label: "Practicar japonés" },
  { group: "tv", emoji: "📺", label: "Controlar la tele" },
  { group: "ps5", emoji: "🎮", label: "Controlar la Play" },
  { group: "heating", emoji: "🏠", label: "Casa" },
];

export function CommandHelp({
  items,
  isLoading,
  errorMessage,
}: CommandHelpProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<CommandHelpGroup | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

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

  // Al cerrar el panel, la próxima apertura arranca con todo plegado.
  useEffect(() => {
    if (!open) {
      setExpanded(null);
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="flex h-7 w-7 bg-gray-900 items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-white hover:bg-gray-700 cursor-pointer"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Qué puedo hacer"
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
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
              <div>
                <h2 className="mb-2 text-sm font-semibold text-zinc-900">
                  ¿Qué puedo hacer?
                </h2>
                <ul className="divide-y divide-zinc-100">
                  {CAPABILITIES.map((capability) => {
                    const groupItems = items.filter(
                      (item) => item.group === capability.group,
                    );
                    const isExpanded = expanded === capability.group;
                    const regionId = `${panelId}-${capability.group}`;
                    return (
                      <li key={capability.group}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 py-2 text-left text-sm text-zinc-800 hover:text-zinc-950"
                          aria-expanded={isExpanded}
                          aria-controls={regionId}
                          onClick={() =>
                            setExpanded((current) =>
                              current === capability.group
                                ? null
                                : capability.group,
                            )
                          }
                        >
                          <span aria-hidden="true">{capability.emoji}</span>
                          <span>{capability.label}</span>
                        </button>
                        {isExpanded ? (
                          <div id={regionId} className="pb-3 pl-7">
                            <HelpPhrases items={groupItems} />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HelpPhrases({ items }: { items: CommandHelpItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-zinc-500">Aún no hay frases para esto.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <p className="text-sm font-medium text-zinc-800">{item.title}</p>
          <p className="text-xs italic text-zinc-500">“{item.example}”</p>
          <p className="text-xs text-zinc-600">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
