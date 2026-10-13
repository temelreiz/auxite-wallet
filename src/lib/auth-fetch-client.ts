// src/lib/auth-fetch-client.ts
//
// Attaches the login token to this app's own API calls from the browser.
//
// The web client identifies itself to 99 call sites across 29 files with an
// `x-wallet-address` header — a string the caller chooses, not a credential.
// The server is migrating those routes onto the JWT that login already issues
// and that the client already keeps in localStorage.
//
// A wrapper rather than 99 edits, for the same reason the mobile app uses one:
// a missed call site becomes a dead screen the moment the server stops
// accepting the header, and 99 hand edits will miss some. The mobile app
// (auxite-vault) routes everything through one http client and was therefore
// unaffected by the server changes that broke nothing — this brings the web to
// the same place.
//
// Additive: existing headers are untouched, so nothing changes until a route
// starts preferring the token.

const TOKEN_KEY = "authToken";

let installed = false;

/** Our own API, same origin, nothing else. */
function isOwnApi(input: RequestInfo | URL): boolean {
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request)?.url;
    if (typeof url !== "string") return false;
    if (url.startsWith("/api/")) return true;
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function alreadyAuthorized(init?: RequestInit): boolean {
  const headers = init?.headers;
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("Authorization");
  if (Array.isArray(headers)) return headers.some(([k]) => k.toLowerCase() === "authorization");
  return Object.keys(headers).some((k) => k.toLowerCase() === "authorization");
}

/**
 * Installs the interceptor. Browser only, and safe to call repeatedly: React
 * strict mode and Fast Refresh both re-run effects, and wrapping a wrapper
 * nests until the stack gives out.
 */
export function installAuthFetch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    if (!isOwnApi(input) || alreadyAuthorized(init)) {
      return originalFetch(input, init);
    }

    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      // Private mode or blocked storage. Not a reason to fail the request:
      // the routes that have not migrated still accept the old header.
      token = null;
    }
    if (!token) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  } as typeof fetch;
}
