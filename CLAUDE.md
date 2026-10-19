# Recipagent: notes for Claude

## What this is
A personal iPhone app: I pick ingredients from my press/fridge, an LLM agent suggests a recipe, and we keep chatting to refine it. It saves favourites and learns my preferences.

Keep changes small and focused, functions single purpose with self explanatory names and briefly explain anything non-obvious.

## Structure
- `mobile/`: Expo app (React Native, TypeScript)
  - screens: `mobile/src/app/` (Expo Router)
  - storage code ONLY in `mobile/src/db/` (expo-sqlite)
  - calls to the proxy in `mobile/src/api/`
  - shared types in `mobile/src/types/`
- `proxy/`: Cloudflare Worker. Receives the chat, calls the Anthropic API (Claude Haiku 4.5), returns `{ reply }`.

## Rules
- Expo SDK 57 is pinned to match my Expo Go (my iPhone can't get a newer one). Do not upgrade the SDK.
- Add Expo / React Native packages with `npx expo install <pkg>`, never `npm install`. After dependency changes, run `npx expo install --check`.
- Never use the global `expo-cli`. If a command offers to install it globally, the local `expo` package is missing; fix that instead.
- No API keys anywhere in `mobile/`. Keys live in `proxy/.dev.vars` (git-ignored) or `wrangler secret`.
- v1 stores everything on the device. No accounts or backend server yet.
- The Worker must validate request bodies at runtime; TypeScript types alone are not checks.
- Proxy tests mock the LLM call. Never hit the real API in tests.
- Use plain React Native components. Ask before adding a UI library or other big dependency.

## Commands
- `mobile/`: `npx expo start --tunnel` (tunnel is required in Codespaces), `npx expo-doctor`
- `proxy/`: `npx wrangler dev`, `npx wrangler types`, `npm test`

## Environment
GitHub Codespaces; the app runs on my iPhone through Expo Go over the tunnel. React Native DevTools can't open here (no display), so ignore that error and debug with `console.log`.

