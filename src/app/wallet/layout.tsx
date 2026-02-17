import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet | Allocated Metals Dashboard",
  description:
    "Manage fully allocated precious metals with real-time custody insights, secure transfers, and transparency-first reporting.",
  alternates: {
    canonical: "https://vault.auxite.io/wallet",
  },
  openGraph: {
    title: "Auxite Wallet | Allocated Metals Dashboard",
    description:
      "Manage fully allocated precious metals with real-time custody insights, secure transfers, and transparency-first reporting.",
    url: "https://vault.auxite.io/wallet",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Auxite Wallet | Allocated Metals Dashboard",
    description:
      "Manage fully allocated precious metals with real-time custody insights and secure transfers.",
  },
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
