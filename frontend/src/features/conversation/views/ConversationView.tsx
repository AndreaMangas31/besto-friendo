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
import { CHAT_GREETING, GREETING, orbPreviewFromParam } from "@/features/conversation/types/preview";
import { CONVERSATION_HELLO_SRC, pickConversationFiller } from "@/features/conversation/types/fillers";
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
  const {
    speakJapanese,
    playModelAudio,
    playAudioSrc,
    bark,
    cancel: cancelSpeech,
    isSpeaking,
  } = useSpeechPlayback();
  const [japaneseEnabled, setJapaneseEnabled] = useState(
    orbPreview.japaneseEnabled,
  );
  const [conversationEnabled, setConversationEnabled] = useState(
    orbPreview.conversationEnabled,
  );
  const [orbPersona, setOrbPersona] = useState<OrbPersona>(orbPreview.persona);
  const [mode, setMode] = useState<PracticeMode>("conversar");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (orbPreview.japaneseEnabled) {
      return [GREETING];
    }
    if (orbPreview.conversationEnabled) {
      return [CHAT_GREETING];
    }
    return [];
  });
  const [hint, setHint] = useState<string | null>(null);
  const [successPlayKey, setSuccessPlayKey] = useState<number | null>(null);
  const [confused, setConfused] = useState(false);
  const [lunaOn, setLunaOn] = useState(searchParams.get("luna") === "1");
  const [lunaPlayKey, setLunaPlayKey] = useState(0);
  const [heatingMood, setHeatingMood] = useState<HeatingMood>(orbPreview.mood);

  const isRecording = recorder.status === "recording";
  const isSending = dispatcher.status === "sending";

  // Espera ~400 ms: un “hola” rápido no suena el filler. Al terminar, no cancelar aquí
  // (pisaría el mp3 de la respuesta); playModelAudio ya corta el filler.
  useEffect(() => {
    if (!conversationEnabled || !isSending) {
      return;
    }
    const timer = window.setTimeout(() => {
      playAudioSrc(pickConversationFiller());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [conversationEnabled, isSending, playAudioSrc]);

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
    const fromChat = conversationEnabled;
    setConversationEnabled(false);
    setJapaneseEnabled(true);
    setOrbPersona("japanese");
    setHint(null);
    setMessages((current) =>
      fromChat || current.length === 0 ? [GREETING] : current,
    );
  }

  function openConversationChat() {
    cancelSpeech();
    setConfused(false);
    const fromJp = japaneseEnabled;
    setJapaneseEnabled(false);
    setConversationEnabled(true);
    setOrbPersona("chat");
    setHint(null);
    setMessages((current) =>
      fromJp || current.length === 0 ? [CHAT_GREETING] : current,
    );
    playAudioSrc(CONVERSATION_HELLO_SRC);
  }

  // Cierra el tutor sin tocar el orbe ni el hint (tele/Play acaban de escribirlo).
  function closeJapaneseChat() {
    cancelSpeech();
    setJapaneseEnabled(false);
    setMessages([]);
    setMode("conversar");
  }

  function closeConversationChat() {
    cancelSpeech();
    setConversationEnabled(false);
    setMessages([]);
  }

  function applyPersona(persona: OrbPersona) {
    if (persona !== "japanese" && japaneseEnabled) {
      closeJapaneseChat();
    }
    if (persona !== "chat" && conversationEnabled) {
      closeConversationChat();
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
        conversationEnabled,
      );
      // null = cancel, timeout 20s o error de red; el dispatcher ya pintó el mensaje.
      if (!result) {
        cancelSpeech();
        return;
      }

      applyDispatchResult(result, {
        openJapaneseChat,
        openConversationChat,
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
        playModelAudio,
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
          : conversationEnabled && isSpeaking
            ? "speaking"
            : "idle";

  const chatOpen = japaneseEnabled || conversationEnabled;
  function handleCancelTurn() {
    dispatcher.cancel();
    cancelSpeech();
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
          chatOpen ? "max-w-6xl md:flex-row" : "max-w-xl"
        }`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-col ${
            chatOpen ? "md:w-[42%]" : "flex-1"
          }`}
        >
          <TutorStage
            persona={orbPersona}
            activity={orbActivity}
            japaneseEnabled={japaneseEnabled}
            conversationEnabled={conversationEnabled}
            mode={mode}
            onModeChange={setMode}
            hideOrb={successPlayKey !== null}
            luna={lunaOn}
            lunaPlayKey={lunaPlayKey}
            heatingMood={heatingMood}
            // En chat el CTA es Hablar del panel: el orbe compacto no graba.
            onOrbPress={!chatOpen ? orbPress.onPress : undefined}
            orbPressDisabled={isSending}
            poked={orbPress.poked}
            pokeMark={orbPress.pokeMark}
          />

          {!chatOpen ? (
            <IdleFooter
              isSending={isSending}
              hint={hint}
              recorderError={recorder.errorMessage}
              dispatchError={dispatcher.errorMessage}
              onCancel={handleCancelTurn}
            />
          ) : null}
        </div>

        {chatOpen ? (
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
              onReplay={(message) => {
                if (message.audioSrc) {
                  playAudioSrc(message.audioSrc);
                  return;
                }
                if (message.speak) {
                  speakJapanese(message.speak);
                }
              }}
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
