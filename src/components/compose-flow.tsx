"use client";

import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import {
  IDKitRequestWidget,
  proofOfHuman,
  type IDKitErrorCodes,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isSavedProofVisibleForDraft, parseSavedProofResult, type SavedProofResult } from "@/lib/saved-proof";
import { validatePostText } from "@/lib/text";
import { normalizeXUsername } from "@/lib/x";

type AppConfig = {
  appId: string;
  action: string;
  environment: "production" | "staging";
  hasWorldConfig: boolean;
  hasXAuthConfig: boolean;
  hasProofStorageConfig: boolean;
  maxPostTextLength: number;
};

type Phase = "loading" | "ready" | "signing_world" | "creating_proof" | "proof_ready" | "error";

const STORAGE_KEY = "veripost:last-proof";

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return payload?.error?.message ?? "Request failed.";
}

export default function ComposeFlow() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [pendingDraft, setPendingDraft] = useState("");
  const [pendingSignal, setPendingSignal] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const worldWidgetPendingRef = useRef(false);
  const [proofResult, setProofResult] = useState<SavedProofResult | null>(() => {
    if (typeof window === "undefined") return null;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved) as unknown;
      const savedProof = parseSavedProofResult(parsed, window.location.origin);
      if (savedProof) return savedProof;

      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/config", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const nextConfig = (await response.json()) as AppConfig;
        if (!mounted) return;
        setConfig(nextConfig);
        setPhase("ready");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Configuration could not be loaded.");
        setPhase("error");
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!proofResult) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(proofResult));
  }, [proofResult]);

  const validation = useMemo(() => validatePostText(text), [text]);
  const normalizedLength = validation.ok ? validation.normalized.length : text.trim().length;
  const charactersLeft = (config?.maxPostTextLength ?? 220) - normalizedLength;
  const signedIn = status === "authenticated";
  const username = normalizeXUsername(session?.user?.username);
  const hasXUsername = Boolean(username);
  const busy = phase === "signing_world" || phase === "creating_proof" || status === "loading";
  const canPost = Boolean(
    signedIn && hasXUsername && config?.hasWorldConfig && config?.hasProofStorageConfig && validation.ok && !busy,
  );
  const canShowLastProof = Boolean(signedIn && isSavedProofVisibleForDraft(proofResult, username, text));
  const postButtonLabel =
    phase === "signing_world" ? "Sign with World ID" : phase === "creating_proof" ? "Creating proof" : "Post";

  const startXLogin = useCallback(() => {
    if (!config?.hasXAuthConfig) return;
    signIn("twitter");
  }, [config?.hasXAuthConfig]);

  const startPost = useCallback(async () => {
    if (!config || !signedIn) return;
    if (!config.hasProofStorageConfig) {
      setError("Proof storage is not configured.");
      setPhase("error");
      return;
    }

    if (!username) {
      setError("X login did not include a username. Sign out and log in with X again.");
      setPhase("error");
      return;
    }

    const nextValidation = validatePostText(text);
    if (!nextValidation.ok) {
      setError(nextValidation.message);
      setPhase("error");
      return;
    }

    setError("");
    setNotice("");
    setPhase("signing_world");
    setPendingDraft(nextValidation.normalized);
    setPendingSignal(nextValidation.signal);

    try {
      const response = await fetch("/api/world/rp-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: config.action }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as { rp_context: RpContext };
      setRpContext(payload.rp_context);
      worldWidgetPendingRef.current = true;
      setWidgetOpen(true);
    } catch (postError) {
      worldWidgetPendingRef.current = false;
      setError(postError instanceof Error ? postError.message : "World verification could not start.");
      setPhase("error");
    }
  }, [config, signedIn, text, username]);

  const handleVerify = useCallback(
    async (result: IDKitResult) => {
      try {
        worldWidgetPendingRef.current = false;
        setPhase("creating_proof");
        setError("");

        const response = await fetch("/api/proofs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            draftText: pendingDraft,
            idkitResponse: result,
          }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const payload = (await response.json()) as SavedProofResult;
        setProofResult(payload);
        setNotice("Opening X with your proof.");
        setPhase("proof_ready");
        setWidgetOpen(false);
        window.location.assign(payload.tweetIntentUrl);
      } catch (verifyError) {
        worldWidgetPendingRef.current = false;
        setPhase("error");
        setWidgetOpen(false);
        setError(verifyError instanceof Error ? verifyError.message : "Proof could not be created.");
      }
    },
    [pendingDraft],
  );

  const handleError = useCallback((code: IDKitErrorCodes) => {
    worldWidgetPendingRef.current = false;
    setPhase("error");
    setWidgetOpen(false);
    setError(code === "user_rejected" ? "World ID signing was cancelled." : `World ID signing failed: ${code}.`);
  }, []);

  const handleWidgetOpenChange = useCallback((open: boolean) => {
    setWidgetOpen(open);

    if (!open && worldWidgetPendingRef.current) {
      worldWidgetPendingRef.current = false;
      setPhase("ready");
      setNotice("");
      setError("World ID signing was cancelled.");
    }
  }, []);

  const openLastPost = useCallback(() => {
    if (!proofResult || !canShowLastProof) return;
    window.location.assign(proofResult.tweetIntentUrl);
  }, [canShowLastProof, proofResult]);

  return (
    <main className="safe-page">
      <div className="shell pb-28">
        <header className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">VeriPost</p>
            <h1 className="mt-2 text-[32px] font-black leading-none tracking-normal">Post as human</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-4">
          {signedIn ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">{username ? `@${username}` : session.user?.name}</p>
                <p className="text-xs text-[var(--muted)]">Signed in with X</p>
              </div>
              <button className="secondary-button min-h-10 px-3 text-sm" type="button" onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={!config?.hasXAuthConfig || status === "loading"}
              onClick={startXLogin}
            >
              {status === "loading" ? <Loader2 aria-hidden="true" className="animate-spin" size={18} /> : null}
              Login with X
            </button>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="text-sm font-black" htmlFor="post-text">
              Post
            </label>
            <span className={charactersLeft < 0 ? "text-sm font-bold text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
              {charactersLeft}
            </span>
          </div>
          <textarea
            id="post-text"
            className="field mt-2 min-h-44 resize-none p-4 text-base leading-6"
            placeholder={signedIn ? "What do you want to post?" : "Login with X to write a post."}
            value={text}
            disabled={!signedIn || busy}
            onChange={(event) => {
              setText(event.target.value);
              if (phase === "error") {
                setPhase("ready");
                setError("");
              }
            }}
            maxLength={(config?.maxPostTextLength ?? 220) + 80}
          />

          {!validation.ok && signedIn ? <p className="mt-3 text-sm text-[var(--muted)]">{validation.message}</p> : null}
        </section>

        {!config?.hasXAuthConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>X login needs `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `NEXTAUTH_SECRET`.</span>
          </div>
        ) : null}

        {!config?.hasWorldConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>World ID signing needs Developer Portal credentials.</span>
          </div>
        ) : null}

        {!config?.hasProofStorageConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>Proof storage needs a production Postgres URL.</span>
          </div>
        ) : null}

        {signedIn && !hasXUsername ? (
          <div className="status-line status-warn mt-4 flex gap-2" role="status">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>X login needs a username. Sign out and log in again.</span>
          </div>
        ) : null}

        {error ? (
          <div className="status-line status-error mt-4 flex gap-2" role="alert">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="status-line status-ok mt-4 flex gap-2" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{notice}</span>
          </div>
        ) : null}

        {proofResult && canShowLastProof ? (
          <section className="surface mt-5 p-4">
            <p className="text-sm font-black text-[var(--accent)]">Last proof is ready</p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {proofResult.proof.draftText}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="secondary-button px-4 text-sm" href={proofResult.proofUrl}>
                Proof
              </a>
              <button className="secondary-button px-4 text-sm" type="button" onClick={openLastPost}>
                Post to X
              </button>
            </div>
          </section>
        ) : null}

        {config && rpContext && pendingSignal ? (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={handleWidgetOpenChange}
            app_id={config.appId as `app_${string}`}
            action={config.action}
            rp_context={rpContext}
            allow_legacy_proofs={false}
            preset={proofOfHuman({ signal: pendingSignal })}
            environment={config.environment}
            handleVerify={handleVerify}
            onSuccess={() => undefined}
            onError={handleError}
            language="en"
          />
        ) : null}

        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[rgba(247,245,239,0.94)] px-6 py-4 backdrop-blur">
          <div className="shell">
            <button className="primary-button" type="button" disabled={!canPost} aria-busy={busy} onClick={startPost}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" size={18} /> : <Send aria-hidden="true" size={18} />}
              {postButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
