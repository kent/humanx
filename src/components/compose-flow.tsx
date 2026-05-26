"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  IDKitRequestWidget,
  orbLegacy,
  type IDKitErrorCodes,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { useCallback, useEffect, useMemo, useState } from "react";

import { shortDigest, validatePostText } from "@/lib/text";

type PublicProof = {
  id: string;
  version: 1;
  action: string;
  environment: "production" | "staging";
  draftText: string;
  draftHash: string;
  signal: string;
  signalHash: string;
  proofCommitment: string;
  worldVerification: {
    verifiedAt: string;
    resultCode?: string;
    sessionId?: string;
  };
  xPostUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type AppConfig = {
  appId: string;
  action: string;
  environment: "production" | "staging";
  appUrl: string;
  supportEmail: string;
  hasWorldConfig: boolean;
  maxPostTextLength: number;
};

type ProofResult = {
  proof: PublicProof;
  proofUrl: string;
  tweetIntentUrl: string;
  editToken: string;
  createdNew: boolean;
};

type Phase =
  | "loading"
  | "editing"
  | "requesting_signature"
  | "awaiting_world"
  | "creating_proof"
  | "proof_ready"
  | "error";

const STORAGE_KEY = "humanx:last-proof";

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return payload?.error?.message ?? "Request failed.";
}

export default function ComposeFlow() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [pendingDraft, setPendingDraft] = useState("");
  const [pendingSignal, setPendingSignal] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [proofResult, setProofResult] = useState<ProofResult | null>(() => {
    if (typeof window === "undefined") return null;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved) as ProofResult;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [xPostUrl, setXPostUrl] = useState("");
  const [isPatching, setIsPatching] = useState(false);

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
        setPhase("editing");
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
  const canVerify = Boolean(config?.hasWorldConfig && validation.ok && consent && phase !== "requesting_signature");

  const startVerification = useCallback(async () => {
    if (!config) return;

    const nextValidation = validatePostText(text);
    if (!nextValidation.ok) {
      setError(nextValidation.message);
      setPhase("error");
      return;
    }

    setError("");
    setNotice("");
    setPhase("requesting_signature");
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
      setWidgetOpen(true);
      setPhase("awaiting_world");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "World verification could not start.");
      setPhase("error");
    }
  }, [config, text]);

  const handleVerify = useCallback(
    async (result: IDKitResult) => {
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

      const payload = (await response.json()) as ProofResult;
      setProofResult(payload);
      setXPostUrl(payload.proof.xPostUrl ?? "");
    },
    [pendingDraft],
  );

  const handleSuccess = useCallback(() => {
    setPhase("proof_ready");
    setNotice("Proof created.");
  }, []);

  const handleError = useCallback((code: IDKitErrorCodes) => {
    setPhase("error");
    setError(code === "user_rejected" ? "Verification was cancelled." : `World verification failed: ${code}.`);
  }, []);

  const copyProofUrl = useCallback(async () => {
    if (!proofResult) return;
    await navigator.clipboard.writeText(proofResult.proofUrl);
    setNotice("Proof link copied.");
  }, [proofResult]);

  const postOnX = useCallback(() => {
    if (!proofResult) return;
    window.location.assign(proofResult.tweetIntentUrl);
  }, [proofResult]);

  const attachPost = useCallback(async () => {
    if (!proofResult) return;
    setIsPatching(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/proofs/${proofResult.proof.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          editToken: proofResult.editToken,
          xPostUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as { proof: PublicProof };
      setProofResult({ ...proofResult, proof: payload.proof });
      setNotice("X post attached.");
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "X post URL could not be saved.");
      setPhase("error");
    } finally {
      setIsPatching(false);
    }
  }, [proofResult, xPostUrl]);

  return (
    <main className="safe-page">
      <div className="shell pb-28">
        <header className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">HumanX</p>
            <h1 className="mt-2 text-[32px] font-black leading-none tracking-normal">Human proof for X</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-black" htmlFor="post-text">
              X post
            </label>
            <span className={charactersLeft < 0 ? "text-sm font-bold text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
              {charactersLeft}
            </span>
          </div>
          <textarea
            id="post-text"
            className="field min-h-40 resize-none p-4 text-base leading-6"
            placeholder="Post text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (phase === "error") {
                setPhase("editing");
                setError("");
              }
            }}
            maxLength={(config?.maxPostTextLength ?? 220) + 80}
          />

          {validation.ok ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
              <Sparkles aria-hidden="true" size={16} />
              <span className="mono">digest {shortDigest(validation.draftHash, 6)}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">{validation.message}</p>
          )}

          <label className="mt-4 flex items-start gap-3 text-sm leading-5 text-[var(--muted)]">
            <input
              className="mt-1 h-5 w-5 accent-[var(--accent)]"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>This proof page will show the post text, timestamp, digest, and optional X post link.</span>
          </label>
        </section>

        {!config?.hasWorldConfig && phase !== "loading" ? (
          <div className="status-line status-warn mt-4 flex gap-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>World verification needs Developer Portal credentials before store submission.</span>
          </div>
        ) : null}

        {error ? (
          <div className="status-line status-error mt-4 flex gap-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="status-line status-ok mt-4 flex gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>{notice}</span>
          </div>
        ) : null}

        {proofResult ? (
          <section className="surface mt-5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[var(--accent)]">Verified human proof</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(proofResult.proof.createdAt))}
                </p>
              </div>
              <Check aria-hidden="true" className="text-[var(--accent)]" size={24} />
            </div>

            <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-3">
              <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6">{proofResult.proof.draftText}</p>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
              <a className="secondary-button px-4 text-sm" href={proofResult.proofUrl}>
                <ExternalLink aria-hidden="true" size={18} />
                Proof
              </a>
              <button className="icon-button" type="button" onClick={copyProofUrl} aria-label="Copy proof link">
                <Copy aria-hidden="true" size={18} />
              </button>
              <button className="icon-button" type="button" onClick={postOnX} aria-label="Post on X">
                <Send aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm font-black" htmlFor="x-post-url">
                X post URL
              </label>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <input
                  id="x-post-url"
                  className="field h-12 px-3 text-sm"
                  placeholder="https://x.com/user/status/..."
                  value={xPostUrl}
                  onChange={(event) => setXPostUrl(event.target.value)}
                />
                <button
                  className="icon-button"
                  type="button"
                  onClick={attachPost}
                  disabled={isPatching || !xPostUrl}
                  aria-label="Attach X post"
                >
                  {isPatching ? <Loader2 aria-hidden="true" className="animate-spin" size={18} /> : <Link2 aria-hidden="true" size={18} />}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {config && rpContext && pendingSignal ? (
          <IDKitRequestWidget
            open={widgetOpen}
            onOpenChange={setWidgetOpen}
            app_id={config.appId as `app_${string}`}
            action={config.action}
            rp_context={rpContext}
            allow_legacy_proofs={true}
            preset={orbLegacy({ signal: pendingSignal })}
            environment={config.environment}
            handleVerify={handleVerify}
            onSuccess={handleSuccess}
            onError={handleError}
            language="en"
          />
        ) : null}

        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[rgba(247,245,239,0.94)] px-6 py-4 backdrop-blur">
          <div className="shell">
            <button className="primary-button" type="button" disabled={!canVerify} onClick={startVerification}>
              {phase === "requesting_signature" || phase === "awaiting_world" || phase === "creating_proof" ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              ) : (
                <ShieldCheck aria-hidden="true" size={18} />
              )}
              {phase === "creating_proof" ? "Creating proof" : "Verify with World ID"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
