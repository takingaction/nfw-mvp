# NFW Mobile — Migration Blueprint

**Created:** 2026-09-11
**Status:** Slices A–F complete (Login · Sign-up · Password reset · Dashboard · Grants · Perks · Zero Dollar Store · Profile & account · **Push · Universal links · Travel**). Remaining placeholders: Contact, FAQ, Share Your Story, Legal (Slice G). See "Implementation Status" below.

> **Slice F needs manual setup to go live** — see "Slice F activation checklist" under Dependencies.

> **API base URL must be `https://www.nationalfundforwomen.org`.** The apex domain 307-redirects to `www`, and fetch strips `Authorization` on cross-origin redirects — pointing the app at the apex makes every authenticated call 401. (Fixed 2026-09-11 in `.env`, `.env.example`, `eas.json`, `lib/env.ts`.)
**Source plan:** `../mobile-app.md`
**Web architecture reference:** `../AGENTS.md`

---

## Technical Decisions (superseding `mobile-app.md`)

| Layer | `mobile-app.md` said | Adopted |
|---|---|---|
| Framework | Expo (managed) | Expo managed workflow, TypeScript — **latest stable SDK** |
| Navigation | React Navigation v6 | **Expo Router** (file-based) with Bottom Tabs: `Dashboard` · `Grants` · `Perks` · `Settings` |
| Session storage | AsyncStorage | **`expo-secure-store`** via Supabase's `LargeSecureStore` pattern (AES key in SecureStore, encrypted blob in AsyncStorage — works around the 2048-byte SecureStore limit) |
| State | Zustand | Zustand (client state) + **TanStack Query** (server state / caching) |
| Push | Expo Notifications | Expo Notifications + FCM/APNs |
| Auth | Supabase RN client | `@supabase/supabase-js` with custom storage adapter; PKCE flow; Google OAuth via `expo-web-browser` |
| Zero Dollar Store | (unspecified) | **Root-level stack** `app/store/*`, entry points from Dashboard + Perks |
| Membership payments | (unspecified) | **Status-only.** Upgrade / Manage Subscription opens `nationalfundforwomen.org` in the system browser (Apple 3.1.1 reader-app pattern). No in-app Stripe checkout. |

---

## Implementation Status

| Screen / module | Status | Data source | Notes |
|---|---|---|---|
| `app/auth/login.tsx` | **Done** | Supabase auth direct | Copy, error strings, 60 s resend cooldown identical to `components/login-form.tsx`. Google via `lib/auth/google.ts`. |
| `app/(tabs)/dashboard/index.tsx` | **Done** | Direct Supabase (own rows + public tables) | Same gating order as web. Savings computed on-device; **Zero Dollar Store bucket shows "—"** until Bearer. Abandoned-checkout banner intentionally omitted (purchase is web-only). Stripe "Connect Bank Account" opens the web grant page. |
| `components/dashboard/*` | **Done** | — | Hero, MembershipCard, MembershipImpactCard, FeaturedItems, GrantsSummary, PerksSummary, BottomActions |
| `components/banners/DashboardBanners.tsx` | **Done** | — | DOB · pending free / waitlist · You're Approved (connect / connected) |
| `app/(tabs)/grants/index.tsx` | **Done** | `grant_cycles` direct | Reminder + eligibility copy verbatim from `GrantApplicationForm.tsx`. Filters `is_testing_only` for non-admins, `end_date >= today`. |
| `app/(tabs)/grants/my-applications.tsx` | **Done** | own `grants` + cycle embed | Stat cards + status prompts match web |
| `app/(tabs)/grants/[id].tsx` | **Done** | own `grants`, `grant_documents`, `/api/grants/document-url`, Stripe status | Timeline, answers, status actions. Documents open via signed URL in the in-app browser; approved grants show `StripeConnectCard`. |
| `app/(tabs)/grants/apply/index.tsx` | **Done** (Slice C) | `/api/grants/create` + `/upload-document` | Native form: cycle radio cards, three textareas (500/1000/500), validation order + strings from web, consent modal, create → sequential uploads with Retry / Continue-without → success. Documents via file picker, camera or photo library. |
| `app/(tabs)/settings/index.tsx` | **Done** | auth store | Identity card, grouped rows, sign-out confirm, version |
| `components/ui/*` | **Done** | — | Typography, Button, Card, Badge, Banner, EmptyState, Input, Screen, AnimatedCurrency |
| `lib/queries/{grants,dashboard}.ts` | **Done** | — | TanStack hooks; keys in `lib/queries/keys.ts` |
| `stores/auth.ts` | **Done** | `profiles` direct | Reads own row (RLS 159 compatible); `null → "free"` normalisation |
| Fonts | **Done** | `@expo-google-fonts/*` | Playfair Display + DM Sans loaded in root layout; splash held until ready |
| **Slice B — Perks tab** | | | |
| Web `lib/supabase/server.ts` | **Done** (commit `459cdc4`) | — | `createClient()` accepts `Authorization: Bearer <access_token>` when no auth cookie is present. Unblocks every `/api/*` route for mobile. |
| `lib/api.ts` → `lib/api/perks.ts` | **Done** | Vercel API | Typed wrappers for rollup, offers search/detail/uses/redeem, locations, categories, facets, redemptions (+fresh-url, check), liked stores, NFW perks, collections, settings |
| `stores/perksFilters.ts` | **Done** | — | Mirrors `app/perks/page.tsx` state: view, query, ZIP (profile default), distance (10mi default, `2500mi` = Nationwide), online-only, categories, facets, offer types, page, NFW toggle. Sidebar Reset vs full RESET semantics preserved. |
| `stores/likedStores.ts` | **Done** | `/api/perks/liked-stores` | Optimistic heart toggle with revert |
| `app/(tabs)/perks/index.tsx` | **Done** | rollup / search / nfw-perks / collections / settings | Stores view (page-based, 100/page, `EXCLUDED_STORES` filter) and Offers view (infinite scroll). Banner honours `is_test_mode`. Quick-access row: NFW Exclusive · collections · Travel. **Locations view omitted** (low value on mobile). |
| `app/(tabs)/perks/filters.tsx` | **Done** | categories / facets | Modal: Online Only · category tree · facets · offer types · Reset |
| `app/(tabs)/perks/store/[storeKey].tsx` | **Done** (new route) | offers search `store_key` | Replaces web's in-place "offers filtered by store" view swap with a pushed screen |
| `app/(tabs)/perks/[offerKey].tsx` | **Done** | offer / uses-remaining / redemptions check / locations / redeem | All 4 methods. Multi-location offers resolve a location-specific `offer_key` before redeeming (web parity). Custom `display_message` HTML → text + tappable links + Continue/Cancel. Coupons open in `expo-web-browser`. 48-hour and limit errors surface verbatim. |
| `app/(tabs)/perks/nfw/[slug].tsx` | **Done** | nfw-perks slug / redeem | Records redemption then opens partner site; promo reveal after redemption |
| `app/(tabs)/perks/collections/[slug].tsx` | **Done** | perk-collections + per-item resolution | Same client-side item resolution + `display_order` sort as web |
| `app/(tabs)/perks/saved.tsx` | **Done** | liked stores | Numeric key → store offers; partner-name key → NFW list |
| `app/(tabs)/perks/history.tsx` | **Done** | redemptions + nfw redemptions + fresh-url | "Open" re-mints expiring coupon URLs; expired → alert |
| `lib/html.ts` | **Done** | — | RN replacement for DOM decoding: entities (named/dec/hex), tag stripping with paragraph breaks, link extraction, phone extraction, `simplifyRedemptionMessage`. Unit-checked (12 cases). |
| **Slice C — Grants completion** | | | |
| `lib/api/grants.ts` | **Done** | Vercel API | createGrant, uploadGrantDocument (multipart `file` + `grantId`; MIME resolved from extension when the picker reports octet-stream), getDocumentUrl, createStripeConnectLink, getStripeConnectStatus, logGrantError |
| `components/grants/DocumentPicker.tsx` | **Done** | — | Choose File / Take Photo / Library; same 6 MIME types + 10 MB; web's exact "File Not Attached" strings |
| `components/grants/ConsentModal.tsx` | **Done** | — | "Ready to Submit": certification + consent checkboxes, collapsible full text — verbatim |
| `components/grants/StripeConnectCard.tsx` | **Done** | `/api/stripe/connect` + `/status` | Merges web ConnectBankButton + StripeAccountStatus. Opens onboarding in the in-app browser; Stripe returns to the **web** return page (which sets `stripe_onboarding_completed`); card re-polls `/status` and refreshes the profile when the app foregrounds. Used on grant detail and the dashboard banner. |
| `app/(tabs)/grants/application-success.tsx` | **Done** | — | Verbatim copy, "What happens next" 01/02/03 |
| `app/(tabs)/grants/connect/{return,refresh}.tsx` | **Done** | Stripe status / connect | Real screens; become universal-link targets in Slice F |
| `components/ui/Modal.tsx` | **Done** | — | BrandModal (scrim + card + footer) |
| `app/(tabs)/grants/apply/confirm.tsx` | Removed | — | Consent is a modal, as on web |
| **Slice D — Zero Dollar Store** | | | |
| `lib/api/store.ts` · `lib/queries/store.ts` · `types/store.ts` | **Done** | `/api/shopify/products` (public), `/api/store/settings`, `/api/system-settings`, `/api/store/claims/check`, `/api/shopify/checkout`, `/api/store/claims/my-claims-simple`, `/api/dashboard/savings` | `canClaimProduct()` reproduces `StoreClient.canClaim()` order + strings; variant grouping / out-of-stock detection / variant resolution mirror `ClaimItemModal` |
| `app/store/index.tsx` | **Done** | products · settings · system · claims-check | Hero, product cards (3:4 image, badges, "Value: $X.XX", Claim Item / More Info), monthly-limit notice, pull-to-refresh, re-checks claims on app foreground (webhook is async). Non-dismissable `StoreUnavailableModal` when `shopify_checkout_enabled === false`. |
| `app/store/[productId].tsx` | **Done** | products | Paged image carousel with dots, status badge, HTML description → text + tappable links, "Available Options" chips, Product ID, Claim button |
| `app/store/claim/[productId].tsx` | **Done** | `/api/shopify/checkout` | Option pickers (out-of-stock values disabled), web's validation strings, "Confirm Your Claim" modal, Shopify hosted checkout in the in-app browser, 503 → unavailable modal. **Improvement over web:** `claimedThisMonth` is set optimistically after a successful checkout so buttons grey out without a reload. |
| `app/store/my-claims.tsx` | **Done** | `my-claims-simple` | Status badges incl. `completed`/`paid` (unmapped on web → showed raw status), tracking link/number, order #. Limited to the latest 5 claims by the existing API. "View on Shopify" hidden, matching the web TODO. |
| `components/dashboard/StoreSummary.tsx` | **Done** | claims + products | "Your Order History" (completed/fulfilled/paid/delivered/cancelled) + "Latest Offerings" (8, DRAFT dimmed) |
| Savings ZDS bucket | **Done** | `/api/dashboard/savings` | `useSavings` now calls the API (Bearer) so the Zero Dollar Store figure is real; Perks = Access + NFW combined as on web |
| **Slice E — Auth + Profile completion** | | | |
| `constants/signup.ts` | **Done** | — | `US_STATES`, `INCOME_RANGES`, `IDENTITY_OPTIONS`, `PASSWORD_REQUIREMENTS`, `PLANS`, waitlist modal copy — verbatim from `SignUpFlow.tsx` |
| `lib/api/profile.ts` | **Done** | `/api/profile/update`, `/avatar`, `/avatar/delete`, `/api/gift-codes/redeem`, `/api/profile/request-deletion`, `/cancel-deletion`, `/api/waitlist`, `/api/signup` | |
| `components/ui/{Select,DateField,CheckboxRow}.tsx` · `lib/dates.ts` | **Done** | — | Native replacements for `<select>` / `<input type=date>` / checkbox grids. `DateField` is MM/DD/YYYY → ISO with 18+ validation (helpers unit-checked). |
| `components/profile/ProfileFields.tsx` | **Done** | — | Shared Personal Info + Identity field groups used by sign-up steps 1–2 and profile edit; labels/placeholders/options verbatim |
| `app/auth/sign-up/index.tsx` | **Done** | Supabase `signUp` | Step 0: email/password/confirm, live rule checklist, Google, Terms/Privacy links. `emailRedirectTo` = website step 1; after confirming, the member signs in here and the dashboard gate routes to step 1. |
| `app/auth/sign-up-success.tsx` · `components/auth/ResendConfirmation.tsx` | **Done** | Supabase `resend` | 60 s cooldown, web strings. Email input shown when the address is unknown (fixes the web's disabled-resend edge case). |
| `app/auth/sign-up/{profile,identity,membership}.tsx` · `components/auth/SignupProgress.tsx` | **Done** | `/api/profile/update`, `/api/waitlist`, `/api/gift-codes/redeem` | Steps 1–3 with progress chips. Step 2 sets `profile_completed`. Step 3: paid plans **open the website** (Apple 3.1.1), gift code + waitlist native; waitlist failure is surfaced (web swallows it). |
| `app/auth/{forgot-password,update-password,error,welcome,waitlist-confirmed}.tsx` | **Done** | Supabase auth | Update-password applies the sign-up strength rules (web has none); handles missing session. |
| `app/(tabs)/settings/profile/{index,edit}.tsx` · `components/profile/AvatarPicker.tsx` | **Done** | `/api/profile/update`, avatar routes | View (DOB banner, avatar, membership status, info rows, danger zone) + full edit form. Avatar via camera/library with square crop, JPEG ≤ 2 MB. |
| `app/(tabs)/settings/{membership,redeem-gift-code,delete-account}.tsx` | **Done** | web links, gift redeem, deletion routes | Membership is status-only; upgrade/portal open the website. Delete-account exposes **cancel pending request** (API exists; web modal lacks it). |
| **Slice F — Push · Universal links · Travel** | | | |
| Web `supabase/migrations/161_create_push_tokens.sql` | **Done** (run in SQL Editor) | — | `push_tokens` (user_id, token UNIQUE, platform, enabled, device_name, timestamps) with own-row RLS |
| Web `app/api/push/register/route.ts` | **Done** | — | GET list · POST upsert (token regex + platform validated, 20/min) · DELETE. Cookie or Bearer. |
| Web `lib/push.ts` | **Done** | Expo Push API (plain fetch) | `sendPushToUser` chunks of 100, deletes `DeviceNotRegistered` tokens; `notifyGrantStatus` copy per status |
| Web push hooks | **Done** | — | `update-status` (all statuses), `final-approve` (approved + not_approved loops), `transfer` (payment_sent) — all fire-and-forget after the DB write |
| Web `app/.well-known/{apple-app-site-association,assetlinks.json}/route.ts` | **Done** (404 until env set) | `APPLE_TEAM_ID`, `ANDROID_SHA256_CERT_FINGERPRINTS` | AASA paths: `/perks*`, `/grants*`, `/store*`, `/dashboard`, `/auth/callback`, `/auth/confirm`; excludes `/perks/info`, `/store/info`, `/grants/connect/*` (Stripe return must stay in the browser) |
| Web `app/travel/embed/route.ts` | **Done** | — | Thin HTML host for the Travel SDK on the whitelisted domain; `?session_token=` is the only credential; relays `loaded` / `session_expired` / `error` to RN via `postMessage` |
| `lib/notifications.ts` · `hooks/usePushNotifications.ts` | **Done** | `/api/push/register` | Silent re-registration on sign-in when permission already granted; permission is only *requested* from Settings. Tap routing via `data.url` (foreground, background, cold start). Token removed on sign-out. |
| `app/(tabs)/settings/notifications.tsx` | **Done** | — | Single toggle (grant updates); denied → Open Settings; explains Expo Go / simulator limits |
| `app/+native-intent.tsx` | **Done** | — | Rewrites universal links + `nfw://` URLs through `mapWebPathToAppRoute()` (22 cases unit-checked) |
| `app/(tabs)/perks/travel.tsx` | **Done** | `POST /api/travel/token` → `/travel/embed` | WebView; re-mints on `TRAVEL_CLIENT_SESSION_EXPIRED`; partner links open in the system browser; home button reloads |
| `app/(tabs)/perks/travel.tsx` | Placeholder | — | Slice F (WebView + `/api/travel/token`) |
| Everything else in the mapping table | Placeholder | — | Renders `PlaceholderScreen` with its web equivalent |

**Removed:** the `__DEV__` preview bypass (login button, settings button, `devPreview` store flag, `AuthGate` exemption).

### Deferred from Slice C (agreed 2026-09-11)
- **Required documents per grant cycle.** No `requires_documents` concept exists in the schema, admin UI or web form — requirements live in cycle description text only. Proposed design: migration adding `grant_cycles.requires_documents BOOLEAN` + `document_instructions TEXT`; admin checkbox/textarea on cycle new/edit; enforce ≥1 attached document on web + mobile; "Documents required" badge on cycle cards. Server-side enforcement at `grants/create` isn't possible because uploads happen after the row exists; the backstop is a "zero documents" state visible on the detail screen and to reviewers.
- **Post-submission document backstop.** If uploads fail after create, mobile offers Retry / Continue-without. Allowing uploads later from the application detail (only while zero docs + status `submitted`) was discussed and deferred.
- **Web bugs observed (not fixed):** `StripeAccountStatus.tsx` "Retry" only resets state — the fetch effect never re-runs; `grants/create` does not validate `certification_consent === true` server-side.

### Deferred from Slice D
- **My Claims pagination.** `/api/store/claims/my-claims-simple` returns the latest 5 claims; the web page lists all via the service role. A paginated member API (or reading `zero_dollar_claims` directly once its RLS is confirmed) is a follow-up.
- **Web observations (not fixed):** `StoreClient` never updates `monthlyClaimed` after a successful checkout (mobile does); `MyClaimsClient.STATUS_INFO` lacks `completed`/`paid`; `/api/store/claims/check` trusts `?userId=` without `getUser()`; `/api/profile/address/[userId]` is unauthenticated and unused.

### Deferred from Slice E
- **Email-link deep linking.** Confirmation and recovery emails currently land on the website (`emailRedirectTo` = web URLs) because `nfw://auth/callback` isn't in Supabase's redirect allowlist yet (Dependencies #4). Once universal links ship (Slice F), point `emailRedirectTo` at the app so confirmation/reset complete in-app.
- **Web observations (not fixed):** waitlist join failure sets no visible error; `validateGiftCode` (GET) is dead code; confirmation guard redirects to `/auth/sign-up-success` without `?email=` (disables resend); avatar "delete old file" parses a signed URL incorrectly (silent no-op); `DeleteAccountModal` has no cancel path; `/api/profile/update` accepts non-existent columns that 500.

### Remaining slices
- **G — Release:** icons/splash, Contact/FAQ/Share/Legal screens, error reporting, a11y, EAS builds, TestFlight/Play, store listings

---

## Route / Feature Mapping

Left: existing Next.js page, Vercel API route, or UI component. Right: the Expo Router file (relative to `/mobile/app/`) or module where the equivalent is built.

| Web (Next.js page / Vercel API / UI context) | Expo Router path (`/mobile/app/...`) |
|---|---|
| **APP SHELL** | |
| `app/layout.tsx` (providers, nav, GA4, Termly) | `app/_layout.tsx` — QueryClient, Zustand hydration, session restore from SecureStore, auth gate, push token registration |
| `proxy.ts` (auth redirect middleware) | `app/index.tsx` — redirect → `/(tabs)/dashboard` or `/auth/login` |
| `app/not-found.tsx` | `app/+not-found.tsx` |
| **AUTH** | |
| `app/auth/login/page.tsx` · `components/login-form.tsx` | `app/auth/login.tsx` |
| `app/auth/sign-up/page.tsx` · `components/SignUpFlow.tsx` (steps 0–3) | `app/auth/sign-up/index.tsx` (step 0), `app/auth/sign-up/profile.tsx` (step 1), `app/auth/sign-up/identity.tsx` (step 2), `app/auth/sign-up/membership.tsx` (step 3) |
| `app/auth/sign-up-success/page.tsx` | `app/auth/sign-up-success.tsx` |
| `app/auth/forgot-password/page.tsx` | `app/auth/forgot-password.tsx` |
| `app/auth/update-password/page.tsx` · `POST /api/auth/update-password` | `app/auth/update-password.tsx` (calls `supabase.auth.updateUser` directly — session lives in SecureStore, no cookie exchange needed) |
| `app/auth/callback/route.ts` · `app/auth/confirm/route.ts` (PKCE / token_hash) | `app/auth/callback.tsx` — deep-link target `nfw://auth/callback`; handles `exchangeCodeForSession` + `verifyOtp` |
| `app/auth/welcome/page.tsx` | `app/auth/welcome.tsx` |
| `app/auth/waitlist-confirmed/page.tsx` · `POST /api/waitlist` | `app/auth/waitlist-confirmed.tsx` |
| `app/auth/error/page.tsx` (resend confirmation) | `app/auth/error.tsx` |
| `app/auth/logout/route.ts` | Settings → `useAuthStore().signOut()` (clears SecureStore) |
| Google OAuth (Supabase provider, `auth.nationalfundforwomen.org`) | `lib/auth/google.ts` — `expo-web-browser` + `signInWithOAuth({ skipBrowserRedirect: true, redirectTo: 'nfw://auth/callback' })` |
| **DASHBOARD TAB** | |
| `app/dashboard/page.tsx` | `app/(tabs)/dashboard/index.tsx` |
| `components/dashboard/DashboardHero.tsx` · `GET /api/dashboard/settings` | `components/dashboard/DashboardHero.tsx` |
| `components/dashboard/MembershipCard.tsx` · `GET /api/auth/profile` | `components/dashboard/MembershipCard.tsx` |
| `components/dashboard/MembershipImpactCard.tsx` · `GET /api/dashboard/savings` | `components/dashboard/MembershipImpactCard.tsx` |
| `components/dashboard/PopularAcrossNFW.tsx` | `components/dashboard/FeaturedItems.tsx` (horizontal FlatList) |
| `components/dashboard/YourPerksAndBenefits.tsx` · `SavedBrandsPanel` · `RedeemedPerksPanel` | `components/dashboard/PerksSummary.tsx` → pushes `/(tabs)/perks/saved` and `/(tabs)/perks/history` |
| `components/dashboard/YourMicrograntsSection.tsx` | `components/dashboard/GrantsSummary.tsx` → pushes `/(tabs)/grants` |
| `components/dashboard/YourZeroDollarStoreSection.tsx` | `components/dashboard/StoreSummary.tsx` → pushes `/store` |
| `components/dashboard/PendingFreeMembershipBanner.tsx` · `AbandonedCheckoutBanner.tsx` · `components/profile/ProfileBanner.tsx` (DOB) · "You're Approved" Stripe banner | `components/banners/DashboardBanners.tsx` (single stacked banner component, same 4 conditions) |
| `components/AccessPerksSync.tsx` · `POST /api/access-perks/sync-member` | `hooks/useAccessPerksSync.ts` (fires once on dashboard mount) |
| **GRANTS TAB** | |
| `app/grants/page.tsx` → `/microgrants` (CMS) | `app/(tabs)/grants/index.tsx` — "Available Microgrants" list (open cycles, filters `is_testing_only` for non-admins) + "My Applications" segment |
| `app/grants/apply/page.tsx` · `components/GrantApplicationForm.tsx` · `POST /api/grants/create` | `app/(tabs)/grants/apply/index.tsx` + `app/(tabs)/grants/apply/confirm.tsx` (consent modal) |
| `POST /api/grants/upload-document` · `POST /api/grants/document-url` · `components/grants/GrantDocuments.tsx` | `components/grants/DocumentPicker.tsx` (`expo-document-picker` + `expo-file-system`) |
| `app/grants/my-applications/page.tsx` | `app/(tabs)/grants/my-applications.tsx` |
| `app/grants/view/[id]/page.tsx` | `app/(tabs)/grants/[id].tsx` |
| `app/grants/application-success/page.tsx` | `app/(tabs)/grants/application-success.tsx` |
| `components/grants/ConnectBankButton.tsx` · `StripeAccountStatus.tsx` · `POST /api/stripe/connect` · `GET /api/stripe/connect/status` | `components/grants/StripeConnectCard.tsx` — opens Stripe onboarding in `expo-web-browser` |
| `app/grants/connect/return/page.tsx` · `app/grants/connect/refresh/page.tsx` | `app/(tabs)/grants/connect/return.tsx` · `app/(tabs)/grants/connect/refresh.tsx` (deep-link targets `nfw://grants/connect/*`) |
| Grant status emails (`grant-approved`, `grant-payment-sent`, …) | Push notification → `app/(tabs)/grants/[id].tsx` (requires new `POST /api/push/register` + webhook hook on web side — see Dependencies) |
| **PERKS TAB** | |
| `app/perks/page.tsx` (stores/offers/locations views) | `app/(tabs)/perks/index.tsx` |
| `components/perks/PerksSearch.tsx` · `GET /api/access-perks/offers/search` · `GET /api/access-perks/rollup` | `components/perks/PerksSearchBar.tsx` |
| `components/perks/FilterSidebar.tsx` · `GET /api/access-perks/categories` · `/categories/counts` · `/facets` | `app/(tabs)/perks/filters.tsx` (bottom-sheet modal via `presentation: 'modal'`) |
| `components/perks/StoreCard.tsx` · `OfferCard.tsx` · `LocationCard.tsx` | `components/perks/StoreCard.tsx` · `OfferCard.tsx` · `LocationCard.tsx` |
| `app/perks/[offerKey]/page.tsx` · `components/perks/OfferDetailPanel.tsx` · `GET /api/access-perks/offers/[offerKey]` · `GET .../uses-remaining` · `GET /api/access-perks/locations` | `app/(tabs)/perks/[offerKey].tsx` |
| `POST /api/access-perks/offers/[offerKey]/redeem` (link / instore / instore_print / call) | `components/perks/RedeemSheet.tsx` — link → `expo-web-browser`; instore/print → `components/perks/CouponView.tsx` (QR/barcode/promo code, brightness boost); call → `Linking.openURL('tel:')` |
| `app/perks/nfw/[slug]/page.tsx` · `components/perks/NfwPerkDetailPanel.tsx` · `GET /api/nfw-perks/slug/[slug]` · `POST /api/nfw-perks/[id]/redeem` | `app/(tabs)/perks/nfw/[slug].tsx` |
| `GET /api/nfw-perks` · `components/perks/NfwPerkStoreCard.tsx` | `components/perks/NfwPerkCard.tsx` (NFW Exclusive toggle in `perks/index.tsx`) |
| `GET /api/perk-collections` (collection buttons, `?collection=slug`) | `app/(tabs)/perks/collections/[slug].tsx` (deep link `nfw://perks?collection=slug` remapped here) |
| `GET/POST/DELETE /api/perks/liked-stores` · `components/dashboard/SavedBrandsPanel.tsx` | `app/(tabs)/perks/saved.tsx` + `stores/likedStores.ts` (Zustand, optimistic) |
| `app/perks/history/page.tsx` · `GET /api/access-perks/redemptions` · `GET /api/nfw-perks/redemptions` · `GET .../redemptions/[id]/fresh-url` · `PATCH .../redemptions/[id]` · `components/ui/ExpiredLinkModal.tsx` | `app/(tabs)/perks/history.tsx` |
| `GET /api/perks/redemptions/check` | `hooks/useRedemptionStatus.ts` |
| `GET /api/perks/settings` (hero banner, `is_test_mode`) | `components/perks/PerksBanner.tsx` |
| `app/travel/page.tsx` · `app/travel/TravelClient.tsx` · `POST /api/travel/token` · `app/perks/travel/page.tsx` | `app/(tabs)/perks/travel.tsx` — `react-native-webview` hosting Travel SDK, token from `/api/travel/token`, `onShouldStartLoadWithRequest` → external browser fallback |
| `app/perks/info/page.tsx` | *Excluded (marketing page) — link opens web in browser* |
| **ZERO DOLLAR STORE** (root stack, reached from Dashboard + Perks) | |
| `app/store/page.tsx` · `components/StoreClient.tsx` · `GET /api/shopify/products` · `GET /api/store/settings` · `GET /api/system-settings` | `app/store/index.tsx` (+ `components/store/StoreUnavailableModal.tsx`) |
| `components/ProductDetailPanel.tsx` | `app/store/[productId].tsx` |
| `components/ClaimItemModal.tsx` · `POST /api/shopify/checkout` · `GET /api/store/claims/check` | `app/store/claim/[productId].tsx` (modal) → Shopify checkout URL in `expo-web-browser` |
| `app/store/my-claims/page.tsx` · `GET /api/store/claims/my-claims-simple` · `GET /api/shopify/orders/[id]` | `app/store/my-claims.tsx` |
| `app/store/info/page.tsx` | *Excluded — link opens web* |
| **SETTINGS TAB** | |
| `components/AuthButtonCombined.tsx` dropdown (Dashboard / My Profile / Logout) | `app/(tabs)/settings/index.tsx` |
| `app/profile/page.tsx` · `GET /api/auth/profile` · `GET /api/profile` | `app/(tabs)/settings/profile/index.tsx` |
| `app/profile/edit/page.tsx` · `components/ProfileCompletionForm.tsx` · `POST /api/profile/update` · `GET/POST /api/profile/address/[userId]` | `app/(tabs)/settings/profile/edit.tsx` |
| `components/profile/AvatarUpload.tsx` · `POST /api/profile/avatar` · `POST /api/profile/avatar/delete` | `components/profile/AvatarPicker.tsx` (`expo-image-picker`) |
| `components/ManageSubscription.tsx` · membership status from `GET /api/auth/profile` | `app/(tabs)/settings/membership.tsx` — **status only**; "Upgrade" / "Manage Subscription" buttons open `https://nationalfundforwomen.org/auth/sign-up?step=3` or `/profile` in the **system browser** (`Linking.openURL`). `POST /api/portal`, `POST /api/checkout`, `POST /api/membership/upgrade`, `POST /api/checkout/resume` are **not called from mobile**. |
| `POST /api/gift-codes/redeem` · `components/gift/RedeemGiftCodeModal.tsx` | `app/(tabs)/settings/redeem-gift-code.tsx` |
| `components/profile/DeleteAccountModal.tsx` · `GET/POST /api/profile/request-deletion` · `POST /api/profile/cancel-deletion` | `app/(tabs)/settings/delete-account.tsx` (required by App Store Guideline 5.1.1(v)) |
| *(new)* Notification preferences | `app/(tabs)/settings/notifications.tsx` + `stores/notifications.ts` (requires new `push_tokens` table + `POST /api/push/register` on web side) |
| `app/share-your-story/page.tsx` · `POST /api/testimonials` | `app/share-your-story.tsx` (root stack, from Settings) |
| `app/contact/page.tsx` · `POST /api/contact/submit` · `GET /api/contact` | `app/contact.tsx` (root stack, from Settings) |
| `app/faq/page.tsx` · `GET /api/faq` | `app/faq.tsx` |
| `app/privacy` · `app/terms-of-service` · `app/accessibility` · `GET /api/legal/[slug]` | `app/legal/[slug].tsx` (WebView of Termly embed) |
| `POST /api/log/client-error` | `lib/errorReporter.ts` (global ErrorBoundary + fetch wrapper) |
| **EXCLUDED FROM MOBILE (web-only)** | |
| `app/admin/**` · `app/api/admin/**` (125 routes) · `app/api/cron/**` | — |
| `app/page.tsx` · `app/[slug]/page.tsx` (page-builder CMS) · `app/preview/**` · `app/coming-soon` | — (marketing; deep links fall through to web) |
| `app/gift-membership/**` · `POST /api/gift-checkout` | — (purchase flow stays on web; redemption is in Settings) |
| `POST /api/checkout` · `POST /api/checkout/resume` · `GET /api/checkout/abandoned` · `POST /api/membership/upgrade` · `POST /api/portal` · `app/checkout/resume/page.tsx` | — (Stripe purchase/portal flows stay on web per Apple 3.1.1 decision) |
| `app/articles/**` | — Phase 2 candidate |
| `POST /api/webhook` · `/api/shopify/webhook` · `/api/storage/**` · `/api/system-settings/health-check` · `/api/test-email` · `/api/upload` | — server-only |

---

## `/mobile` Scaffold

```
mobile/
  app/                       # Expo Router (as mapped above)
    _layout.tsx
    index.tsx
    +not-found.tsx
    auth/
    (tabs)/
      _layout.tsx            # Bottom Tabs
      dashboard/
      grants/
      perks/
      settings/
    store/                   # root stack
    share-your-story.tsx
    contact.tsx
    faq.tsx
    legal/[slug].tsx
  components/{dashboard,perks,grants,store,profile,banners,ui}/
  lib/
    supabase.ts              # supabase-js + LargeSecureStore adapter, autoRefreshToken, AppState listener
    secureStorage.ts         # LargeSecureStore adapter
    api.ts                   # fetch wrapper → https://nationalfundforwomen.org/api/*, injects Bearer token
    auth/google.ts
    errorReporter.ts
    notifications.ts         # expo-notifications registration + handlers
  stores/                    # Zustand: auth.ts, profile.ts, likedStores.ts, notifications.ts, ui.ts
  hooks/                     # TanStack Query hooks per API domain
  constants/{colors.ts,fonts.ts}
  app.json / eas.json / package.json / tsconfig.json
```

---

## Build & Deployment Architecture

| | **Web app** (existing) | **Mobile app** (new) |
|---|---|---|
| Source location | Repo root (`app/`, `components/`, `lib/`…) | `/mobile/` subdirectory, own `package.json` |
| Build system | **Vercel** — triggered by `git push` | **EAS Build** — `eas build` CLI or GitHub integration |
| Build output | Serverless functions + static assets | Signed native binaries: `.ipa` (iOS), `.aab`/`.apk` (Android) |
| Where it runs | Vercel edge/serverless | Expo cloud build farm (no local Xcode/Android Studio required for cloud builds) |
| Deploy target | `nationalfundforwomen.org` | App Store Connect → TestFlight → App Store; Play Console → Internal Testing → Production |
| Code signing | N/A | EAS-managed Apple certs/profiles and Android keystore |
| Hot updates | Every push = new deploy | **EAS Update** — JS/asset changes OTA without store review; native changes need a new store build |
| Env vars | Vercel project settings | `EXPO_PUBLIC_*` in `mobile/.env` (bundled) + EAS Secrets |
| Cost | Existing Vercel plan | EAS free tier (limited builds/month) or Production plan for unlimited priority builds |

### Expo account linkage (done 2026-09-11)

| Setting | Value |
|---|---|
| Expo account / owner | `my-hero-creative` (CLI user `takingaction`, Google sign-in) |
| Project slug | `nfw-app` (matches expo.dev; `app.json` and `package.json` aligned) |
| EAS project ID | `8f7802b0-60fc-4623-809f-cf26fe7e06dd` (in `app.json` → `extra.eas.projectId`) |
| Dashboard | https://expo.dev/accounts/my-hero-creative/projects/nfw-app |
| CLI login | `npx expo login --browser` (Google accounts have no password) |
| Dev on phone | `npx expo start --tunnel` — the Mac is on Ethernet and the phone on Wi-Fi; the router blocks wired↔wireless client traffic, so LAN mode times out |

### Isolation within the shared repo
- **Vercel ignores `/mobile`** once `/mobile` is added to root `tsconfig.json` `exclude` and the ESLint ignore list (see Dependencies).
- **EAS ignores the web app**: `eas build` is run from `/mobile`; EAS uses `/mobile` as the project root.
- **Not a monorepo**: no `workspaces`; each side installs its own deps. Shared TS types are copied, not imported (a `packages/shared` workspace is a later refactor if drift becomes a problem).

### Runtime data flow
The mobile binary contains zero backend code. It calls:
- **Supabase** directly (`auth.nationalfundforwomen.org` for auth; RLS-protected tables for simple reads)
- **The existing Vercel API** at `https://nationalfundforwomen.org/api/*` for everything needing server secrets (Access Perks, Shopify, Stripe Connect status, Travel token)

### EAS build profiles (`eas.json`)

| Profile | Purpose | API target |
|---|---|---|
| `development` | Dev client on device/simulator with hot reload | `http://localhost:3000` or a Vercel preview URL |
| `preview` | Internal TestFlight / Play internal testing | `https://nationalfundforwomen.org` |
| `production` | Store submissions | `https://nationalfundforwomen.org` |

### Local development
`npx expo start` in `/mobile` runs Metro locally; test in iOS Simulator, Android Emulator, or Expo Go. Cloud builds are needed only for push-notification testing on iOS (Expo Go can't do APNs), TestFlight, and store submission.

---

## Slice F activation checklist (manual steps)

| # | Step | Where | Unlocks |
|---|---|---|---|
| 1 | Run `supabase/migrations/161_create_push_tokens.sql` | Supabase SQL Editor | Token registration (until then `POST /api/push/register` 500s and the app logs a warning) |
| 2 | Add `nfw://auth/callback` to **Auth → URL Configuration → Redirect URLs** | Supabase Dashboard | Google OAuth from the app (`lib/auth/google.ts` uses it as `redirectTo`) |
| 3 | Build a **development build** (`eas build --profile development`) or TestFlight build | EAS | Receiving push — Expo Go can't receive remote notifications (SDK 53+) |
| 4 | Set `APPLE_TEAM_ID` (Apple Developer account, 10 chars) | Vercel env | AASA file → iOS universal links open the app |
| 5 | Set `ANDROID_SHA256_CERT_FINGERPRINTS` (`eas credentials -p android` after first build) | Vercel env | assetlinks.json → Android App Links |
| 6 | Optional: `EXPO_ACCESS_TOKEN` (expo.dev → Access Tokens) | Vercel env | Authenticated Expo Push API (higher limits, required if "enhanced push security" is turned on for the Expo project) |
| 7 | Confirm `www.nationalfundforwomen.org` is whitelisted with Access Development | Access Development | Travel SDK loads inside `/travel/embed` (same domain as the web `/travel` page, so likely already true) |
| 8 | After 4: switch `emailRedirectTo` in `app/auth/sign-up/index.tsx`, `ResendConfirmation.tsx`, `forgot-password.tsx` to app-openable URLs | mobile | Confirmation / reset emails open the app directly (they intercept `/auth/confirm`) |

## Dependencies on the Web Repo (follow-up edits, not part of the scaffold)

1. ~~Bearer-token auth for API routes~~ — **done** (`459cdc4`, `lib/supabase/server.ts`).
2. ~~Push infrastructure~~ — **done** in Slice F (run migration 161 — see activation checklist).
3. ~~Root `tsconfig.json` / ESLint excludes~~ — **done** (`8fc5a8e`).
4. **Supabase Dashboard:** add `nfw://auth/callback` to Auth → URL Configuration → Redirect URLs (activation checklist #2).
5. **Google Cloud Console:** add iOS bundle ID / Android package name to the OAuth client.

---

## Technical Notes

- **`expo-secure-store` 2048-byte limit.** Supabase sessions (esp. Google OAuth with `provider_token`) routinely exceed 2 KB. Using the Supabase-documented `LargeSecureStore` pattern: a random AES-256 key per storage key is stored in SecureStore; the encrypted session blob is stored in AsyncStorage. Plaintext tokens never touch AsyncStorage.
- **Expo Router version.** Using the Router bundled with the latest stable Expo SDK (not the SDK 50–era v3). Same file-based API, typed routes enabled.
- **Grants "browse" page.** Web `/grants` redirects to a CMS page; mobile `grants/index.tsx` queries `grant_cycles` directly (status=open, `is_testing_only=false` for non-admins), matching the dashboard's "Available Microgrants" logic.
- **Deep links.** URL scheme `nfw://`. Universal links / App Links for `https://nationalfundforwomen.org/perks/*`, `/grants/*`, `/store/*` are a Phase 8 item (requires `apple-app-site-association` + `assetlinks.json` served by the Next.js app).
- **Fonts.** Playfair Display (headings/body) and DM Sans (UI/buttons) loaded via `expo-font`, matching web brand rules.
- **Brand palette.** aubergine `#3E145F` · citrine `#F8F19A` · lilac `#B693C0` · wisteria `#7786BE` · dove `#F6F5F0` · blackberry `#2E1F38` · stone `#a3a3a3`. Green `#d4f1ad` reserved for status badges only.
