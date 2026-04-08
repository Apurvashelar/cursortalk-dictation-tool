export type BackendHealth = {
  status: "unknown" | "healthy" | "degraded" | "unreachable";
  endpoint: string;
  healthUrl: string;
  message: string;
};

export const defaultBackendHealth: BackendHealth = {
  status: "unknown",
  endpoint: "http://127.0.0.1:8080",
  healthUrl: "http://127.0.0.1:8080/health",
  message: "Health has not been checked yet.",
};

export type AppConfig = {
  mode: string;
  personal_mode_enabled: boolean;
  server_url: string;
  health_url: string;
  tunnel_enabled: boolean;
  tunnel_host: string;
  tunnel_local_port: number;
  tunnel_remote_port: number;
};
