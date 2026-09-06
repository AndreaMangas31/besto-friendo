export const CONVERSATION_FILLERS = [
  "/conversation-fillers/un-momento.mp3",
  "/conversation-fillers/voy-a-mirarlo.mp3",
  "/conversation-fillers/un-segundo.mp3",
  "/conversation-fillers/a-ver.mp3",
  "/conversation-fillers/un-momento-porfa.mp3",
] as const;

export const CONVERSATION_HELLO_SRC = "/conversation-fillers/hola.mp3";

export function pickConversationFiller(): string {
  const index = Math.floor(Math.random() * CONVERSATION_FILLERS.length);
  return CONVERSATION_FILLERS[index];
}
