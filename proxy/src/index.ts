/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const MODEL = "claude-haiku-4-5";
const DEFAULT_BASICS = ["oil", "salt", "pepper"];

type SuggestRequest = {
  ingredients: string[];
  basics?: string[]; // optional; defaults to oil, salt, pepper
};

type Suggestion = {
  title: string;
  description: string;
  minutes: number;
};

type RecipeRequest = {
  suggestion: Suggestion;
  ingredients: string[];
  basics?: string[];
};

type Recipe = {
  title: string;
  minutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatRequest = {
  recipe: Recipe;           // the recipe currently on screen
  ingredients: string[];
  basics?: string[];
  messages: ChatMessage[];  // the whole chat so far, ending with the user's new message
};


// ---------- Prompts ----------

const SUGGEST_PROMPT = `Someone tells you exactly what food they have. Suggest meals they can make right now.
Strict rule: each meal may ONLY use the listed ingredients and the basics. Nothing else.
Do not add or assume any other ingredient, even common ones like onion, garlic, rice, butter or herbs.
A meal doesn't need to use every listed ingredient.
Give exactly 3 suggestions, in this order:
1. The best fit.
2. A good alternative, slightly less obvious.
3. A wildcard: a more unusual dish, still using only what's available.
Do not label or explain the order.
Each description is one short sentence. "minutes" is the total time to make it.`;

const RECIPE_PROMPT = `You write clear home-cooking recipes.
Strict rule: each meal may ONLY use ingredients from the two lists given (ingredients I have, and basics).
Never assume any ingredient that isn't in those lists, even common ones like onion, garlic, rice, butter or herbs.
If one of those IS in either list, it's fine to use.
Write the full recipe for exactly the dish described, matching its title and description.
Use the listed ingredients plus the basics; it doesn't need to use every ingredient.
Give each ingredient with an amount. Keep steps short, one action each, in order.`;

const CHAT_PROMPT = `You are a cooking assistant chatting with a home cook about the recipe below.
Chat naturally and briefly, no preamble. Always reply in plain conversational sentences, never JSON.
Write plain text only, no markdown symbols like ** or #. Use simple numbered lines for steps.
Prefer what the cook has (their ingredients and basics).
If what they ask needs something extra, don't refuse or ask whether they have it: answer directly,
naming the extra ingredient, e.g. "If you have chilli flakes, add a pinch to the eggs in step 2."
If they ask for a change, write out the revised steps.`;

// ---------- tools ----------
// A "tool" with a strict schema. We force Claude to call it, so its answer
// always arrives as JSON in exactly this shape, never as free text.
const SUGGEST_TOOL = {
  name: "give_suggestions",
  description: "Return exactly 3 meal suggestions.",
  input_schema: {
    uses: {
      type: "array", items: { type: "string" },
      description: "Every ingredient this meal needs, each one from the list or the basics."
    },
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string", description: "One short sentence." },
            minutes: { type: "integer", description: "Total time in minutes." },
          },
          required: ["title", "description", "minutes"],
        },
      },
    },
    required: ["suggestions"],
  },
};

const RECIPE_TOOL = {
  name: "give_recipe",
  description: "Return the full recipe.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      minutes: { type: "integer", description: "Total time in minutes." },
      servings: { type: "integer" },
      ingredients: {
        type: "array",
        items: { type: "string", description: "Ingredient with amount, e.g. '3 eggs'." },
      },
      steps: {
        type: "array",
        items: { type: "string", description: "One short instruction." },
      },
    },
    required: ["title", "minutes", "servings", "ingredients", "steps"],
  },
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Send a POST request", { status: 405 });
    }
    try {
      const path = new URL(request.url).pathname;
      if (path === "/suggest") return await handleSuggest(request, env);
      if (path === "/recipe") return await handleRecipe(request, env);
      if (path === "/chat") return await handleChat(request, env);
      return new Response("Not found", { status: 404 });
    } catch (err) {
      return new Response(String(err), { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

// ---------- Routes ----------

// POST /suggest  { ingredients: [...] }  ->  { suggestions: [3 x Suggestion] }
async function handleSuggest(request: Request, env: Env): Promise<Response> {
  const body = await request.json<SuggestRequest>();

  const ok =
    Array.isArray(body.ingredients) &&
    body.ingredients.length > 0 &&
    body.ingredients.every((i) => typeof i === "string");
  if (!ok) {
    return new Response("Request body must be { ingredients: string[] }", {
      status: 400,
    });
  }

  const basics = body.basics ?? DEFAULT_BASICS;

  const data = await callLLM(env, {
    model: MODEL,
    max_tokens: 1024,
    system: SUGGEST_PROMPT,
    tools: [SUGGEST_TOOL],
    tool_choice: { type: "tool", name: "give_suggestions" }, // must use the tool
    messages: [
      {
        role: "user",
        content: `Ingredients I have: ${body.ingredients.join(", ")}.\nBasics I always have: ${basics.join(", ")}.`,
      },
    ],
  });
  console.log(JSON.stringify(data, null, 2));
  // The answer is in the tool_use block's "input", already parsed as JSON.
  const toolUse = data.content?.find((block: any) => block.type === "tool_use");
  const suggestions: Suggestion[] | undefined = toolUse?.input?.suggestions;
  if (!Array.isArray(suggestions)) {
    return new Response("Model returned no suggestions", { status: 502 });
  }
  return Response.json({ suggestions });
}

async function handleRecipe(request: Request, env: Env): Promise<Response> {
  const body = await request.json<RecipeRequest>();

  const ok =
    typeof body.suggestion?.title === "string" &&
    Array.isArray(body.ingredients) &&
    body.ingredients.every((i) => typeof i === "string");
  if (!ok) {
    return new Response('Body must be { "suggestion": {...}, "ingredients": ["..."] }', { status: 400 });
  }

  const basics = body.basics ?? DEFAULT_BASICS;
  const { title, description } = body.suggestion;

  const data = await callLLM(env, {
    model: MODEL,
    max_tokens: 2048,
    system: RECIPE_PROMPT,
    tools: [RECIPE_TOOL],
    tool_choice: { type: "tool", name: "give_recipe" },
    messages: [
      {
        role: "user",
        content:
          `Dish: ${title}. ${description}\n` +
          `Ingredients I have: ${body.ingredients.join(", ")}.\n` +
          `Basics I always have: ${basics.join(", ")}.`,
      },
    ],
  });

  const toolUse = data.content?.find((block: any) => block.type === "tool_use");
  const recipe: Recipe | undefined = toolUse?.input;

  if (!recipe || !Array.isArray(recipe.steps)) {
    return new Response("Model returned no recipe", { status: 502 });
  }
  return Response.json({ recipe });
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.json<ChatRequest>();

  const ok =
    Array.isArray(body.recipe?.steps) &&
    Array.isArray(body.ingredients) &&
    Array.isArray(body.messages) &&
    body.messages.length > 0 &&
    body.messages.at(-1)?.role === "user";
  if (!ok) {
    return new Response('Body must be { "recipe", "ingredients", "messages" } ending with a user message', { status: 400 });
  }

  const basics = body.basics ?? DEFAULT_BASICS;

  const data = await callLLM(env, {
    model: MODEL,
    max_tokens: 2048,
    system:
      `${CHAT_PROMPT}\n\n` +
      `The user's ingredients: ${body.ingredients.join(", ")}.\n` +
      `The user's basics: ${basics.join(", ")}.\n\n` +
      `Recipe (for reference only; never reply in JSON):\n${JSON.stringify(body.recipe)}`,
    messages: body.messages,
  });

  const message = data.content?.find((block: any) => block.type === "text")?.text;
  if (typeof message !== "string") {
    return new Response("Model returned no reply", { status: 502 });
  }
  return Response.json({ message });
}

async function callLLM(env: Env, body: object): Promise<any> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
