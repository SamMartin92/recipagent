import { Recipe, Suggestion, ChatMessage } from "../types/recipe";
import type { Profile } from "../types/profile";

// App talk to Cloudfare worker here. Cloudfare calls Anthropic API to get recipes.
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL!;
// What the Worker sends back.
type ProxyResponse = { reply: string };


function profileFields(profile: Profile) {
  return { basics: profile.basics, diets: profile.diets, notes: profile.notes };
}
  
export async function getSuggestions(ingredients: string[], profile: Profile): Promise<Suggestion[]> {
  const response = await fetch(`${PROXY_URL}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, ...profileFields(profile) }),
  });

  // fetch doesn't throw on 4xx/5xx, so check ourselves.
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { suggestions: Suggestion[] };
  return data.suggestions;
}

export async function getRecipe(suggestion: Suggestion, ingredients: string[], profile: Profile): Promise<Recipe> {
  const response = await fetch(`${PROXY_URL}/recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggestion, ingredients, ...profileFields(profile) }),
  });

  // fetch doesn't throw on 4xx/5xx, so check ourselves.
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { recipe: Recipe };
  return data.recipe;
}

export async function sendChat(
  recipe: Recipe,
  ingredients: string[],
  profile: Profile,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${PROXY_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipe, ingredients, ...profileFields(profile), messages }),
  });
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as { message: string };
  return data.message;
}
