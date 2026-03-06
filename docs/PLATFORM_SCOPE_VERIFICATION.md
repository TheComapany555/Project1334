# Platform Scope – Feature Verification

This document confirms which items from the *Platform Scope Clarification – Feature Review* are implemented.

---

## 1. Interactive Map for Listings

**Doc:** *"Listings already include a location field. Displaying that location on a map (for example using a Google Maps pin) is a small enhancement to the listing detail page."*

**Status: Implemented**

- **Location:** `app/listing/[slug]/listing-map.tsx`, used in `app/listing/[slug]/page.tsx`.
- **Behaviour:**
  - If `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set: shows a “Show map” button; on click, embeds Google Maps (Maps Embed API) with the listing location.
  - If no Google key: shows an inline map using **OpenStreetMap** (no API key), or a fallback “Open in Google Maps” / “Open in OpenStreetMap” link.
- **Alternative map:** OpenStreetMap is available so the client can use a map without enabling or paying for Google Maps.

---

## 2. “Why This Business?” Highlight Box

**Doc:** *"Key selling points such as: 5-Year Lease, 20% Net Margin, Under Management — implemented as simple visual tags or badges attached to a listing."*

**Status: Implemented**

- **Location:** `app/listing/[slug]/page.tsx` (lines 163–196).
- **Behaviour:**
  - Section titled **“Why this business?”** with subtitle “Key selling points”.
  - Renders `listing.listing_highlights` as a grid of tags (label + optional accent: primary, warning, secondary).
  - Data comes from `listing_highlights` (see `lib/types/listings.ts`: `ListingHighlight` with `label`, `accent`).

---

## 3. Request Call Back Button

**Doc:** *"A ‘Request Call Back’ option can be implemented as an additional enquiry type that sends a notification to the broker."*

**Status: Implemented**

- **Locations:**
  - `app/listing/[slug]/enquiry-form.tsx`: “Request call back” card, enquiry type, and form behaviour.
  - `lib/types/enquiries.ts`: `request_callback` in `EnquiryReason` and `ENQUIRY_REASON_LABELS`.
  - `lib/actions/enquiries.ts`: stores `reason` and includes it in broker notification email.
- **Behaviour:**
  - Prominent “Request call back” card above the enquiry form; button pre-fills the form with reason “Request call back” and scrolls to the form.
  - Enquiry reason dropdown includes “Request call back”; when selected, copy and validation (e.g. phone/name) are tailored for callback.
  - On submit, enquiry is stored with `reason: "request_callback"` and the broker receives an email including the reason.

---

## Summary

| Feature                         | Status     | Notes                                                |
|---------------------------------|-----------|------------------------------------------------------|
| Interactive map for listings   | Implemented | Google Maps when key set; OSM option without key     |
| “Why this business?” highlights| Implemented | Tags/badges from `listing_highlights`                |
| Request call back               | Implemented | Enquiry type + card + email to broker                |

All three items from the scope document are in place. The map can be used with Google (API key) or with OpenStreetMap (no key).
