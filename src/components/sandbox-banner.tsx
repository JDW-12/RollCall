import Link from "next/link";
import { isSandbox } from "@/lib/env";

/** Shown only when the deployment has no database configured. */
export function SandboxBanner() {
  if (!isSandbox()) return null;
  return (
    <div className="bg-card-soft text-card-ink text-[13px] px-4 py-2 border-b border-card/40">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        <strong>Sandbox.</strong>
        <span>Demo data, resets when the server restarts. Try it as</span>
        <Link href="/demo" className="underline font-semibold">
          Josh (organiser)
        </Link>
        <Link href="/demo?as=member" className="underline font-semibold">
          Priya (member)
        </Link>
        <span className="opacity-80">Sign-in codes show on screen here.</span>
      </div>
    </div>
  );
}
