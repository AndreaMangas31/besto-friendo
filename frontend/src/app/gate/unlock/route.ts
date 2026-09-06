import { type NextRequest } from "next/server";
import {
  expectedGateToken,
  gateIsRequired,
  gatePassword,
  passwordsMatch,
} from "../lib";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!gateIsRequired()) {
    return Response.json({ token: "", required: false });
  }

  let password = "";
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && "password" in body) {
      password = String((body as { password: unknown }).password);
    }
  } catch {
    password = "";
  }

  if (!passwordsMatch(password, gatePassword())) {
    return Response.json({ detail: "Contraseña incorrecta" }, { status: 401 });
  }

  return Response.json({ token: expectedGateToken(), required: true });
}
