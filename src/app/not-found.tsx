import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main className="safe-page">
      <div className="shell flex min-h-[70svh] items-center">
        <section className="surface w-full p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#fee4e2] text-[#b42318]">
            <ShieldAlert aria-hidden="true" size={24} />
          </div>
          <h1 className="text-2xl font-black">Proof not found</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            This HumanX proof link is missing or no longer available.
          </p>
          <Link className="primary-button mt-6" href="/">
            Create proof
          </Link>
        </section>
      </div>
    </main>
  );
}
