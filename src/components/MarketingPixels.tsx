"use client";

// MarketingPixels — the X and Meta advertising pixels, gated behind analytics
// consent.
//
// These two are pure marketing trackers with no essential function, so under
// GDPR they must not load until the user opts in. They previously sat inline
// in layout.tsx and fired on every page load regardless of the cookie banner,
// which is a real exposure now that campaigns target DE/NL/CH.
//
// GA4 stays in layout.tsx: it uses Google consent mode and degrades to a
// cookieless ping rather than an all-or-nothing load, so the same treatment
// doesn't apply.
//
// Rendering nothing until consent means a user who declines never fetches
// uwt.js or fbevents.js at all — not merely "loads them in a muted mode".

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  applyConsentToWindow,
  hasAnalyticsConsent,
} from "@/lib/consent";

const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID || "";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "875602632179249";

export default function MarketingPixels() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // Re-hydrate the global GA4's inline script reads, then take our own
    // reading. Both run on every mount, so a returning visitor's stored
    // decision is honoured instead of silently defaulting to "denied".
    applyConsentToWindow();
    setConsented(hasAnalyticsConsent());

    // Accepting the banner should start tracking immediately rather than on
    // the next navigation.
    const onChange = () => setConsented(hasAnalyticsConsent());
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  if (!consented) return null;

  return (
    <>
      {/* X (Twitter) Pixel — required by the Website Conversions objective;
          without it X can only bid on link clicks. src/lib/x-pixel.ts maps
          funnel events onto X standard events. */}
      {X_PIXEL_ID && (
        <Script id="x-pixel" strategy="afterInteractive">
          {`
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){
            s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,
            u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))
            }(window,document,'script');
            twq('config','${X_PIXEL_ID}');
          `}
        </Script>
      )}

      {/* Meta Pixel */}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}
