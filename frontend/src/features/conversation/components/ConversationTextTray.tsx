"use client";

import { useEffect, useRef } from "react";
import { MessageList } from "@/features/conversation/components/MessageList";
import type { ChatMessage } from "@/features/conversation/types/turn";

type ConversationTextTrayProps = {
  open: boolean;
  messages: ChatMessage[];
  onToggle: () => void;
  onReplay: (message: ChatMessage) => void;
};

export function ConversationTextTray({
  open,
  messages,
  onToggle,
  onReplay,
}: ConversationTextTrayProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length]);

  return (
    <div className="space-y-2 px-4 pb-6 sm:px-6">
      <button
        type="button"
        className="mx-auto block text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
        onClick={onToggle}
      >
        {open ? "Ocultar texto" : "Ver conversación"}
      </button>
      {open ? (
        <div className="conversation-text-tray max-h-36 overflow-y-auto rounded-2xl bg-white/70 px-2 py-1 ring-1 ring-zinc-200">
          <MessageList messages={messages} onReplay={onReplay} compact />
          <div ref={endRef} />
        </div>
      ) : null}
    </div>
  );
}
