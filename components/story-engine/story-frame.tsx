import type { ReactNode } from "react";

export function StoryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-ink">
      <div className="stage relative overflow-hidden w-full h-[100dvh] md:aspect-[9/16] md:h-[min(100dvh,900px)] md:w-auto md:rounded-2xl">
        {children}
      </div>
    </div>
  );
}
