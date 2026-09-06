import { JapaneseWithRomaji } from "@/features/conversation/components/JapaneseWithRomaji";
import type { ChatMessage, ContentBlock } from "@/features/conversation/types/turn";

type MessageListProps = {
  messages: ChatMessage[];
  onReplay?: (message: ChatMessage) => void;
  compact?: boolean;
};

function AssistantBlocks({
  blocks,
  speak,
  compact,
}: {
  blocks: ContentBlock[];
  speak?: string;
  compact?: boolean;
}) {
  if (blocks.length === 0) {
    return speak ? (
      <p className={`mt-1 leading-tight ${compact ? "" : "text-lg"}`}>{speak}</p>
    ) : null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-end gap-x-1 gap-y-2 text-sm leading-relaxed">
      {blocks.map((block, index) =>
        block.type === "jp" && block.segments?.length ? (
          <JapaneseWithRomaji key={`jp-${index}`} segments={block.segments} />
        ) : block.type === "text" && block.text ? (
          <span key={`text-${index}`} className="whitespace-pre-wrap">
            {block.text}
          </span>
        ) : null,
      )}
    </div>
  );
}

export function MessageList({ messages, onReplay, compact = false }: MessageListProps) {
  return (
    <ul
      className={`flex min-h-0 flex-col px-1 py-2 ${
        compact ? "gap-2" : "flex-1 gap-3 overflow-y-auto"
      }`}
    >
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const canReplay =
          !isUser &&
          Boolean(message.speak?.trim() || message.audioSrc);

        return (
          <li
            key={`${message.role}-${index}`}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                compact ? "text-xs leading-snug" : "text-sm"
              } ${
                isUser
                  ? "rounded-br-md bg-zinc-900 text-white"
                  : "rounded-bl-md bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-100"
              }`}
            >
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.text}</p>
              ) : (
                <>
                  <AssistantBlocks
                    blocks={message.blocks ?? []}
                    speak={message.speak || message.text}
                    compact={compact}
                  />
                  {canReplay && onReplay ? (
                    <button
                      type="button"
                      className="mt-2 text-zinc-400 hover:text-zinc-700"
                      aria-label="Repetir audio"
                      onClick={() => onReplay(message)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      </svg>
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
