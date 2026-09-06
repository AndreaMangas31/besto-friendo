"use client";

import { useCallback, useRef, useState } from "react";
import type { RecorderStatus } from "@/features/conversation/types/audio";

// Chrome/Firefox suelen grabar webm; Safari a menudo solo mp4.
// Si el MIME no coincide con lo que ves en DevTools → Network, mira este orden.
function pickMimeType(): string | undefined {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return "mp4";
  }
  if (mimeType.includes("ogg")) {
    return "ogg";
  }
  return "webm";
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const withWebkit = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? withWebkit.webkitAudioContext ?? null;
}

function rmsFromTimeDomain(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}

/** Cuánto callas seguidos antes de enviar. Sube esto si corta frases (“enciende… la tele”). */
const SILENCE_MS = 1600;
/** VOOOOY solo al final, no en pausas. Tiene que ser < SILENCE_MS; ~400 ms antes del envío. */
const VOOOY_AFTER_MS = 1200;
/** Suelo de ruido al abrir el micro: no armar el endpoint en el silencio inicial. */
const NOISE_SAMPLE_MS = 200;
/** Evita toses / picos de un frame; un “enciende la tele” corto sí llega. */
const MIN_SPEECH_MS = 200;
/** RMS por encima del suelo; el delta evita umbrales ridículos en una sala muda. */
const SPEECH_RATIO = 2.4;
const SPEECH_DELTA = 0.012;

type UseAudioRecorderArgs = {
  onSilenceHold?: (holding: boolean) => void;
  onEndpoint?: () => void;
};

export function useAudioRecorder(args: UseAudioRecorderArgs = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onSilenceHoldRef = useRef(args.onSilenceHold);
  const onEndpointRef = useRef(args.onEndpoint);
  onSilenceHoldRef.current = args.onSilenceHold;
  onEndpointRef.current = args.onEndpoint;

  const stopVad = useCallback((notifyHoldOff: boolean) => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    // El clone es solo para el RMS; si no lo paramos, el LED del micro se queda encendido.
    monitorStreamRef.current?.getTracks().forEach((track) => track.stop());
    monitorStreamRef.current = null;
    if (notifyHoldOff) {
      onSilenceHoldRef.current?.(false);
    }
  }, []);

  const closeAudioContext = useCallback(() => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Safari: resume() tiene que ir en el gesto (el OOPS retrasa getUserMedia ~550 ms).
  const prime = useCallback(() => {
    const Ctor = audioContextCtor();
    if (!Ctor) {
      return;
    }
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      audioContextRef.current = new Ctor();
    }
    void audioContextRef.current.resume();
  }, []);

  const startVad = useCallback(
    (stream: MediaStream) => {
      const Ctor = audioContextCtor();
      if (!Ctor) {
        return;
      }

      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      ) {
        audioContextRef.current = new Ctor();
      }
      const context = audioContextRef.current;
      void context.resume();

      // Clone: Safari a veces deja el MediaRecorder en 0 bytes si el Analyser come el mismo stream.
      const monitorStream = stream.clone();
      monitorStreamRef.current = monitorStream;
      const source = context.createMediaStreamSource(monitorStream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;

      const samples = new Float32Array(analyser.fftSize);
      const startedAt = performance.now();
      let lastFrameAt = startedAt;
      let noiseSum = 0;
      let noiseCount = 0;
      let noiseFloor = SPEECH_DELTA;
      let speechMs = 0;
      let armed = false;
      let holding = false;
      let silenceStartedAt: number | null = null;

      const tick = (now: number) => {
        const analyserNode = analyserRef.current;
        if (!analyserNode) {
          return;
        }

        analyserNode.getFloatTimeDomainData(samples);
        const rms = rmsFromTimeDomain(samples);
        const elapsed = now - startedAt;
        const dt = Math.min(now - lastFrameAt, 50);
        lastFrameAt = now;

        if (elapsed < NOISE_SAMPLE_MS) {
          noiseSum += rms;
          noiseCount += 1;
          if (noiseCount > 0) {
            noiseFloor = noiseSum / noiseCount;
          }
          rafRef.current = window.requestAnimationFrame(tick);
          return;
        }

        const threshold = Math.max(
          noiseFloor * SPEECH_RATIO,
          noiseFloor + SPEECH_DELTA,
        );
        const speaking = rms >= threshold;

        if (speaking) {
          speechMs += dt;
          if (!armed && speechMs >= MIN_SPEECH_MS) {
            armed = true;
          }
          if (silenceStartedAt !== null || holding) {
            holding = false;
            silenceStartedAt = null;
            onSilenceHoldRef.current?.(false);
          }
        } else if (armed) {
          if (silenceStartedAt === null) {
            silenceStartedAt = now;
          }
          const silentFor = now - silenceStartedAt;
          if (!holding && silentFor >= VOOOY_AFTER_MS) {
            holding = true;
            onSilenceHoldRef.current?.(true);
          }
          if (silentFor >= SILENCE_MS) {
            // Cortar el rAF antes del callback: pulso + silencio no disparan dos envíos.
            stopVad(false);
            onEndpointRef.current?.();
            return;
          }
        }

        rafRef.current = window.requestAnimationFrame(tick);
      };

      rafRef.current = window.requestAnimationFrame(tick);
    },
    [stopVad],
  );

  const start = useCallback(async () => {
    setErrorMessage(null);

    if (typeof MediaRecorder === "undefined") {
      setStatus("error");
      setErrorMessage("Este navegador no soporta grabación de audio.");
      return;
    }

    try {
      // Falla aquí si el usuario deniega el micro, o si no estás en localhost/https.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Sin timeslice: un único blob al stop(). Si size_bytes sale 0, el stop
      // se disparó antes de tener datos (grabación demasiado corta).
      recorder.start();
      startVad(stream);
      setStatus("recording");
    } catch {
      stopVad(false);
      closeAudioContext();
      stopStream();
      setStatus("error");
      setErrorMessage(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador.",
      );
    }
  }, [closeAudioContext, startVad, stopStream, stopVad]);

  const stop = useCallback(async (): Promise<File | null> => {
    const recorder = recorderRef.current;

    stopVad(true);
    closeAudioContext();

    if (!recorder || recorder.state === "inactive") {
      return null;
    }

    const file = await new Promise<File | null>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stopStream();
        recorderRef.current = null;

        if (blob.size === 0) {
          // No enviamos: el backend marcaría received=true con 0 bytes y confundiría.
          resolve(null);
          return;
        }

        resolve(
          new File([blob], `recording.${extensionForMime(mimeType)}`, {
            type: mimeType,
          }),
        );
      };

      recorder.stop();
    });

    setStatus("idle");
    return file;
  }, [closeAudioContext, stopStream, stopVad]);

  return { status, errorMessage, start, stop, prime };
}
