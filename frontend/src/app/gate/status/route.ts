import { type NextRequest } from "next/server";
import { GATE_HEADER, gateIsRequired, gateTokenOk } from "../lib";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const required = gateIsRequired();
  const ok = !required || gateTokenOk(req.headers.get(GATE_HEADER));
  return Response.json({ required, ok });
}
