// Calls to the server
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL!;

export type LoginResult = { token: string; username: string };

// Creates the account if the username is new. Returns a session token.
export async function login(username: string): Promise<LoginResult> {
  const response = await fetch(`${SERVER_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Server error ${response.status}`);
  }
  return data as LoginResult;
}