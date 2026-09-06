import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC de GATE_PASSWORD, no la clave en claro. unlocked=true en el teléfono no basta.
export const GATE_HEADER = "x-besto-gate";

export function gatePassword(): string {
  return (process.env.GATE_PASSWORD ?? "").trim();
}

export function gateIsRequired(): boolean {
  return gatePassword().length > 0;
}

export function expectedGateToken(): string {
  return createHmac("sha256", gatePassword()).update("besto-gate-v1").digest("hex");
}

export function gateTokenOk(raw: string | null): boolean {
  if (!gateIsRequired()) {
    return true;
  }
  const got = (raw ?? "").trim();
  if (!got) {
    return false;
  }
  const expected = Buffer.from(expectedGateToken(), "utf8");
  const actual = Buffer.from(got, "utf8");
  if (expected.length !== actual.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function passwordsMatch(got: string, expected: string): boolean {
  const left = Buffer.from(got, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}
