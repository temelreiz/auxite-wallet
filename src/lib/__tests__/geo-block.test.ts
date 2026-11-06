import { isGeoBlocked } from "../geo-block";

describe("isGeoBlocked", () => {
  it.each(["CU", "IR", "KP", "SY", "RU", "BY", "MM"])("blocks sanctioned country %s", (c) => {
    expect(isGeoBlocked(c, null)).toBe(true);
  });

  it("keeps the fraud-cohort countries blocked", () => {
    expect(isGeoBlocked("IN", null)).toBe(true);
    expect(isGeoBlocked("NG", null)).toBe(true);
  });

  it.each(["43", "40", "14", "09", "23", "65"])("blocks Ukraine region %s", (r) => {
    expect(isGeoBlocked("UA", r)).toBe(true);
  });

  it("leaves the rest of Ukraine open", () => {
    expect(isGeoBlocked("UA", "30")).toBe(false);
    expect(isGeoBlocked("UA", null)).toBe(false);
  });

  it("does not apply Ukraine region codes to other countries", () => {
    expect(isGeoBlocked("AE", "43")).toBe(false);
  });

  it("ignores case and allows when the country is unknown", () => {
    expect(isGeoBlocked("ir", null)).toBe(true);
    expect(isGeoBlocked("", null)).toBe(false);
    expect(isGeoBlocked(null, null)).toBe(false);
  });

  it("allows target markets", () => {
    for (const c of ["AE", "SA", "QA", "KW", "BH", "OM", "AU", "CA", "DE", "TR"]) {
      expect(isGeoBlocked(c, null)).toBe(false);
    }
  });
});
