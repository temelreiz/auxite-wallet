"use client";

import { useEffect } from "react";
import { installAuthFetch } from "@/lib/auth-fetch-client";

/**
 * Installs the authenticated-fetch wrapper once, before any page makes a call.
 *
 * Rendered from the root layout so there is no page that can opt out of it by
 * being forgotten — which is exactly how 99 call sites ended up identifying
 * themselves with a header anyone could set.
 */
export function AuthFetchInstaller() {
  useEffect(() => {
    installAuthFetch();
  }, []);
  return null;
}
