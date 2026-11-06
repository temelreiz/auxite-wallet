import { isOnrampUnavailable, onrampSessionParams } from "../stripe-onramp";

const EVM = "0x1111111111111111111111111111111111111111";
const BTC = "bc1qexample";

describe("onrampSessionParams", () => {
  const p = onrampSessionParams(EVM, BTC, "1.2.3.4");

  it("locks delivery to the customer's own addresses", () => {
    expect(p.lock_wallet_address).toBe("true");
    expect(Object.values(p)).toContain(EVM);
    expect(p["wallet_addresses[bitcoin]"]).toBe(BTC);
  });

  it("only allows networks the deposit watcher reads", () => {
    const nets = Object.entries(p).filter(([k]) => k.startsWith("destination_networks")).map(([, v]) => v);
    expect(nets.sort()).toEqual(["base", "bitcoin"]);
  });

  it("does not allow currencies the watcher would miss", () => {
    const cur = Object.entries(p).filter(([k]) => k.startsWith("destination_currencies")).map(([, v]) => v);
    expect(cur.sort()).toEqual(["btc", "eth", "usdc"]);
  });

  it("passes the customer's IP, and omits an unknown one", () => {
    expect(p.customer_ip_address).toBe("1.2.3.4");
    expect(onrampSessionParams(EVM, BTC, "unknown").customer_ip_address).toBeUndefined();
    expect(onrampSessionParams(EVM, BTC).customer_ip_address).toBeUndefined();
  });
});

describe("isOnrampUnavailable", () => {
  it("recognises Stripe's location and shutdown errors", () => {
    expect(isOnrampUnavailable("crypto_onramp_unsupported_country")).toBe(true);
    expect(isOnrampUnavailable("crypto_onramp_unsupportable_customer")).toBe(true);
    expect(isOnrampUnavailable("crypto_onramp_disabled")).toBe(true);
  });

  it("does not hide other failures", () => {
    expect(isOnrampUnavailable("parameter_unknown")).toBe(false);
    expect(isOnrampUnavailable(undefined)).toBe(false);
  });
});
