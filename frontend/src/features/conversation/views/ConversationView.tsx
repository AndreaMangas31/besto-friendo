"use client";

import { useCallback, useEffect, useState } from "react";
import { BestoFriendoSuccessAnimation } from "@/features/conversation/components/BestoFriendoSuccessAnimation";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { TalkButton } from "@/features/conversation/components/TalkButton";
import { TutorStage } from "@/features/conversation/components/TutorStage";
import { useAudioRecorder } from "@/features/conversation/hooks/useAudioRecorder";
import { useDispatchCommand } from "@/features/conversation/hooks/useDispatchCommand";
import { useSpeechPlayback } from "@/features/conversation/hooks/useSpeechPlayback";
import { HEATING_COMMANDS, PS5_COMMANDS, TV_COMMANDS } from "@/features/conversation/types/commands";
import {
  nextHeatingMood,
  nextOrbPersona,
  type HeatingMood,
  type OrbPersona,
} from "@/features/conversation/types/orb";
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
  const { speakJapanese, bark, cancel: cancelSpeech } = useSpeechPlayback();
  const [japaneseEnabled, setJapaneseEnabled] = useState(false);
  const [orbPersona, setOrbPersona] = useState<OrbPersona>("idle");
  const [mode, setMode] = useState<PracticeMode>("conversar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [successPlayKey, setSuccessPlayKey] = useState<number | null>(null);
  const [confused, setConfused] = useState(false);
  const [lunaOn, setLunaOn] = useState(false);
  const [lunaPlayKey, setLunaPlayKey] = useState(0);
  const [heatingMood, setHeatingMood] = useState<HeatingMood>("cold");

  const clearSuccessAnimation = useCallback(() => {
    setSuccessPlayKey(null);
  }, []);

  const playLuna = useCallback(() => {
    setConfused(false);
    setLunaPlayKey((current) => current + 1);
    setLunaOn(true);
    bark();
    setHint("Luna te ha oído. Guau.");
  }, [bark]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // ?burst=1 enseña el overlay sin mandar un comando a la tele/PS5.
    if (params.get("burst") === "1") {
      setSuccessPlayKey(1);
    }
    // ?orb=tv|play|japanese|heating|heating-warm para ver el personaje sin el dispositivo.
    const preview = params.get("orb");
    if (preview === "japanese" || preview === "tv" || preview === "play" || preview === "heating") {
      setOrbPersona(preview);
    }
    if (preview === "heating-warm") {
      setOrbPersona("heating");
      setHeatingMood("warm");
    }
    // ?luna=1 enseña orejas + guau sin pasar por el micro.
    if (params.get("luna") === "1") {
      playLuna();
    }
  }, [playLuna]);

  function celebrateDeviceSuccess(ok: boolean | null) {
    if (!ok) {
      return;
    }
    setSuccessPlayKey((current) => (current ?? 0) + 1);
  }

  const isRecording = recorder.status === "recording";
  const isSending = dispatcher.status === "sending";
  const orbActivity = isRecording
    ? "listening"
    : isSending
      ? "thinking"
      : confused
        ? "confused"
        : "idle";

  function openJapaneseChat() {
    setConfused(false);
    setJapaneseEnabled(true);
    setOrbPersona("japanese");
    setHint(null);
    setMessages((current) => (current.length === 0 ? [GREETING] : current));
  }

  // Cierra el tutor sin tocar el orbe ni el hint (tele/Play acaban de escribirlo).
  function closeJapaneseChat() {
    cancelSpeech();
    setJapaneseEnabled(false);
    setMessages([]);
    setMode("conversar");
  }

  function applyPersona(persona: OrbPersona) {
    if (persona !== "japanese" && japaneseEnabled) {
      closeJapaneseChat();
    }
    setOrbPersona(persona);
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

      // Luna se queda champagne hasta el siguiente comando (no un timeout).
      if (result.command !== "call_luna") {
        setLunaOn(false);
      }

      if (result.command === "enable_japanese_mode") {
        openJapaneseChat();
        return;
      }

      if (result.command === "disable_japanese_mode") {
        setConfused(false);
        applyPersona("idle");
        setHint(null);
        return;
      }

      if (result.command === "set_practice_mode" && result.practice_mode) {
        setConfused(false);
        setMode(result.practice_mode);
        setMessages((current) => [...current, modeNotice(result.practice_mode!)]);
        return;
      }

      if (result.command === "call_luna") {
        playLuna();
        if (result.device_message) {
          setHint(result.device_message);
        }
        return;
      }

      if (PS5_COMMANDS.has(result.command)) {
        setConfused(false);
        const heard = result.transcript ? ` Te oí: “${result.transcript}”.` : "";
        const fallback =
          result.command === "ps5_power_on"
            ? "Mandé despertar la PlayStation."
            : "La mandé a reposo.";
        setHint(`${result.device_message ?? fallback}${heard}`);
        celebrateDeviceSuccess(result.ok);
        const persona = nextOrbPersona(result.command);
        if (result.ok && persona) {
          applyPersona(persona);
        }
        return;
      }

      if (TV_COMMANDS.has(result.command)) {
        setConfused(false);
        const heard = result.transcript ? ` Te oí: “${result.transcript}”.` : "";
        setHint(
          `${result.device_message ?? "Mandé el comando a la tele."}${heard}`,
        );
        celebrateDeviceSuccess(result.ok);
        const persona = nextOrbPersona(result.command);
        if (result.ok && persona) {
          applyPersona(persona);
        }
        return;
      }

      if (HEATING_COMMANDS.has(result.command)) {
        setConfused(false);
        const heard = result.transcript ? ` Te oí: “${result.transcript}”.` : "";
        setHint(
          `${result.device_message ?? "Mandé el comando a la calefacción."}${heard}`,
        );
        celebrateDeviceSuccess(result.ok);
        const persona = nextOrbPersona(result.command);
        if (result.ok && persona) {
          applyPersona(persona);
        }
        // Mood aparte de la persona: encender/bajar tiembla; subir/poner grados humito.
        const mood = nextHeatingMood(result.command);
        if (result.ok && mood) {
          setHeatingMood(mood);
        }
        return;
      }

      if (result.command === "japanese_turn" && result.turn) {
        setConfused(false);
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
          speakJapanese(turn.speak);
        }
        return;
      }

      setConfused(true);
      setHint(
        result.transcript
          ? `No encajó como comando de activar. Te oí algo como: “${result.transcript}”.`
          : "No encajó como comando. Di enable japanese mode, más o menos.",
      );
      return;
    }

    cancelSpeech();
    setConfused(false);
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
            persona={orbPersona}
            activity={orbActivity}
            japaneseEnabled={japaneseEnabled}
            mode={mode}
            onModeChange={setMode}
            hideOrb={successPlayKey !== null}
            luna={lunaOn}
            lunaPlayKey={lunaPlayKey}
            heatingMood={heatingMood}
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
              onReplay={speakJapanese}
            />
          </div>
        ) : null}
      </div>

      {successPlayKey !== null ? (
        <BestoFriendoSuccessAnimation
          key={successPlayKey}
          playKey={successPlayKey}
          onFinished={clearSuccessAnimation}
        />
      ) : null}
    </div>
  );
}
