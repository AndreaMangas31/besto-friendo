"use client";

import { useState } from "react";
import { MessageList } from "@/features/conversation/components/MessageList";
import { TalkButton } from "@/features/conversation/components/TalkButton";
import { useAudioRecorder } from "@/features/conversation/hooks/useAudioRecorder";
import { useSendTurn } from "@/features/conversation/hooks/useSendTurn";
import { useSpeechPlayback } from "@/features/conversation/hooks/useSpeechPlayback";
import type { ChatMessage } from "@/features/conversation/types/turn";

export function ConversationView() {
  const recorder = useAudioRecorder();
  const sender = useSendTurn();
  const speech = useSpeechPlayback();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const isRecording = recorder.status === "recording";
  const isSending = sender.status === "sending";

  async function handleTalkClick() {
    if (isSending) {
      return;
    }

    if (isRecording) {
      const file = await recorder.stop();
      if (file) {
        const turn = await sender.send(file, messages);
        if (turn) {
          const historyText = [turn.explanation, turn.assistant_text]
            .filter(Boolean)
            .join("\n");
          setMessages((current) => [
            ...current,
            { role: "user", text: turn.user_text },
            {
              role: "assistant",
              text: historyText,
              explanation: turn.explanation,
              segments: turn.segments,
            },
          ]);
          // TTS solo japonés (speak), nunca el romaji ni la explicación.
          if (turn.assistant_text) {
            speech.speakJapanese(turn.assistant_text);
          }
        }
      }
      return;
    }

    speech.cancel();
    await recorder.start();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-10">
      <main className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Fase 3
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Besto Friendo
          </h1>
          <p className="text-zinc-600">
            Habla en japonés, castellano o inglés. El japonés se muestra con
            romaji encima; la voz lee solo el japonés.
          </p>
        </div>

        <MessageList messages={messages} />

        <TalkButton
          isRecording={isRecording}
          disabled={isSending}
          onClick={() => {
            void handleTalkClick();
          }}
        />

        {isSending ? (
          <p className="text-zinc-500">Transcribiendo y pensando…</p>
        ) : null}

        {recorder.errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
            role="alert"
          >
            <p className="font-medium">No se pudo grabar</p>
            <p className="mt-1 text-sm">{recorder.errorMessage}</p>
          </div>
        ) : null}

        {sender.errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
            role="alert"
          >
            <p className="font-medium">No se pudo completar el turno</p>
            <p className="mt-1 text-sm">{sender.errorMessage}</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
