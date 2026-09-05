import { JapaneseWithRomaji } from "@/features/conversation/components/JapaneseWithRomaji";
import type { ChatMessage, ContentBlock } from "@/features/conversation/types/turn";

type MessageListProps = {
  messages: ChatMessage[];
};

function AssistantBlocks({ blocks, speak }: { blocks: ContentBlock[]; speak?: string }) {
  if (blocks.length === 0) {
    return speak ? (
      <p className="mt-1 text-lg leading-tight">{speak}</p>
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
            <AssistantBlocks blocks={message.blocks ?? []} speak={message.speak} />
          ) : (
            <p className="mt-1 whitespace-pre-wrap">{message.text}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
