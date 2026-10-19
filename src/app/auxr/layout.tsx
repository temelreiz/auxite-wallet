import type { Metadata } from "next";

// /auxr is the page people share for the AUXR price (exchanges post it on X).
// Without its own metadata it inherited the site default — "Fully Allocated
// Precious Metals" — which is wrong for AUXR: it is price exposure to a
// basket, not allocated bullion. The card image shows the live NAV.
const TITLE = "AUXR — Live NAV";
const DESCRIPTION =
  "Auxite Reserve (AUXR): live net asset value of a fixed gold, silver, platinum and palladium basket at global spot. ERC-20 on Base.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://vault.auxite.io/auxr" },
  openGraph: {
    title: `${TITLE} | Auxite`,
    description: DESCRIPTION,
    url: "https://vault.auxite.io/auxr",
    siteName: "Auxite",
    type: "website",
    images: [{ url: "/api/og/auxr", width: 1200, height: 630, alt: "AUXR live NAV" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Auxite`,
    description: DESCRIPTION,
    images: ["/api/og/auxr"],
  },
};

export default function AuxrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
