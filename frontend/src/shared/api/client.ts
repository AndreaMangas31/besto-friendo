import { API_BASE_URL } from "@/shared/config/env";
import { GATE_HEADER, readGateToken } from "@/shared/api/gateToken";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function gateHeaders(init?: HeadersInit): Headers {
  // Token HMAC en localStorage; el servidor lo comprueba antes de hablar con el Mac.
  const headers = new Headers(init);
  const token = readGateToken();
  if (token) {
    headers.set(GATE_HEADER, token);
  }
  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      return body.detail;
    }
  } catch {
    // cuerpo no JSON
  }

  return `El backend respondió con ${response.status}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: gateHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  // No pongas Content-Type a mano: el navegador tiene que añadir el boundary
  // de multipart. Si lo fijas a multipart/form-data, FastAPI no parsea el archivo
  // (error típico: "there was an error parsing the body" / 422).
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: gateHeaders(),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}
