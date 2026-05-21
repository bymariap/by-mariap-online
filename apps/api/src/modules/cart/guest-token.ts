import { Request, Response } from "express";
import { randomUUID } from "crypto";

export const GUEST_TOKEN_COOKIE = "guest_token";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function readGuestToken(req: Request): string | undefined {
  return req.cookies?.[GUEST_TOKEN_COOKIE];
}

export function ensureGuestToken(req: Request, res: Response): string {
  const existing = readGuestToken(req);
  if (existing) return existing;
  const token = randomUUID();
  res.cookie(GUEST_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
    maxAge: ONE_YEAR_MS,
  });
  return token;
}

export function clearGuestToken(res: Response): void {
  res.clearCookie(GUEST_TOKEN_COOKIE, { path: "/" });
}
