import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proof of Reserves | Transparency Report",
  description:
    "Independent transparency into Auxite's vaulted reserves. Fully allocated metals backed by custody-first architecture and public reserve reporting.",
  alternates: {
    canonical: "https://vault.auxite.io/trust/reserves",
  },
  openGraph: {
    title: "Auxite Proof of Reserves",
    description:
      "Fully allocated metals backed by vaulted reserves and transparency-first reporting.",
    url: "https://vault.auxite.io/trust/reserves",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auxite Proof of Reserves",
    description:
      "Fully allocated metals backed by vaulted reserves and transparency-first reporting.",
  },
};

export default function ReservesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
