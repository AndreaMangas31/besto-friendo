"use client";

import { useState } from "react";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { TalkButton } from "@/features/conversation/components/TalkButton";
import { TutorStage } from "@/features/conversation/components/TutorStage";
import { useAudioRecorder } from "@/features/conversation/hooks/useAudioRecorder";
import { useDispatchCommand } from "@/features/conversation/hooks/useDispatchCommand";
import { useSpeechPlayback } from "@/features/conversation/hooks/useSpeechPlayback";
import { TV_COMMANDS } from "@/features/conversation/types/commands";
import type { ChatMessage, PracticeMode } from "@/features/conversation/types/turn";

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hola. Soy tu tutor de japonés. Dime algo y practicamos.",
  blocks: [
    {
      type: "text",
      text: "Hola. Soy tu tutor de japonés. Dime algo y practicamos.",
    },
  ],
};

const MODE_LABEL: Record<PracticeMode, string> = {
  conversar: "Conversar",
  corregir: "Corregir",
  ideas: "Darme ideas",
};

function modeNotice(mode: PracticeMode): ChatMessage {
  return {
    role: "assistant",
    text: `Vale, pasamos a ${MODE_LABEL[mode]}.`,
    blocks: [{ type: "text", text: `Vale, pasamos a ${MODE_LABEL[mode]}.` }],
  };
}

export function ConversationView() {
  const recorder = useAudioRecorder();
  const dispatcher = useDispatchCommand();
  const speech = useSpeechPlayback();
  const [japaneseEnabled, setJapaneseEnabled] = useState(false);
  const [mode, setMode] = useState<PracticeMode>("conversar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  const isRecording = recorder.status === "recording";
  const isSending = dispatcher.status === "sending";

  function openJapaneseChat() {
    setJapaneseEnabled(true);
    setHint(null);
    setMessages((current) => (current.length === 0 ? [GREETING] : current));
  }

  function closeJapaneseChat() {
    speech.cancel();
    setJapaneseEnabled(false);
    setMessages([]);
    setMode("conversar");
    setHint(null);
  }

  async function handleTalkClick() {
    if (isSending) {
      return;
    }

    if (isRecording) {
      const file = await recorder.stop();
      if (!file) {
        return;
      }

      const result = await dispatcher.send(file, messages, japaneseEnabled, mode);
      if (!result) {
        return;
      }

      if (result.command === "enable_japanese_mode") {
        openJapaneseChat();
        return;
      }

      if (result.command === "disable_japanese_mode") {
        closeJapaneseChat();
        return;
      }

      if (result.command === "set_practice_mode" && result.practice_mode) {
        setMode(result.practice_mode);
        setMessages((current) => [...current, modeNotice(result.practice_mode!)]);
        return;
      }

      if (TV_COMMANDS.has(result.command)) {
        const heard = result.transcript ? ` Te oí: “${result.transcript}”.` : "";
        setHint(
          `${result.device_message ?? "Mandé el comando a la tele."}${heard}`,
        );
        return;
      }

      if (result.command === "japanese_turn" && result.turn) {
        const turn = result.turn;
        setMessages((current) => [
          ...current,
          { role: "user", text: turn.user_text },
          {
            role: "assistant",
            text: turn.assistant_text,
            speak: turn.speak || turn.assistant_text,
            blocks: turn.blocks,
          },
        ]);
        if (turn.speak) {
          speech.speakJapanese(turn.speak);
        }
        return;
      }

      setHint(
        result.transcript
          ? `No encajó como comando de activar. Te oí algo como: “${result.transcript}”.`
          : "No encajó como comando. Di enable japanese mode, más o menos.",
      );
      return;
    }

    speech.cancel();
    await recorder.start();
  }

  const talk = () => {
    void handleTalkClick();
  };

  return (
    <div className="flex flex-1 flex-col bg-[#fbf7f2] text-zinc-900">
      <div
        className={`mx-auto flex w-full flex-1 flex-col ${
          japaneseEnabled ? "max-w-6xl md:flex-row" : "max-w-xl"
        }`}
      >
        <div className={japaneseEnabled ? "md:w-[42%]" : "flex-1"}>
          <TutorStage
            japaneseEnabled={japaneseEnabled}
            mode={mode}
            onModeChange={setMode}
          />

          {!japaneseEnabled ? (
            <div className="space-y-3 px-6 pb-10">
              <TalkButton
                isRecording={isRecording}
                disabled={isSending}
                onClick={talk}
              />
              {isSending ? (
                <p className="text-center text-sm text-zinc-500">Escuchando el comando…</p>
              ) : null}
              {hint ? <p className="text-center text-sm text-zinc-600">{hint}</p> : null}
              {recorder.errorMessage ? (
                <p className="text-center text-sm text-red-700" role="alert">
                  {recorder.errorMessage}
                </p>
              ) : null}
              {dispatcher.errorMessage ? (
                <p className="text-center text-sm text-red-700" role="alert">
                  {dispatcher.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {japaneseEnabled ? (
          <div className="flex flex-1 flex-col p-4 md:p-6">
            <ChatPanel
              messages={messages}
              isRecording={isRecording}
              isSending={isSending}
              recorderError={recorder.errorMessage}
              dispatchError={dispatcher.errorMessage}
              notice={hint}
              onTalk={talk}
              onReplay={speech.speakJapanese}
            />
            <p className="mt-2 px-1 text-xs text-zinc-400">
              También: disable japanese mode, modo corregir, o controla la tele
              (volumen, pausa, YouTube). Para buscar en YouTube: ok tele y el texto.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
