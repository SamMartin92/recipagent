import { Recipe, Suggestion } from "../types/recipe";

// App talk to Cloudfare worker here. Cloudfare calls Anthropic API to get recipes.
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL!;
// What the Worker sends back.
type ProxyResponse = { reply: string };

export async function getSuggestions(ingredients: string[]): Promise<Suggestion[]> {
  const response = await fetch(`${PROXY_URL}/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });

  // fetch doesn't throw on 4xx/5xx, so check ourselves.
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { suggestions: Suggestion[] };
  return data.suggestions;
}

export async function getRecipe(suggestion: Suggestion, ingredients: string[]): Promise<Recipe> {
  const response = await fetch(`${PROXY_URL}/recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggestion, ingredients }),
  });

  // fetch doesn't throw on 4xx/5xx, so check ourselves.
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { recipe: Recipe };
  return data.recipe;
}