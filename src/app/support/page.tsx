import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export const metadata: Metadata = {
  title: "VeriPost support",
  description: "Support contact for VeriPost.",
};

export default function SupportPage() {
  return (
    <main className="safe-page">
      <div className="shell py-2">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">VeriPost</p>
            <h1 className="mt-2 text-[30px] font-black leading-none">Support</h1>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <LifeBuoy aria-hidden="true" size={26} />
          </div>
        </header>

        <section className="surface mt-6 p-5">
          <h2 className="text-base font-black">Contact</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Email{" "}
            <a className="font-bold text-[var(--accent)]" href="mailto:support@veripost.io">
              support@veripost.io
            </a>{" "}
            for account, proof, deletion, review, or abuse-report questions.
          </p>
        </section>

        <section className="surface mt-4 p-5">
          <h2 className="text-base font-black">Include</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Send the proof URL or proof id, your device type, and the steps that led to the issue. Do not send private
            keys, recovery phrases, or other secrets.
          </p>
        </section>

        <section className="surface mt-4 p-5">
          <h2 className="text-base font-black">Security</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            For security issues, email support and ask for a private disclosure channel before sharing exploit details.
          </p>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link className="secondary-button px-4" href="/privacy">
            Privacy
          </Link>
          <Link className="secondary-button px-4" href="/">
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}
