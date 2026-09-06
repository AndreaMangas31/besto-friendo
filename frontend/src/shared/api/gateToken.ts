export const GATE_STORAGE_KEY = "besto-gate-token";
export const GATE_HEADER = "X-Besto-Gate";

export function readGateToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(GATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeGateToken(token: string): void {
  window.localStorage.setItem(GATE_STORAGE_KEY, token);
}

export function clearGateToken(): void {
  window.localStorage.removeItem(GATE_STORAGE_KEY);
}
