// Calls to the foodbrain server 
// The Worker (recipes.ts) is separate: this server only stores user data.
import { type Profile } from "@/types/profile";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL!;

export type LoginResult = { token: string; username: string };
export type Ingredient = { name: string; useCount: number };

// Called when the server rejects our token (e.g. the server's data was reset).
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

// Shared helper: sends JSON, adds the token, and turns errors into exceptions.
async function request<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {
  onUnauthorized?.();
}
  if (!response.ok) {
    throw new Error(data.error ?? `Server error ${response.status}`);
  }
  return data as T;
}

// ---------- Login ----------

// Creates the account if the username is new. Returns a session token.
export function login(username: string) {
  return request<LoginResult>("/login", null, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

// ---------- Profile (per user) ----------

export function fetchProfile(token: string) {
  return request<Profile>("/me/profile", token);
}

export function saveProfile(token: string, profile: Profile) {
  return request("/me/profile", token, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

// ---------- Ingredients (per user) ----------

// Most-used first; the server does the sorting.
export async function fetchIngredients(token: string) {
  const data = await request<{ ingredients: Ingredient[] }>("/me/ingredients", token);
  return data.ingredients;
}

export function addIngredient(token: string, name: string) {
  return request("/me/ingredients", token, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Bumps the use count of each, so they move up the list.
export function markIngredientsUsed(token: string, names: string[]) {
  return request("/me/ingredients/used", token, {
    method: "POST",
    body: JSON.stringify({ names }),
  });
}