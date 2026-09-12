# NFW Mobile — Release Runbook & Store Listing

Companion to `migration-blueprint.md` (what was built) — this file is *how to ship it*.

## 0. Identifiers

| | |
|---|---|
| App name | National Fund for Women |
| Bundle ID / package | `org.nationalfundforwomen.app` |
| Scheme | `nfw://` |
| EAS project | `8f7802b0-60fc-4623-809f-cf26fe7e06dd` (owner `my-hero-creative`, slug `nfw-app`) |
| Runtime version policy | `appVersion` — every `expo.version` bump is a new OTA runtime |
| Update channels | `development` · `preview` · `production` (see `eas.json`) |
| Version source | remote (`eas build` manages `buildNumber` / `versionCode`; production auto-increments) |

## 1. One-time account setup

### Apple (blocks TestFlight + universal links)
1. Enroll in the Apple Developer Program ($99/yr) as **National Fund for Women** (organization — needs a D-U-N-S number; individual enrollment is faster but shows a person's name as the seller).
2. Note the **Team ID** → Vercel env `APPLE_TEAM_ID` (turns on `/.well-known/apple-app-site-association`).
3. App Store Connect → New App → bundle `org.nationalfundforwomen.app`, SKU `nfw-app`. Copy the numeric **App ID** into `eas.json` → `submit.production.ios.ascAppId`.
4. `eas credentials -p ios` → let EAS create the distribution cert + provisioning profile. Enable the **Push Notifications** capability when prompted (EAS generates the APNs key).

### Google Play
1. Play Console developer account ($25 one-time) as the organization.
2. Create app → package `org.nationalfundforwomen.app`, default language en-US.
3. First upload must be manual (EAS can't create the app listing). After that, `eas submit` works with a service account:
   Play Console → Setup → API access → create service account with *Release manager* → download JSON → save as `mobile/google-play-service-account.json` (git-ignored).
4. `eas credentials -p android` → after the first build, copy the **SHA-256** fingerprint(s) → Vercel env `ANDROID_SHA256_CERT_FINGERPRINTS` (comma-separated; include the Play App Signing key from Play Console → App integrity, not just the upload key).

### Expo
- Optional: `EXPO_ACCESS_TOKEN` in Vercel for authenticated push sends (`lib/push.ts`).
- Push in dev/preview builds requires the APNs key + FCM V1 credentials on the EAS project: `eas credentials` → Push Notifications (iOS) and `eas credentials -p android` → Google Service Account for FCM.

### Supabase
- Auth → URL Configuration → Redirect URLs: add `nfw://auth/callback`.
- Run `supabase/migrations/161_create_push_tokens.sql` (if not already applied).

## 2. Build

```bash
cd mobile
npx expo login --browser              # Google account (my-hero-creative)

# Internal testing (installable without stores)
eas build -p android --profile preview      # → .apk, share the link
eas build -p ios --profile preview          # → ad-hoc .ipa (device UDIDs registered via `eas device:create`)

# Dev client on a physical phone (push + universal links testable)
eas build -p ios --profile development-device
eas build -p android --profile development

# Store builds
eas build -p all --profile production
```

Pre-flight before any production build:

```bash
npm run typecheck && npm run lint && npx expo-doctor
node mobile/scripts/generate-app-icons.mjs   # only if the mark changed (run from repo root)
```

## 3. Submit

```bash
eas submit -p ios --latest        # → TestFlight; then add testers / submit for review in ASC
eas submit -p android --latest    # → Play internal track (draft); promote in Play Console
```

## 4. Over-the-air updates

JS-only changes ship without a store review:

```bash
eas update --channel production --message "fix: …"
```

Anything touching native config (`app.json` plugins/permissions, new native packages, `expo.version`) needs a new store build. `checkAutomatically: ON_LOAD` + `fallbackToCacheTimeout: 0` means users get the update on the *next* launch.

## 5. Post-release verification

- `curl -I https://www.nationalfundforwomen.org/.well-known/apple-app-site-association` → 200 JSON (not 404) after `APPLE_TEAM_ID` is set.
- Open `https://www.nationalfundforwomen.org/grants/view/<id>` from Notes on a device with the app → opens the app.
- Settings → Notifications → enable → confirm a `push_tokens` row; change a grant status in admin → push arrives.
- Flip `emailRedirectTo` in `app/auth/sign-up/index.tsx`, `components/auth/ResendConfirmation.tsx`, `app/auth/forgot-password.tsx` to app-openable URLs once universal links verify.

---

## Store listing (draft — edit freely)

**Name:** National Fund for Women
**Subtitle (iOS, ≤30):** Microgrants, perks & more
**Short description (Play, ≤80):** Your NFW membership in your pocket: microgrants, member perks, Zero Dollar Store.

**Description**

> National Fund for Women is a membership community that puts money and resources directly into women's hands. The NFW app brings your membership with you:
>
> • **Microgrants** — browse open grant cycles, apply in minutes, attach supporting documents, and track every application from submission to payment.
> • **Member Perks** — thousands of discounts at national brands and local businesses near you, plus NFW-exclusive partner offers. Save your favorites and redeem online, in store, or by phone.
> • **Zero Dollar Store** — claim one free product every month, shipped to your door.
> • **Travel** — member rates on hotels, car rentals, flights, and activities.
> • **Your dashboard** — see what your membership has put back in your pocket and connect your bank account to receive grant funds securely through Stripe.
>
> Membership is required. Join or manage your membership at nationalfundforwomen.org.

**Keywords (iOS, ≤100 chars):** `women,grants,microgrant,nonprofit,perks,discounts,membership,community,savings,free`

**Category:** Lifestyle (primary) · Finance (secondary)
**Age rating:** 17+ / Mature 17+ is *not* required — content is 4+/Everyone, but membership requires 18+ (state this in the review notes).
**Privacy policy URL:** https://www.nationalfundforwomen.org/privacy
**Support URL:** https://www.nationalfundforwomen.org/contact
**Marketing URL:** https://www.nationalfundforwomen.org

**App Privacy (Apple) / Data safety (Google) — data collected, linked to identity:**
name, email, phone, physical address, date of birth, household income range, self-identified demographics (optional), photos (avatar / grant documents, user-initiated), coarse location (ZIP entered by user — no device location permission), purchase history (grant awards, store claims, perk redemptions), device push token, crash/diagnostic data (error reports). No tracking, no third-party advertising, no data sold.

**Review notes (Apple/Google):**
- Demo account: create a test member before submission (`eas build` reviewers need a login) — note email/password here, never commit it.
- Membership purchases are **not** offered in the app (reader-app style: status display + link to the website), per Guideline 3.1.1 / Play Payments policy. Grant payouts flow *to* the user via Stripe Connect — the app never charges the user.
- Zero Dollar Store "checkout" opens Shopify in an in-app browser for shipping details; the order total is always $0.
- Push notifications are opt-in from Settings → Notifications and only report grant application status changes.

**Screenshots to capture (6.7" iPhone + 6.5", 5.5" optional; Play 16:9 or 9:16):** Dashboard · Grants list · Grant detail (approved) · Perks stores grid · Offer detail · Zero Dollar Store · Settings/Notifications.
