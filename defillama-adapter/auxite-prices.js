// DefiLlama price adapter — Auxite tokenized precious metals (Base)
// ----------------------------------------------------------------------------
// Purpose: give DefiLlama a price source for AUXG/AUXS/AUXPT/AUXPD so the RWA
// "Onchain Marketcap" (circulating supply × price) is populated. These tokens
// have NO DEX/CEX market and are not on CoinGecko, so DefiLlama currently has
// no price → marketcap shows blank. They are valued at issuer NAV.
//
// Source of truth is ON-CHAIN and verifiable: AuxiteOracleV2 (Base mainnet)
// publishes USD-per-gram (E6) for each metal, updated regularly by the issuer.
// Since 1 token = 1 gram of allocated physical metal, token price = per-gram NAV.
//
//   Oracle:  0xDB36fFD8a762226928d62a2Fe6F19bB329b5EbbE  (Base, chainId 8453)
//   read:    getPricePerGramE6(bytes32 metalId) → USD/gram × 1e6
//   metalId: keccak256("GOLD" | "SILVER" | "PLATINUM" | "PALLADIUM")
//
// Drop into the DefiLlama coins/price pipeline. Output shape mirrors a standard
// custom price adapter: one entry per token, keyed `base:<address>`.
//
// NOTE: prices are issuer NAV read from an on-chain oracle (not a market). This
// is the canonical valuation for an allocated-metal RWA with primary-only
// mint/redeem — the same basis used by the TVL adapter (auxite.js).

const sdk = require("@defillama/sdk");

const CHAIN = "base";
const ORACLE = "0xDB36fFD8a762226928d62a2Fe6F19bB329b5EbbE";
const TOKEN_DECIMALS = 3; // 1 token = 1 gram = 1000 raw units

// Canonical AuxiteMetal tokens (Base mainnet, the per-investor set on rwa.xyz).
// metalId = keccak256(utf8(name)) — precomputed so the adapter has no ethers
// version dependency.
const METALS = [
  { symbol: "AUXG", token: "0xCef9D7593E8Ba796eE05C54B8983B7749bB1218a", id: "0xdbd17891fc491ac6717dd01ab1f90f82509f1f2e91cd5066f68805860fbdeb72" },
  { symbol: "AUXS", token: "0xB0aC63aeD12b5A0Ee710618D99444bf126068c1a", id: "0x75e02a3ee626f5d4b8bc98cc8de5b102ee067608b6066832ffdc71f78445ac2b" },
  { symbol: "AUXPT", token: "0x39F314fb20668997A2ADDaB1eA9236e0072D5E2D", id: "0xecbba860b0e9fdd311c554f0b28ccf3d616b99de2f208aa830a91bd846d16657" },
  { symbol: "AUXPD", token: "0x6e4837fCf158D15ABFdf90b3954D041D452BE832", id: "0x06be24fb53be069d32979b5b3d41617a459d2f6b1b018dd945ebb5b9dc321d15" },
];

const GET_PRICE_ABI =
  "function getPricePerGramE6(bytes32 metalId) view returns (uint256)";

async function prices(timestamp = Date.now() / 1000) {
  const out = {};
  await Promise.all(
    METALS.map(async (m) => {
      const e6 = await sdk.api2.abi.call({
        chain: CHAIN,
        target: ORACLE,
        abi: GET_PRICE_ABI,
        params: [m.id],
      });
      const price = Number(e6) / 1e6; // USD per gram = USD per token
      if (price > 0) {
        out[`${CHAIN}:${m.token.toLowerCase()}`] = {
          price,
          decimals: TOKEN_DECIMALS,
          symbol: m.symbol,
          timestamp,
        };
      }
    })
  );
  return out;
}

module.exports = { prices, METALS, ORACLE, CHAIN };
