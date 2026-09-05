import type { HealthState } from "@/features/home/types/health";

type BackendStatusProps = {
  health: HealthState;
};

export function BackendStatus({ health }: BackendStatusProps) {
  if (health.status === "loading") {
    return <p className="text-zinc-500">Comprobando conexión con el backend…</p>;
  }

  if (health.status === "error") {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        role="alert"
      >
        <p className="font-medium">Backend no conectado</p>
        <p className="mt-1 text-sm">{health.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
      <p className="font-medium">Backend conectado</p>
      <p className="mt-1 text-sm">Servicio: {health.service}</p>
    </div>
  );
}
