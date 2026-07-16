"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";

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
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.landing.emailPlaceholder}
          aria-label={copy.landing.emailLabel}
          className="flex-1 rounded-full border border-cream/30 bg-transparent px-5 py-3 text-cream t-body placeholder:text-cream/40 focus:outline-none focus:border-cream/70"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-cream text-ink px-5 py-3 t-label disabled:opacity-60"
        >
          {status === "loading" ? "…" : copy.landing.emailSubmit}
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

export default function LandingPage() {
  const [showEmail, setShowEmail] = useState(false);

  return (
    <main className="min-h-dvh bg-ink text-cream relative overflow-hidden flex flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-[0.06] t-label text-[8rem] tracking-widest select-none pointer-events-none"
      >
        <div className="animate-marquee inline-block">
          {MARQUEE_TEXT.repeat(2)}
        </div>
      </div>

      <div className="relative max-w-sm mx-auto flex flex-col items-center text-center gap-6">
        <p className="t-label text-cream/55">{copy.landing.eyebrow}</p>

        <div style={{ viewTransitionName: "wrapped-title" } as React.CSSProperties}>
          <h1
            className="text-outline-base text-outline-cream leading-none"
            style={{ fontSize: "clamp(4rem, 22vw, 9rem)" }}
          >
            {copy.landing.title}
          </h1>
          <p
            className="t-display text-gdg-blue"
            style={{ fontSize: "clamp(1.6rem, 8.8vw, 3.6rem)" }}
          >
            {copy.landing.year}
          </p>
        </div>

        <p className="t-body text-cream/75">{copy.landing.sub}</p>

        <div className="flex flex-col items-center gap-3 w-full mt-2">
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
        </div>

        <p className="t-label text-cream/35 mt-8">
          BUILT BY GDG ON CAMPUS BABCOCK · 2026
        </p>
      </div>
    </main>
  );
}
