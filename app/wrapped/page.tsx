"use client";

import { Suspense, useEffect, useState } from "react";
import { DeckPlayer } from "@/components/run/deck-player";
import type { Snapshot } from "@/lib/snapshot";

/**
 * The Wrapped: twelve beats, five movements, one stitched soundtrack
 * (build spec §4).
 *
 * The previous thirteen-story deck still exists at /wrapped/classic. It is
 * kept because it is the only thing that has been watched on real phones, not
 * because anything still points at it.
 */
function Wrapped() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fixture = new URLSearchParams(window.location.search).get("fixture");
    fetch(fixture ? `/api/me?fixture=${fixture}` : "/api/me")
      .then((r) => r.json())
      .then((d) => setSnapshot(d.snapshot ?? null))
      .catch(() => setSnapshot(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="fixed inset-0 bg-ink" />;
  return <DeckPlayer snapshot={snapshot} />;
}

export default function WrappedPage() {
  return (
    <Suspense fallback={<main className="fixed inset-0 bg-ink" />}>
      <Wrapped />
    </Suspense>
  );
}
