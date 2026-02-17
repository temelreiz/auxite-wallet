import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trust Center | Transparency & Custody",
  description:
    "Explore Auxite's transparency framework including custody architecture, Proof of Reserves, and institutional safeguards for fully allocated metals.",
  alternates: {
    canonical: "https://vault.auxite.io/trust-center",
  },
  openGraph: {
    title: "Auxite Trust Center",
    description:
      "Custody architecture, Proof of Reserves, and transparency standards behind Auxite's fully allocated metals.",
    url: "https://vault.auxite.io/trust-center",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auxite Trust Center",
    description:
      "Custody architecture, Proof of Reserves, and transparency standards behind Auxite's fully allocated metals.",
  },
};

export default function TrustCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* JSON-LD: Trust Report schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Report",
            name: "Auxite Proof of Reserves",
            description:
              "Public transparency into Auxite's fully allocated vaulted reserves and custody model.",
            publisher: {
              "@type": "Organization",
              name: "Auxite",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
