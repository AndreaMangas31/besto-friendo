import { API_BASE_URL } from "@/shared/config/env";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      `El backend respondió con ${response.status}`,
      response.status,
    );
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
  });

  if (!response.ok) {
    throw new ApiError(
      `El backend respondió con ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
