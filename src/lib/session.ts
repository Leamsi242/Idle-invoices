import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

/**
 * No accounts in version 1: each browser gets an anonymous random session id in an
 * httpOnly cookie, and every stored row carries it.
 */
export const SESSION_COOKIE = "sd_session";
const VALID = /^[0-9a-f-]{36}$/;

export async function getSessionId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && VALID.test(value) ? value : null;
}

export async function getOrCreateSessionId(): Promise<string> {
  const existing = await getSessionId();
  if (existing) return existing;
  const id = randomUUID();
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 86_400,
  });
  return id;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
