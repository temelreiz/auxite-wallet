import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/vault/", "/wallet/", "/profile/", "/kyc/", "/fund-vault/", "/allocate/", "/redeem/", "/stake/", "/notifications/", "/statements/", "/security/", "/sentry-example-page/"],
      },
    ],
    sitemap: "https://vault.auxite.io/sitemap.xml",
  };
}
