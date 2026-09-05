export type PracticeMode = "conversar" | "corregir" | "ideas";

export type ChatRole = "user" | "assistant";

export type JapaneseSegment = {
  surface: string;
  romaji: string;
};

export type ContentBlock =
  | { type: "text"; text: string; segments?: JapaneseSegment[] }
  | { type: "jp"; text?: string; segments: JapaneseSegment[] };

export type ChatMessage = {
  role: ChatRole;
  // Historial plano hacia el backend (prosa + surface japonés).
  text: string;
  speak?: string;
  blocks?: ContentBlock[];
};

export type ConversationTurnResponse = {
  user_text: string;
  assistant_text: string;
  speak: string;
  blocks: ContentBlock[];
};
