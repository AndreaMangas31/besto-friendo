export type ChatRole = "user" | "assistant";

export type JapaneseSegment = {
  surface: string;
  romaji: string;
};

export type ChatMessage = {
  role: ChatRole;
  // Historial hacia el backend: transcripción (tú) o speak + explanation (tutor).
  text: string;
  explanation?: string;
  segments?: JapaneseSegment[];
};

export type ConversationTurnResponse = {
  user_text: string;
  assistant_text: string;
  explanation: string;
  segments: JapaneseSegment[];
};

export type SendTurnStatus = "idle" | "sending" | "ok" | "error";
