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
  hotkey: string;
  server_url: string;
  health_url: string;
  tunnel_enabled: boolean;
  tunnel_host: string;
  tunnel_local_port: number;
  tunnel_remote_port: number;
};

export type SessionState = {
  state: "idle" | "recording" | "transcribing" | "error";
  message: string;
  hotkey: string;
  input_device: string | null;
  last_recording_path: string | null;
  last_recording_duration_ms: number | null;
  last_recording_sample_rate: number | null;
  last_recording_channels: number | null;
};

export type AudioInputDevice = {
  name: string;
  is_default: boolean;
};

export type SttStatus = {
  engine: string;
  state: string;
  message: string;
};
