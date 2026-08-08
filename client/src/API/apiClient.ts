import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/** Raw fetch wrapper — attaches the current Supabase session as a Bearer token. Prefer apiRequest below for typed calls; this stays exported for callers that need the raw Response (e.g. checking res.ok before parsing). */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(`${API_URL}${path}`, { ...init, headers });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Every controller in this app responds with either `{ data: ... }` on
 * success or `{ error: "..." }` on failure — this wraps that shared shape
 * once, instead of every component repeating
 * `const body = await res.json(); if (!res.ok) {...}`.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return body.data as T;
}
