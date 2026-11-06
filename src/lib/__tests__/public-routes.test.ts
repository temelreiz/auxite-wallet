import { isAdminPath } from "@/lib/public-routes";

describe("isAdminPath", () => {
  it("matches the admin area only", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/auxr")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/vault")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath(null)).toBe(false);
  });
});
