/**
 * An operator freeze must survive the account holder.
 *
 * unfreezeAccount() used to consider only the cooldown, so a freeze placed by
 * security review turned into a self-service unfreeze 24 hours later — and the
 * route that calls it identified the caller by a header anyone could set.
 */
import { unfreezeAccount, DEFAULT_EMERGENCY_CONFIG, type EmergencyConfig } from "../emergency";

const frozen = (over: Partial<EmergencyConfig> = {}): EmergencyConfig => ({
  ...DEFAULT_EMERGENCY_CONFIG,
  frozen: true,
  // Well past the 24h cooldown, so cooldown can never be what blocks these.
  frozenAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  ...over,
});

describe("unfreezeAccount", () => {
  it("refuses to lift a freeze placed by an operator", () => {
    const res = unfreezeAccount(frozen({ frozenBy: "admin:security-review" }));
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/güvenlik incelemesi/i);
  });

  it("refuses any frozenBy that starts with admin", () => {
    expect(unfreezeAccount(frozen({ frozenBy: "admin" })).success).toBe(false);
    expect(unfreezeAccount(frozen({ frozenBy: "admin:incident-2026-09-09" })).success).toBe(false);
  });

  it("still lets a user lift their own freeze once the cooldown has passed", () => {
    const res = unfreezeAccount(frozen({ frozenBy: "0xabc" }));
    expect(res.success).toBe(true);
    expect(res.config?.frozen).toBe(false);
  });

  it("still enforces the cooldown on a self-freeze", () => {
    const res = unfreezeAccount(
      frozen({ frozenBy: "0xabc", frozenAt: new Date().toISOString() }),
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/saat/i);
  });

  it("does nothing when the account is not frozen", () => {
    expect(unfreezeAccount({ ...DEFAULT_EMERGENCY_CONFIG }).success).toBe(false);
  });
});
