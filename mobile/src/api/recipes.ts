// App talk to Cloudfare worker here. Cloudfare calls Anthropic API to get recipes.
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL!;
// What the Worker sends back.
type ProxyResponse = { reply: string };

export async function askForRecipe(ingredients: string[]): Promise<string> {
  const message = `I have ${ingredients.join(", ")}. Suggest a recipe I can make.`;
  console.log("hello");
  console.log("Calling", PROXY_URL, "with", message);
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  // fetch doesn't throw on 4xx/5xx, so check ourselves.
  if (!response.ok) {
    throw new Error(`Proxy error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as ProxyResponse;
  return data.reply;
}