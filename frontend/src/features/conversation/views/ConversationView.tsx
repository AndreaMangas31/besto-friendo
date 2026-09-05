"use client";

import { TalkButton } from "@/features/conversation/components/TalkButton";
import { useAudioRecorder } from "@/features/conversation/hooks/useAudioRecorder";
import { useSendAudio } from "@/features/conversation/hooks/useSendAudio";

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export function ConversationView() {
  const recorder = useAudioRecorder();
  const sender = useSendAudio();

  const isRecording = recorder.status === "recording";
  const isSending = sender.status === "sending";

  async function handleTalkClick() {
    if (isSending) {
      return;
    }

    if (isRecording) {
      const file = await recorder.stop();
      // file === null: blob vacío o stop() sin grabación activa.
      if (file) {
        await sender.send(file);
      }
      return;
    }

    await recorder.start();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6">
      <main className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Fase 2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Besto Friendo
          </h1>
          <p className="text-zinc-600">
            Graba un audio y envíalo al backend. Todavía no hay transcripción ni
            modelo: solo comprobamos que el micrófono y el envío funcionan.
          </p>
        </div>

        <TalkButton
          isRecording={isRecording}
          disabled={isSending}
          onClick={() => {
            void handleTalkClick();
          }}
        />

        {isSending ? (
          <p className="text-zinc-500">Enviando audio…</p>
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
            <p className="font-medium">No se pudo enviar</p>
            <p className="mt-1 text-sm">{sender.errorMessage}</p>
          </div>
        ) : null}

        {sender.status === "ok" && sender.result ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <p className="font-medium">Audio recibido</p>
            <p className="mt-1 text-sm">
              {formatBytes(sender.result.size_bytes)} · {sender.result.content_type}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
