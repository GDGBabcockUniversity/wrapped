"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();

  /**
   * Client-side navigation into the deck, so the browser's audio permission —
   * which is granted to a DOCUMENT once someone interacts with it — survives
   * the move. A hard navigation throws it away with the document.
   *
   * Nothing is started here any more. The deck opens on its own Play screen,
   * and that tap is both the gesture and the thing the visitor came to do;
   * priming a second engine from this click is how two soundtracks end up
   * playing over each other.
   *
   * The anchor and its href stay real, so modifier-clicks, middle-clicks and
   * a JS-less load all still work.
   */
  function enterWrapped(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push("/wrapped");
  }

  return (
    <main className="min-h-dvh bg-ink text-cream relative overflow-hidden flex flex-col items-center justify-center px-6 py-8 md:py-12">
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

        {/* w-max, NOT w-full: the title is sized in viewport units but the
            column is capped at max-w-sm (384px), so on any wide-and-short
            viewport the glyphs (≈5.2em ≈ 631px at the desktop size) overflow
            the box. text-align only distributes POSITIVE leftover space — with
            none to give it leaves the text at the line-start edge, so it spilled
            entirely rightward and sat ~124px off-centre. Sizing this wrapper to
            its own content instead lets the parent's items-center do the
            centering, whatever the glyphs measure. */}
        <motion.div
          {...rise(0.08)}
          className="w-max"
          style={{ viewTransitionName: "wrapped-title" } as React.CSSProperties}
        >
          {/* 16vw: 7 outline-tracked glyphs measure ≈5.2em WITH the 0.045em
              tracking (the 4.9em here before counted glyphs only), which is the
              widest that still fits a 390px phone inside the px-6 gutters. */}
          <h1
            className="text-outline-base text-outline-cream leading-none"
            style={{ fontSize: "clamp(3.25rem, min(16vw, 16vh), 8rem)" }}
          >
            {copy.landing.title}
          </h1>
          <p
            className="t-display text-gdg-blue kinetic kinetic-breathe"
            style={{ fontSize: "clamp(1.6rem, min(8.8vw, 8vh), 3.6rem)" }}
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
            onClick={enterWrapped}
            className="rounded-full bg-cream text-ink px-8 py-4 t-label w-full text-center"
          >
            {copy.landing.ctaWatch}
          </a>

          {showEmail ? (
            <EmailForm />
          ) : (
            <>
              <p className="t-body text-cream/60 text-sm">
                {copy.landing.sentNotice}
              </p>
              {/* A plain text button, not the second pill it used to be. The
                  Wrapped is sent now, so this is the recovery path for the
                  people it missed — it should not compete with WATCH. */}
              <button
                onClick={() => setShowEmail(true)}
                className="t-label text-cream/45 underline underline-offset-4 py-1"
              >
                {copy.landing.ctaPersonal}
              </button>
            </>
          )}
        </motion.div>

        <motion.p {...rise(0.32)} className="t-label text-cream/35 mt-8">
          BUILT BY GDG ON CAMPUS BABCOCK · 2026
        </motion.p>
      </div>
    </main>
  );
}
