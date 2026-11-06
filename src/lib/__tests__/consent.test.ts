import { notifyConsentChanged } from "@/lib/consent";

describe("notifyConsentChanged", () => {
  const save = (analytics: boolean) =>
    // jest.setup.js replaces localStorage with a mock.
    (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify({ essential: true, analytics }));

  afterEach(() => {
    (localStorage.getItem as jest.Mock).mockReset();
    delete (window as any).gtag;
  });

  it("passes the visitor's choice to Google for analytics and ads", () => {
    const gtag = jest.fn();
    (window as any).gtag = gtag;

    save(true);
    notifyConsentChanged();
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });

    save(false);
    notifyConsentChanged();
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  });

  it("still wakes the pixels when the Google tag isn't loaded", () => {
    const listener = jest.fn();
    window.addEventListener("auxite:consent-changed", listener);
    save(true);
    notifyConsentChanged();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("auxite:consent-changed", listener);
  });
});
