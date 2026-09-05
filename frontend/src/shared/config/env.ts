export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// NEXT_PUBLIC_* se inyecta en build/dev. Si cambias .env.local, reinicia `pnpm dev`.
