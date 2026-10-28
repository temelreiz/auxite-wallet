// The legal entity named on customer documents (participation notes,
// allocation certificates). Decided 2026-10-28.
//
// Documents used to pick an entity by vault code and default to
// "Auxite Precious Metals AG, Zurich" — and a "…Trading LLC, Dubai" — which
// are not Auxite entities. Every document now names the Turkish company.
export const DOCUMENT_ISSUER = {
  name: "Auxite Kıymetli Madenler Ticaret A.Ş.",
  address: "Istanbul, Turkey",
} as const;
