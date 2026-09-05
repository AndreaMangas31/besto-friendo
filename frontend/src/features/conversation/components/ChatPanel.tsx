import { MessageList } from "@/features/conversation/components/MessageList";
import { TalkButton } from "@/features/conversation/components/TalkButton";
import type { ChatMessage } from "@/features/conversation/types/turn";

type ChatPanelProps = {
  messages: ChatMessage[];
  isRecording: boolean;
  isSending: boolean;
  recorderError: string | null;
  dispatchError: string | null;
  notice?: string | null;
  onTalk: () => void;
  onReplay: (speak: string) => void;
};

export function ChatPanel({
  messages,
  isRecording,
  isSending,
  recorderError,
  dispatchError,
  notice,
  onTalk,
  onReplay,
}: ChatPanelProps) {
  return (
    <section className="flex min-h-[28rem] flex-1 flex-col rounded-3xl bg-[#f4f1ec] p-4 md:min-h-0">
      <MessageList messages={messages} onReplay={onReplay} />

      <div className="mt-4 space-y-3">
        <TalkButton
          isRecording={isRecording}
          disabled={isSending}
          onClick={onTalk}
        />

        {isSending ? (
          <p className="text-center text-sm text-zinc-500">
            Transcribiendo y pensando…
          </p>
        ) : null}

        {notice ? (
          <p className="text-center text-sm text-zinc-600">{notice}</p>
        ) : null}

        {recorderError ? (
          <p className="text-sm text-red-700" role="alert">
            {recorderError}
          </p>
        ) : null}

        {dispatchError ? (
          <p className="text-sm text-red-700" role="alert">
            {dispatchError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
