import type { StoryProps } from "./types";

export function MomentsStory({ phase }: StoryProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-cream text-ink px-6 pt-20 pb-16">
      <p className="t-label opacity-50">THE MOMENTS — {phase}</p>
    </div>
  );
}
