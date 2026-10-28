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

// Where allocated metal is held. Certificates were assigned one of four vault
// codes (IST / ZH / DB / LN — 1,530 / 1,283 / 2,057 / 1,622 of 6,492 on
// 2026-10-28) with no bar inventory behind the choice; the metal is held in
// Istanbul. Documents show this location whatever code a record carries.
export const DOCUMENT_VAULT = {
  code: "IST",
  name: "Vault A – Istanbul Facility",
  id: "TR-IST-VAULT-01",
  location: "Istanbul",
  country: "Turkey",
} as const;
