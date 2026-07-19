import type { ComponentType } from "react";
import type { StoryId } from "@/lib/stories";
import type { StoryProps } from "./types";
import { TheYearStory } from "./01-the-year";
import { MomentsStory } from "./02-moments";
import { BuiltStory } from "./03-built";
import { GroupChatStory } from "./11-group-chat";
import { PeopleStory } from "./04-people";
import { YourEventsStory } from "./05-your-events";
import { StandingStory } from "./06-standing";
import { YourChapterStory } from "./07-your-chapter";
import { YourClubStory } from "./08-your-club";
import { WhatsNextStory } from "./09-whats-next";
import { SummaryStory } from "./10-summary";

export const STORY_COMPONENTS: Record<StoryId, ComponentType<StoryProps>> = {
  "the-year": TheYearStory,
  moments: MomentsStory,
  built: BuiltStory,
  "group-chat": GroupChatStory,
  people: PeopleStory,
  "your-events": YourEventsStory,
  standing: StandingStory,
  "your-chapter": YourChapterStory,
  "your-club": YourClubStory,
  "whats-next": WhatsNextStory,
  summary: SummaryStory,
};
