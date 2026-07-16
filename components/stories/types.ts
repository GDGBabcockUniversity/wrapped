import type { Snapshot } from "@/lib/snapshot";
import type { Phase } from "@/components/story-engine/use-story-state";

export interface StoryProps {
  phase: Phase;
  active: boolean;
  snapshot: Snapshot | null;
  guest: boolean;
  paused: boolean;
}
