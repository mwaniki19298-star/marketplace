import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithEmail, loginWithGoogleIdToken, persistAuth } from "@/lib/auth";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
      prompt: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const loadGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          try {
            setError("");
            setLoading("google");
            const result = await loginWithGoogleIdToken(credential);
            persistAuth(result);
            navigate("/", { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed.");
          } finally {
            setLoading(null);
          }
        },
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(420, googleButtonRef.current.clientWidth),
        logo_alignment: "left",
      });
    };

    if (window.google) {
      loadGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = loadGoogle;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [navigate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isResetMode) {
      setError("Account recovery is not connected to the backend yet.");
      return;
    }

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    try {
      setError("");
      setLoading("email");
      const result = await loginWithEmail(email, password);
      persistAuth(result);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f6fc] text-ink dark:bg-[#0d0b12] dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-violet-300/15 blur-3xl dark:bg-violet-900/20" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.1fr_.9fr]">
        <section className="hidden flex-col justify-center px-10 py-12 lg:flex xl:px-16">
          <Link to="/" className="inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-tight text-ink dark:text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-sm font-bold text-white shadow-raised">M</span>
            Marketplace
          </Link>

          <div className="mt-20 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-xs font-semibold text-accent shadow-xs backdrop-blur dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5" /> A community marketplace
            </span>
            <h1 className="mt-6 font-display text-6xl leading-[0.98] tracking-tight text-ink dark:text-white xl:text-7xl">
              Buy. Sell. <span className="text-accent">Connect.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-ink-soft dark:text-white/60">
              Discover useful products, support local sellers, and build trusted relationships through one community marketplace.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                ["Local stores", "Discover"],
                ["Verified reviews", "Trust"],
                ["Any seller", "Opportunity"],
              ].map(([title, label]) => (
                <div key={label} className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-card backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-ink dark:text-white">{title}</div>
                  <div className="mt-1 text-xs text-ink-faint dark:text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link
                to="/"
                className="font-display text-xl font-semibold tracking-tight text-ink dark:text-white"
                aria-label="Marketplace home"
              >
                {isResetMode ? "Reset Account" : "Welcome back"}
              </Link>
              <span className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-semibold text-ink-faint dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                {isResetMode ? "Account recovery" : "Sign in"}
              </span>
            </div>

            <div className="rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_24px_80px_-30px_rgba(50,38,90,.35)] backdrop-blur sm:p-8 dark:border-white/10 dark:bg-white/[0.045] dark:shadow-black/30">
              <div className="mb-7">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent dark:bg-accent/15">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-display text-3xl tracking-tight text-ink dark:text-white">
                  {isResetMode ? "Reset your account" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft dark:text-white/55">
                  {isResetMode
                    ? "Enter your email address and we’ll help you recover access."
                    : "Sign in to continue shopping, manage your store, and stay connected."}
                </p>
              </div>

              {!isResetMode && <div>
                {googleClientId ? (
                  <div ref={googleButtonRef} className="flex min-h-12 w-full justify-center overflow-hidden rounded-xl" aria-label="Continue with Google" />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface text-sm font-semibold text-ink-soft opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-bold shadow-xs">G</span>
                    Google sign-in is not configured
                  </button>
                )}
                {loading === "google" && <p className="mt-2 text-center text-xs text-ink-faint dark:text-white/45">Signing you in securely…</p>}
              </div>}

              {!isResetMode && <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border dark:bg-white/10" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint dark:text-white/35">or continue with email</span>
                <span className="h-px flex-1 bg-border dark:bg-white/10" />
              </div>}

              <form onSubmit={submit} className="space-y-4" noValidate>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                    <Mail className="h-4 w-4 text-ink-faint dark:text-white/45" /> Email address
                  </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-border-strong bg-white px-4 text-sm text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
                  />
                </label>

                {!isResetMode && <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink dark:text-white">
                    <KeyRound className="h-4 w-4 text-ink-faint dark:text-white/45" /> Password
                  </span>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-xl border border-border-strong bg-white px-4 pr-12 text-sm text-ink outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-faint transition hover:bg-surface-sunken hover:text-ink dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>}

                {error && (
                  <div role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger">
                    {error}
                  </div>
                )}

                {!isResetMode && (
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <label className="flex items-center gap-2 text-ink-soft dark:text-white/50">
                      <input type="checkbox" className="h-4 w-4 rounded border-border accent-accent" /> Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setError(""); }}
                      className="font-semibold text-accent hover:text-accent-strong"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading !== null}
                  className="h-12 w-full rounded-xl bg-accent text-sm font-semibold text-white shadow-raised transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetMode ? "Send reset link" : loading === "email" ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-ink-soft dark:text-white/50">
                {isResetMode ? (
                  <>
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(false); setError(""); }}
                      className="font-semibold text-accent hover:text-accent-strong"
                    >
                      Back to sign in
                    </button>
                  </>
                ) : (
                  <>
                    New to Marketplace?{" "}
                    <Link to="/signup" className="font-semibold text-accent hover:text-accent-strong">Create an account</Link>
                  </>
                )}
              </p>

              <p className="mx-auto mt-6 max-w-sm text-center text-[11px] leading-5 text-ink-faint dark:text-white/30">
                By continuing, you agree to the Marketplace terms, community rules, and privacy policy.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
