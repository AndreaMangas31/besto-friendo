import { HEATING_COMMANDS, PS5_COMMANDS, TV_COMMANDS } from "@/features/conversation/types/commands";
import type { CommandName } from "@/features/conversation/types/commands";

export type OrbPersona = "idle" | "japanese" | "tv" | "play" | "heating";

export type OrbActivity = "idle" | "listening" | "thinking" | "confused";

/** Frío = tiembla con bufanda. Calor = humito de alivio. */
export type HeatingMood = "cold" | "warm";

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
  if (command === "heating_power_off") {
    return "idle";
  }
  if (HEATING_COMMANDS.has(command)) {
    return "heating";
  }
  return null;
}

/** null = el comando no toca el mood (apagar, tele, chat…). */
export function nextHeatingMood(command: CommandName): HeatingMood | null {
  if (command === "heating_temp_up" || command === "heating_set_temp") {
    return "warm";
  }
  if (command === "heating_power_on" || command === "heating_temp_down") {
    return "cold";
  }
  return null;
}
