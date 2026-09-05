/** Respuesta de POST /conversation/audio. Si received es true y size_bytes > 0, el pipeline llegó. */
export type AudioReceivedResponse = {
  received: boolean;
  filename: string;
  content_type: string;
  size_bytes: number;
};

export type RecorderStatus = "idle" | "recording" | "error";

export type SendAudioStatus = "idle" | "sending" | "ok" | "error";
