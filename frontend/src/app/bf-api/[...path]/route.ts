import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Hobby puede recortar antes; Groq + audio a veces pide más.
export const maxDuration = 180;

function backendBase(): string {
  return (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const rawBase = backendBase();
  if (process.env.VERCEL && isLoopback(rawBase)) {
    // Vercel no puede hablar con el Mac por localhost: hace falta ngrok en BACKEND_URL.
    return Response.json(
      {
        detail:
          "En Vercel, BACKEND_URL tiene que ser el túnel (https://….ngrok-free.dev), no localhost. Secret, no NEXT_PUBLIC_.",
      },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const suffix = (path ?? []).join("/");
  const dest = `${rawBase}/${suffix}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("accept", "application/json, */*");

  const wakeKey = (process.env.BACKEND_WAKE_KEY ?? "").trim();
  if (wakeKey) {
    headers.set("X-Besto-Boot", wakeKey);
    headers.set("ngrok-skip-browser-warning", "1");
  } else if (process.env.VERCEL) {
    return Response.json(
      {
        detail:
          "Falta BACKEND_WAKE_KEY en Vercel (Secret, igual que BOOT_SECRET). Sin eso el portero responde 401 o el proxy peta.",
      },
      { status: 503 },
    );
  }

  try {
    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
      cache: "no-store",
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = Buffer.from(await req.arrayBuffer());
    }

    const upstream = await fetch(dest, init);
    const out = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) {
      out.set("content-type", upstreamType);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "fetch falló";
    // dest no lleva el secreto; sirve para ver si BACKEND_URL está mal.
    return Response.json(
      { detail: `No se alcanzó el Mac (${message}). ¿ngrok y el portero :7999 están vivos?`, dest },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}

export async function OPTIONS(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  return proxy(req, ctx);
}
