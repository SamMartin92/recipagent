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

type ChatRequest = { message: string };

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "POST") {
      		return new Response("Send a POST request", { status: 405 });
    }	
	const { message } = await request.json<ChatRequest>();

    if (typeof message !== "string") {
      return new Response('Body must be { "message": "..." }', { status: 400 });
    }

	const llmResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: "You are a helpful home-cooking assistant. Suggest recipes using the ingredients the user has.",
          messages: [{ role: "user", content: message }],
      })
    });
    

	if (!llmResponse.ok) {
      return new Response(await llmResponse.text(), { status: llmResponse.status });
    }
	const data = await llmResponse.json<any>();
  const reply = data.content?.[0].text ?? "Empty response";

    return Response.json({ reply });
	},
} satisfies ExportedHandler<Env>;
