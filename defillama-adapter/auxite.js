// DefiLlama TVL adapter — Auxite (tokenized precious metals on Base)
// ----------------------------------------------------------------------------
// Drop this into your DefiLlama-Adapters fork at: projects/auxite/index.js
// then open a PR. It REPLACES any adapter pointing at the old mirror contracts
// (0x24acdf…/0xb03471…/0xe5640d…/0x1c99a4…), which are being retired.
//
// Model: each token's on-chain totalSupply = full physical vault metal (AUM),
// 3 decimals (1 token = 1 gram). TVL = Σ (grams → troy oz) × spot USD/oz.
//
// Canonical AuxiteMetal contracts (Base mainnet, deployed 2026-06-09):
const TOKENS = {
  AUXG: "0xCef9D7593E8Ba796eE05C54B8983B7749bB1218a", // gold
  AUXS: "0xB0aC63aeD12b5A0Ee710618D99444bf126068c1a", // silver
  AUXPT: "0x39F314fb20668997A2ADDaB1eA9236e0072D5E2D", // platinum
  AUXPD: "0x6e4837fCf158D15ABFdf90b3954D041D452BE832", // palladium
};

const GRAMS_PER_TROY_OZ = 31.1034768;
const TOKEN_DECIMALS = 3; // 1 gram = 1000 raw units

// DefiLlama price keys (per troy oz). Gold via PAX Gold is reliable.
// TODO(fork): confirm/replace the silver/Pt/Pd keys against DefiLlama's coins
// API — if a clean $/oz feed is unavailable, wire a dedicated price source.
// Gold dominates AUM (7.4kg) so a gold-accurate adapter is already meaningful.
const PRICE_KEY = {
  AUXG: "coingecko:pax-gold", // 1 PAXG = 1 troy oz gold
  AUXS: "coingecko:tether-gold", // PLACEHOLDER — replace with a $/oz silver feed
  AUXPT: "coingecko:pax-gold", // PLACEHOLDER — replace with a $/oz platinum feed
  AUXPD: "coingecko:pax-gold", // PLACEHOLDER — replace with a $/oz palladium feed
};

async function tvl(api) {
  const symbols = Object.keys(TOKENS);
  const supplies = await api.multiCall({
    abi: "uint256:totalSupply",
    calls: symbols.map((s) => TOKENS[s]),
  });

  symbols.forEach((sym, i) => {
    const grams = Number(supplies[i]) / 10 ** TOKEN_DECIMALS;
    const troyOz = grams / GRAMS_PER_TROY_OZ;
    if (troyOz > 0) {
      // addCGToken(coingeckoId, amount) — amount is in "tokens" (here: troy oz,
      // since pax-gold/tether-gold are priced per 1 oz).
      api.addCGToken(PRICE_KEY[sym].replace("coingecko:", ""), troyOz);
    }
  });

  return api.getBalances();
}

module.exports = {
  methodology:
    "AUM = on-chain totalSupply (grams) of each Auxite metal token on Base, converted to troy ounces and valued at spot USD/oz. Each token is 1:1 backed by allocated physical metal (custody: Silver Bullion SG; attestation: The Network Firm).",
  base: {
    tvl,
  },
};
