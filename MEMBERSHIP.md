# Membership Sign-Up Flow

## Overview

The membership sign-up flow handles user registration, email confirmation, profile completion, and membership tier selection. It supports both email/password and Google OAuth sign-up.

## Sign-Up Flow Steps

```
/auth/sign-up → [Email/Password] → Check Email Page → Email Confirmation
                 OR
              [Google OAuth] → /auth/callback → Step 1 or Dashboard
                                                            ↓
                              User clicks link → /auth/sign-up?step=1
                                                            ↓
                    Step 1 (Personal Info) → Step 2 (Identity) → Step 3 (Membership)
                                                            ↓
                         Free: /auth/welcome → /dashboard
                         Paid: Stripe Checkout → Webhook → /auth/welcome → /dashboard
```

### Step 0: Account Creation (`/auth/sign-up?step=0`)
- **Email/Password:** User enters email and password, calls `supabase.auth.signUp()` with `emailRedirectTo` pointing to `/auth/sign-up?step=1`, redirects to `/auth/sign-up-success?email={email}` to check email
- **Google OAuth:** User clicks "Sign up with Google", redirected to Google OAuth, returns to `/auth/callback`

### Step 1: Personal Info (`/auth/sign-up?step=1`)
- Full name
- Phone number
- Address (Line 1, Line 2, City, State, ZIP)
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed

### Step 2: Identity (`/auth/sign-up?step=2`)
- Age range (moved to top of this step)
- Household income
- Identities (multi-select)
- Social handles (optional): Instagram, Twitter, Facebook, LinkedIn
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed
- **Sets `profile_completed: true`** - Profile is considered complete after this step

### Step 3: Membership Selection (`/auth/sign-up?step=3`)
- Free: Redirects to `/auth/welcome`
- Contributing ($15/year): Redirects to Stripe Checkout
- Founding ($100/year): Redirects to Stripe Checkout
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed

### Confirmation Email (`/auth/sign-up-success`)
- Shows "Check your email" message
- Resend confirmation email button with 60-second cooldown
- Uses `supabase.auth.resend({ type: 'signup' })`

### Welcome Page (`/auth/welcome`)
- Checks if `profile_completed` is true
- If false, redirects to `/auth/sign-up?step=1`
- If true, shows appropriate welcome message based on membership level:
  - **Free members:** "You're officially a member!"
  - **Contributing members:** "You're a Contributing Member!" (after upgrade or new paid signup)
  - **Founding members:** "You're a Founding Member!" (after upgrade or new paid signup)
- Links to `/dashboard`

## Membership Tiers

| Tier | Price | Stripe Price ID |
|------|-------|-----------------|
| Free | $0 | (no Stripe) |
| Contributing | $15/year | `price_xxx` |
| Founding | $100/year | `price_xxx` |

## Database Schema

### Profiles Table

```sql
ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
```

Fields tracked:
- `full_name`
- `age_range`
- `phone_number`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `zip`
- `household_income`
- `identities` (array)
- `social_handles` (JSON: instagram, twitter, facebook, linkedin)
- `profile_completed` (boolean)
- `membership_level` (free, contributing, founding)

## API Endpoints

### Profile Update (`/api/profile/update`)
Handles updating profile fields including:
- All profile fields
- `profile_completed` boolean
- `identities` array
- `social_handles` object

### Checkout (`/api/checkout`)
Creates Stripe checkout session for paid memberships.

### Portal (`/api/portal`)
Creates Stripe Customer Portal session for managing existing subscriptions.

## Protected Routes

The following pages check for `profile_completed` AND `membership_level` before allowing access:

| Check | Result | Redirect To |
|-------|--------|-------------|
| `profile_completed = false` | Profile not filled | `/auth/sign-up?step=1` |
| `membership_level = null` | Profile complete, no membership selected | `/auth/sign-up?step=3` |
| Both pass | Allow access | Continue to page |

Protected pages:
- `/dashboard`
- `/perks`
- `/grants/apply`

### Why Separate Profile from Membership?

A user can fill out their profile (steps 1-2) but not yet select a membership tier. They should still be able to access some parts of the site but not others. The separation allows:
- Users who abandoned at step 3 to be redirected to complete membership selection
- Paid members to see appropriate welcome messaging after payment

## Supabase Configuration

### Email Confirmation
1. Go to **Authentication → Email**
2. Enable **Confirm email** toggle
3. Update email template `next` param to `/auth/sign-up?step=1`

### Email Template
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1">Confirm your email</a>
```

## Page Builder: Pricing Cards Section

The `pricing_cards` section template supports dynamic Stripe buttons.

### Section Fields
| Field | Type | Description |
|-------|------|-------------|
| `show_buttons` | boolean | Show/hide plan buttons |
| `show_cta` | boolean | Show/hide bottom CTA section |
| `stripe_price_id` | string | Stripe Price ID per plan card |

### Plan Button Logic

| User State | Free Plan | Contributing | Founding |
|-----------|-----------|---------------|----------|
| Logged out | "Join Free" → signup | "Upgrade" → signup | "Upgrade" → signup |
| Free member | "Current Plan" (disabled) | "Upgrade" → Stripe Checkout | "Upgrade" → Stripe Checkout |
| Contributing | (hidden) | "Manage Subscription" → Portal | "Upgrade" → Stripe Checkout |
| Founding | (hidden) | (hidden) | "Manage Subscription" → Portal |

### `/plans` Page Setup
1. Create page in page builder with slug `/plans`
2. Add `pricing_cards` section
3. Set `show_buttons: true`
4. Set `show_cta: false` (for upgrade page)
5. Enter `stripe_price_id` for Contributing and Founding plans

## Environment Variables

```env
STRIPE_PRICE_CONTRIBUTING=price_xxx
STRIPE_PRICE_FOUNDING=price_xxx
```

## Files

- `components/SignUpFlow.tsx` - Multi-step signup form
- `app/auth/sign-up/page.tsx` - Sign-up page wrapper
- `app/auth/sign-up-success/page.tsx` - Email confirmation page
- `app/auth/welcome/page.tsx` - Welcome page
- `components/ManageSubscription.tsx` - Dashboard subscription button
- `components/sections/PlanButton.tsx` - Pricing card button logic
- `components/sections/PricingCardsSection.tsx` - Pricing cards display
- `app/api/profile/update/route.ts` - Profile update endpoint
- `app/api/checkout/route.ts` - Stripe checkout
- `app/api/portal/route.ts` - Stripe portal

## Google OAuth Setup

### Supabase Configuration
1. Enable Google provider in **Supabase Dashboard → Authentication → Providers → Google**
2. Enter Client ID and Client Secret from Google Cloud Console

### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `https://lirsaxhujjgnibcwyzpl.supabase.co/auth/v1/callback`
4. Configure OAuth consent screen with app name ("National Fund for Women") and authorized domains

### Code Changes
- `app/auth/callback/route.ts` - Handles OAuth callback, checks profile completion, redirects
- `components/login-form.tsx` - Added "Continue with Google" button
- `components/SignUpFlow.tsx` - Added "Sign up with Google" button on Step 0

### OAuth Callback Flow
```
User clicks Google sign-in → Redirect to Google OAuth
    → User grants permission
    → Redirect to /auth/callback?code=xxx
    → Exchange code for session
    → Check if profile exists and profile_completed=true
    → Existing complete user → /dashboard
    → New user or incomplete profile → /auth/sign-up?step=1
```

### OAuth Files
- `app/auth/callback/route.ts` - OAuth callback handler

## FAQ Section: Linked Text

### Overview
FAQ section answers support inline hyperlinks using markdown-style syntax.

### Syntax
```
[link text](https://example.com)              - Same window
[link text](https://example.com)|_blank        - New tab
```

### How It Works
1. Admin enters markdown link syntax in the answer field
2. `parseMarkdownLinks()` function converts to HTML on render
3. Links styled to match background color (aubergine/citrine/lilac)

### Code Files
- `components/sections/FaqSection.tsx` - Parses markdown links and renders HTML
- `components/admin/pages/SectionEditorPanel.tsx` - Link insert modal for richtext fields

### Link Insert Modal
Admin can click "Insert Link" button to open modal with:
- Link Text field
- URL field  
- "Open in new tab" checkbox

## Bug Fixes

### Age Range Field (2026-03-30)
**Problem:** `age_range` was still being sent from Step 1 even though it was moved to Step 2, causing database constraint violation.

**Fix:** Removed `age_range` from `handlePersonalInfo` payload in `SignUpFlow.tsx`.

### Spinning Buttons (2026-03-30)
**Problem:** Clicking paid membership buttons and then hitting back left buttons in permanent loading state.

**Fix:** Added `finally` block and 30-second timeout in `handleSelectPlan` to reset loading state.

### Profile Phone Field (2026-03-30)
**Problem:** Database had duplicate `phone` and `phone_number` columns.

**Fix:** Removed `phone` column definition from migration file. Data preserved in `phone_number`.

### FAQ Question Font Size (2026-03-30)
**Problem:** FAQ question and answer text were same size.

**Fix:** Increased question text from `text-lg` to `text-xl` in `FaqSection.tsx`.

### Profile vs Membership Completion (2026-03-30)
**Problem:** `profile_completed` was only set after step 3 (membership selection), conflating profile completion with membership selection. Users who filled their profile but hadn't selected a tier were blocked from dashboard/perks.

**Fix:** 
- Set `profile_completed = true` after step 2 (identity) completes
- Protected routes now check both `profile_completed` AND `membership_level`
- Users with profile complete but no membership are redirected to step 3
- `/auth/welcome` now shows appropriate messages based on membership level (free vs paid)

## Font Consistency (2026-03-31)

All NFW pages follow brand font guidelines:
- **Playfair Display** (`font-serif`) - Headings, body text, descriptions
- **DM Sans** (`font-ui`) - Button text, navigation links, eyebrow text, labels

### Brand Font Rules

| Element | Font | Tailwind Class |
|---------|------|----------------|
| Headings, body text | Playfair Display | `font-serif` |
| Button text | DM Sans | `font-ui` |
| Navigation links | DM Sans | `font-ui` |
| Eyebrow text | DM Sans | `font-ui` |
| Labels, card titles | DM Sans or Playfair Display | See guidelines |

### Files Fixed

**Section Templates:**
- `PricingCardsSection.tsx` - Body text → `font-serif`
- `PricingComparisonSection.tsx` - Benefit labels → `font-serif`
- `PricingBenefitsSection.tsx` - Body and item descriptions → `font-serif`
- `PricingCtaBoxSection.tsx` - Body and secondary text → `font-serif`
- `GrantsGridSection.tsx` - Card text → `font-serif`, CTA links → `font-ui`
- `SuccessStoriesSection.tsx` - CTA links → `font-ui`
- `TestimonialsGridSection.tsx` - Quote text → `font-serif`
- `MemberCelebrationGridSection.tsx` - Body text → `font-serif`
- `BenefitsCheckmarksSection.tsx` - Body and descriptions → `font-serif`
- `HowItWorksSection.tsx` - Step titles → `font-serif`
- `RightSide3FeaturesSection.tsx` - Item titles → `font-serif`
- `3CardsSection.tsx` - Card descriptions → `font-serif`
- `4CardsSection.tsx` - Subheadlines, card titles, descriptions → `font-serif`
- `PerksStoreGridSection.tsx` - Subheadline, card descriptions → `font-serif`, CTA links → `font-ui`
- `ZeroDollarStoreTeaserSection.tsx` - Product titles → `font-serif`

**Landing Components:**
- `Footer.tsx` - All navigation link text → `font-ui`

**App Pages:**
- `perks/page.tsx` - Body text → `font-serif`, buttons → `font-ui`
- `grants/apply/page.tsx` - Headings/body → `font-serif`
- `contact/page.tsx` - All body text → `font-serif`, labels/links → `font-ui`
- `faq/page.tsx` - Category headings, questions, answers → `font-serif`

### Pages Now Consistent

- `/membership` - "Why become a member?" section
- `/about-us-new` - "Our Values" section, 3 blocks
- `/faq` - FAQ accordion section
- `/microgrants` - "How microgrants work" step titles
- `/perks-about` - "Browse Our Perks" section
- `/store-about` - "$0 every item" product titles, "What else do I need to know?" section
- `/contact` - All contact cards and form
