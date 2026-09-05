export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

export type ConversationTurnResponse = {
  user_text: string;
  assistant_text: string;
};

export type SendTurnStatus = "idle" | "sending" | "ok" | "error";
