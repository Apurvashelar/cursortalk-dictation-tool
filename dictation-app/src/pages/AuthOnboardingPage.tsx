import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

type AuthMode = "signin" | "signup";

type AuthOnboardingPageProps = {
  onBack: () => void;
  onSkip: () => void;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function GoogleMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/10 bg-white text-[13px] font-semibold text-slate-950">
      G
    </span>
  );
}

function GitHubMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[9px] font-semibold text-white">
      GH
    </span>
  );
}

export function AuthOnboardingPage({ onBack, onSkip }: AuthOnboardingPageProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function resetError() {
    if (error) {
      setError("");
    }
  }

  function submitForm() {
    const nextEmail = email.trim();

    if (!isValidEmail(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(
      mode === "signin"
        ? "Sign in is not connected yet. Use Skip for now, or connect the auth endpoint."
        : "Account creation is not connected yet. Use Skip for now, or connect the registration endpoint.",
    );
  }

  function startSocialLogin(provider: "Google" | "GitHub") {
    setError(`${provider} OAuth is not connected yet. Use Skip for now.`);
  }

  return (
    <BackgroundPaths>
      <div
        className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10"
        style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-4xl"
        >
          <button
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mx-auto max-w-2xl rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
            <div className="text-center">
              <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
                Account
              </h1>
            </div>

            <div className="mt-8 grid grid-cols-2 rounded-2xl border border-black/10 bg-black/[0.035] p-1">
              <button
                className={`rounded-[14px] px-4 py-3 text-sm font-medium transition-all ${
                  mode === "signin"
                    ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => {
                  setMode("signin");
                  resetError();
                }}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`rounded-[14px] px-4 py-3 text-sm font-medium transition-all ${
                  mode === "signup"
                    ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => {
                  setMode("signup");
                  resetError();
                }}
                type="button"
              >
                Create account
              </button>
            </div>

            <form
              className="mt-7 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitForm();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                <input
                  autoComplete="email"
                  className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                  inputMode="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    resetError();
                  }}
                  placeholder="you@company.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    resetError();
                  }}
                  placeholder="At least 8 characters"
                  type="password"
                  value={password}
                />
              </label>

              {mode === "signup" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Confirm password
                  </span>
                  <input
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      resetError();
                    }}
                    placeholder="Re-enter password"
                    type="password"
                    value={confirmPassword}
                  />
                </label>
              ) : null}

              {error ? (
                <p className="rounded-2xl border border-red-900/10 bg-red-950/[0.035] px-4 py-3 text-sm leading-6 text-red-800">
                  {error}
                </p>
              ) : null}

              <Button
                className="w-full rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
                size="lg"
                type="submit"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">or</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white/84 px-4 py-3 text-sm font-medium text-slate-800 transition-all hover:border-black/20 hover:bg-white"
                onClick={() => startSocialLogin("Google")}
                type="button"
              >
                <GoogleMark />
                Continue with Google
              </button>
              <button
                className="inline-flex items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white/84 px-4 py-3 text-sm font-medium text-slate-800 transition-all hover:border-black/20 hover:bg-white"
                onClick={() => startSocialLogin("GitHub")}
                type="button"
              >
                <GitHubMark />
                Continue with GitHub
              </button>
            </div>

            <div className="mt-8 text-center">
              <button
                className="text-sm font-medium text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-950"
                onClick={onSkip}
                type="button"
              >
                Skip for now
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
