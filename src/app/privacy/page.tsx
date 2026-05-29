import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "VeriPost privacy",
  description: "Privacy details for VeriPost proof creation and public proof pages.",
};

export default function PrivacyPage() {
  return (
    <main className="safe-page">
      <div className="shell py-2">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">VeriPost</p>
            <h1 className="mt-2 text-[30px] font-black leading-none">Privacy</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-5">
          <h2 className="text-base font-black">What VeriPost Stores</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            When you create a proof, VeriPost stores the post text, X username, proof id, text digest, signal hash,
            proof commitment, verification timestamp, and non-public World ID nullifier needed to prevent duplicate
            proof reuse for the same action.
          </p>
        </section>

        <section className="surface mt-4 p-5">
          <h2 className="text-base font-black">What Stays Private</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Public proof pages do not publish your World ID identity, raw proof material, or full nullifier. Proof pages
            are public if you share them, and the post text on a proof page should be treated as public.
          </p>
        </section>

        <section className="surface mt-4 p-5">
          <h2 className="text-base font-black">Services Used</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            VeriPost uses X login to confirm the posting account and forwards World ID proof responses to the World
            verifier. Request IP addresses may be processed temporarily for rate limiting and abuse prevention.
          </p>
        </section>

        <section className="surface mt-4 p-5">
          <h2 className="text-base font-black">Support And Deletion</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            For support, deletion requests, or abuse reports, email{" "}
            <a className="font-bold text-[var(--accent)]" href="mailto:support@veripost.io">
              support@veripost.io
            </a>
            . Include the proof id or proof URL when the request concerns a public proof page.
          </p>
        </section>

        <Link className="secondary-button mt-5 px-4" href="/">
          Back
        </Link>
      </div>
    </main>
  );
}
