export interface LeaseRatePeriod {
  months: number;
  days: number;
  apy: number;
}

export interface MetalLeaseConfig {
  metal: string;
  symbol: string;
  name: string;
  nameEn: string;
  nameTr: string;
  icon: string;
  metalTokenAddress: string;
  contractAddress: string;
  periods: LeaseRatePeriod[];
  minAmount: number;
  maxAmount: number;
  tvl: number;
  lastUpdated: string;
  source: string;
}

export const LEASE_RATES_CONFIG: MetalLeaseConfig[] = [
  {
    metal: "AUXG",
    symbol: "AUXG",
    name: "Gold",
    nameEn: "Gold",
    nameTr: "Altın",
    icon: "/gold-favicon-32x32.png",
    metalTokenAddress: "0xE425A9923250E94Fe2F4cB99cbc0896Aea24933a",
    contractAddress: "0xe63050b6d0497a970d3fB44EBF428742631d1006",
    periods: [
      { months: 3, days: 90, apy: 2.5 },
      { months: 6, days: 180, apy: 3.0 },
      { months: 12, days: 365, apy: 3.5 },
    ],
    minAmount: 10,
    maxAmount: 0,
    tvl: 500000,
    lastUpdated: "2025-01-20",
    source: "JBMA/Monetary Metals",
  },
  {
    metal: "AUXS",
    symbol: "AUXS",
    name: "Silver",
    nameEn: "Silver",
    nameTr: "Gümüş",
    icon: "/silver-favicon-32x32.png",
    metalTokenAddress: "0xaE583c98c833a0B4b1B23e58209E697d95F05D23",
    contractAddress: "0x6396163f0CeA0EdC639c353f6D1EbCd7C5427945",
    periods: [
      { months: 3, days: 90, apy: 2.0 },
      { months: 6, days: 180, apy: 2.5 },
      { months: 12, days: 365, apy: 3.0 },
    ],
    minAmount: 100,
    maxAmount: 0,
    tvl: 250000,
    lastUpdated: "2025-01-20",
    source: "JBMA/Monetary Metals",
  },
  {
    metal: "AUXPT",
    symbol: "AUXPT",
    name: "Platinum",
    nameEn: "Platinum",
    nameTr: "Platin",
    icon: "/platinum-favicon-32x32.png",
    metalTokenAddress: "0xeCfD88bE4f93C9379644B303444943e636A35F66",
    contractAddress: "0xeB95c1C459506F6265c800C64D3423005499C3Ea",
    periods: [
      { months: 3, days: 90, apy: 3.0 },
      { months: 6, days: 180, apy: 3.5 },
      { months: 12, days: 365, apy: 4.0 },
    ],
    minAmount: 5,
    maxAmount: 0,
    tvl: 350000,
    lastUpdated: "2025-01-20",
    source: "JBMA/Monetary Metals",
  },
  {
    metal: "AUXPD",
    symbol: "AUXPD",
    name: "Palladium",
    nameEn: "Palladium",
    nameTr: "Paladyum",
    icon: "/palladium-favicon-32x32.png",
    metalTokenAddress: "0x6F4E027B42E14e06f3eaeA39d574122188eab1D4",
    contractAddress: "0x587706Bf9A907288145cfFc35b57818Df4db68A4",
    periods: [
      { months: 3, days: 90, apy: 2.8 },
      { months: 6, days: 180, apy: 3.3 },
      { months: 12, days: 365, apy: 3.8 },
    ],
    minAmount: 5,
    maxAmount: 0,
    tvl: 150000,
    lastUpdated: "2025-01-20",
    source: "JBMA/Monetary Metals",
  },
];

export function getLeaseConfigBySymbol(symbol: string): MetalLeaseConfig | undefined {
  return LEASE_RATES_CONFIG.find(config => config.symbol === symbol || config.metal === symbol);
}

export function getLocalizedName(config: MetalLeaseConfig, lang: "tr" | "en"): string {
  return lang === "tr" ? config.nameTr : config.nameEn;
}
