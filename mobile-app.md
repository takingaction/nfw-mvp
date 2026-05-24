# NFW Mobile App - Build Plan

**Created:** 2026-05-24
**Status:** Planning
**Goal:** Native iOS + Android app using React Native

---

## Context

- DIY with AI assistance
- Timeline: ASAP
- Budget: No limit
- Push notifications: Required from day one

---

## Executive Summary

Build native iOS and Android apps for National Fund for Women using React Native (Expo). The app will provide mobile access to member perks, grant applications, and dashboard features currently available on the web app. Access Perks integration will use existing REST APIs; Travel will use embedded WebView.

---

## Developer Accounts & Tools Required

### What You Already Have
| Resource | Status |
|----------|--------|
| Mac | ✓ |
| Supabase backend | ✓ (existing) |
| Access Perks REST API | ✓ (existing) |
| GitHub | ✓ |
| VS Code | ✓ |

### Accounts to Sign Up For

| Service | Cost | When Needed |
|---------|------|-------------|
| Apple Developer Program | $99/year | Only when publishing to App Store |
| Google Play Console | $25 one-time | Only when publishing to Play Store |
| Expo | Free | Development (recommended) |

### Development Testing (No Account Needed)

| Platform | Build & Test | Publish |
|----------|--------------|---------|
| iOS | Free (simulator + your phone) | $99/year Apple Developer Program |
| Android | Free (emulator + your phone) | $25 one-time Play Console |

---

## Technical Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Expo (managed workflow) | Faster builds, easier cert management |
| Language | TypeScript | Existing codebase uses TS |
| Navigation | React Navigation v6 | Industry standard, tab + stack |
| State | Zustand | Lightweight, simple API |
| Push Notifications | Expo Notifications + FCM/APNs | Built into Expo |
| API layer | RTK Query or TanStack Query | Caching, loading states |
| Auth | Supabase React Native client | Same backend |

---

## Features by Screen

### 1. Authentication
- [ ] Sign up (email/password)
- [ ] Login
- [ ] Password reset
- [ ] Google OAuth (requires native URL scheme setup)
- [ ] Session handling with AsyncStorage

### 2. Profile
- [ ] View profile (name, DOB, membership level)
- [ ] Edit profile
- [ ] Date of birth alert banner (prompt for real DOB if placeholder)

### 3. Dashboard (Home)
- [ ] Personalized greeting
- [ ] Membership impact card (savings, offers used)
- [ ] Quick actions (View Perks, My Grants, Browse Store)
- [ ] Saved brands panel
- [ ] Redeemed perks panel

### 4. Grants
- [ ] Browse available grant cycles
- [ ] Grant detail (amount, deadline, description)
- [ ] Application form (reuse web form fields)
- [ ] My applications list
- [ ] Application status tracking
- [ ] Push notification on status change

### 5. Perks - Browse
- [ ] Offers grid with images
- [ ] Search by keyword
- [ ] Filters (category, distance, online-only)
- [ ] Store detail view
- [ ] Save/like stores
- [ ] Deep link handling for offer URLs

### 6. Perks - Redemption
- [ ] In-store redemption (returns coupon + location)
- [ ] Print coupon (returns coupon image/URL)
- [ ] Link redemption (opens in-app browser)
- [ ] Active offers list
- [ ] Redemption history
- [ ] Coupon display (QR code, barcode, promo code)

### 7. Zero Dollar Store
- [ ] Browse products
- [ ] Product detail panel
- [ ] Claim item (Shopify checkout)
- [ ] Order history
- [ ] Latest offerings carousel

### 8. Travel
- [ ] WebView container for Travel SDK
- [ ] Handle SDK callbacks via deep links
- [ ] Loading state
- [ ] Fallback to external browser

### 9. Settings
- [ ] Notification preferences (on/off)
- [ ] Account info
- [ ] Logout
- [ ] App version

---

## Build Phases

### Phase 1: Setup & Foundation
**Timeline:** Week 1
**Goal:** Dev environment ready, empty shell app on simulators

- [ ] Install Xcode (App Store → free)
- [ ] Install Android Studio (Google → free)
- [ ] Install VS Code + React Native extension
- [ ] Create Expo account (expo.dev → free)
- [ ] Initialize project: `npx create-expo-app NFWMobile`
- [ ] Run on iOS Simulator
- [ ] Run on Android Emulator

### Phase 2: Auth & User Management
**Timeline:** Week 1-2
**Goal:** Users can sign up, log in, manage profile

- [ ] Install Supabase React Native client
- [ ] Auth screens (sign up, login, password reset)
- [ ] Google OAuth
- [ ] Session handling
- [ ] Profile screen
- [ ] Push notification permission request

### Phase 3: Grants
**Timeline:** Week 2-3
**Goal:** Browse grants, submit applications, track status

- [ ] Grant list screen
- [ ] Grant detail screen
- [ ] Application form
- [ ] My applications screen
- [ ] Push notifications for status changes

### Phase 4: Perks - Core
**Timeline:** Week 3-4
**Goal:** Browse offers, search, filter, save favorites

- [ ] Supabase API wrapper for Access Perks
- [ ] Offers list
- [ ] Search + filters
- [ ] Store detail
- [ ] Save/like stores
- [ ] Deep link handling

### Phase 5: Perks - Redemption
**Timeline:** Week 4-5
**Goal:** Redeem coupons, view active offers, history

- [ ] In-store redemption
- [ ] Print coupon
- [ ] Link redemption (in-app browser)
- [ ] Active offers screen
- [ ] Redemption history

### Phase 6: Dashboard & Profile
**Timeline:** Week 5-6
**Goal:** Member home screen, impact stats, settings

- [ ] Dashboard home
- [ ] Membership impact card
- [ ] Redeemed perks panel
- [ ] Settings screen
- [ ] Notification preferences

### Phase 7: Travel
**Timeline:** Week 6-7
**Goal:** Integrate travel booking

- [ ] WebView container
- [ ] Handle SDK callbacks
- [ ] Loading state
- [ ] Fallback browser handling

### Phase 8: Polish & Testing
**Timeline:** Week 7-8
**Goal:** Bug fixes, performance, App Store assets

- [ ] Bug fixes on physical devices
- [ ] Performance (lazy loading, image caching)
- [ ] App icons + splash screen
- [ ] Screenshots for stores
- [ ] TestFlight beta (iOS)
- [ ] Play Store internal testing (Android)

### Phase 9: Publish
**Timeline:** Week 8-9
**Goal:** Live on both stores

| Task | iOS | Android |
|------|-----|---------|
| Sign up | Apple Developer Program ($99/yr) | Google Play Console ($25) |
| Create listing | App Store Connect | Play Console |
| Upload build | Xcode → App Store Connect | Android Studio → Play Console |
| Review | 1-3 days | 1-7 days |
| Go live | ✓ | ✓ |

---

## Access Perks Integration

### What's Feasible on Mobile

| Feature | Method | Status |
|---------|--------|--------|
| Browse offers | REST API | ✓ Works great |
| Search by location | REST API | ✓ Works great |
| In-store redemption | REST API | ✓ Works |
| Print coupons | REST API | ✓ Works |
| Link redemption | Opens browser | ✓ Works |
| Uses remaining | REST API | ✓ Works |
| Saved/liked stores | Your API | ✓ Works |

### Travel SDK

| Issue | Solution |
|-------|----------|
| Web-only iframe | Embed in WebView (WKWebView/SFWebView) |
| 320x600px minimum | Handle in app container |
| SDK callbacks | Deep links back to app |

### API Endpoints Available

```
GET /v1/offers                      - Search offers
GET /v1/offers/{key}                - Get offer details
GET /v1/offers/{key}/uses_remaining - Check uses remaining
GET /v1/redeem/{key}/instore        - In-store redemption
GET /v1/redeem/{key}/instore_print  - Print coupon
GET /v1/redeem/{key}/link           - Link/callback
GET /v1/locations                   - Location search
```

---

## Design Decisions

### Navigation Style
**Decision needed:** Tab-based (bottom tabs) or drawer?

Current web app uses header navigation. Mobile apps typically use:
- **Bottom tabs** (Instagram, Spotify style) - 4-5 main sections
- **Drawer** (gmail style) - more menu items

### Branding
- Use existing NFW colors and logo
- Mobile-specific splash screen and app icons needed

### Data Sync Strategy
- Pull on app open (simple, reliable)
- Or real-time with Supabase subscriptions (more complex)

---

## Key Challenges

1. **Access Perks SDK** - Web-only. Travel uses iframe SDK. Mobile needs WebView wrapper.

2. **Google OAuth** - Requires native URI scheme setup (`supabase://` callback). Well-documented but requires configuration.

3. **Coupon Display** - Some coupons are QR codes, some are barcodes, some are promo text. Need to handle variety.

4. **App Store Review** - Apple rejection possible. Must follow HIG and have proper UX.

---

## Open Questions

1. **Navigation style:** Tab-based or drawer?
2. **Branding:** Reuse web design or mobile-specific?
3. **Data sync:** Pull on open or real-time subscriptions?
4. **Push triggers:** What notifications are priority (grant deadline, new perks, etc)?

---

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Navigation Docs](https://reactnavigation.org)
- [Supabase React Native](https://supabase.com/docs/reference/javascript/react-native)
- [React Native Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Access Travel Integration Skill](../.agents/skills/access-travel-integration/SKILL.md)