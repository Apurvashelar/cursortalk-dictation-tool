export type BackendHealth = {
  status: "unknown" | "healthy" | "degraded" | "unreachable";
  endpoint: string;
  healthUrl: string;
  message: string;
};

export type AuthUser = {
  first_name: string;
  last_name: string;
  email: string;
};

export type AuthState = {
  state: "signed_out" | "signed_in";
  is_authenticated: boolean;
  message: string;
  auth_base_url: string | null;
  organization_id: string | null;
  organization_name: string | null;
  user: AuthUser | null;
};

export const defaultBackendHealth: BackendHealth = {
  status: "unknown",
  endpoint: "http://127.0.0.1:8080/clean",
  healthUrl: "http://127.0.0.1:8080/health",
  message: "Health has not been checked yet.",
};

export const defaultAuthState: AuthState = {
  state: "signed_out",
  is_authenticated: false,
  message: "Not signed in.",
  auth_base_url: null,
  organization_id: null,
  organization_name: null,
  user: null,
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
  cleanup_source: string | null;
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

export type PermissionState = {
  status: "ready" | "needs_access" | "unknown" | "error";
  label: string;
  message: string;
};

export type PermissionStatusReport = {
  microphone: PermissionState;
  accessibility: PermissionState;
};

export type DictationLogEntry = {
  timestamp_ms: number;
  mode: "local" | "organization";
  raw_transcript: string | null;
  cleaned_output: string | null;
  final_output: string;
  word_count: number;
  stt_latency_ms: number | null;
  cleanup_latency_ms: number | null;
  total_latency_ms: number | null;
  status: "success" | "fallback" | "error";
  cleanup_source: string | null;
  cleanup_model_version: string | null;
  error_message: string | null;
};

export type DictationLogSummary = {
  dictations: number;
  words: number;
  average_latency_ms: number | null;
  recent_entries: DictationLogEntry[];
};
