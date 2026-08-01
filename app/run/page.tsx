"use client";

import { Suspense, useEffect, useState } from "react";
import { DeckPlayer } from "@/components/run/deck-player";
import type { Snapshot } from "@/lib/snapshot";

/**
 * The twelve-beat deck (build spec §4), on the stitched soundtrack.
 *
 * Deliberately its own route while the old thirteen-story deck still works at
 * /wrapped: swapping them over is a one-line change once this has been watched
 * end to end on a real phone.
 *
 *   /run                 guest
 *   /run?fixture=top1    a loud member
 *   /run?fixture=member  an ordinary one
 */
function Run() {
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

export default function RunPage() {
  return (
    <Suspense fallback={<main className="fixed inset-0 bg-ink" />}>
      <Run />
    </Suspense>
  );
}
