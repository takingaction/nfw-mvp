// Share Your Story form — single source of truth for prompt copy and program options.
// Mirrored in mobile/types/content.ts (separate Expo bundle); keep the two in sync.

export const STORY_PROGRAMS = [
  { value: "microgrants", label: "Microgrants" },
  { value: "perks", label: "Perks & Discounts" },
  { value: "zero_dollar_store", label: "Zero Dollar Store" },
] as const;

export type StoryProgram = (typeof STORY_PROGRAMS)[number]["value"];

export const STORY_PROGRAM_VALUES: readonly string[] = STORY_PROGRAMS.map((p) => p.value);

export const storyProgramLabel = (value: string) =>
  STORY_PROGRAMS.find((p) => p.value === value)?.label ?? value;

/** Text prompts in display order. `programsUsed` checkboxes render after `surprisedBy`. */
export const STORY_TEXT_PROMPTS = {
  howNfwHelped: "How has NFW membership made a difference for you?",
  surprisedBy: "How has NFW membership surprised you?",
  improvementIdeas:
    "If you had a magic wand, how would you improve the NFW membership experience?",
  feedback: "Do you have specific feedback or ideas? We’d love to hear them.",
  whyJoin:
    "What would you tell someone considering joining NFW? Why should others join this community?",
} as const;

export type StoryTextKey = keyof typeof STORY_TEXT_PROMPTS;

export const STORY_PROGRAMS_PROMPT = "Which programs have you utilized? (check all that apply)";

export const STORY_PERMISSIONS = {
  permissionGranted:
    "I grant NFW permission to utilize excerpts from this submission for its website, email newsletters, social media platforms, and various other external outreach. When using quotes, we will only attribute them by your first name, age, and state of residence.",
  preferAnonymous: "I prefer that any of my quoted statements remain anonymous.",
  interestedVideo:
    "Are you interested in recording a brief video for NFW's social media platforms? A modest honorarium may be available for participants.",
} as const;

export const STORY_INTRO =
  "Thank you for being a member of the National Fund for Women! Hearing from you helps us make membership as impactful as possible while growing our community to reach women all across the country.";

/** Legacy prompts (pre–Oct 2026). Shown in admin only when an old submission has an answer. */
export const LEGACY_STORY_PROMPTS = {
  drawn_to_membership: "What drew you to becoming a National Fund for Women member?",
  programs_engaged: "Which NFW program(s) have you engaged with? What was your experience?",
  favorite_part: "What is your favorite part about being an NFW member?",
} as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "AS", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "GU", "HI",
  "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MP", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "VI", "WA", "WV", "WI", "WY",
] as const;
