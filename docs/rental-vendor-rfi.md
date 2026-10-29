# Car-sharing platform RFI — taslak

**Durum:** Taslak, gönderilmedi. `[köşeli parantez]` alanları doldurulmalı.
**Gönderilecekler:** ATOM Mobility, MOQO, Vulog (platform) · INVERS (telematik) · yedek: Zemtu, Levy Fleets
**Bağlam:** `docs/car-rental-pilot-design.md` §10

Ortak e-posta aşağıda. Her satıcıya ortak metin + o satıcıya ait ek sorular (en altta) gönderilir.
INVERS'e platform soruları yerine yalnızca telematik bölümü gönderilir.

---

**Subject:** RFI — free-floating car-sharing pilot in Türkiye (50 vehicles, 24 months)

Hello [Name / team],

We are [Company], and we are preparing a free-floating car-sharing pilot in
[city], Türkiye. We will own and operate the fleet ourselves and are looking for a
white-label platform (customer app, booking and billing, operator console) and
compatible telematics.

The pilot has an unusual requirement: its main output is **data**. Over six months
we need to measure, per vehicle and per trip, revenue, costs, utilisation and damage,
and we will reconcile it with third-party audited figures. Data access through your
platform is therefore our most important selection criterion.

**Pilot scope**
- Fleet: about 50 vehicles, **70% electric / 30% petrol**, B and C segment, one model per segment and powertrain (4 models in total; candidates: [model list])
- Model: free-floating within a geofenced zone of 2–3 districts, per-minute/hour pricing
- Term: 24 months, with a planned expansion to 2–3 segments and more vehicles afterwards
- Timeline: platform selection in [month], closed beta around [month], public launch around [month]

**Required — please answer each with yes / no / partly and a short explanation**
1. **Webhooks** for trip completion and vehicle status changes (available, in trip, servicing, damaged, etc.). Please share the event list and a sample payload.
2. **REST API** to retrieve historical trips by date range, for nightly reconciliation.
3. **Per-trip fare breakdown** via API/webhook (time fee, distance fee, discounts, surcharges such as out-of-zone parking or cleaning) plus payment status (paid / failed / refunded / disputed).
4. **Raw data export** (CSV/JSON) of trips, vehicles, incidents and payments, and a contract clause that **we own our operational data**, including after termination.
5. **Telematics:** keyless unlock/lock, odometer, fuel/charge level and GPS. Which hardware do you support? Can we bring our own (e.g. INVERS CloudBoxx, Teltonika)?
6. **Geofencing** of the operating zone, with configurable fees for ending a trip outside it.
7. **Payments in Türkiye:** do you have an existing integration with **iyzico** or **PayTR** for TRY card payments? If not, what would a custom integration cost and how long would it take?
8. **Driver's licence and identity verification** that supports Turkish licences. If your built-in flow does not, can we plug in our existing Sumsub account?
9. **White-label apps** on iOS and Android under our brand, with Turkish-language support.

**Also helpful**
- Field-operations module (cleaning, refuelling/charging, relocation tasks with costs), and whether this data is available via API
- **EV support:** remote state-of-charge reading, low-charge alerts, charging-station locations in the app, and in-app credits for users who end a trip at a partner charger
- Integration with charge point operators (start/stop charging from the app, or importing charging sessions per vehicle)
- Mixed EV and petrol fleet in one zone, with different tariffs by vehicle segment
- Before/after trip damage photos and incident records
- Dynamic pricing by time and zone
- A sandbox environment and API documentation we can test against **before signing**
- Support hours that cover Türkiye (UTC+3)
- Reference customers of similar size, ideally in Türkiye or nearby markets

**Commercials — please quote for 50 vehicles over 24 months**
- One-time setup and onboarding fees
- Monthly fees (per vehicle, per trip, minimums) and which plan tier includes API/webhook access
- Telematics hardware, installation and connectivity costs, if you provide them
- Costs for custom work (payment integration, KYC integration)
- Minimum contract term and termination conditions, including data handover at termination
- Pricing at scale (e.g. 150 and 500 vehicles), to understand the path beyond the pilot

We would appreciate a reply by [date]. If it is easier, we are happy to do a 30-minute
call first, followed by sandbox access.

Kind regards,
[Name]
[Title], [Company]
[Email] · [Phone]

---

## Satıcıya özel ek sorular

Ortak metnin "Also helpful" bölümünden sonra eklenir.

**ATOM Mobility**
- Public sources disagree on whether you offer an open API. Which plan includes API access, and do you offer webhooks? Can you share the API documentation?
- Car-sharing plans are quote-only: what is the setup fee and monthly fee for 50 cars on the plan that includes the API?

**MOQO**
- API access starts on the Pro plan and the branded app is an add-on from Plus. What would Pro + branded app cost for 50 vehicles?
- Do you support free-floating zones, or only station-based and round-trip models?

**Vulog**
- We understand Vulog usually works with larger operators and OEMs. Do you offer a pilot or starter package for about 50 vehicles, with a path to larger volumes?
- Which telematics providers do you integrate with today (e.g. INVERS, OEM connected-car)?

**INVERS** (send only the telematics questions from the shared text and these)
- CloudBoxx price per vehicle, installation and monthly connectivity for 50 vehicles (35 EV, 15 petrol) in Türkiye. Do you have a local installation partner?
- Does OneAPI provide webhooks or push events for trip/booking-relevant vehicle events, or only the Events API? Can we read data directly while a third-party platform (e.g. ATOM, MOQO, Vulog) controls the vehicles?
- Compatibility with our candidate vehicle models: [model list]

**Zemtu / Levy Fleets** (backups)
- Zemtu: Do you offer an API and webhooks, and do you support free-floating zones?
- Levy: Is your revenue-share model available for car-sharing in Türkiye, and what share applies? Is API/webhook access included?
