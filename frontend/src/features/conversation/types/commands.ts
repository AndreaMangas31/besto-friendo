import type { ConversationTurnResponse, PracticeMode } from "@/features/conversation/types/turn";

export type CommandName =
  | "enable_japanese_mode"
  | "disable_japanese_mode"
  | "set_practice_mode"
  | "japanese_turn"
  | "tv_power_on"
  | "tv_power_off"
  | "tv_volume_up"
  | "tv_volume_down"
  | "tv_mute"
  | "tv_home"
  | "tv_back"
  | "tv_play_pause"
  | "tv_open_youtube"
  | "tv_open_netflix"
  | "tv_search"
  | "ps5_power_on"
  | "ps5_power_off"
  | "unknown";

export type DispatchResponse = {
  command: CommandName;
  transcript: string;
  turn: ConversationTurnResponse | null;
  practice_mode: PracticeMode | null;
  device_message: string | null;
  ok: boolean | null;
};

export type DispatchStatus = "idle" | "sending" | "ok" | "error";

export type CommandHelpGroup = "tutor" | "tv" | "ps5";

export type CommandHelpId = Exclude<CommandName, "japanese_turn" | "unknown">;

export type CommandHelpItem = {
  id: CommandHelpId;
  title: string;
  example: string;
  description: string;
  group: CommandHelpGroup;
};

export type CommandCatalogResponse = {
  items: CommandHelpItem[];
};

export const TV_COMMANDS: ReadonlySet<CommandName> = new Set([
  "tv_power_on",
  "tv_power_off",
  "tv_volume_up",
  "tv_volume_down",
  "tv_mute",
  "tv_home",
  "tv_back",
  "tv_play_pause",
  "tv_open_youtube",
  "tv_open_netflix",
  "tv_search",
]);

export const PS5_COMMANDS: ReadonlySet<CommandName> = new Set([
  "ps5_power_on",
  "ps5_power_off",
]);
