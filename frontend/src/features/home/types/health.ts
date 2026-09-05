export type HealthResponse = {
  status: string;
  service: string;
};

export type HealthState =
  | { status: "loading" }
  | { status: "ok"; service: string }
  | { status: "error"; message: string };
