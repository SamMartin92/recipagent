// The user's profile. Sent to the Worker so the LLM can follow it.
export type Profile = {
  basics: string[]; // ingredients always available, 
  diets: string[]; // empty = no restrictions
  notes: string; // free-text likes and dislikes
};

export const DEFAULT_PROFILE: Profile = {
  basics: ["Oil", "Salt", "Pepper"],
  diets: [],
  notes: "",
};