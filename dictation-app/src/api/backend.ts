export type BackendHealth = {
  status: "unknown" | "healthy" | "degraded" | "unreachable";
  endpoint: string;
  healthUrl: string;
  message: string;
};

export const defaultBackendHealth: BackendHealth = {
  status: "unknown",
  endpoint: "http://127.0.0.1:8080/clean",
  healthUrl: "http://127.0.0.1:8080/health",
  message: "Health has not been checked yet.",
};

export type AppConfig = {
  mode: string;
  personal_mode_enabled: boolean;
  hotkey: string;
  cleanup_url: string;
  health_url: string;
  tunnel_enabled: boolean;
  tunnel_host: string;
  tunnel_local_port: number;
  tunnel_remote_port: number;
  stt_model_dir: string;
};

export type SessionState = {
  state: "idle" | "recording" | "transcribing" | "cleaning" | "pasting" | "error";
  message: string;
  hotkey: string;
  input_device: string | null;
  last_recording_path: string | null;
  last_recording_duration_ms: number | null;
  last_recording_sample_rate: number | null;
  last_recording_channels: number | null;
  raw_transcript: string | null;
  cleaned_text: string | null;
  stt_latency_ms: number | null;
  cleanup_latency_ms: number | null;
  cleanup_model_version: string | null;
  used_cleanup_fallback: boolean;
  final_output: string | null;
  last_paste_message: string | null;
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

export type LocalSetupStatus = {
  status: "complete" | "partial" | "missing";
  message: string;
  storage_path: string;
  stt_model_dir: string;
  cleanup_model_dir: string;
  missing_items: string[];
  detected_legacy_cleanup: boolean;
};

export type LocalSetupProgress = {
  step: string;
  message: string;
};
