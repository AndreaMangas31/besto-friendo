import {
  HEATING_COMMANDS,
  PS5_COMMANDS,
  TV_COMMANDS,
  type DispatchResponse,
} from "@/features/conversation/types/commands";
import {
  nextHeatingMood,
  nextOrbPersona,
  type HeatingMood,
  type OrbPersona,
} from "@/features/conversation/types/orb";
import { modeNotice } from "@/features/conversation/types/preview";
import type { ChatMessage, PracticeMode } from "@/features/conversation/types/turn";

export type ApplyDispatchHandlers = {
  openJapaneseChat: () => void;
  applyPersona: (persona: OrbPersona) => void;
  playLuna: () => void;
  setHint: (hint: string | null) => void;
  setConfused: (value: boolean) => void;
  setMode: (mode: PracticeMode) => void;
  setMessages: (update: (current: ChatMessage[]) => ChatMessage[]) => void;
  setHeatingMood: (mood: HeatingMood) => void;
  setLunaOn: (on: boolean) => void;
  celebrateDeviceSuccess: (ok: boolean | null) => void;
  speakJapanese: (text: string) => void;
};

/** “Te oí” usa la frase entendida; el STT crudo no se enseña si hay understood. */
function hintWithHeard(message: string, heard: string): string {
  const bit = heard ? ` Te oí: “${heard}”.` : "";
  return `${message}${bit}`;
}

function heardPhrase(result: DispatchResponse): string {
  return result.understood?.trim() || result.transcript;
}

export function applyDispatchResult(
  result: DispatchResponse,
  handlers: ApplyDispatchHandlers,
): void {
  // Luna se queda champagne hasta el siguiente comando (no un timeout).
  if (result.command !== "call_luna") {
    handlers.setLunaOn(false);
  }

  if (result.command === "enable_japanese_mode") {
    handlers.openJapaneseChat();
    return;
  }

  if (result.command === "disable_japanese_mode") {
    handlers.setConfused(false);
    handlers.applyPersona("idle");
    handlers.setHint(null);
    return;
  }

  if (result.command === "set_practice_mode" && result.practice_mode) {
    handlers.setConfused(false);
    handlers.setMode(result.practice_mode);
    handlers.setMessages((current) => [
      ...current,
      modeNotice(result.practice_mode!),
    ]);
    return;
  }

  if (result.command === "call_luna") {
    handlers.playLuna();
    if (result.device_message) {
      handlers.setHint(result.device_message);
    }
    return;
  }

  if (PS5_COMMANDS.has(result.command)) {
    handlers.setConfused(false);
    const fallback =
      result.command === "ps5_power_on"
        ? "Mandé despertar la PlayStation."
        : "La mandé a reposo.";
    handlers.setHint(
      hintWithHeard(result.device_message ?? fallback, heardPhrase(result)),
    );
    handlers.celebrateDeviceSuccess(result.ok);
    const persona = nextOrbPersona(result.command);
    if (result.ok && persona) {
      handlers.applyPersona(persona);
    }
    return;
  }

  if (TV_COMMANDS.has(result.command)) {
    handlers.setConfused(false);
    handlers.setHint(
      hintWithHeard(
        result.device_message ?? "Mandé el comando a la tele.",
        heardPhrase(result),
      ),
    );
    handlers.celebrateDeviceSuccess(result.ok);
    const persona = nextOrbPersona(result.command);
    if (result.ok && persona) {
      handlers.applyPersona(persona);
    }
    return;
  }

  if (HEATING_COMMANDS.has(result.command)) {
    handlers.setConfused(false);
    handlers.setHint(
      hintWithHeard(
        result.device_message ?? "Mandé el comando a la calefacción.",
        heardPhrase(result),
      ),
    );
    handlers.celebrateDeviceSuccess(result.ok);
    const persona = nextOrbPersona(result.command);
    if (result.ok && persona) {
      handlers.applyPersona(persona);
    }
    // Mood aparte de la persona: encender/bajar tiembla; subir/poner grados humito.
    const mood = nextHeatingMood(result.command);
    if (result.ok && mood) {
      handlers.setHeatingMood(mood);
    }
    return;
  }

  if (result.command === "agent_turn") {
    handlers.setConfused(false);
    handlers.setHint(
      result.agent_message
        ? hintWithHeard(result.agent_message, heardPhrase(result))
        : hintWithHeard("Vale.", heardPhrase(result)),
    );
    return;
  }

  if (result.command === "japanese_turn" && result.turn) {
    handlers.setConfused(false);
    const turn = result.turn;
    handlers.setMessages((current) => [
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
      handlers.speakJapanese(turn.speak);
    }
    return;
  }

  handlers.setConfused(true);
  handlers.setHint(
    result.transcript
      ? `No encajó como comando de activar. Te oí algo como: “${result.transcript}”.`
      : "No encajó como comando. Di enable japanese mode, más o menos.",
  );
}
