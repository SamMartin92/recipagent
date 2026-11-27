import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";

import { db } from "./db.js";
import { checkPassword, hashPassword } from "./passwords.js";

// userId is set by the session check below, for every /me/* route.
const app = new Hono<{ Variables: { userId: number } }>();

const DEFAULT_BASICS = ["Oil", "Salt", "Pepper"];

const isStringList = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((i) => typeof i === "string");

// ---------- Log in (username only; creates the account if it's new) ----------

// POST /login  { username }  ->  { token, username }
// New username: creates the account. Existing: checks the password.
app.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return c.json({ error: "Username must be 2-30 letters, numbers, _ or -" }, 400);
  }
  if (password.length < 6 || password.length > 100) {
    return c.json({ error: "Password must be at least 6 characters" }, 400);
  }

  const existing = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; username: string; password_hash: string | null } | undefined;

  let user: { id: number; username: string };

  if (!existing) {
    // New username: create the account and a default profile.
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(username, hashPassword(password));
    user = { id: Number(result.lastInsertRowid), username };

    db.prepare("INSERT INTO profiles (user_id, basics, diets, notes) VALUES (?, ?, ?, ?)")
      .run(user.id, JSON.stringify(DEFAULT_BASICS), "[]", "");
  } else if (!existing.password_hash || !checkPassword(password, existing.password_hash)) {
    // Existing username, wrong password.
    return c.json({ error: "Wrong password for this username" }, 401);
  } else {
    user = existing;
  }

  // Same as before: a random token for the app to send with every request.
  const token = randomUUID();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);

  return c.json({ token, username: user.username });
});

// ---------- Session check: every /me/* route needs a valid token ----------

app.use("/me/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace(/^Bearer /, "");
  const session = token
    ? (db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as
      | { user_id: number }
      | undefined)
    : undefined;

  if (!session) return c.json({ error: "Not logged in" }, 401);
  c.set("userId", session.user_id);
  await next();
});

// ---------- Profile ----------

// GET /me/profile  ->  { basics, diets, notes }
app.get("/me/profile", (c) => {
  const row = db
    .prepare("SELECT basics, diets, notes FROM profiles WHERE user_id = ?")
    .get(c.get("userId")) as { basics: string; diets: string; notes: string };

  return c.json({ basics: JSON.parse(row.basics), diets: JSON.parse(row.diets), notes: row.notes });
});

// PUT /me/profile  { basics, diets, notes }  ->  { ok }
app.put("/me/profile", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !isStringList(body.basics) || !isStringList(body.diets) || typeof body.notes !== "string") {
    return c.json({ error: 'Body must be { "basics": [], "diets": [], "notes": "" }' }, 400);
  }

  db.prepare("UPDATE profiles SET basics = ?, diets = ?, notes = ? WHERE user_id = ?").run(
    JSON.stringify(body.basics),
    JSON.stringify(body.diets),
    body.notes.slice(0, 500),
    c.get("userId")
  );
  return c.json({ ok: true });
});

// GET /me/check  ->  { ok, username }
// Used by the Worker to confirm a token belongs to a logged-in user.
app.get("/me/check", (c) => {
  const user = db
    .prepare("SELECT username FROM users WHERE id = ?")
    .get(c.get("userId")) as { username: string };
  return c.json({ ok: true, username: user.username });
})

// ---------- Ingredients ----------

// GET /me/ingredients  ->  { ingredients: [{ name, useCount }] }, most-used first
app.get("/me/ingredients", (c) => {
  const rows = db
    .prepare(
      `SELECT name, use_count AS useCount FROM ingredients
       WHERE user_id = ?
       ORDER BY use_count DESC, last_used_at DESC, name`
    )
    .all(c.get("userId"));
  return c.json({ ingredients: rows });
});

// POST /me/ingredients  { name }  ->  { ok }
app.post("/me/ingredients", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    return c.json({ error: 'Body must be { "name": "..." }' }, 400);
  }
  db.prepare("INSERT OR IGNORE INTO ingredients (user_id, name) VALUES (?, ?)").run(c.get("userId"), name);
  return c.json({ ok: true });
});

// POST /me/ingredients/used  { names: [...] }  ->  { ok }   (bumps use counts)
app.post("/me/ingredients/used", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!isStringList(body?.names)) {
    return c.json({ error: 'Body must be { "names": ["..."] }' }, 400);
  }
  const bump = db.prepare(
    "UPDATE ingredients SET use_count = use_count + 1, last_used_at = datetime('now') WHERE user_id = ? AND name = ?"
  );
  for (const name of body.names) bump.run(c.get("userId"), name);
  return c.json({ ok: true });
});

// ---------- Favourites ----------

// GET /me/favourites  ->  { favourites: [{ id, title, minutes }] }, newest first
app.get("/me/favourites", (c) => {
  const rows = db
    .prepare("SELECT id, title, recipe FROM favourites WHERE user_id = ? ORDER BY id DESC")
    .all(c.get("userId")) as { id: number; title: string; recipe: string }[];
  return c.json({
    favourites: rows.map((r) => ({ id: r.id, title: r.title, minutes: JSON.parse(r.recipe).minutes })),
  });
});

// GET /me/favourites/:id  ->  { id, recipe, ingredients }
app.get("/me/favourites/:id", (c) => {
  const row = db
    .prepare("SELECT id, recipe, ingredients FROM favourites WHERE id = ? AND user_id = ?")
    .get(Number(c.req.param("id")), c.get("userId")) as
    | { id: number; recipe: string; ingredients: string }
    | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ id: row.id, recipe: JSON.parse(row.recipe), ingredients: JSON.parse(row.ingredients) });
});

// POST /me/favourites  { recipe, ingredients }  ->  { id }
app.post("/me/favourites", async (c) => {
  const body = await c.req.json().catch(() => null);
  const r = body?.recipe;
  const ok =
    r && typeof r.title === "string" && Array.isArray(r.steps) &&
    Array.isArray(r.ingredients) && isStringList(body.ingredients);
  if (!ok) return c.json({ error: 'Body must be { "recipe": {...}, "ingredients": [...] }' }, 400);

  const result = db
    .prepare("INSERT INTO favourites (user_id, title, recipe, ingredients) VALUES (?, ?, ?, ?)")
    .run(c.get("userId"), r.title, JSON.stringify(r), JSON.stringify(body.ingredients));
  return c.json({ id: Number(result.lastInsertRowid) });
});

// DELETE /me/favourites/:id  ->  { ok }
app.delete("/me/favourites/:id", (c) => {
  db.prepare("DELETE FROM favourites WHERE id = ? AND user_id = ?")
    .run(Number(c.req.param("id")), c.get("userId"));
  return c.json({ ok: true });
});

// ---------- Start ----------

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`foodbrain server running on http://localhost:${port}`);
});