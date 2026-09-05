import type { ConversationTurnResponse, PracticeMode } from "@/features/conversation/types/turn";

export type CommandName =
  | "enable_japanese_mode"
  | "disable_japanese_mode"
  | "set_practice_mode"
  | "japanese_turn"
  | "tv_power_on"
  | "tv_power_off"
  | "unknown";

export type DispatchResponse = {
  command: CommandName;
  transcript: string;
  turn: ConversationTurnResponse | null;
  practice_mode: PracticeMode | null;
  device_message: string | null;
};

export type DispatchStatus = "idle" | "sending" | "ok" | "error";
