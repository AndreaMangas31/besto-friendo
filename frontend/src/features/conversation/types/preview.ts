import type { HeatingMood, OrbPersona } from "@/features/conversation/types/orb";
import type { ChatMessage, PracticeMode } from "@/features/conversation/types/turn";

export const GREETING: ChatMessage = {
  role: "assistant",
  text: "Hola. Soy tu tutor de japonés. Dime algo y practicamos.",
  blocks: [
    {
      type: "text",
      text: "Hola. Soy tu tutor de japonés. Dime algo y practicamos.",
    },
  ],
};

const MODE_LABEL: Record<PracticeMode, string> = {
  conversar: "Conversar",
  corregir: "Corregir",
  ideas: "Darme ideas",
};

export function modeNotice(mode: PracticeMode): ChatMessage {
  return {
    role: "assistant",
    text: `Vale, pasamos a ${MODE_LABEL[mode]}.`,
    blocks: [{ type: "text", text: `Vale, pasamos a ${MODE_LABEL[mode]}.` }],
  };
}

/** ?orb= en el primer paint; si va en useEffect el HTML (y el fondo) salen idle. */
export function orbPreviewFromParam(preview: string | null): {
  persona: OrbPersona;
  mood: HeatingMood;
  japaneseEnabled: boolean;
} {
  if (preview === "japanese") {
    return { persona: "japanese", mood: "cold", japaneseEnabled: true };
  }
  if (preview === "tv" || preview === "play" || preview === "heating") {
    return { persona: preview, mood: "cold", japaneseEnabled: false };
  }
  if (preview === "heating-warm") {
    return { persona: "heating", mood: "warm", japaneseEnabled: false };
  }
  return { persona: "idle", mood: "cold", japaneseEnabled: false };
}
