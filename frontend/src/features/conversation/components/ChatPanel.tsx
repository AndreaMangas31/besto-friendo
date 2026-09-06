import { CancelButton } from "@/features/conversation/components/CancelButton";
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
  onCancel: () => void;
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
  onCancel,
  onReplay,
}: ChatPanelProps) {
  return (
    <section className="conversation-shell-panel flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-x-hidden rounded-3xl p-4 md:min-h-0">
      <MessageList messages={messages} onReplay={onReplay} />

      <div className="mt-4 space-y-3">
        {isSending ? (
          <CancelButton onClick={onCancel} />
        ) : (
          <TalkButton
            isRecording={isRecording}
            disabled={isSending}
            onClick={onTalk}
          />
        )}

        {isSending ? (
          <p className="text-center text-sm text-zinc-500">
            Transcribiendo y pensando…
          </p>
        ) : null}

        {notice ? (
          <p className="wrap-break-word text-center text-sm text-zinc-600">{notice}</p>
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
