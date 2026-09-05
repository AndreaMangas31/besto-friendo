import { JapaneseWithRomaji } from "@/features/conversation/components/JapaneseWithRomaji";
import type { ChatMessage } from "@/features/conversation/types/turn";

type MessageListProps = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Pulsa Hablar para empezar. La conversación de esta pestaña no se guarda.
      </p>
    );
  }

  return (
    <ul className="max-h-80 space-y-3 overflow-y-auto">
      {messages.map((message, index) => (
        <li
          key={`${message.role}-${index}`}
          className={`rounded-lg px-3 py-2 text-sm ${
            message.role === "user"
              ? "bg-zinc-100 text-zinc-900"
              : "bg-emerald-50 text-emerald-950"
          }`}
        >
          <p className="text-xs font-medium tracking-wide uppercase text-zinc-500">
            {message.role === "user" ? "Tú" : "Tutor"}
          </p>
          {message.role === "assistant" ? (
            <>
              {message.explanation ? (
                <p className="mt-1 whitespace-pre-wrap">{message.explanation}</p>
              ) : null}
              {message.segments && message.segments.length > 0 ? (
                <JapaneseWithRomaji segments={message.segments} />
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
              )}
            </>
          ) : (
            <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
