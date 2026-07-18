import { notFound } from "next/navigation";
import { STORIES } from "@/lib/stories";

const PUBLIC_IDS = ["the-year", "moments", "built", "people", "whats-next"] as const;
const PERSONAL_IDS = ["your-events", "standing", "your-chapter", "your-club", "summary"] as const;
const FIXTURE_NAMES = [
  "top1",
  "member",
  "zero",
  "newmember",
  "unmatched",
  "builder",
  "connector",
  "observer",
  "sprinter",
  "guest",
] as const;

function labelFor(id: string) {
  return STORIES.find((s) => s.id === id)?.label ?? id;
}

export default function DebugCardsPage() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEBUG) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-ink text-cream p-8">
      <h1 className="t-display mb-8">Share card debug grid</h1>

      <section className="mb-12">
        <h2 className="t-label text-cream/55 mb-4">PUBLIC CARDS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PUBLIC_IDS.map((id) => (
            <div key={id} className="flex flex-col gap-2">
              <img
                src={`/api/share/${id}?nocache=1`}
                alt={id}
                className="w-full rounded-lg border border-cream/15"
              />
              <p className="t-label text-cream/60 text-center">{labelFor(id)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="t-label text-cream/55 mb-4">PERSONAL CARDS &times; FIXTURES</h2>
        {PERSONAL_IDS.map((id) => (
          <div key={id} className="mb-10">
            <h3 className="t-body font-bold mb-3">{labelFor(id)}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {FIXTURE_NAMES.map((fixture) => (
                <div key={fixture} className="flex flex-col gap-2">
                  <img
                    src={`/api/share/${id}?fixture=${fixture}`}
                    alt={`${id}-${fixture}`}
                    className="w-full rounded-lg border border-cream/15"
                  />
                  <p className="t-label text-cream/60 text-center text-[0.55rem]">
                    {fixture}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
