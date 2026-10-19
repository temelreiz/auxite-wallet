// src/lib/security/require-user.ts
//
// Identity for API routes.
//
// Most routes historically read `x-wallet-address` and trusted it. That header
// is whatever the caller types, so it identified nobody: anyone could act as
// anyone by sending their address. These helpers replace that with the
// credentials the system already issues — the login JWT for users, the admin
// session token for operators — and they never fall back to an unverified
// header. A fallback would make the check decorative.

import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthedUser {
  address: string;
  userId?: string;
  email?: string;
}

export type AuthResult<T> =
  | { ok: true; user: T }
  | { ok: false; response: NextResponse };

const deny = (status: number, error: string): { ok: false; response: NextResponse } => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

function bearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Resolves the caller from the login JWT (`Authorization: Bearer <token>`),
 * which carries `walletAddress` as a signed claim.
 *
 * Returns the lowercased address, or a ready-to-return 401. Callers must use
 * the returned address and ignore any address in the request body or headers —
 * otherwise the caller still chooses who they are.
 */
export function requireUser(request: NextRequest): AuthResult<AuthedUser> {
  if (!JWT_SECRET) {
    // Fail closed: without a secret we cannot verify anything, and treating
    // that as "allow" is how an env mistake becomes an open door.
    console.error("requireUser: JWT_SECRET is not set — denying");
    return deny(500, "Auth not configured");
  }

  const token = bearer(request);
  if (!token) return deny(401, "Authentication required");

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      walletAddress?: string;
      userId?: string;
      email?: string;
    };
    const address = decoded?.walletAddress?.toLowerCase();
    if (!address) return deny(401, "Token carries no wallet address");
    return { ok: true, user: { address, userId: decoded.userId, email: decoded.email } };
  } catch {
    return deny(401, "Invalid or expired session");
  }
}

/**
 * Resolves an operator from the admin session that /api/admin/auth issues and
 * stores at `admin:session:<token>`.
 *
 * The admin UI sends it as `Authorization: Bearer <token>` (it lives in
 * sessionStorage); the cookie form is accepted too, but the VALUE is validated
 * either way — presence alone proves nothing.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<AuthResult<{ token: string }>> {
  const token = bearer(request) || request.cookies.get("admin_session")?.value || null;
  if (!token) return deny(401, "Admin authentication required");

  try {
    const session = await getRedis().get(`admin:session:${token}`);
    if (!session) return deny(401, "Invalid or expired admin session");
    return { ok: true, user: { token } };
  } catch (e) {
    // A Redis failure must not hand out admin access.
    console.error("requireAdmin: session lookup failed", e);
    return deny(503, "Auth backend unavailable");
  }
}

/**
 * Like `requireUser`, but also accepts a server-to-server caller presenting
 * `x-api-key: INTERNAL_API_KEY`, which may then name the address it acts for.
 *
 * This exists for the recurring-buy and recurring-stake jobs, which call
 * /api/staking on a customer's behalf and have no login token to present. The
 * key is required to be non-empty: `INTERNAL_API_KEY` is not configured in
 * production today, so an equality check against an unset env would otherwise
 * let a caller sending no header at all match it.
 */
export function requireUserOrInternal(
  request: NextRequest,
  bodyAddress?: string,
): AuthResult<AuthedUser & { internal: boolean }> {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.INTERNAL_API_KEY;

  if (apiKey && expected && apiKey === expected) {
    const address = bodyAddress?.toLowerCase();
    if (!address) return deny(400, "address is required for internal calls");
    return { ok: true, user: { address, internal: true } };
  }

  const user = requireUser(request);
  if (!user.ok) return user;
  return { ok: true, user: { ...user.user, internal: false } };
}
