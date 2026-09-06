"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const EXIT_MS = 280;

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const titleId = useId();
  const [inDocument, setInDocument] = useState(false);
  // Montado durante la salida; `entered` aplica el translate un frame después.
  const [shown, setShown] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setInDocument(true);
  }, []);

  useEffect(() => {
    if (open) {
      setShown(true);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const frame = window.requestAnimationFrame(() => setEntered(true));
      return () => {
        window.cancelAnimationFrame(frame);
        document.body.style.overflow = previousOverflow;
      };
    }

    setEntered(false);
    const timeoutId = window.setTimeout(() => setShown(false), EXIT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!inDocument || !shown) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-[6px] transition-opacity duration-300 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute flex max-h-[85dvh] w-full max-w-full flex-col overflow-hidden bg-white/85 shadow-[0_-12px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-[1.75rem] max-md:pb-[env(safe-area-inset-bottom)] md:inset-y-3 md:right-3 md:max-h-none md:max-w-sm md:rounded-[1.75rem] md:shadow-[0_24px_80px_rgba(15,23,42,0.22)] ${
          entered
            ? "max-md:translate-y-0 md:translate-x-0"
            : "max-md:translate-y-full md:translate-x-[calc(100%+0.75rem)]"
        }`}
      >
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-zinc-300/90" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-2 md:pt-5">
          <h2
            id={titleId}
            className="min-w-0 truncate text-lg font-semibold tracking-tight text-zinc-900"
          >
            {title}
          </h2>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900/5 text-zinc-500 ring-1 ring-zinc-900/8 transition hover:bg-zinc-900/10 hover:text-zinc-800"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
