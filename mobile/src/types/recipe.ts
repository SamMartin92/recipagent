// Shapes shared with the Worker (proxy/src/index.ts). 
export type Suggestion = {
  title: string;
  description: string;
  minutes: number;
};

export type Recipe = {
  title: string;
  minutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string };