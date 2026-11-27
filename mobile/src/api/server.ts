// Calls to the foodbrain server 
// The Worker (recipes.ts) is separate: this server only stores user data.
import { type Profile } from "@/types/profile";
import type { Recipe } from "@/types/recipe";

// const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL!;
const SERVER_URL = "https://ideal-space-parakeet-v7xjjg66jwrhww94-3000.app.github.dev"; // for local dev; the Worker uses the same URL

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
export function login(username: string, password: string) {
  return request<LoginResult>("/login", null, {
    method: "POST",
    body: JSON.stringify({ username, password }),
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

// ---------- Favourites (per user) ----------

export type FavouriteSummary = { id: number; title: string; minutes: number };

export async function fetchFavourites(token: string) {
  const data = await request<{ favourites: FavouriteSummary[] }>("/me/favourites", token);
  return data.favourites;
}

export function fetchFavourite(token: string, id: number) {
  return request<{ id: number; recipe: Recipe; ingredients: string[] }>(`/me/favourites/${id}`, token);
}

export function addFavourite(token: string, recipe: Recipe, ingredients: string[]) {
  return request<{ id: number }>("/me/favourites", token, {
    method: "POST",
    body: JSON.stringify({ recipe, ingredients }),
  });
}

export function deleteFavourite(token: string, id: number) {
  return request(`/me/favourites/${id}`, token, { method: "DELETE" });
}