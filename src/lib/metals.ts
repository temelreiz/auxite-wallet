// src/lib/metals.ts

export const METALS = [
  {
    id: "AUXG",
    symbol: "AUXG",
    name: "Auxite Gold (AUXG)",
    tokenAddress: "0x5B18e37006B605c64b6d296409c7A98e136d68e9",
  },
  {
    id: "AUXS",
    symbol: "AUXS",
    name: "Auxite Silver (AUXS)",
    tokenAddress: "0xfAEe6F8B00862524719909D6c367b49Ac7AEF69f",
  },
  {
    id: "AUXPT",
    symbol: "AUXPT",
    name: "Auxite Platinum (AUXPT)",
    tokenAddress: "0x8a145B64C5c2F1e3Fa09480db119E59a240722F0",
  },
  {
    id: "AUXPD",
    symbol: "AUXPD",
    name: "Auxite Palladium (AUXPD)",
    tokenAddress: "0xd4A5357B8881fA6a649CbA7117ba96af5B264238",
  },
] as const;

export type MetalId = (typeof METALS)[number]["id"];
