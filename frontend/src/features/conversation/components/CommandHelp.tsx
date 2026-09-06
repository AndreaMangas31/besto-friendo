"use client";

import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type {
  CommandHelpGroup,
  CommandHelpItem,
} from "@/features/conversation/types/commands";
import { Drawer } from "@/shared/components/Drawer";

type CommandHelpProps = {
  items: CommandHelpItem[];
  isLoading: boolean;
  errorMessage: string | null;
};

const CAPABILITIES: {
  group: CommandHelpGroup;
  emoji: string;
  label: string;
  hint: string;
  textColor: string;
  well: string;
}[] = [
  {
    group: "tutor",
    emoji: "🇯🇵",
    label: "Practicar japonés",
    hint: "Tutor, modos y frases",
    textColor: "text-pink-600",
    well: "bg-pink-100",
  },
  {
    group: "tv",
    emoji: "📺",
    label: "Controlar la tele",
    hint: "Volumen, apps, HDMI",
    textColor: "text-amber-600",
    well: "bg-amber-100",
  },
  {
    group: "ps5",
    emoji: "🎮",
    label: "Controlar la Play",
    hint: "Encender o reposo",
    textColor: "text-sky-600",
    well: "bg-sky-100",
  },
  {
    group: "heating",
    emoji: "🏠",
    label: "Casa",
    hint: "Calefacción MIGo",
    textColor: "text-orange-600",
    well: "bg-orange-100",
  },
];

export function CommandHelp({
  items,
  isLoading,
  errorMessage,
}: CommandHelpProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<CommandHelpGroup | null>(null);
  const panelId = useId();

  // Al cerrar el drawer, la próxima apertura arranca con todo plegado.
  useEffect(() => {
    if (!open) {
      setExpanded(null);
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-950/10 transition hover:bg-zinc-800"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Qué puedo hacer"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="h-4 w-4" aria-hidden />
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="¿Qué puedo hacer?"
      >
        <div id={panelId}>
          <p className="mb-4 px-1 text-sm text-zinc-500">
            Elige una y verás cómo pedírmelo en voz alta.
          </p>
          {isLoading ? (
            <p className="text-sm text-zinc-500">Cargando comandos…</p>
          ) : null}
          {errorMessage ? (
            <p className="wrap-break-word text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {!isLoading && !errorMessage ? (
            <ul className="flex flex-col gap-2">
              {CAPABILITIES.map((capability) => {
                const groupItems = items.filter(
                  (item) => item.group === capability.group,
                );
                const isExpanded = expanded === capability.group;
                const regionId = `${panelId}-${capability.group}`;
                return (
                  <li key={capability.group}>
                    <div
                      className={`overflow-hidden rounded-2xl bg-white/70 ring-1 ring-zinc-950/6 transition ${
                        isExpanded ? "shadow-sm ring-zinc-950/10" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left"
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
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${capability.well}`}
                          aria-hidden
                        >
                          {capability.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-zinc-900">
                            {capability.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {capability.hint}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                      {isExpanded ? (
                        <div
                          id={regionId}
                          className="border-t border-zinc-950/5 px-3 pb-3 pt-2"
                        >
                          <HelpPhrases
                            items={groupItems}
                            textColor={capability.textColor}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </Drawer>
    </>
  );
}

function HelpPhrases({
  items,
  textColor,
}: {
  items: CommandHelpItem[];
  textColor: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-zinc-500">
        Aún no hay frases para esto.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2.5">
          <p className="wrap-break-word text-sm font-medium text-zinc-800">
            {item.title}
          </p>
          <div
            className={`flex flex-row whitespace-nowrap  text-xs font-medium ${textColor}`}
          >
            "<p className="first-letter:uppercase">{item.example}</p>"
          </div>
          <p className="mt-0.5 wrap-break-word text-xs text-zinc-500">
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
