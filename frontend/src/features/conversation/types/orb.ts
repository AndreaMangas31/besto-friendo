import { PS5_COMMANDS, TV_COMMANDS } from "@/features/conversation/types/commands";
import type { CommandName } from "@/features/conversation/types/commands";

export type OrbPersona = "idle" | "japanese" | "tv" | "play";

export type OrbActivity = "idle" | "listening" | "thinking" | "confused";

/** null = el comando no cambia el personaje (turno de chat, unknown, práctica). */
export function nextOrbPersona(command: CommandName): OrbPersona | null {
  if (command === "enable_japanese_mode") {
    return "japanese";
  }
  if (command === "disable_japanese_mode") {
    return "idle";
  }
  if (command === "tv_power_off") {
    return "idle";
  }
  // HDMI es la entrada de la Play (1–4).
  if (command === "tv_hdmi") {
    return "play";
  }
  if (TV_COMMANDS.has(command)) {
    return "tv";
  }
  if (command === "ps5_power_off") {
    return "idle";
  }
  if (PS5_COMMANDS.has(command)) {
    return "play";
  }
  return null;
}
