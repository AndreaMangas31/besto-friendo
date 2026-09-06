"use client";

import { useEffect, useRef, useState } from "react";
import { CancelButton } from "@/features/conversation/components/CancelButton";
import "./idle-footer.css";

type IdleFooterProps = {
  isSending: boolean;
  hint: string | null;
  recorderError: string | null;
  dispatchError: string | null;
  onCancel: () => void;
};

type BubbleTone = "listen" | "hint" | "error";

type BubbleContent = {
  text: string;
  tone: BubbleTone;
};

function resolveBubble(
  isSending: boolean,
  hint: string | null,
  recorderError: string | null,
  dispatchError: string | null,
): BubbleContent | null {
  if (isSending) {
    return { text: "Escuchando el comando…", tone: "listen" };
  }
  if (recorderError) {
    return { text: recorderError, tone: "error" };
  }
  if (dispatchError) {
    return { text: dispatchError, tone: "error" };
  }
  if (hint) {
    return { text: hint, tone: "hint" };
  }
  return null;
}

function sameBubble(a: BubbleContent | null, b: BubbleContent | null) {
  return a?.text === b?.text && a?.tone === b?.tone;
}

function IdleSpeechBubble({ content }: { content: BubbleContent | null }) {
  const [shown, setShown] = useState<BubbleContent | null>(content);
  const [phase, setPhase] = useState<"in" | "out" | "idle">(
    content ? "in" : "idle",
  );
  const shownRef = useRef(content);
  const nextText = content?.text ?? null;
  const nextTone = content?.tone ?? null;

  useEffect(() => {
    const next: BubbleContent | null =
      nextText && nextTone ? { text: nextText, tone: nextTone } : null;

    if (sameBubble(shownRef.current, next)) {
      return;
    }

    if (!shownRef.current) {
      shownRef.current = next;
      setShown(next);
      setPhase("in");
      return;
    }

    setPhase("out");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const swap = window.setTimeout(() => {
      shownRef.current = next;
      setShown(next);
      setPhase(next ? "in" : "idle");
    }, reduceMotion ? 0 : 180);

    return () => window.clearTimeout(swap);
  }, [nextText, nextTone]);

  if (!shown) {
    return null;
  }

  const isError = shown.tone === "error";
  const isListen = shown.tone === "listen";

  return (
    <div className="flex justify-center">
      <div
        className="idle-speech-bubble relative w-fit min-w-0 max-w-full"
        data-phase={phase}
      >
        {/* Cola hacia el orbe: se lee como globo de diálogo. */}
        <span
          aria-hidden
          className={`absolute top-0 left-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1.5 rotate-45 ring-1 ${
            isError
              ? "bg-white ring-rose-200"
              : "bg-white ring-zinc-100"
          }`}
        />
        <p
          className={`relative z-10 wrap-break-word rounded-2xl bg-linear-to-b px-5 py-3 text-center text-2xl leading-snug ring-1 ${
            isError
              ? "from-white to-rose-50 text-red-700 ring-rose-200"
              : isListen
                ? "from-white to-gray-100 text-zinc-500 ring-zinc-100"
                : "from-white to-gray-100 text-zinc-700 ring-zinc-100"
          }`}
          role={isError ? "alert" : undefined}
        >
          {shown.text}
        </p>
        {/* Sombra al suelo, no un halo alrededor del globo. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 -bottom-2 z-0 h-5 rounded-full bg-zinc-950/25 blur-md"
        />
      </div>
    </div>
  );
}

export function IdleFooter({
  isSending,
  hint,
  recorderError,
  dispatchError,
  onCancel,
}: IdleFooterProps) {
  const content = resolveBubble(
    isSending,
    hint,
    recorderError,
    dispatchError,
  );

  return (
    <div className="mt-auto space-y-3 px-4 pb-8 sm:px-6">
      {isSending ? <CancelButton onClick={onCancel} /> : null}
      <IdleSpeechBubble content={content} />
    </div>
  );
}
