"use client";

// Google Analytics and the Google Ads tag. Neither loads under /admin, so staff
// activity stays out of the analytics and the ad audiences.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";
import { isAdminPath } from "@/lib/public-routes";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
// Google Ads conversion tag (AW-XXXXXXXXXX). Set in Vercel env; if empty
// the tag never loads and src/lib/google-ads-conversion.ts no-ops.
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "";

export default function SiteAnalytics() {
  const pathname = usePathname();
  if (isAdminPath(pathname)) return null;

  if (!GA_ID && !GOOGLE_ADS_ID) return null;

  return (
    <>
      {/* Runs before the tags are configured, so Google never gets more than the
          visitor's stored choice allows. notifyConsentChanged() updates it later. */}
      <Script id="google-consent-default" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          var consent = null;
          try { consent = JSON.parse(localStorage.getItem('${CONSENT_STORAGE_KEY}')); } catch (e) {}
          var choice = consent && consent.analytics === true ? 'granted' : 'denied';
          gtag('consent', 'default', {
            analytics_storage: choice,
            ad_storage: choice,
            ad_user_data: choice,
            ad_personalization: choice,
          });
        `}
      </Script>
      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
                anonymize_ip: true,
                cookie_flags: 'SameSite=None;Secure',
              });
            `}
          </Script>
        </>
      )}
      {/* Google Ads conversion tag — shares the gtag() global with GA4.
          Loaded only when NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID is set so
          ad-blocker users / dev environments don't see extra requests. */}
      {GOOGLE_ADS_ID && (
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            // Accept the click id handed over from the auxite.io landing page
            gtag('set', 'linker', { domains: ['auxite.io', 'vault.auxite.io'], accept_incoming: true });
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
      )}
    </>
  );
}
