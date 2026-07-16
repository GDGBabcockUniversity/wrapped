import type { StoryProps } from "./types";

export function YourClubStory({ phase, guest }: StoryProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink text-cream px-6 pt-20 pb-16">
      <p className="t-label opacity-50">
        YOUR CLUB — {phase} {guest ? "(guest)" : ""}
      </p>
    </div>
  );
}
