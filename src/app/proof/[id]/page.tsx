import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Fingerprint, ShieldCheck } from "lucide-react";

import { getPublicProof } from "@/lib/proofs";
import { shortDigest } from "@/lib/text";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const proof = await getPublicProof(id);

  if (!proof) {
    return {
      title: "VeriPost proof not found",
    };
  }

  return {
    title: `VeriPost proof ${proof.id}`,
    description: "Verified human proof for an X post.",
    openGraph: {
      title: "Verified human proof",
      description: proof.draftText,
      type: "article",
    },
  };
}

export default async function ProofPage({ params }: PageProps) {
  const { id } = await params;
  const proof = await getPublicProof(id);

  if (!proof) {
    notFound();
  }

  return (
    <main className="safe-page">
      <div className="shell py-2">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">VeriPost</p>
            <h1 className="mt-2 text-[30px] font-black leading-none">Verified human proof</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-5">
          <div className="flex items-center gap-3 text-[var(--accent)]">
            <CheckCircle2 aria-hidden="true" size={22} />
            <p className="text-sm font-black">World ID verified</p>
          </div>

          {proof.xUsername ? (
            <p className="mt-3 text-sm font-bold text-[var(--muted)]">X account @{proof.xUsername}</p>
          ) : null}

          <blockquote className="mt-5 whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-white p-4 text-base leading-7">
            {proof.draftText}
          </blockquote>

          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Created</dt>
              <dd className="font-bold">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(proof.createdAt))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Digest</dt>
              <dd className="mono font-bold">{shortDigest(proof.draftHash, 8)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Proof</dt>
              <dd className="mono font-bold">{proof.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--muted)]">Commitment</dt>
              <dd className="mono font-bold">{shortDigest(proof.proofCommitment, 8)}</dd>
            </div>
          </dl>
        </section>

        <section className="surface mt-4 p-5">
          <div className="flex items-start gap-3">
            <Fingerprint aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--blue)]" size={22} />
            <p className="text-sm leading-6 text-[var(--muted)]">
              World ID proves humanness without publishing the person&apos;s identity. VeriPost stores the post text,
              digest, timestamp, and proof commitment.
            </p>
          </div>
        </section>

        <div className="mt-4 grid gap-3">
          <a
            className="secondary-button px-4"
            href={`mailto:support@veripost.io?subject=Report%20VeriPost%20proof%20${encodeURIComponent(proof.id)}`}
          >
            Report proof
          </a>
          <Link className="secondary-button px-4" href="/">
            Post another
          </Link>
        </div>
      </div>
    </main>
  );
}
