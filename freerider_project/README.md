# Hertz Freerider for Home Assistant — multicountry prototype

**Status: development prototype, not ready for HACS or production.**

This is an independent integration project, deliberately isolated from the ATHLTH integration. Intended final destination: a dedicated public GitHub repository with `custom_components/hertz_freerider/` at its root.

## Supported country discovery
- Norway: https://hertzfreerider.no/
- Sweden: https://hertzfreerider.se/
- Denmark: https://hertzfreerider.nu/

These are verified Freerider websites, **not verified data APIs**. Additional countries can be added as official Freerider offerings are confirmed. Sweden and Norway have a similar public UI, whereas Denmark uses a separate store implementation. Do not assume standard Hertz rentals elsewhere are Freerider.

## Installation for development
Copy `custom_components/hertz_freerider` into your Home Assistant `config/custom_components` directory, restart, and add **Hertz Freerider (prototype)** in Devices & services.

Choose one or more countries and optionally enter departure/arrival **partial matching** text. Use empty departure or arrival to match all. These fields can be changed in Configure / Options.

**Important:** No unverified Hertz scraper/API is enabled. The polling coordinator deliberately returns an explicit source-not-configured error instead of fake available cars. Until a supported authorized data feed is connected, the sensor will be unavailable. No automatic availability alerts can be relied on yet.

## Next integration steps
1. Identify an officially accessible feed or authorized structured data access for each source; confirm policy for automated polling.
2. Implement each country adapter independently, with fixtures captured legally and regression tests.
3. Reconcile multi-country ride IDs and route fields; expose actionable booking URLs.
4. Add notification automation blueprint, translations, tests, HACS metadata; move to a dedicated public repo.
5. Validate live listings in Home Assistant before public release.

## Design
Config entry stores selected countries, origin/destination filters and 15-minute refresh. Future providers output normalized `Ride` records. Unique IDs must come from original source to avoid repeated notifications when listings refresh. Never collect users' Freerider passwords.

Not affiliated with Hertz.
