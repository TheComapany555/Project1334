# Postman setup

Two files in this folder:

- `Salebiz.postman_collection.json` — request collection (mobile auth, profile, listings, favorites, enquiries)
- `Salebiz.postman_environment.json` — environment with `baseUrl`, `mobileToken`, etc.

## Import

1. Open Postman → **Import** → drop both JSON files in.
2. Top-right environment switcher → pick **Salebiz — Production**.
3. Open **Environments → Salebiz — Production** and fill the secret values:
   - `buyerEmail` / `buyerPassword` → a real registered buyer (run `Mobile / Auth / Register` first if you don't have one, then verify the OTP from your inbox)

`baseUrl` already points at `https://project1334.vercel.app`.

## Test the buyer panel APIs

1. **Mobile / Auth / Login** — on success, the test script saves your bearer token to `{{mobileToken}}` automatically. Every other request that needs auth uses that variable.
2. **Mobile / Profile / Get account snapshot** — confirms the `/api/mobile/profile` endpoint is returning the buyer's stats (saved listings, enquiries, NDAs).
3. **Mobile / Profile / Update profile** — patches name + phone.

## Test enquiries / favorites

Both need a real `listingId`. Easy way to get one:

1. Run **Mobile / Listings & Categories / List published listings** to see returned listings.
2. Copy any listing's `id` into the `listingId` environment variable.
3. Now **Toggle favorite** and **Send enquiry** will work.

## Buyer alerts cron (Feature 3)

The cron is **not** in this collection because it doesn't expose an HTTP endpoint anymore. It runs entirely on GitHub Actions runners — see `.github/workflows/buyer-alerts-cron.yml`.

To trigger it on demand:

- **From GitHub** (recommended): Actions tab → **Buyer alerts cron** → **Run workflow** → optionally set `lookbackHours` → Run. The run log shows the JSON summary.
- **Locally** (for development): from the project root,
  ```bash
  npm run cron:buyer-alerts -- --lookback 2
  ```
  with `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXTAUTH_URL`.

End-to-end recipe:

1. Sign in as a buyer in the web app and create an alert (e.g. category=Cafe, state=NSW).
2. Sign in as a broker, publish a listing matching those filters.
3. Run the workflow from GitHub Actions with `lookbackHours: 2`.
4. Run summary should report `newMatches: 1`. Re-running returns `newMatches: 0` — the dedup table is doing its job.
5. Switch to the buyer's account — bell shows "New match: …", **Matched for you** panel shows the listing, inbox has the email.
