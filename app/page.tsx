"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { track } from "@vercel/analytics";
import { copy } from "@/lib/copy";

// Staggered entrance for the landing column — the first thing anyone sees
// must already be moving.
const RISE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};
function rise(delay: number) {
  return { ...RISE, transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const } };
}

const MARQUEE_TEXT =
  "ORBIT · DEVFEST · RADAR · BABCOCK 100 · GAME NIGHTS · 500+ MEMBERS · ";

function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 202) throw new Error("failed");
      track("magiclink_request"); // never track the email address itself
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="t-body text-cream/90 flex items-center gap-2">
        <span aria-hidden className="text-gdg-green">
          &#10003;
        </span>
        {copy.landing.emailSent}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 w-full">
      {/* One capsule, not a text field + a full pill button — the button is
          a 40px circle nested in the field's own right edge (§11.1). */}
      <div className="relative w-full">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.landing.emailPlaceholder}
          aria-label={copy.landing.emailLabel}
          className="w-full rounded-full border border-cream/30 bg-transparent pl-5 pr-14 py-3 text-cream t-body placeholder:text-cream/40 focus:outline-none focus:border-cream/70"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label={copy.landing.emailSubmit}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream text-ink flex items-center justify-center disabled:opacity-60"
        >
          <span aria-hidden className="text-lg leading-none">
            {status === "loading" ? "…" : "↑"}
          </span>
        </button>
      </div>
      {status === "error" && (
        <p className="t-body text-gdg-red/90 text-sm">{copy.errors.generic}</p>
      )}
      <p className="t-label text-cream/40 normal-case tracking-normal font-medium text-xs">
        {copy.landing.emailHint}
      </p>
    </form>
  );
}

function ErrorBanner() {
  const params = useSearchParams();
  if (params.get("error") !== "expired") return null;
  return (
    <p className="t-body text-gdg-red/90 text-sm">{copy.errors.linkExpired}</p>
  );
}

export default function LandingPage() {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <main className="min-h-dvh bg-ink text-cream relative overflow-hidden flex flex-col items-center justify-center px-6 py-16">
      {/* Backdrop wordmark strip — parked in the empty top band so it never
          collides with the copy column (it used to sit mid-screen, straight
          through the subtitle). */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-[8%] whitespace-nowrap opacity-[0.05] t-label text-[6rem] tracking-widest select-none pointer-events-none"
      >
        <div className="animate-marquee inline-block">
          {MARQUEE_TEXT.repeat(2)}
        </div>
      </div>

      <div className="relative w-full max-w-sm mx-auto flex flex-col items-center text-center gap-6">
        <motion.p {...rise(0)} className="t-label text-cream/55">
          {copy.landing.eyebrow}
        </motion.p>

        <motion.div
          {...rise(0.08)}
          className="w-full"
          style={{ viewTransitionName: "wrapped-title" } as React.CSSProperties}
        >
          {/* 17vw: 7 outline-tracked glyphs ≈ 4.9em — the widest that still
              fits a 390px phone inside the px-6 gutters. 22vw clipped. */}
          <h1
            className="text-outline-base text-outline-cream leading-none"
            style={{ fontSize: "clamp(3.25rem, 17vw, 8rem)" }}
          >
            {copy.landing.title}
          </h1>
          <p
            className="t-display text-gdg-blue kinetic kinetic-breathe"
            style={{ fontSize: "clamp(1.6rem, 8.8vw, 3.6rem)" }}
          >
            {copy.landing.year}
          </p>
        </motion.div>

        <motion.p {...rise(0.16)} className="t-body text-cream/75">
          {copy.landing.sub}
        </motion.p>

        <Suspense fallback={null}>
          <ErrorBanner />
        </Suspense>

        <motion.div {...rise(0.24)} className="flex flex-col items-center gap-3 w-full mt-2">
          <a
            href="/wrapped"
            className="rounded-full bg-cream text-ink px-8 py-4 t-label w-full text-center"
          >
            {copy.landing.ctaWatch}
          </a>

          {showEmail ? (
            <EmailForm />
          ) : (
            <button
              onClick={() => setShowEmail(true)}
              className="rounded-full border border-cream/40 text-cream px-8 py-4 t-label w-full"
            >
              {copy.landing.ctaPersonal}
            </button>
          )}
        </motion.div>

        <motion.p {...rise(0.32)} className="t-label text-cream/35 mt-8">
          BUILT BY GDG ON CAMPUS BABCOCK · 2026
        </motion.p>
      </div>
    </main>
  );
}
