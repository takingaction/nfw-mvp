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
                              Paid: Stripe Checkout → /auth/welcome → /dashboard
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

### Step 3: Membership Selection (`/auth/sign-up?step=3`)
- Free: Redirects to `/auth/welcome` after setting `profile_completed: true`
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
- If true, shows welcome celebration page
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

The following pages check for `profile_completed` and redirect to sign-up if incomplete:
- `/dashboard`
- `/perks`
- `/grants/apply`

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
