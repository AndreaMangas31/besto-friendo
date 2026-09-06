"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BestoFriendoSuccessAnimation } from "@/features/conversation/components/BestoFriendoSuccessAnimation";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { IdleFooter } from "@/features/conversation/components/IdleFooter";
import { ShellParticles } from "@/features/conversation/components/ShellParticles";
import { TutorStage } from "@/features/conversation/components/TutorStage";
import { applyDispatchResult } from "@/features/conversation/hooks/applyDispatchResult";
import { useAudioRecorder } from "@/features/conversation/hooks/useAudioRecorder";
import { useDispatchCommand } from "@/features/conversation/hooks/useDispatchCommand";
import { useOrbPress } from "@/features/conversation/hooks/useOrbPress";
import { useSpeechPlayback } from "@/features/conversation/hooks/useSpeechPlayback";
import type {
  HeatingMood,
  OrbPersona,
} from "@/features/conversation/types/orb";
import {
  GREETING,
  orbPreviewFromParam,
} from "@/features/conversation/types/preview";
import type {
  ChatMessage,
  PracticeMode,
} from "@/features/conversation/types/turn";
import "./conversation-shell.css";

export function ConversationView() {
  const searchParams = useSearchParams();
  const orbPreview = orbPreviewFromParam(searchParams.get("orb"));
  const recorder = useAudioRecorder();
  const dispatcher = useDispatchCommand();
  const { speakJapanese, bark, cancel: cancelSpeech } = useSpeechPlayback();
  const [japaneseEnabled, setJapaneseEnabled] = useState(
    orbPreview.japaneseEnabled,
  );
  const [orbPersona, setOrbPersona] = useState<OrbPersona>(orbPreview.persona);
  const [mode, setMode] = useState<PracticeMode>("conversar");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [successPlayKey, setSuccessPlayKey] = useState<number | null>(null);
  const [confused, setConfused] = useState(false);
  const [lunaOn, setLunaOn] = useState(searchParams.get("luna") === "1");
  const [lunaPlayKey, setLunaPlayKey] = useState(0);
  const [heatingMood, setHeatingMood] = useState<HeatingMood>(orbPreview.mood);

  const isRecording = recorder.status === "recording";
  const isSending = dispatcher.status === "sending";

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
    // ?burst=1 / ?luna=1: preview visual sin pasar por el micro ni la tele.
    if (params.get("burst") === "1") {
      setSuccessPlayKey(1);
    }
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

      const result = await dispatcher.send(
        file,
        messages,
        japaneseEnabled,
        mode,
      );
      // null = cancel, timeout 20s o error de red; el dispatcher ya pintó el mensaje.
      if (!result) {
        return;
      }

      applyDispatchResult(result, {
        openJapaneseChat,
        applyPersona,
        playLuna,
        setHint,
        setConfused,
        setMode,
        setMessages,
        setHeatingMood,
        setLunaOn,
        celebrateDeviceSuccess,
        speakJapanese,
      });
      return;
    }

    cancelSpeech();
    setConfused(false);
    await recorder.start();
  }

  const talk = () => {
    void handleTalkClick();
  };

  const orbPress = useOrbPress({
    isRecording,
    isSending,
    startRecording: () => {
      void recorder.start();
    },
    commitRecording: talk,
    cancelSpeech,
    onClearHint: () => setHint(null),
    onClearConfused: () => setConfused(false),
  });

  // listening > thinking > oops > confused: si no, OOPS pisa ESCUCHANDO al pulsar.
  const orbActivity = isRecording
    ? "listening"
    : isSending
      ? "thinking"
      : orbPress.oopsing
        ? "oops"
        : confused
          ? "confused"
          : "idle";

  // Cancelar aborta el fetch; el corte a 20s vive en useDispatchCommand, no aquí.
  function handleCancelTurn() {
    dispatcher.cancel();
    setHint("Cortaste el turno.");
  }

  return (
    <div
      className="conversation-shell flex min-h-dvh min-w-0 max-w-full flex-1 flex-col overflow-x-hidden text-zinc-900"
      data-persona={orbPersona}
      data-mood={heatingMood}
      data-luna={lunaOn ? "on" : "off"}
    >
      <ShellParticles />
      <div
        className={`relative z-10 mx-auto flex h-full min-w-0 w-full max-w-full flex-1 flex-col ${
          japaneseEnabled ? "max-w-6xl md:flex-row" : "max-w-xl"
        }`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-col ${
            japaneseEnabled ? "md:w-[42%]" : "flex-1"
          }`}
        >
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
            // En japonés el CTA es Hablar del chat: el orbe compacto no graba.
            onOrbPress={!japaneseEnabled ? orbPress.onPress : undefined}
            orbPressDisabled={isSending}
            poked={orbPress.poked}
            pokeMark={orbPress.pokeMark}
          />

          {!japaneseEnabled ? (
            <IdleFooter
              isSending={isSending}
              hint={hint}
              recorderError={recorder.errorMessage}
              dispatchError={dispatcher.errorMessage}
              onCancel={handleCancelTurn}
            />
          ) : null}
        </div>

        {japaneseEnabled ? (
          <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">
            <ChatPanel
              messages={messages}
              isRecording={isRecording}
              isSending={isSending}
              recorderError={recorder.errorMessage}
              dispatchError={dispatcher.errorMessage}
              notice={hint}
              onTalk={talk}
              onCancel={handleCancelTurn}
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
