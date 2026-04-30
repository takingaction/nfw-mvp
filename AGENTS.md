# Agents

This file contains context and instructions for AI agents working on this project.

## Project Overview

- **Project**: nfw-mvp
- **Type**: Next.js application with TypeScript, Tailwind CSS
- **Location**: ./nfw-mvp

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: npm

## Project Structure

- `app/` - Next.js App Router pages
- `components/` - React components
- `lib/` - Utility functions and libraries
- `types/` - TypeScript type definitions
- `middleware/` - Next.js middleware
- `public/` - Static assets

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Critical Database Schema Notes

### IMPORTANT: `profiles` Table Does NOT Have `email` Column

The `profiles` table schema does NOT include an `email` column. User email is stored in `auth.users`, NOT in `profiles`.

**Correct `profiles` table columns:**
- `id` (UUID, PK)
- `full_name` (TEXT)
- `membership_level` (TEXT)
- `is_admin` (BOOLEAN)
- `profile_completed` (BOOLEAN)
- `city`, `state`, `zip` (TEXT)
- `date_of_birth` (DATE) - must be 18+, born after 1900
- `household_income` (TEXT)
- `stripe_connect_account_id` (TEXT)
- `subscription_status`, `subscription_ends_at` (TEXT)
- `shipping_address` (JSONB)
- `social_handles` (JSONB)
- And more...

**NEVER query `profiles.email`** - it doesn't exist. To get user email, you must query `auth.users` table directly.

### Bug Pattern to Avoid

```typescript
// WRONG - profiles table has no email column:
.supabase.from("profiles").select("id, full_name, email")

// CORRECT - only select columns that exist:
.supabase.from("profiles").select("id, full_name")
```

This mistake has caused bugs in:
- `app/admin/grants/[id]/page.tsx` - Fixed 2026-04-04
- `components/admin/AdminGrantReviewer.tsx` - Fixed 2026-04-05
- `app/api/admin/users/route.ts` - Fixed 2026-04-07

## Accomplishments

### Session 2026-03-27: Template Building

#### Templates Created (15 total)

**Pricing Page Templates (6):**
- `pricing_hero` - Hero with eyebrow, headline, subheadline, trust badges
- `pricing_cards` - 3-tier pricing cards with checkbox color dropdown
- `pricing_cta_box` - Single CTA box with adaptive background
- `pricing_comparison` - Full benefits table with checked/unchecked color dropdowns
- `pricing_benefits` - "Why membership matters" with icon color dropdowns
- `pricing_final_cta` - Dark CTA with icon color dropdowns

**Shared/Duplicated Section Templates (2):**
- `how_it_works` - 3-step process with icon + icon_color dropdowns
- `benefits_checkmarks` - Benefits rows with check color dropdowns

**Grants Page Templates (4):**
- `grants_hero` - Split hero with stats
- `grants_grid` - Cards grid (category buttons removed)
- `grant_amount_cards` - 3-tier amount display with bg_tint dropdowns
- `success_stories` - Stories grid with bg_tint dropdowns (separate from testimonials)

**Merged Perks/Store Template (1):**
- `perks_store_grid` - Merged grid with CardSwatchColor dropdown (no category buttons)

**Testimonials/Member Celebration Templates (2):**
- `testimonials_grid` - Static 6-card testimonials grid with avatar circles (from perks/info page lines 405-441)
- `member_celebration_grid` - Split layout with staggered 2x2 member photo grid (from perks/info page lines 443-514)

**New Stacked Features Template (1):**
- `stacked_features` - Image on top, colored text area below. 3 columns desktop, 1 column mobile. No section-level background.

#### Key Implementation Details
- All templates adapt to 4 background colors: dove, aubergine, wisteria, blackberry
- Color helpers used: getTextColorForBackground, getEyebrowColorForBackground,
  getMutedTextColorForBackground, getCardTextColorForBackground, getCardBorderColorForBackground,
  getPrimaryButtonClass, getCardSwatchColor
- Checkbox colors: green, aubergine, wisteria, citrine (dark backgrounds use white checkmark)
- Icon colors: green (#d4f1ad), yellow (#fdf493), blue (#b2d1ee)
- Bg_tint colors: powder, citrine, lilac
- CardSwatchColor: yellow, green, blue, lavender, citrine, lilac, powder

#### Files Modified/Created
- `lib/sections/types.ts` - Added interfaces for all templates
- `lib/sections/registry.ts` - Added section definitions with editorFields
- `components/sections/SectionRenderer.tsx` - Added imports and switch cases
- Section components in `components/sections/`
- `supabase/migrations/014_add_pricing_and_shared_section_templates.sql`
- `supabase/migrations/015_add_grants_and_perks_templates.sql`
- `supabase/migrations/016_add_testimonials_and_member_celebration_templates.sql`
- `supabase/migrations/018_add_stacked_features_template.sql`

### Session 2026-03-27: Page Duplication Feature

Added ability to duplicate pages in `/admin/pages`.

**Files created:**
- `app/api/admin/pages/duplicate/route.ts` - API endpoint that duplicates page with all sections
- `components/admin/pages/DuplicatePageModal.tsx` - Modal component for duplicating pages

**Files modified:**
- `components/admin/pages/AdminPagesClient.tsx` - Added duplicate button (Copy icon) and modal

**How it works:**
- Each page card in `/admin/pages` has a Copy icon between Edit and Delete buttons
- Clicking Copy opens a modal pre-filled with "Copy of {title}" and "{slug}-copy"
- Slug uniqueness is validated before duplication
- New page is created in draft status with all sections copied from original
- On success, redirects to the new page editor

**Key implementation details:**
- API endpoint: `POST /api/admin/pages/duplicate` with `{ originalPageId, title, slug }`
- Copies all `page_sections` where `version = 'draft'` from original to new page
- Uses Supabase admin client with service role key
- Also created `DELETE /api/admin/pages/delete` route for page deletion (was previously failing due to SUPABASE_SERVICE_ROLE_KEY being server-only)

### Session 2026-03-28: Media Library Feature

Added a full-featured Media Library for the page builder allowing users to browse, search, upload, and delete images from the Supabase `page-builder` storage bucket.

**Files created:**
- `app/api/storage/list/route.ts` - Lists files from storage (checks root, sections/, images/ subfolders)
- `app/api/storage/delete/route.ts` - Deletes files from storage
- `components/admin/MediaLibraryModal.tsx` - Modal with Browse/Upload tabs, search, pagination, delete confirmation

**Files modified:**
- `components/admin/pages/SectionEditorPanel.tsx` - Integrated media library for image fields, including array item fields (e.g., `columns.0.image_url`)

**Key features:**
- Browse existing images with 200x200 thumbnails in a grid
- Upload new images (3MB limit, image/* types only)
- Delete with confirmation warning
- Search by filename (debounced via API)
- Pagination (20 items per page)
- Tab switching (Browse/Upload) preserves loaded state

**Key implementation details:**
- Modal does not render until images are loaded (`if (activeTab === "browse" && !imagesReady) return null`)
- Uses `useRef` to hold latest `fetchFiles` callback, preventing effect re-runs on tab switch
- Array field key parsing: `"columns.0.image_url"` splits into array name, index, and subfield key
- Fixed modal height (`h-[32rem]`) with flexbox layout and `min-h-0` for proper scrolling
- Grid uses `aspect-square` for consistent image tiles

### Session 2026-03-29: Inline Location List for OfferDetailPanel

Added inline location list display on **OfferDetailPanel** to show nearby store locations BEFORE users click to redeem.

**Goal:** Display nearby locations so users know which stores they can bring coupons to, without requiring location selection to redeem (Access Perks generates coupons based on Member ID + Offer ID, not pre-selected location).

**Files created:**
- `app/api/profile/route.ts` - GET endpoint to fetch user's profile ZIP code

**Files modified:**
- `components/perks/OfferDetailPanel.tsx` - Added location fetching, display UI, and distance selector
  - Added `Location` interface supporting both root-level and nested `physical_location` API response structures
  - Added helper functions: `getLocationName`, `getLocationKey`, `getStreetAddress`, `getExtendedAddress`, `getCityStateZip`, `getDistance`
  - Added state: `locations`, `loadingLocations`, `searchDistance`, `searchZip`, `profileZip`
  - `fetchLocations()` - Fetches up to 10 locations from `/api/access-perks/locations`
  - `fetchProfileZip()` - Fetches user's profile ZIP from `/api/profile`
  - Added distance dropdown (5mi, 10mi, 25mi, 50mi, 100mi) matching PerksSearch
  - Added ZIP code input with "Leave blank to use your profile ZIP (XXXXX)" helper text
  - Simplified redemption flow - removed location selector prerequisite
  - Removed `isAuthenticated` prop - now relies on API 401 response for auth errors

**Key implementation details:**
- Distance default changed from 25mi to 100mi
- API uses user's profile ZIP code (from database) if no ZIP override entered
- ZIP input does NOT save to profile (session-only override)
- Location list shows: name, street address, city/state/zip, distance
- Empty state message: "No locations found within X miles. Try a larger distance."
- Auth check now handled by API (not client-side) to avoid race condition

### Session 2026-03-30: Email Confirmation + Profile Completion Flow

Implemented Supabase email confirmation flow with profile completion tracking.

**Goal:** Users must confirm their email before completing signup, then complete their profile before accessing features.

**Files modified:**
- `components/SignUpFlow.tsx`
  - Step 0: After signUp success, redirect to `/auth/sign-up-success?email=...`
  - Added emailRedirectTo option for confirmation link
  - Added useEffect confirmation check on steps 1-3 (redirects if not confirmed)
  - Reordered Step 2: Age Range moved to top
  - Added social handles (optional) to Step 2 - Instagram, Twitter, Facebook, LinkedIn
  - Step 3 (free plan): Sets profile_completed = true before redirecting to welcome
- `app/auth/sign-up-success/page.tsx`
  - Added resend confirmation email button with 60s cooldown
  - Shows email address passed via URL query param
  - Uses supabase.auth.resend({ type: 'signup' })
- `app/auth/welcome/page.tsx`
  - Added profile_completed check - redirects to signup if not completed
- `app/dashboard/page.tsx` - Added profile_completed guard
- `app/perks/page.tsx` - Added profile_completed guard in useEffect
- `app/grants/apply/page.tsx` - Added profile_completed guard

**Database change (run in Supabase SQL Editor):**
```sql
ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
```

**Supabase Dashboard changes (manual):**
- Confirmed email confirmation is ON (Confirm sign up toggle)
- Updated email template next param to `/auth/sign-up?step=1`

**Flow:**
1. User signs up at /auth/sign-up → receives confirmation email
2. User clicks link → redirected to /auth/sign-up?step=1
3. User completes Personal Info (Step 1) → Identity (Step 2) → Membership (Step 3)
4. Free plan → profile_completed = true → /auth/welcome
5. Paid plan → Stripe checkout → /auth/welcome (sets profile_completed on return)
6. Incomplete profiles blocked from /perks, /dashboard, /grants/apply

### Previous Sessions
- Fixed intermittent "Failed to Add Section" error by computing order_index in database instead of client-side (race condition fix)
- Fixed inline editor stale closure bug in triggerAutoSave
- Fixed auto-save "Saved" badge timing bug
- Added defensive null checks in SectionEditorPanel and EditableSections
- Added error placeholder in SectionWrapper for invalid content
- Created saveDraftSection for single-row updates
- Fixed hero_video container aspect ratio for contain mode (CSS approach with 16:9)
- Removed hover grow effect from back to top button
- Changed grants page CTA text color from blackberry to dove for readability
- Fixed perks page auth state sync with onAuthStateChange listener

### Session 2026-03-31: Font Consistency + Footer Admin

#### Font Consistency Audit & Fix

Systematic audit and fix of all font usage to follow brand guidelines across all section templates and pages.

**Brand Font Rules:**
- Playfair Display (`font-serif`) - Headings, body text, descriptions
- DM Sans (`font-ui`) - Button text, navigation links, eyebrow text, labels

**Files Fixed (20 total):**

Section Templates:
- `PricingCardsSection.tsx` - Body text → `font-serif`
- `PricingComparisonSection.tsx` - Benefit labels → `font-serif`
- `PricingBenefitsSection.tsx` - Body and item descriptions → `font-serif`
- `PricingCtaBoxSection.tsx` - Body and secondary text → `font-serif`
- `PricingFinalCtaSection.tsx` - Item sub and footnote → `font-serif`
- `GrantsHeroSection.tsx` - stat_label, secondary_stat_label → `font-serif`
- `GrantAmountCardsSection.tsx` - Item range, label, description → `font-serif`
- `GrantsGridSection.tsx` - Card text → `font-serif`, CTA links → `font-ui`
- `SuccessStoriesSection.tsx` - CTA links → `font-ui`
- `TestimonialsGridSection.tsx` - Quote text → `font-serif`
- `MemberCelebrationGridSection.tsx` - Body text → `font-serif`
- `BenefitsCheckmarksSection.tsx` - Body and descriptions → `font-serif`
- `HowItWorksSection.tsx` - Step titles → `font-serif`
- `RightSide3FeaturesSection.tsx` - Item titles → `font-serif`
- `ThreeColumnStoriesSection.tsx` - Column content → `font-serif`
- `3CardsSection.tsx` - Card descriptions → `font-serif`
- `4CardsSection.tsx` - Subheadlines, card titles, descriptions → `font-serif`
- `PerksStoreGridSection.tsx` - Subheadline, card descriptions → `font-serif`, CTA links → `font-ui`
- `ZeroDollarStoreTeaserSection.tsx` - Product titles → `font-serif`

Landing Components:
- `Footer.tsx` - All navigation link text → `font-ui`

App Pages:
- `perks/page.tsx` - Body text → `font-serif`, buttons → `font-ui`
- `grants/apply/page.tsx` - Headings/body → `font-serif`
- `contact/page.tsx` - All body text → `font-serif`, labels/links → `font-ui`
- `faq/page.tsx` - Category headings, questions, answers → `font-serif`

#### Footer Admin Feature

Created admin-editable footer at `/admin/footer`.

**Database:**
- `supabase/migrations/019_add_site_footer.sql` - Creates `site_footer` table
- `supabase/migrations/020_fix_site_footer_schema.sql` - Adds missing columns to existing row

**Schema:**
```sql
site_footer (
  id UUID PRIMARY KEY,
  logo_url TEXT,
  column1_heading TEXT DEFAULT 'MEMBERSHIP',
  column1_links JSONB DEFAULT '[...]',
  column2_heading TEXT DEFAULT 'COMMUNITY',
  column2_links JSONB DEFAULT '[...]',
  column3_heading TEXT DEFAULT 'ORGANIZATION',
  column3_links JSONB DEFAULT '[...]',
  copyright_text TEXT DEFAULT '© 2026 National Fund for Women...',
  footer_link1-3_text TEXT,
  footer_link1-3_url TEXT
)
```

**Files created:**
- `app/api/footer/route.ts` - GET/POST API endpoints
- `app/admin/footer/page.tsx` - Admin page wrapper
- `components/admin/FooterEditorClient.tsx` - Admin form UI

**Files modified:**
- `components/landing/Footer.tsx` - Dynamic data fetching from `/api/footer`

**Footer Styling:**
- Background: aubergine (`#3E145F`)
- Text color: `#B7B6B9`
- Divider line: `#B7B6B9` (full opacity)
- Column headings: font-weight 900
- Spacing: `mb-6` between heading and links, `space-y-4` between links
- Width: `max-w-[1400px]` matching header

#### Header Updates

- `NavigationClient.tsx` - Menu items and dropdown text color changed to `#ac9bb6`
- `AuthButtonCombined.tsx` - "Join Now" ghost button border/text color changed to `#ac9bb6`
- `app/layout.tsx` - Added DM Sans weight 900 to font loading

#### Database Fix
- Fixed `profile_completed` for `ron@myherodesign.com` via SQL update
- Recommended backfill query for all existing paid members:
  ```sql
  UPDATE profiles SET profile_completed = true 
  WHERE membership_level IN ('contributing', 'founding') 
  AND (profile_completed IS NULL OR profile_completed = false);
  ```

#### Shopify Schema Security Issue & Resolution
- Initially moved `shopify_product_mappings` to `internal` schema to isolate from PostgREST
- Encountered PostgREST schema cache issues preventing RPC function access
- Reverted table to `public` schema (acceptable for product mappings - not sensitive data)
- Created `SHOPIFY.md` with full documentation of the issue and learnings
- Key files: `app/api/shopify/products/route.ts`, `app/api/admin/shopify/sync/route.ts`, `app/api/admin/shopify/update-product/route.ts`

#### Gift Membership Codes RLS Decision
- `gift_membership_codes` table intentionally left without RLS (like shopify_product_mappings)
- All redemption happens via API routes using `supabaseAdmin` (service role key), which bypasses RLS
- Codes are cryptographically random and unguessable - not a security risk
- Redemption flow: User submits code → API route checks validity with service role → redeems if valid
- Same rationale as shopify_product_mappings: data is not sensitive, service role bypasses RLS anyway

### Session 2026-04-03: Access Perks Category Filtering

Disabled 34 unwanted categories from the Access Perks API integration.

**Categories Excluded (34 total):**
Auto Body & Paint, Auto Parts, Car Wash Detail, Condos & Resorts, Catering, Convenience Stores, Golf, Chiropractic, Day Spa, Dental, Fitness Equipment, Massage, Medical, Tanning Salons, Garden Centers, Pest Control, Siding, Water Purification/softening, Business Services, Carpet Cleaner, Cell Phone, Financial Services, Office Services, Transportation, Tuxedo Rental, Weddings, Boutique, Bridal, Cycling, Outdoor Equipment, Toys, Wireless, Ski & Snowboard

**Files created:**
- `lib/access-perks/category-filters.ts` - Shared utility with:
  - `CATEGORY_EXCLUSIONS` constant array (34 category names)
  - `isCategoryExcluded()` - Case-insensitive exclusion check
  - `filterCategoriesByExclusion()` - Recursive category/subcategory filtering

**Files modified:**
- `app/api/access-perks/categories/route.ts` - Filters `result.categories` before returning
- `app/api/access-perks/categories/counts/route.ts` - Skips excluded categories when building counts

**Key implementation details:**
- Filtering is case-insensitive
- Subcategories are recursively filtered
- API response structure: `{ categories: [...] }` - filter applied to nested array
- Category counts route has 5-minute cache (filtered counts cached)
- To apply changes after deploy: restart dev server and clear `.next` cache

### Session 2026-04-03: Access Perks Category Transformation

Transformed the category tree to rename categories and restructure the hierarchy.

**Files modified:**
- `lib/access-perks/category-filters.ts` - Added `CategoryNode` interface and `transformCategoryTree()` helper
- `app/api/access-perks/categories/route.ts` - Applies transformation after filtering
- `app/api/access-perks/categories/counts/route.ts` - Applies same transformation to counts tree

**Transformations applied:**
1. **Rename "Automotive" → "Auto, Gas, & Car Rental"**
2. **Move "Car Rental"** from top-level category to subcategory under "Auto, Gas, & Car Rental"

**Key implementation details:**
- `transformCategoryTree()` finds "Automotive" and "Car Rental" in the category tree
- If both exist: renames Automotive, moves Car Rental into Automotive's subcategories array
- If only Automotive exists: renames it (handles case where Car Rental was already excluded)
- Counts route applies same transformation before processing, so counts stay in sync
- Cache auto-invalidates (5 min TTL on counts route)

### Session 2026-04-03: Perks Page UX Improvements

Major UX refactor for the /perks page.

**Files modified:**
- `components/perks/ViewToggle.tsx` - **DELETED** - Removed toggle buttons
- `components/perks/PerksSearch.tsx` - Distance dropdown now: 5mi, 10mi, 25mi, 50mi, 100mi, Nationwide
- `components/perks/StoreCard.tsx` - Replaced Next.js Image with HTML img for logos
- `components/perks/LocationCard.tsx` - Replaced Next.js Image with HTML img for logos
- `components/perks/FilterSidebar.tsx` - Added "Online Only" checkbox filter, renamed "Clear all" to "Reset"
- `app/perks/page.tsx` - Multiple changes:
  - Added savedFilters state for back navigation
  - Added handleBackToStores function
  - Added "← Back to stores results" link in offers view
  - Added profile ZIP fetching on mount, triggers auto-search
  - Changed default distance from 25mi to 10mi
  - clearAllFilters resets to user's profile ZIP or Nationwide
  - Added "No Results" display when 0 results
- `app/api/access-perks/rollup/route.ts` - Added online and national=include support for filters

**Key changes:**
1. **Removed ViewToggle** - Stores/Offers view toggle removed
2. **Back navigation** - When viewing offers, "← Back to stores results" preserves filters
3. **Profile ZIP default** - Page auto-searches with user's profile ZIP on load
4. **Online Only filter** - Checkbox to filter online-redeemable offers
5. **Nationwide distance** - 2500mi triggers national=include API parameter
6. **RESET button** - Always visible, greyed out when in default state
7. **Image optimization** - Replaced Next.js Image with HTML img to save transform credits
8. **No Results text** - Shows "No Results" instead of "Showing 0 of X stores"

**Behavior notes:**
- GoDaddy (online-only) only appears in Nationwide searches - this is correct behavior
- Distance dropdown: 5mi, 10mi (default), 25mi, 50mi, 100mi, Nationwide
- RESET returns to user's profile ZIP + 10mi, or Nationwide if no profile ZIP

### Session 2026-04-04: Font Consistency - Microgrants Flow + Admin Grants Bug Fix

#### Font Consistency Fix - Microgrants Application Flow

Fixed fonts across all microgrants flow pages to follow brand guidelines.

**Brand Font Rules:**
- Playfair Display (`font-serif`) - Headings, body text, descriptions, questions
- DM Sans (`font-ui`) - Button text, labels, links, amounts, metadata

**Files Fixed (6 total):**

- `components/GrantApplicationForm.tsx` - ~20 fonts fixed
  - Form labels (Who is this application for?, etc.) → `font-serif`
  - Grant cycle names (MH Test - April, 5K Grant, etc.) → `font-serif` (larger sizes: text-lg/text-xl)
  - Dollar amounts, Deadline labels, "available" counts → `font-ui`
  - Helper/instruction text (Tell us a little about yourself...) → `font-serif`
  - Character counts (0/500), button text, "Remove" link → `font-ui`
  - labelClass changed from `font-semibold` to `font-serif`

- `app/grants/my-applications/page.tsx` - ~15 fonts fixed
  - Body text (Track your microgrant applications...) → `font-serif`
  - Status counts, deadline labels, "Grant amount" labels → `font-ui`
  - Links (View Details, Connect Bank Account) → `font-ui`
  - Status messages (Approved!, Payment sent!, etc.) → `font-serif`

- `app/grants/view/[id]/page.tsx` - ~25 fonts fixed
  - Back link, section labels (Grant Cycle, Who are you?, etc.) → `font-ui`
  - Body text (application answers, timeline descriptions) → `font-serif`
  - Status-specific messages (Connect bank account..., Payment processing...) → `font-serif`

- `app/grants/application-success/page.tsx` - 2 fonts fixed
  - Step descriptions (Our team reviews your application...) → `font-serif`
  - "Questions?" label → `font-ui`

- `components/grants/GrantDocuments.tsx` - 4 fonts fixed
  - Heading, filename, metadata, View button → `font-ui`

- `components/grants/ConnectBankButton.tsx` - 1 font fixed
  - Button text → `font-ui`

#### Admin Grants Bug Fix - Missing Applications

Fixed critical bug where admin grant review page showed "0 applications" even when applications existed.

**Root Cause:** Query in `app/admin/grants/[id]/page.tsx` was selecting `email` from `profiles` table, but `profiles` table has no `email` column (only `full_name`, `city`, `state`, etc.). This caused the query to silently fail and return `null`.

**Error Message:**
```
"column profiles_1.email does not exist"
```

**Fix Applied:**
Removed `email` from the profile select query:
```typescript
// Before:
profiles:user_id (full_name, email, city, state, age_range, household_income)

// After:
profiles:user_id (full_name, city, state, age_range, household_income)
```

**Files modified:**
- `app/admin/grants/[id]/page.tsx` - Removed `email` from profiles join query

**Note:** This was a silent failure - the error wasn't being logged. Added defensive error logging. Always log both `data` AND `error` when debugging Supabase queries.

#### Additional Notes

- `app/grants/apply/page.tsx` was already correctly using `font-serif` - no changes needed
- Section templates (GrantsHeroSection, GrantAmountCardsSection, etc.) were already correct - no changes needed
- Grant names in application form now larger (text-lg for multi-cycle, text-xl for single cycle)

### Session 2026-04-04: Logo Scroll Bug Fix (Multiple Iterations)

Fixed logo scroll jump/skip glitch in "Perks Feature + Brand Logos" section template.

**Problem:** Logo scroll had visible "jump" every 15-40 seconds despite various CSS/JS fixes.

**Root Cause:** Floating-point precision errors in JavaScript animation calculations causing drift.

**Iterations:**
1. CSS 3x content with -50% animation - jumped every 15s
2. CSS 2x content with -50% animation - jumped every 15s
3. CSS 2x content with -100% animation - still jumped
4. JS requestAnimationFrame with accumulated offset - jumped every 35-40s due to precision drift
5. JS with modulo arithmetic - still jumped every 12s
6. JS with elapsed time calculation - jumped every 12s
7. CSS with opacity fade at loop point - fade didn't sync properly
8. Pure CSS 2x with -50% - still jumped (browser rounding issues)

**Final Working Solution:**
- Installed `react-fast-marquee` library
- Library handles all seamless loop calculations properly
- Uses CSS transform animations offloaded to GPU compositor
- No JavaScript timing calculations that can drift
- `pauseOnHover` for better UX

**Files modified:**
- `components/sections/PerksFeatureSection.tsx` - Replaced custom animation with react-fast-marquee
- `app/globals.css` - Removed custom keyframes (library handles animation)

**Dependencies:**
- `react-fast-marquee` - Seamless infinite scroll library

### Session 2026-04-04: Add SEO Fields to Pages

Added SEO title and description fields to the page builder's Edit Page modal.

**Database:**
- Created `supabase/migrations/021_add_seo_fields_to_pages.sql`
- Added columns: `meta_title TEXT`, `meta_description TEXT`
- Created indexes on SEO fields

**Files modified:**
- `components/admin/pages/EditPageModal.tsx` - Added collapsible SEO Settings section
  - SEO Title field with 60 character limit and counter
  - SEO Description field with 160 character limit and counter
  - Red warning text when character count exceeds recommended limit
  - Fields are optional (null if empty)
- `components/admin/pages/AdminPagesClient.tsx` - Updated Page interface to include SEO fields

**UX:**
- Collapsible "SEO Settings" section below Title/Slug fields
- Character counters with red highlighting when over recommended limit
- Fields auto-clear to null when left empty

**API Route:**
- `app/api/admin/pages/update/route.ts` - Handles page updates via POST
- Required because SUPABASE_SERVICE_ROLE_KEY is server-only

**Page Metadata Support:**
- `app/[slug]/page.tsx` - Updated to fetch and use meta_title, meta_description
- `app/page.tsx` - Updated to fetch and use meta_title, meta_description for homepage
- Added generateMetadata() to dynamically set page titles and descriptions
- Falls back to default title/description if SEO fields not set

### Session 2026-04-05: Nomination Feature + Stripe Connect Integration

#### Nomination Feature Implementation

Added ability for members to nominate someone else for a microgrant.

**Database:**
- Created `supabase/migrations/022_add_nominee_fields_to_grants.sql`
- Added columns: `nominee_name TEXT`, `nominee_email TEXT`
- Created index on `nominee_email`

**Files created:**
- `app/api/admin/grants/send-bank-info-email/route.ts` - API endpoint for sending bank info request emails to nominees or applicants
- `lib/email.ts` - Added `sendBankInfoRequestEmail()` function

**Files modified:**
- `components/GrantApplicationForm.tsx` - Added nominee fields:
  - "Who is this application for?" toggle (Myself / Someone else)
  - Nominee Information section with name, email inputs
  - Consent checkbox: "I confirm the nominated person has consented to being nominated and understands their information will be shared with National Fund for Women to facilitate this grant."
  - Validation for nominee fields when nominating
- `app/api/grants/create/route.ts` - Updated to accept and store `nominee_name`, `nominee_email`
- `components/admin/AdminGrantReviewer.tsx` - Multiple updates:
  - Added "Send Bank Info Email" button with aubergine styling
  - Fixed `profiles.email` reference bug (table has no email column)
  - Added nominee name/email display in review panel
  - Added "Ready to Pay!" badge with pulse animation for grants with `payment_pending` status
- `app/grants/view/[id]/page.tsx` - Added nominee information section when viewing a nomination
- `app/admin/grants/[id]/page.tsx` - Added "ready to pay" counter in stats header

**Email Flow:**
- Admin clicks "Send Bank Info Email" button in grant review panel
- For nominations: email sent to `nominee_email`
- For self-applications: email sent to user's email from auth.users
- Email contains link to `/grants/my-applications` for bank account connection

#### Stripe Connect Integration

Fixed and verified Stripe Connect onboarding flow.

**Problem:** API error `"You can only create new accounts if you've signed up for Connect"` despite Connect being enabled.

**Root Cause:** Test mode credentials vs Sandbox mode credentials mismatch. Stripe Connect requires **Sandbox mode** credentials for platform integration testing.

**Files modified:**
- `app/api/stripe/connect/route.ts` - Fixed API endpoint path issue (was at `/api/stripe/connect` but components called `/api/stripe/connect/create`)
- `app/grants/connect/refresh/page.tsx` - Updated API endpoint from `/api/stripe/connect/create` to `/api/stripe/connect`
- `components/grants/ConnectBankButton.tsx` - Updated API endpoint from `/api/stripe/connect/create` to `/api/stripe/connect`
- `lib/email.ts` - Changed Resend initialization from module-level (at build time) to lazy initialization (at runtime) to fix build error: `"Missing API key. Pass it to the constructor"`

**Key Fix - Resend Build Error:**
```typescript
// Before (fails at build time):
const resend = new Resend(process.env.RESEND_API_KEY);

// After (works at runtime):
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}
```

**Key Fix - API Endpoint Path:**
RESTful design: `POST /api/stripe/connect` (not `/api/stripe/connect/create`)

**Required Environment Variables for Stripe Connect:**
- `STRIPE_SECRET_KEY` - Sandbox credentials for test mode
- `STRIPE_CONNECT_REFRESH_URL` - URL for expired onboarding links
- `STRIPE_CONNECT_RETURN_URL` - URL after onboarding completion
- `RESEND_API_KEY` - For email sending
- `RESEND_FROM_EMAIL` - From address for emails

**Production URLs (configured in Vercel):**
- `STRIPE_CONNECT_REFRESH_URL=https://nationalfundforwomen.org/grants/connect/refresh`
- `STRIPE_CONNECT_RETURN_URL=https://nationalfundforwomen.org/grants/connect/return`

#### Admin "Ready to Pay" Dashboard Indicator

Added visual indicators for grants ready for payment disbursement.

**Files modified:**
- `app/admin/grants/[id]/page.tsx` - Added "ready to pay" count in header (green when > 0)
- `components/admin/AdminGrantReviewer.tsx` - Added "Ready to Pay!" badge with pulse animation on grant cards with `payment_pending` status

#### Database Migration Required

For production deployment, run in Supabase SQL Editor:
```sql
-- Migration: Add nominee fields to grants table
ALTER TABLE grants 
ADD COLUMN nominee_name TEXT,
ADD COLUMN nominee_email TEXT;

CREATE INDEX IF NOT EXISTS idx_grants_nominee_email ON grants(nominee_email);
```

#### Known Issues / Remaining Work

1. **Email sending** - Resend shows "no emails sent yet" despite API calls succeeding. Domain verification may be needed in Resend dashboard.
2. **Manual fund release** - "Release Funds" button not yet implemented. Admin must manually trigger transfers via Stripe dashboard.
3. **Nominee account creation flow** - Nominee receives email but needs clear instructions to create account and connect bank. Consider sending a separate onboarding email.

### Session 2026-04-08: Signup Flow Brand Colors + /perks Members-Only

#### Signup Flow Brand Colors Update

Updated signup flow to use brand-consistent colors instead of generic styles.

**Files modified:**
- `components/SignUpFlow.tsx` - Updated colors to match brand palette:
  - Error alert: `bg-red-50` → `bg-nfw-citrine/20` with `text-nfw-blackberry`
  - Progress step checkmark: Green `#d4f1ad` → `bg-nfw-wisteria` (brand consistency)
  - Feature checkmarks in right panel: Green `#d4f1ad` → `bg-nfw-wisteria`

**Brand colors for checkmarks/indicators:**
- wisteria (`#7786BE`) - Used for checkmarks and step indicators
- NOT green (`#d4f1ad`) which was previously used

#### /perks Members-Only Protection

Made `/perks` page accessible only to logged-in members with completed profiles.

**Files modified:**
- `app/perks/page.tsx` - Added auth check:
  - Added `authChecked` state to prevent premature redirect
  - Added useEffect that redirects to `/auth/login` if user is null after auth check
  - Free members (membership_level = null) now allowed access
  - Only paid members (contributing, founding) allowed, or free members with completed profiles

**Logic:**
```typescript
if (user === null && authChecked) → redirect to /auth/login
if (profile?.profile_completed === false) → redirect to /auth/sign-up?step=1
if (profile?.membership_level exists AND not in ['contributing', 'founding']) → redirect to /auth/sign-up?step=3
```

**Image Assets Added:**
- `public/images/nfw-symbol-brandmark-aubergine.png` - Logo for signup page
- `public/images/nfw-symbol-brandmark-wisteria.png` - Logo for welcome page
- Deleted: `public/images/nfw-symbol-brandmark-wisteria.svg`

### Session 2026-04-08: Footer Update - Column 4 + Social Media Links

Expanded footer to 5 columns with social media icons in the bottom bar.

**Database:**
- Created `supabase/migrations/026_add_column4_and_social_media.sql`
- Added columns: `column4_heading TEXT DEFAULT 'CONNECT'`, `column4_links JSONB DEFAULT '[]'`
- Added columns: `social_instagram`, `social_tiktok`, `social_facebook` (TEXT with default URLs)

**Schema Changes:**
```sql
ALTER TABLE site_footer ADD COLUMN column4_heading TEXT DEFAULT 'CONNECT';
ALTER TABLE site_footer ADD COLUMN column4_links JSONB DEFAULT '[]';
ALTER TABLE site_footer ADD COLUMN social_instagram TEXT DEFAULT 'https://www.instagram.com/nationalfundforwomen';
ALTER TABLE site_footer ADD COLUMN social_tiktok TEXT DEFAULT 'https://www.tiktok.com/@nationalfundforwomen';
ALTER TABLE site_footer ADD COLUMN social_facebook TEXT DEFAULT 'https://www.facebook.com/nationalfundforwomen';
```

**Files Modified:**
- `app/api/footer/route.ts` - Added column4 and social media fields to POST handler
- `components/landing/Footer.tsx`:
  - Grid changed from `md:grid-cols-4` to `md:grid-cols-5` (1 logo + 4 equal link columns)
  - Added Column 4 rendering (same pattern as columns 1-3)
  - Added social icons in bottom bar left of Privacy Policy (Instagram, TikTok, Facebook in lilac #B693C0)
  - Icons are inline SVG, no external dependencies
- `components/admin/FooterEditorClient.tsx`:
  - Added Column 4 editor (heading + links, same pattern as other columns)
  - Added Social Media Links section with Instagram, TikTok, Facebook URL inputs
  - Updated handleSave to include new fields

**Footer Layout:**
- Desktop: 5 equal columns (Logo | Column 1 | Column 2 | Column 3 | Column 4)
- Bottom bar: Copyright text | Social icons | divider | Privacy | Terms | Accessibility

### Session 2026-04-08: Zero Dollar Store Hero + ImagePicker Component

#### Zero Dollar Store Hero Image

Added configurable hero banner to the Zero Dollar Store page (`/store`) and admin controls (`/admin/shopify`).

**Database:**
- Created `supabase/migrations/027_create_store_settings.sql`
- New `store_settings` table:
  - `hero_image_url TEXT`
  - `hero_heading TEXT DEFAULT 'ZERO DOLLAR STORE'`
  - `hero_subheading TEXT DEFAULT 'Browse our selection'`
  - `updated_at TIMESTAMPTZ`

**API Route:**
- Created `app/api/store/settings/route.ts`
  - GET: Fetch hero settings from `store_settings` table
  - POST: Save hero settings (admin only)

**Store Hero Display (`components/StoreClient.tsx`):**
- Fetches hero settings on mount
- Renders full-width hero with 500px height on desktop, 250px on mobile (scales responsively)
- Centered white text overlay with heading and subheading
- Only shows if `hero_image_url` exists (hidden until image uploaded)

**Admin Controls (`app/admin/shopify/page.tsx`):**
- Hero Image section at top of page
- Image preview with "Change Image" button (opens MediaLibraryModal)
- Heading and subheading text inputs
- "Save Hero Settings" button → POST to `/api/store/settings`
- Uses existing MediaLibraryModal from template editor

#### ImagePicker Component

Created reusable component for selecting images from media library.

**Files created:**
- `components/ImagePicker.tsx` - Wraps MediaLibraryModal with label/preview/remove UI

**Files modified:**
- `components/ArticleForm.tsx` - Replaced ImageUpload with ImagePicker for Featured Image and Hero Image fields
- Articles now use `page-builder` bucket (same as template editor) instead of `article-images`

#### Bug Fix: Article Slug Auto-Generation

Fixed slug auto-generation to only apply when creating new articles, not when editing.

**Bug:** On `/admin/articles/edit/[id]`, typing in the Title field would only capture the first character for the slug due to incorrect conditional logic (`prev.slug ||` would short-circuit after first character).

**Fix:** Changed `slug: prev.slug || generateSlug(title)` to `slug: !article ? generateSlug(title) : prev.slug`

### Session 2026-04-09: Access Perks Member Sync on Login

**Problem:** Only the user's own profile had `access_perks_member_id` filled. Members weren't being synced to Access Perks during signup.

**Root Cause:** The `syncAccessMember()` function and `/api/access-perks/sync-member` endpoint existed but were never called anywhere in the signup flow.

**Solution:** Sync on next login instead of during signup (non-blocking, idempotent).

**Files created:**
- `components/AccessPerksSync.tsx` - Client component that fires sync on dashboard mount
  - Uses fire-and-forget pattern (doesn't block page render)
  - Checks if `access_perks_member_id` is null before syncing (idempotent)

**Files modified:**
- `lib/access-perks/member-sync.ts` - Added `checkAndSyncAccessMember()` function
  - Checks profile for existing `access_perks_member_id`
  - If null, fetches user email from auth, calls `syncAccessMember()`, updates profile with `access_perks_member_id` and `access_perks_synced_at`
- `app/dashboard/page.tsx` - Added `<AccessPerksSync userId={user.id} />` to trigger sync on mount

**Sync Logic Flow:**
```
User logs in → Dashboard loads → AccessPerksSync fires
                                               ↓
                              checkAndSyncAccessMember(userId, email)
                                           ↓
                              Check: access_perks_member_id IS NULL?
                                           ↓
                              If yes → sync to Access Perks API
                                      → update profile with member_id
                              If no → do nothing (already synced)
```

**Benefits:**
- Works for all login methods (email/password, Google OAuth)
- Non-blocking - doesn't slow down login experience
- Only syncs if not already synced (idempotent)
- Fire-and-forget with error logging

### Session 2026-04-09: Access Perks Sync Bug Fixes

**Problem:** Access Perks member sync was not working for existing members on login.

**Root Causes Found:**

1. **Server-only env vars in client code** - `AccessPerksSync` was calling `checkAndSyncAccessMember()` directly, which uses server-side environment variables (`ACCESS_AMT_API_URL`, `ACCESS_AMT_TOKEN`, `ACCESS_ORGANIZATION_ID`, `ACCESS_PROGRAM_ID`). These aren't exposed to the browser without `NEXT_PUBLIC_` prefix.

2. **Missing `membership_level` in profile update** - The `/api/profile/update` endpoint's `ALLOWED_FIELDS` didn't include `membership_level`, so free plan users never had their membership set.

3. **`subscription_status` null handling** - Free users with null `subscription_status` were being marked as "SUSPEND" in Access Perks instead of "OPEN".

**Fixes Applied:**

1. **Changed `AccessPerksSync` to call server-side API** - Component now calls `/api/access-perks/sync-member` API route instead of calling the function directly.

2. **Added idempotency check to API route** - Only syncs if `access_perks_member_id` is null.

3. **Added `membership_level` to allowed fields** - `/api/profile/update/route.ts` now allows `membership_level` to be updated.

4. **Fixed `subscription_status` null handling** - Treats null/empty `subscription_status` as "active" (OPEN) for free users.

5. **Fixed `sanitizeMemberIdentifier` import** - Inlined the function to avoid build errors with module exports.

**Files Modified:**
- `components/AccessPerksSync.tsx` - Now calls API route instead of function directly
- `app/api/access-perks/sync-member/route.ts` - Added idempotency check, inlined sanitize function
- `lib/access-perks/member-sync.ts` - Fixed subscription_status null handling
- `app/api/profile/update/route.ts` - Added `membership_level` to ALLOWED_FIELDS
- `components/SignUpFlow.tsx` - Free plan now sets `membership_level: "free"`

**Testing:** Login with Google OAuth account and check browser console for:
- `[AccessPerksSync] Starting sync for userId: ...`
- `[AccessPerksSync] Sync result: ...`

### Session 2026-04-10: Coming Soon Page

Created a Coming Soon landing page for non-authenticated users with email capture functionality.

**Database:**
- Created `supabase/migrations/028_create_coming_soon_emails.sql`
- New `coming_soon_emails` table:
  - `id` (UUID, PK)
  - `email` (TEXT, UNIQUE NOT NULL)
  - `created_at` (TIMESTAMPTZ)
  - `ip_address` (TEXT)
  - `user_agent` (TEXT)

**Files Created:**
- `app/coming-soon/page.tsx` - Coming Soon page component with:
  - Full-screen background using `/images/landing.jpg`
  - Logo at top using `/images/nfw-symbol-brandmark-white.png`
  - Main title in Playfair Display (`font-serif`)
  - Email signup form with white input, ghost button (`font-ui`)
  - White social media icons (Instagram, TikTok, Facebook)
  - Honeypot bot protection (hidden `website` field)
- `app/api/coming-soon/subscribe/route.ts` - POST endpoint for email capture
- `app/admin/coming-soon-emails/page.tsx` - Admin page server component
- `app/admin/coming-soon-emails/AdminComingSoonEmails.tsx` - Admin client component with CSV export
- `app/api/admin/coming-soon-emails/route.ts` - GET endpoint for CSV/JSON export (admin-only)
- `proxy.ts` - Sets `x-pathname` header for route detection

**Files Modified:**
- `app/page.tsx` - Added auth check, redirects non-logged-in users to `/coming-soon`
- `app/layout.tsx` - Conditionally hides Navigation, Footer, BackToTop based on pathname
- `components/Navigation.tsx` - Hides on `/coming-soon` route
- `components/landing/Footer.tsx` - Hides on `/coming-soon` route
- `components/BackToTop.tsx` - Hides on `/coming-soon` route

**Key Implementation Details:**
- Coming Soon page shows for non-authenticated users only
- Authenticated users see normal homepage
- Bot protection via honeypot field (rejects if `website` field is filled)
- Email capture stores email, IP, user agent, timestamp
- Admin page at `/admin/coming-soon-emails` shows subscriber count and CSV download
- All text uses brand fonts (Playfair Display for headline, DM Sans for UI elements)

**Migration Required:**
```sql
-- Run in Supabase SQL Editor:
-- Contents of supabase/migrations/028_create_coming_soon_emails.sql
```

**Bug Fix - Dashboard Cookie Error:**
- `app/dashboard/page.tsx` was creating Supabase client inline instead of using `@/lib/supabase/server` helper
- Fixed by using `createClient()` from `@/lib/supabase/server` which has proper try-catch for Next.js 15 cookie restrictions

**Bug Fix - Navigation Client-Side Navigation Error:**
- Navigation component was using server-only `headers()` API for pathname check
- On client-side navigation (clicking logo), `headers()` didn't re-evaluate, causing React error #300
- Fixed by creating `NavigationContent` client component that uses `usePathname()` for route check
- Navigation server component fetches data, wraps content in NavigationContent which handles client-side route detection

**Coming Soon Emails Link Added to Navigation:**
- Added "Coming Soon Emails" link to Admin section in the user dropdown menu (AuthButtonCombined.tsx)
- Links to `/admin/coming-soon-emails`
- Only visible to admin users

### Session 2026-04-10: Store Draft Product Visibility

Added Shopify product status awareness to the Zero Dollar Store to show draft items as disabled.

**Feature:** Products with `DRAFT` status in Shopify now appear greyed out with "Dropping Soon" badge and disabled claim button.

**Files Modified:**
- `lib/shopify.ts` - Added `status` field to `ShopifyProduct` type and `PRODUCTS_QUERY` GraphQL
- `lib/mock-shopify.ts` - Added `status` to `MockProduct` type and `transformShopifyProduct()` function
- `app/api/shopify/products/route.ts` - Passes `status` through to client
- `components/StoreClient.tsx` - Updated to handle draft products:
  - Added `status` check in `canClaim()` - returns "Dropping Soon" for DRAFT items
  - DRAFT products greyed out (same as out-of-stock)
  - Both "Out of Stock" and "Dropping Soon" badges use wisteria background, top-left placement

**Behavior:**
- DRAFT products display with grayscale + reduced opacity
- "Dropping Soon" purple badge overlaid on product image (top-left)
- "Claim Item" button disabled with "Dropping Soon" label
- Users cannot open claim modal for DRAFT items
- Mock data includes "Lip Balm Set" as example DRAFT product for testing

### Session 2026-04-11: Gift Membership Feature

Implemented gift membership purchase and redemption system.

#### Purchase Flow

**New pages:**
- `/gift-membership` - Landing page with quantity selector (1-10), buyer form (name, email), Stripe checkout
- `/gift-membership/success` - Shows purchased codes after successful payment

**New API routes:**
- `POST /api/gift-checkout` - Creates Stripe Checkout session (mode: payment, one-time $15/code)
  - Accepts: `{ quantity, buyerName, buyerEmail }`
  - Uses inline price_data (no pre-created Stripe product needed)
- Webhook handles `checkout.session.completed` for gift purchases, generates codes, sends email

**Database migration:** `supabase/migrations/032_create_gift_membership_tables.sql`
- `gift_membership_purchases` - Stores purchase records (buyer info, quantity, stripe IDs, total)
- `gift_membership_codes` - Individual codes with redemption tracking

**Email:** `sendGiftCodesEmail()` added to `lib/email.ts`
- Sent to buyer after purchase
- Contains all codes + redemption instructions

#### Redemption Flow

**During signup:**
- `SignUpFlow.tsx` - Added collapsible "I have a gift code" section on Step 3
- Validates and redeems code, upgrades user to contributing with 1-year subscription

**Dashboard:**
- `DashboardContent.tsx` - Client component showing gift code prompt for free members
- `RedeemGiftCodeModal.tsx` - Modal for entering gift codes

**API:** `POST /api/gift-codes/redeem`
- Validates code, marks as redeemed, upgrades profile to contributing
- Sets `subscription_ends_at = 1 year from now`

#### Admin Page

**`/admin/gift-codes`** - Gift codes management dashboard
- Stats: total codes, redeemed, unredeemed, revenue
- Table with filtering (all/redeemed/unredeemed) and search
- CSV export

**API:** `GET /api/admin/gift-codes` - Admin-only endpoint with stats and pagination

#### Files Created/Modified

**Created:**
- `supabase/migrations/032_create_gift_membership_tables.sql`
- `app/gift-membership/page.tsx`
- `app/gift-membership/success/page.tsx`
- `app/api/gift-checkout/route.ts`
- `app/api/gift-codes/redeem/route.ts`
- `app/api/admin/gift-codes/route.ts`
- `app/admin/gift-codes/page.tsx`
- `app/admin/gift-codes/AdminGiftCodes.tsx`
- `components/gift/RedeemGiftCodeModal.tsx`
- `components/dashboard/DashboardContent.tsx`
- `lib/adminCheck.ts` (moved from middleware/)

**Modified:**
- `lib/email.ts` - Added `sendGiftCodesEmail()`
- `app/api/webhook/route.ts` - Handle gift purchase completion
- `components/SignUpFlow.tsx` - Gift code input on Step 3
- `app/dashboard/page.tsx` - Added DashboardContent for gift prompt

#### Post-Year Downgrade

When gifted membership expires (checked on login/page load):
- User's `subscription_ends_at` is checked
- If expired: `membership_level = 'free'`, `subscription_status = null`, `subscription_ends_at = null`
- User sees "Membership expired" state and can resubscribe

#### Navigation Links Needed

Add "Gift Membership" link to:
- Header navigation
- Footer navigation

### Session 2026-04-11: Admin SEO Fields for FAQ and Contact Pages

Added admin-editable SEO title and description fields to `/faq` and `/contact` pages via their admin pages.

**Database:**
- Created `supabase/migrations/033_add_seo_fields_to_faq_and_contact.sql`
- Added `meta_title TEXT` and `meta_description TEXT` columns to `site_faq` and `site_contact` tables
- Created indexes on SEO fields

**Files Created:**
- `components/faq/FaqClient.tsx` - Client component extracted from FAQ page
- `components/contact/ContactClient.tsx` - Client component extracted from Contact page

**Files Modified:**
- `app/faq/page.tsx` - Converted to server component with `generateMetadata()` export
- `app/contact/page.tsx` - Converted to server component with `generateMetadata()` export
- `app/api/faq/route.ts` - Added `meta_title` and `meta_description` to POST handler
- `app/api/contact/route.ts` - Added `meta_title` and `meta_description` to POST handler
- `components/admin/FaqEditorClient.tsx` - Added collapsible SEO Settings section with character counters
- `components/admin/ContactEditorClient.tsx` - Added collapsible SEO Settings section with character counters

**How it works:**
- Admin pages have collapsible "SEO Settings" section (similar to /admin/pages)
- Character counters for title (60 char max) and description (160 char max)
- Warning text appears when character count exceeds recommended limit
- FAQ and Contact pages now export proper metadata via `generateMetadata()`
- Fallback title/description if admin hasn't set custom SEO values

### Session 2026-04-11: Tabbed Feature Section Template

Created new "Tabbed Feature" section template based on TYB website structure.

**Structure:**
- 3 toggle buttons at top (Discover, Access, Earn by default)
- Each tab reveals: eyebrow, headline (with optional italic phrase), body text, image on left, CTA button on right
- 2-column layout: image left, text + CTA right
- Responsive (stacks on mobile)

**Styling:**
- Tab buttons use DM Sans font (font-ui)
- Active tab: aubergine background, white text
- Inactive tabs: dove background, aubergine text
- Border around tab button group

**Files Created:**
- `components/sections/TabbedFeatureSection.tsx` - Client component with tab toggle and 2-column layout
- `supabase/migrations/034_add_tabbed_feature_template.sql` - Template insert

**Files Modified:**
- `lib/sections/types.ts` - Added `TabbedFeatureItem`, `TabbedFeatureContent` interfaces, added `tabbed_feature` to unions
- `lib/sections/registry.ts` - Added `tabbed_feature` entry with editorFields
- `components/sections/SectionRenderer.tsx` - Added import and case for `tabbed_feature`

### Session 2026-04-12: Database Schema Cleanup

Comprehensive review and cleanup of database schema for structure, relationships, data integrity, and performance.

**Migration 035: Data Integrity Fixes** (`supabase/migrations/035_data_integrity_fixes.sql`)

**NOT NULL Constraints Added:**
- `profiles.full_name` - Required for grant communications
- `profiles.membership_level` - Explicit non-null enforcement
- `grants.who_are_you`, `grants.biggest_challenge`, `grants.fund_usage` - Essay fields enforced

**Unique Constraints Added:**
- `profiles.access_perks_member_id` - Partial unique index (1:1 with profile)
- `articles.slug` - URL stability and SEO
- `article_categories.slug` - Routing consistency

**Gift Code Normalization:**
- `generate_gift_code()` updated to return uppercase only
- Existing codes normalized to uppercase
- CHECK constraint enforces uppercase on new codes

**Migration 036: Performance Indexes** (`supabase/migrations/036_performance_indexes.sql`)

**Indexes Added:**
- `idx_articles_published_featured` - Homepage featured content
- `idx_articles_published_at` - Archive/news feeds ordered by date
- `idx_grant_cycles_status_dates` - Find open cycles with date overlap
- `idx_offer_redemptions_offer_key` - Quick offer lookup by Access Perks key
- `idx_profiles_access_perks_id` - Access Perks sync lookups
- `idx_claims_user_product` - Duplicate claim prevention
- `idx_article_likes_user_article` - Duplicate like prevention

### Session 2026-04-13: Date of Birth Field

Replaced `age_range` dropdown with `date_of_birth` date input in signup and profile flows.

**Migration 037: Age Range to DOB** (`supabase/migrations/037_age_range_to_dob.sql`)

- Added `date_of_birth` column (DATE) with NOT NULL constraint
- Backfilled existing NULLs with `1900-01-01` placeholder (for compliance)
- CHECK constraint enforces: `date_of_birth >= '1900-01-01' AND date_of_birth <= (today - 18 years)`
- Dropped `age_range` column from `profiles` table

**Files Modified:**
- `components/SignUpFlow.tsx` - Replaced `AGE_RANGES` dropdown with date input (min=1900-01-01, max=18 years ago)
- `components/ProfileCompletionForm.tsx` - Same change
- `components/admin/AdminMembersClient.tsx` - "Age Range" display → "Date of Birth" in US format (MM/DD/YYYY)
- `components/admin/AdminAnalyticsClient.tsx` - Type updated from `age_range` to `date_of_birth`
- `components/admin/AdminGrantReviewer.tsx` - "Age Range" display → "Date of Birth" in US format
- `app/api/profile/update/route.ts` - Removed `age_range` from `ALLOWED_FIELDS`
- `app/admin/members/page.tsx` - Removed `age_range` from SELECT query
- `app/admin/analytics/page.tsx` - Removed `age_range` from SELECT query
- `app/admin/grants/[id]/page.tsx` - Removed `age_range` from profiles join

**Email Updates (`lib/email.ts`):**
- Changed default FROM fallback from `noreply@` to `hello@nationalfundforwomen.org`
- Contact form now sends to `hello@nationalfundforwomen.org`
- Grant-related emails now use `hello@` as sender

### Session 2026-04-17: Security & Fraud Prevention

Implemented security fixes identified in security audit.

**Migration 038: Fraud Prevention** (`supabase/migrations/038_fraud_prevention.sql`)

- `offer_redemptions` - Added unique index on `(user_id, offer_key)` WHERE status='active' to prevent duplicate redemptions
- `zero_dollar_claims` - Added unique index on `(user_id, shopify_product_id)` for lifetime product limit
- Created `monthly_claims` table to track per-user monthly claims for 1-per-month enforcement

**Access Perks Duplicate Prevention:**
- `app/api/access-perks/offers/[offerKey]/redeem/route.ts` - Added check for existing active redemption before processing

**Zero Dollar Store Security:**
- `app/api/shopify/checkout/route.ts` - Full security overhaul:
  - Added authentication verification (userId must match authenticated user)
  - Added lifetime duplicate check (1 per product per user)
  - Added monthly claim limit check (1 per month per user)
  - Added rate limiting (5 requests per minute)

**Account Age Requirement:**
- `app/api/access-perks/offers/[offerKey]/redeem/route.ts` - Added 48-hour account age check before redeeming
- `app/api/shopify/checkout/route.ts` - Added 48-hour account age check before claiming
- `supabase/migrations/039_account_age_index.sql` - Added index on profiles.joined_at for query performance
- **Toggle:** Set `ACCOUNT_AGE_CHECK_ENABLED=false` in Vercel env vars to disable (re-enable by setting to `true` or removing)

**Shopify Admin Security:**
- `app/api/admin/shopify/sync/route.ts` - Added `requireAdmin()` authentication
- `app/api/admin/shopify/update-product/route.ts` - Added `requireAdmin()` authentication
- `app/admin/shopify/page.tsx` - Refactored to server wrapper with `requireAdmin()` (was client component)
- Created `app/admin/shopify/ShopifyAdminClient.tsx` - Client component extracted from page.tsx

### Session 2026-04-19: Dashboard Rework

Implemented new member dashboard design with configurable content.

**Database Migrations:**

`supabase/migrations/040_dashboard_settings.sql`:
- Created `dashboard_settings` table with columns for hero image, featured items, square images, and membership badge images
- Added `featured_image` column to `grant_cycles` table
- Seeded default settings row

**Admin Dashboard (`/admin/dashboard`):**
- Created server wrapper page with `requireAdmin()`
- Created `DashboardAdminClient.tsx` with:
  - Hero image picker via MediaLibraryModal
  - Featured items section (max 5) with drag-and-drop reordering
  - Support for both Zero Dollar Store products and Microgrants
  - Badge images for each membership level (Free, Contributing, Founding)
  - Square image pickers with link inputs for bottom section

**Dashboard Frontend Components:**

- `components/dashboard/DashboardHero.tsx` - Full-width hero with eyebrow, H1, subtext, and wisteria buttons
- `components/dashboard/MembershipCard.tsx` - Member avatar with badge overlay, name, join date, membership level, and upgrade button
- `components/dashboard/MembershipImpactCard.tsx` - Total savings display with 3-column breakdown
- `components/dashboard/PopularAcrossNFW.tsx` - Featured items grid with portrait images and yellow title bars
- `components/dashboard/BottomActions.tsx` - Aubergine section with 3 square images and overlay buttons (Contact Us, Gift Membership, Share Your Story disabled/coming soon)

**API Routes:**
- `app/api/dashboard/settings/route.ts` - GET/POST for dashboard settings
- `app/api/admin/grants/route.ts` - GET for listing grant cycles (used by dashboard admin)

**Updated Pages:**
- `app/dashboard/page.tsx` - Rewritten to use new components, fetches settings and savings server-side
- `app/admin/grants/[id]/edit/page.tsx` - Added featured_image field with MediaLibraryModal picker
- `app/api/admin/grants/update-cycle/route.ts` - Added featured_image to update fields

**Navigation:**
- Added "Manage Dashboard" link to admin dropdown menus in auth-button.tsx, AuthButtonCombined.tsx, and MobileMenu.tsx

### Session 2026-04-20: Profile Avatar Upload

Implemented profile avatar upload functionality for the `/profile` page.

**Database Migrations:**
- `supabase/migrations/043_create_profile_avatars_bucket.sql` - Creates `profile-avatars` private storage bucket
- `supabase/migrations/044_add_avatar_url_to_profiles.sql` - Adds `avatar_url TEXT` column to profiles table

**Storage:**
- Bucket `profile-avatars` is private (public: false)
- Uses signed URLs (1 year validity) for secure access
- File size limit: 2MB
- Allowed types: JPEG, PNG, WebP

**Image Processing:**
- Sharp library for server-side optimization
- Auto-rotates images based on EXIF orientation
- Resizes to 400x400 square crop (center crop)
- Converts to WebP at 80% quality

**Files Created:**
- `app/api/profile/avatar/route.ts` - Upload endpoint with Sharp optimization
- `app/api/profile/avatar/delete/route.ts` - Delete avatar endpoint
- `components/profile/AvatarUpload.tsx` - Upload UI component

**Files Modified:**
- `app/profile/page.tsx` - Added AvatarUpload component

**Features:**
- Simple file input for upload (no complex modal)
- Auto-deletes previous avatar when uploading new one
- Delete avatar functionality
- Progress spinner during upload
- Error and success feedback

**Navigation Fix:**
- `components/NavigationClient.tsx` - Reduced nav item padding from `py-6` to `py-2` to close gap between dropdown and nav items

### Session 2026-04-20: Dashboard Styling Fixes

**Microgrant Featured Images:**
- Fixed issue where microgrant images weren't showing in "Popular across NFW" section
- The `grant_cycles.featured_image` was not being fetched when enriching featured items
- Added lookup logic in `app/dashboard/page.tsx` to fetch `featured_image` from `grant_cycles` table
- Also added same enrichment to `app/api/dashboard/settings/route.ts` for API consistency

**Dashboard Component Styling:**
- `components/dashboard/MembershipCard.tsx`:
  - Level badge: aubergine background with white text, ALL CAPS
  - Upgrade button: wisteria (`#7786BE`) background with white text, ALL CAPS
- `components/dashboard/PopularAcrossNFW.tsx`:
  - "Popular across NFW" heading changed from blackberry to white text

### Session 2026-04-20: Stats Counter Animation Fix

**Issue:** Stats counters on homepage and about page would stutter/hang before reaching final value.

**Fix:**
- `components/sections/StatsBarSection.tsx`:
  - Changed `Math.floor` to `Math.round` in the animation step function
  - This eliminates the stutter at the end of the animation where the counter would pause at one below the target before jumping to the final value

### Session 2026-04-21: Store Likes Feature

Implemented ability for users to "like" stores on the /perks page, with liked stores displayed on the dashboard.

**Database:**
- `supabase/migrations/045_create_store_likes.sql` - Creates `store_likes` table with columns: id, user_id, store_key, store_name, logo_url, created_at

**API Routes:**
- `app/api/perks/liked-stores/route.ts` - GET (fetch user's liked stores), POST (like a store)
- `app/api/perks/liked-stores/[storeKey]/route.ts` - DELETE (unlike a store)

**Components Modified:**
- `components/perks/StoreCard.tsx`:
  - Added heart icon button in top-right corner
  - Heart unchecked: citrine (#F8F19A), checked: lilac (#B693C0)
  - Added scale animation on click
  - Props: `liked`, `onToggleLike`, `showLikeButton`
- `components/perks/OfferDetailPanel.tsx`:
  - Added "Save" heart button next to "Visit Website" link
  - Same color states as StoreCard
  - Props: `likedStores`, `onToggleLike`

**New Dashboard Components:**
- `components/dashboard/YourPerksAndBenefits.tsx` - Aubergine section with "Your Saved Brands" and "Your Redeemed Perks" columns
- `components/dashboard/SavedBrandsPanel.tsx` - Slide-in panel showing all liked stores with unlike functionality
- `components/dashboard/RedeemedPerksPanel.tsx` - Slide-in panel showing redeemed perks (adapted from RecentRedemptions)
- `components/dashboard/DashboardPerksSection.tsx` - Client wrapper component managing panel state

**Dashboard Updates:**
- `app/dashboard/page.tsx`:
  - Fetches liked stores server-side
  - Renders new "Your Perks & Benefits" section below "Popular across NFW"
- Section has aubergine background, H5 Playfair heading "Your Saved Brands"
- Two-column layout: Saved Brands (left), Redeemed Perks (right)
- "Explore Your Saved Brands" / "Explore Your Redeemed Perks" links open slide-in panels

**Perks Page Updates:**
- `app/perks/page.tsx`:
  - Added `likedStoreKeys` state to track liked stores
  - Added `fetchLikedStores()` and `handleToggleLike()` functions
  - Passes `liked` and `onToggleLike` props to StoreCard and OfferDetailPanel

**Build Fix (2026-04-21):**
- Fixed type mismatch in StoreCard - `onToggleLike` callback signature updated to include `storeName` and `logoUrl` parameters to match OfferDetailPanel

**Layout Fixes:**
- `components/dashboard/YourPerksAndBenefits.tsx` - Removed `max-w-7xl mx-auto` wrapper to match PopularAcrossNFW section positioning
- `app/admin/dashboard/DashboardAdminClient.tsx` - Renamed Square Link labels:
  - Square 1 Link → Contact Us Link
  - Square 2 Link → Gift A Membership Link
  - Square 3 Link → Share Your Story Link

**Store Likes Debug:**
- Added console.log debugging to `handleToggleLike` in `/perks/page.tsx`

### Session 2026-04-22: Perks Page Updates + GA4 Installation

#### Hidden Gun Range Stores

Added `EXCLUDED_STORES` constant array to filter out gun/shooting related stores from `/perks` page. These stores are hidden from the stores view but may still appear in offers/locations views.

**Stores Excluded:**
- Williams Gun Works
- Medlock Range
- Miami Valley Shooting Grounds
- Learn 2 Shoot Handgun Training Academy
- Paladin Tactical Firearms Training
- Republic Arms
- Defender Shooting Sports
- New American Arms
- Hopkins Gun & Tackle
- Range Masters of Utah
- Original Bob's Shooting Range
- Impact Guns
- Personal Defense Depot
- Vegas Machine Gun Experience

**Files Modified:**
- `app/perks/page.tsx` - Added `EXCLUDED_STORES` array and filter on stores view

#### Login Page Updates

- `components/login-form.tsx` - Commented out "Don't have an account? Sign up" link
- `app/coming-soon/page.tsx` - Added "Login" button in top right corner linking to `/auth/login`

#### GA4 Installation

- `app/layout.tsx` - Added Google Analytics 4 script with tracking ID `G-MXX079LCCS`
- Script loads asynchronously after page becomes interactive

#### Store Likes View Offers Fix

Fixed "View Offers" link in SavedBrandsPanel to open in new tab (`target="_blank"`) instead of client-side navigation. This avoids a bug where clicking the link would briefly show filtered results then revert to unfiltered results due to state synchronization issues during Next.js client-side navigation.

**Files Modified:**
- `components/dashboard/SavedBrandsPanel.tsx` - Changed Link to anchor with `target="_blank"` to open in new tab

#### Store Likes Purple Hearts Fix

Fixed liked store hearts showing yellow instead of purple on `/perks` page. The issue was that `fetchLikedStores()` was only called during initial auth check, but subsequent auth state changes (like `onAuthStateChange` firing) would reset the user state before `fetchLikedStores` could run.

**Fix:** Added a dedicated `useEffect` that watches `user` and calls `fetchLikedStores()` whenever user changes:
```typescript
useEffect(() => {
  if (user) {
    fetchLikedStores();
  }
}, [user]);
```

**Files Modified:**
- `app/perks/page.tsx` - Added useEffect to fetch liked stores when user state changes

#### Coming Soon Page Login Button

- `app/coming-soon/page.tsx` - Added "Login" button in top right corner that links to `/auth/login`

#### RLS Policies for store_likes

Created `supabase/migrations/046_add_store_likes_rls.sql` to add RLS policies for the `store_likes` table.

**SQL Applied:**
```sql
ALTER TABLE store_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liked stores"
  ON store_likes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can like stores"
  ON store_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike stores"
  ON store_likes FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload';
```

#### React Error #300 Fix - Early Returns Before Hooks

Fixed "Rendered fewer hooks than expected" error caused by early return statements before hook calls in Footer and BackToTop components.

**Root Cause:**
- `Footer.tsx` had `if (pathname === "/coming-soon") return null;` before `useEffect`
- `BackToTop.tsx` had the same issue

**Files Modified:**
- `components/landing/Footer.tsx` - Moved early return after useEffect
- `components/BackToTop.tsx` - Moved early return after useEffect

This follows React's rule that hooks must be called before any early returns.

### Session 2026-04-23: Dashboard Redeemed Perks Fix

Fixed "Your Redeemed Perks" section not showing redeemed perks on dashboard.

**Problem:**
- Redeemed perks showed correctly in slide-out panel but not on main dashboard section
- The `YourPerksAndBenefits` component had a static "Redeem perks to see them here" message

**Solution:**
- Added `recentRedemptions` prop to `YourPerksAndBenefits` component
- Updated `RedeemedPerksList` to accept and display redemptions
- Modified `DashboardPerksSection` to fetch redemptions on mount via `/api/access-perks/redemptions?limit=50`
- Removed `status=active` filter from redemptions query to show all redemptions

**Files Modified:**
- `components/dashboard/YourPerksAndBenefits.tsx` - Updated RedeemedPerksList to display redemptions
- `components/dashboard/DashboardPerksSection.tsx` - Added redemptions fetching on mount
- `components/dashboard/RedeemedPerksPanel.tsx` - Changed to fetch all redemptions without status filter
- `app/api/access-perks/redemptions/route.ts` - Added debug logging

**Additional Fix:**
- Fixed duplicate `RedeemedPerksList` function definition in YourPerksAndBenefits.tsx
- Added console.log debugging to POST `/api/perks/liked-stores` route

### Session 2026-04-22: Dashboard New Sections

Added three new sections to the dashboard:

#### Your Microgrants Section

New section with wisteria (`#7786BE`) background showing user's grant applications.

**Features:**
- "New Application" button (citrine bg, black text) top-right
- Horizontal scrollable row of grant cards showing: cycle name, amount, status badge, deadline
- Status badges match `/grants/my-applications` styling (submitted, in_review, approved, not_approved, payment_pending, payment_sent)
- Empty state with CTA if no grants
- Click card → `/grants/view/[id]`

**Files Created:**
- `components/dashboard/YourMicrograntsSection.tsx`

#### Your Zero Dollar Store Section

New section with lilac (`#B693C0`) background showing user's zero dollar store orders.

**Features:**
- "Browse the Zero Dollar Store" button (wisteria bg, white text) top-right
- 1/3 width left column "Your Order History" (renamed from "Your Online History") - stacked claimed items with image, name, date, "View on Shopify" link
- 2/3 width right column "Latest Offerings" - horizontal scroll of up to 8 product cards (portrait image, yellow title bar)

**Files Created:**
- `components/dashboard/YourZeroDollarStoreSection.tsx`

#### Your Perks & Benefits Updates

- Added "Explore Perks" button (lilac bg, white text) to section header
- Changed grid from 50/50 to 1/3 (Saved Brands) / 2/3 (Redeemed Perks)

**Files Modified:**
- `app/dashboard/page.tsx` - Added queries for grants and zero dollar claims
- `components/dashboard/YourPerksAndBenefits.tsx` - Added button and adjusted column widths
- `components/dashboard/YourZeroDollarStoreSection.tsx` - New component with Online History and Latest Offerings
- `components/dashboard/YourMicrograntsSection.tsx` - New component for grant applications

**Database Fix:**
- Zero dollar claims query was failing because `shopify_product_mappings` table had no foreign key relationship with `zero_dollar_claims`
- Fixed by fetching claims and mappings separately, then joining in JavaScript
- Also fixed by including `order_status_url` and `shopify_order_id` fields for "View on Shopify" link

### Session 2026-04-23: Dashboard Updates + Termly CMP

#### Termly Consent Management Platform

Installed Termly CMP for GDPR cookie consent compliance.

**Files Created:**
- `components/TermlyCMP.tsx` - Termly CMP component with website UUID `182a3bc4-4347-44b6-b918-ef8406dd41e1`

**Files Modified:**
- `app/layout.tsx` - Integrated TermlyCMP to load on all pages

#### Consent Preferences Link

Added "Consent Preferences" link in footer next to Accessibility using `termly-display-preferences` class.

**Files Modified:**
- `components/landing/Footer.tsx` - Added consent preferences link

#### Your Microgrants Section Layout

Updated "Your Microgrants" section to use 1/3 + 2/3 column layout.

**Structure:**
- Main section heading "Your Microgrants" with "New Application" button
- Left column (1/3): "Your Applications" sub-heading showing user's grant applications with status badges
- Right column (2/3): "Available Microgrants" sub-heading showing open grant cycles with images

**Files Created:**
- `components/TermlyCMP.tsx`

**Files Modified:**
- `app/dashboard/page.tsx` - Added query for available grant cycles
- `components/dashboard/YourMicrograntsSection.tsx` - Restructured to 2-column layout with available cycles

#### Counter Animation for Membership Impact Card

Added animated counting effect to the 3 smaller numbers in "Your Membership at Work" section.

**Files Modified:**
- `components/dashboard/MembershipImpactCard.tsx` - Added AnimatedCurrency component for counter animation

#### Latest Offerings Image and Draft Styling

Updated "Latest Offerings" in Your Zero Dollar Store section.

**Changes:**
- Changed image style from `object-contain` to `object-cover` for full coverage
- Draft products now show greyed out with "Dropping Soon" badge (matching /store page styling)

**Files Modified:**
- `components/dashboard/YourZeroDollarStoreSection.tsx` - Image styling and draft status handling

### Session 2026-04-24: Dashboard Styling Updates

#### Order History Date Fix

Fixed "Invalid Date" issue in "Your Order History" by using `claimed_at` field instead of `created_at`.

**Files Modified:**
- `components/dashboard/YourZeroDollarStoreSection.tsx` - Changed date field from `created_at` to `claimed_at`

#### Eyebrow Text Styling

Updated dashboard section headings to match homepage eyebrow style (`text-xs font-black tracking-[0.06em] uppercase`).

**Files Modified:**
- `components/dashboard/DashboardHero.tsx` - "Your Member Dashboard" eyebrow styling
- `components/dashboard/MembershipImpactCard.tsx` - "Your Membership at Work" eyebrow styling

#### Hero Text Size

Updated hero text to match homepage headline size (`text-5xl lg:text-6xl xl:text-[63px]`).

**Files Modified:**
- `components/dashboard/DashboardHero.tsx` - "Here to help." headline
- `components/dashboard/MembershipImpactCard.tsx` - "$[X] saved" headline

#### Your Microgrants Section Updates

- Removed "View All" button from Available Microgrants column
- Changed available microgrants grid to horizontal scroll layout (matching Latest Offerings pattern)

**Files Modified:**
- `components/dashboard/YourMicrograntsSection.tsx` - Removed View All button, horizontal scroll layout

### Session 2026-04-24: Email System + Perks Filters

#### Email System Implementation

Built branded email template system using Resend API with inline HTML generation.

**Architecture:**
- `lib/email.ts` - Central email utilities
  - `buildEmailHtml()` - Generates branded HTML emails
  - `sendTemplateEmail()` - Wrapper for Resend API calls
  - `sendWelcomeEmail()` - Tier-based welcome emails (free/contributing/founding)
  - `sendNewsletterWelcomeEmail()` - Newsletter subscription welcome
  - `sendContactFormEmail()` - Contact form submissions
  - `sendGiftCodesEmail()` - Gift membership codes
  - `sendGrantStatusEmail()` - Grant application status updates
  - `sendBankInfoRequestEmail()` - Bank info request for grants

**Email Template Design:**
- Container: Dove background (#EBEBE8), 50px rounded corners
- Header: Aubergine logo centered
- Hero: Full-width background image with centered white italic Playfair text overlay
- Body: Lilac background (#B693C0), white text, DM Sans font
- CTA Buttons: Citrine background (#F8F19A), aubergine text (#3E145F)
- Footer: Aubergine background (#3E145F), white Playfair italic quote, social icons

**Files Created:**
- `app/api/test-email/route.ts` - Debug endpoint for testing email rendering
- `app/api/welcome-email/route.ts` - Welcome email trigger for free signups

**Files Modified:**
- `app/api/contact/submit/route.ts` - Fixed fire-and-forget pattern with proper await
- `app/api/webhook/route.ts` - Added welcome email for paid memberships
- `components/SignUpFlow.tsx` - Fixed welcome email fetch to properly await
- `lib/email.ts` - Multiple updates:
  - Hardcoded site URL to `https://nationalfundforwomen.org`
  - Hero image uses background-image CSS for full coverage
  - Hero padding increased for taller appearance (80px → 120px)
  - Member ID field replaced with Email display
  - Footer removed border-radius for seamless aubergine look

**Key Fixes:**
1. **Email URLs** - All email links and images now use hardcoded `https://nationalfundforwomen.org` instead of `NEXT_PUBLIC_SITE_URL` env var (which was pointing to Vercel preview URL)
2. **Fire-and-forget** - Contact form and welcome email calls now properly awaited
3. **Member ID → Email** - Welcome emails now show user's email instead of truncated ID
4. **Hero Image** - Uses CSS background-image with cover sizing for full-width display
5. **Email Footer** - Removed bottom border-radius to prevent dove-colored artifact

**Resend Configuration:**
- API Key: `RESEND_API_KEY` environment variable
- From Address: `hello@nationalfundforwomen.org` (configured in Resend dashboard)
- Domain verification required for nationalfundforwomen.org

**Test Email Endpoint:**
```bash
curl -X POST https://nationalfundforwomen.org/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","membershipType":"free"}'
```

#### Perks Page Online Only Filter Fix

Fixed "Online Only" checkbox filter that was incorrectly hiding online-only merchants.

**Problem:**
- When "Online Only" was unchecked, no `online` param was sent to Access Perks API
- API defaulted to hiding pure online offers (like Norwegian Cruise Lines)

**Root Cause:**
```typescript
// BEFORE - only sent online=only when checked, nothing when unchecked
if (onlineParam === "only") {
  params.online = "only";
}
```

**Fix Applied:**
```typescript
// AFTER - explicitly include all offers when unchecked
params.online = onlineParam === "only" ? "only" : "include";
```

**Files Modified:**
- `app/api/access-perks/offers/search/route.ts` - Always send online param
- `app/api/access-perks/rollup/route.ts` - Same fix for rollup queries

**Filter Behavior:**
| State | Behavior |
|-------|----------|
| Online Only OFF (default) | Show ALL offers (online + in-store + print) |
| Online Only ON | Filter to show ONLY online-redeemable offers |

**Note:** Online-only merchants (like Norwegian Cruise Lines) only appear in Nationwide searches because they have no physical locations. This is correct behavior - they're nationwide online offers.

#### Google OAuth Redirect URI Fix

Fixed Google OAuth consent screen showing Supabase project reference URL instead of brand domain.

**Error:**
```
redirect_uri=https://lirsaxhujjgnibcwyzpl.supabase.co/auth/v1/callback
```

**Solution:**
1. Added Supabase callback URL to Google Cloud Console authorized redirect URIs
2. Added custom domain URL as additional redirect URI

**URIs to register in Google Cloud Console:**
- `https://lirsaxhujjgnibcwyzpl.supabase.co/auth/v1/callback` (Supabase reference)
- `https://nationalfundforwomen.org/auth/callback` (custom domain)

**To customize consent screen:**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Set App name to "National Fund for Women"
3. Set support email to hello@nationalfundforwomen.org
4. Add Privacy Policy and Terms of Service URLs

### Session 2026-04-25: Email Template Fixes

#### Social Icons Visibility Fix

**Problem:** Social icons (Instagram, TikTok, Facebook) were invisible in email clients.

**Root Cause:** The `socialIcons` variable used a nested table structure (`<tr><td>`). In email HTML, nested tables do NOT inherit or properly display the parent cell's background color behind them. The icons (white images) were being rendered on transparent/white background, making them nearly invisible against light backgrounds.

**Fix:** Replaced nested table structure with inline `<span>` elements so icons render directly inside the footer cell against the aubergine background.

**Before:**
```html
const socialIcons = `
  <tr>
    <td style="padding: 10px 0; text-align: center; font-size: 0;">
      <a href="..."><img ...></a>
      ...
    </td>
  </tr>
`;
```

**After:**
```html
const socialIcons = `
  <span style="display: inline-block; padding: 15px 0;">
    <a href="..."><img ...></a>
    ...
  </span>
`;
```

#### Copyright Text Opacity Fix

**Problem:** Copyright text "© 2026 National Fund for Women. All rights reserved." was invisible in email clients.

**Root Cause:** The copyright had `opacity: 0.7` applied. In some email clients, `opacity` on text combined with certain backgrounds renders as nearly invisible.

**Fix:** Removed `opacity: 0.7`, using solid `#FFFFFF` color instead.

#### Mobile Responsive Fixes

**Problem:** On mobile, gray `#f5f5f5` background was showing behind the email content, and footer wasn't showing aubergine properly.

**Fixes Applied:**
1. Removed `background-color: #f5f5f5` from body and outer wrapper - now uses white
2. Removed `background-color: ${footerBackground}` from email container (only footer section should be aubergine)
3. Mobile media query sets proper section backgrounds:
   - `.email-container` - dove (#EBEBE8)
   - `.header-cell` - dove (#EBEBE8)
   - `.body-cell` - lilac (#B693C0)
   - `.footer-cell` - aubergine (#3E145F)

**Files Modified:**
- `lib/email.ts` - Updated socialIcons structure, removed opacity, updated mobile styles

### Session 2026-04-25: Product Detail Panel for Zero Dollar Store

Added "More Info" button and slideout panel for Zero Dollar Store products.

#### Features

**Image Carousel:**
- Horizontal scroll with CSS scroll-snap
- Previous/Next arrow buttons
- Dot indicators - clicking jumps to that image
- Shows all product images from Shopify (up to 20)

**Product Details:**
- Title with status badge (Dropping Soon, Out of Stock)
- Full description
- Available options grouped by type (Size, Color, etc.)
- Product ID display
- Full vertical scrolling

**Files Created:**
- `components/ProductDetailPanel.tsx` - Slide-out panel from left, image carousel, product details

**Files Modified:**
- `lib/shopify.ts` - Added `images` field to `ShopifyProduct` type and `PRODUCTS_QUERY`
- `lib/mock-shopify.ts` - Added `images` field to `MockProduct` type and `transformShopifyProduct`
- `components/StoreClient.tsx` - Added "More Info" button (wisteria bg), state management, and panel render

#### Shopify GraphQL Update
```graphql
images(first: 20) {
  edges {
    node {
      url
      altText
    }
  }
}
```

#### StoreClient Changes
- Added `images: string[]` to `StoreProduct` type
- Added `detailsProduct` state
- Added `handleShowDetails` handler
- Two-button layout: "Claim Item" (citrine) + "More Info" (wisteria)

### Session 2026-04-25: Schema Markup Field for Pages

Added ability to add JSON-LD schema markup to pages via the `/admin/pages` editor.

**Database:**
- `supabase/migrations/047_add_meta_schema_to_pages.sql` - Added `meta_schema TEXT` column to `pages` table

**Files Modified:**
- `app/api/admin/pages/update/route.ts` - Added `meta_schema` to allowed fields
- `components/admin/pages/EditPageModal.tsx` - Added schema markup textarea with JSON validation
- `components/admin/pages/AdminPagesClient.tsx` - Added `meta_schema` to Page interface
- `app/[slug]/page.tsx` - Renders `<Script type="application/ld+json">` with schema in page head

### Session 2026-04-25: Sitemap.xml, Robots.txt, and Site Settings

Added sitemap.xml generation and editable robots.txt via admin.

**Database:**
- `supabase/migrations/048_create_site_settings.sql` - Creates `site_settings` table with `robots_txt` column
- `supabase/migrations/049_add_sitemap_fields_to_pages.sql` - Added `include_in_sitemap BOOLEAN` to `pages` table

**API Routes:**
- `app/sitemap.xml/route.ts` - Generates XML sitemap from published pages with `include_in_sitemap=true` (uses root URL for homepage)
- `app/robots.txt/route.ts` - Serves robots.txt from site_settings
- `app/api/site/settings/route.ts` - GET/POST for site settings

**Admin UI:**
- `components/admin/SiteSettingsEditor.tsx` - Collapsible panel at bottom of `/admin/pages` for editing robots.txt
- `components/admin/pages/EditPageModal.tsx` - Added "Include in sitemap" checkbox per page

**Sitemap Output:**
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nationalfundforwomen.org/</loc>
    <lastmod>2026-04-25</lastmod>
  </url>
</urlset>
```

### Session 2026-04-25: OfferDetailPanel getLocationName HTML Fix

Fixed `getLocationName` helper function to decode HTML entities in location names (e.g., stripping `<sup>®</sup>` tags).

**Problem:** Nearby Locations section was displaying raw HTML like "McDonald's<sup>®</sup>" instead of "McDonald's".

**Fix Applied:** Updated `getLocationName` to use `document.createElement('div').textContent` pattern (same as `decodeHtml`):

```typescript
const getLocationName = (loc: Location): string => {
  const raw = loc.location_name || loc.name || loc.physical_location?.location_name || "Unknown Location";
  if (typeof window === "undefined") return raw;
  const div = document.createElement("div");
  div.innerHTML = raw;
  return div.textContent || raw;
};
```

**Files Modified:**
- `components/perks/OfferDetailPanel.tsx` - Updated getLocationName function

### Session 2026-04-25: Footer Links Open in New Tab

Updated all 3 footer links (Privacy Policy, Terms of Use, Accessibility) to open in new tab.

**Changes:**
- Added `target="_blank" rel="noopener noreferrer"` to footer_link1, footer_link2, and footer_link3

**Files Modified:**
- `components/landing/Footer.tsx` - Added target="_blank" and rel="noopener noreferrer" to Link components

### Session 2026-04-25: MFA Implementation Attempted and Reverted

Attempted to implement custom email OTP MFA but encountered fundamental Supabase limitation: `signInWithPassword` creates a full session immediately, making it impossible to prevent dashboard access until OTP verification.

**Decision:** Abandoned custom MFA in favor of password-only security hardening.

**Files Deleted:**
- `components/auth/MfaChallenge.tsx` - MFA challenge UI component
- `components/auth/OtpInput.tsx` - OTP input component
- `lib/supabase/auth/mfa.ts` - MFA helper functions
- `app/api/auth/otp/challenge/route.ts` - OTP challenge endpoint
- `app/api/auth/otp/verify/route.ts` - OTP verify endpoint

**Database Migrations Created:**
- `supabase/migrations/053_drop_mfa_tables.sql` - Drops `otp_codes` and `pending_auth` tables
- `supabase/migrations/054_add_login_attempts.sql` - Creates `login_attempts` table (rate limiting infrastructure)

**Files Cleaned:**
- `lib/email.ts` - Removed `sendOtpEmail` function
- `proxy.ts` - Removed MFA cookie logic, kept pathname header

**Files Modified:**
- `components/login-form.tsx` - Simplified to password + Google OAuth only
- `components/SignUpFlow.tsx` - Added strong password requirements:
  - 8+ characters
  - Uppercase letter
  - Lowercase letter
  - Number
  - Special character
  - Real-time validation with checkmarks

**Future Plans:**
- Rate limiting to be handled via Supabase Dashboard (not custom code)
- No MFA required for membership site

### Session 2026-04-25: Login Form Auth State Fix

Fixed login form to use direct `signInWithPassword` instead of custom API route to ensure auth state properly updates navbar immediately after login.

**Files Modified:**
- `components/login-form.tsx` - Calls `supabase.auth.signInWithPassword` directly instead of custom `/api/auth/login` route

**Note:** Custom login API route (`/api/auth/login/route.ts`) was deleted. Rate limiting via Supabase Dashboard planned for future.

### Session 2026-04-25: Allow Unlimited Nominations

Users can now nominate unlimited people for a grant cycle, but are limited to one self-application per cycle.

**Database Changes:**
- `supabase/migrations/055_allow_unlimited_nominations.sql` - Drops existing UNIQUE constraint on `(user_id, cycle_id)`, adds partial unique index only for self-applications (`WHERE is_nominating = false`)

**API Changes:**
- `app/api/grants/create/route.ts` - Updated duplicate check to only apply when `is_nominating = false`. Nominations now allow unlimited per cycle.

**Behavior:**
| Action | Result |
|--------|--------|
| Apply as "Myself" for a cycle | Allowed (once per cycle) |
| Apply as "Myself" again for same cycle | Blocked |
| Nominate someone for a cycle | Allowed |
| Nominate another person for same cycle | Allowed (unlimited) |

### Session 2026-04-25: Admin Email Templates

Created `/admin/emails` page for viewing, editing, and testing email templates.

**Database:**
- `supabase/migrations/056_create_email_templates.sql` - Creates `email_templates` table with RLS
  - Columns: id, name, slug, category, description, subject, html_content, is_editable, source_file, updated_at
  - RLS policies allow admin read/write
- `supabase/migrations/057_seed_email_templates.sql` - Seeds 10 templates (6 Resend + 4 Supabase)

**Schema:**
```sql
email_templates (
  id UUID PK,
  name TEXT UNIQUE,
  slug TEXT UNIQUE,
  category TEXT CHECK (resend|supabase),
  description TEXT,
  subject TEXT,
  html_content TEXT,
  is_editable BOOLEAN DEFAULT true,
  source_file TEXT,
  updated_at TIMESTAMPTZ
)
```

**Admin Page (`/admin/emails`):**
- Tabbed interface: Resend Emails | Supabase Emails
- Left panel: scrollable template list with status badges
- Right panel: Preview (desktop/mobile toggle), subject, source file, last updated
- Resend emails: Edit button opens modal editor
- Supabase emails: Copy HTML button + instructions

**Modal Editor (Resend templates):**
- Subject line input
- HTML textarea with syntax highlighting
- Edit/Preview tabs
- Cancel / Save / Save & Send Test buttons
- Test email pre-filled with admin's auth email

**Files Created:**
- `app/admin/emails/page.tsx` - Server component with admin auth
- `app/api/admin/emails/route.ts` - GET all templates
- `app/api/admin/emails/[slug]/route.ts` - GET/PUT single template
- `app/api/admin/emails/[slug]/send-test/route.ts` - Send test email
- `app/api/admin/emails/seed/route.ts` - Seed templates (admin only)
- `components/admin/AdminEmailsClient.tsx` - Main admin UI
- `components/admin/EmailEditorModal.tsx` - Edit modal with preview

**Files Modified:**
- `lib/email.ts` - Refactored:
  - `sendBrandedEmail()` - Internal helper using `buildEmailHtml()`
  - `sendTemplateEmail()` - Export for sending raw HTML (used by API routes)
  - `sendWelcomeEmail()` and `sendNewsletterWelcomeEmail()` now use `sendBrandedEmail()`
  - Legacy functions (`sendGrantStatusEmail`, `sendBankInfoRequestEmail`, `sendGiftCodesEmail`, `sendContactFormEmail`) still use plain text but call `sendTemplateEmail()` internally for consistency

**Key Implementation Details:**
- Supabase templates are read-only (can't edit in our admin, must use Supabase Dashboard)
- Test email default: admin's auth email from session
- Variables in editor HTML are highlighted in yellow for visibility
- Preview uses iframe with `srcDoc` for live rendering
- Supabase templates show "Copy HTML" button - user copies HTML and pastes into Supabase Dashboard

### Session 2026-04-26: Grant Application Consent

Added consent checkbox to grant application submission flow.

**Goal:** Users must read and consent to data collection before submitting grant applications.

**Consent Text:**
```
"By submitting this application, I consent to National Fund for Women Foundation collecting, storing, and using the personal information I have provided, including any details I have voluntarily shared about my circumstances, for the purpose of reviewing and evaluating my grant application. My information will be accessed by National Fund for Women Foundation staff involved in the grant review process and will not be sold or shared with third parties. I may request deletion of my information by contacting National Fund for Women Foundation directly."
```

**Database:**
- `supabase/migrations/062_add_grant_consent.sql` - Added `consent_version TEXT DEFAULT 'v1'` and `consent_given_at TIMESTAMPTZ` columns to grants table

**Files Modified:**
- `app/api/grants/create/route.ts` - Stores `consent_version` and `consent_given_at` on submission
- `components/GrantApplicationForm.tsx`:
  - Removed ReauthModal and reauthentication flow
  - Added `showConfirm` and `submitConsentChecked` state
  - Form submit opens confirmation modal instead of direct submission
  - Modal has checkbox, collapsible `<details>` with full consent text (mobile-friendly)
  - "Confirm & Submit" button disabled until checkbox checked

**UI Flow:**
1. User fills out application form
2. Clicks "Continue →" to open confirmation modal
3. Checks consent checkbox
4. Optionally expands "View full consent text" to read full legal text
5. Clicks "Confirm & Submit" to complete submission

**Note on ReauthModal.tsx:**
The `components/auth/ReauthModal.tsx` component still exists in the codebase but is no longer imported or used anywhere. It was removed from both `GrantApplicationForm.tsx` and `ClaimItemModal.tsx` due to Supabase SDK Web Locks API causing hangs on `reauthenticate()` and `verifyOtp()` calls. The component and related `lib/auth/reauthentication.ts` are preserved for potential future implementation if the Web Locks issue is resolved or a different OTP approach is needed.

### Session 2026-04-26: Shopify Sync Creates Hidden Products

Changed `/api/admin/shopify/sync` to set `mvp_visibility: false` for newly synced products.

**Files Modified:**
- `app/api/admin/shopify/sync/route.ts` - Added `mvp_visibility: false` to upsert payload

**Behavior:**
- New products synced from Shopify are hidden by default (visibility = false)
- Existing products unaffected (upsert only sets field on insert, not on update)
- Admin must manually toggle visibility on `/admin/shopify` to make new products visible

### Session 2026-04-27: Membership Price Update

Updated contributing membership price from $1 to $15 in:
- `components/SignUpFlow.tsx` - membership card price
- `components/MembershipSelector.tsx` - membership selector price

### Session 2026-04-27: Fix Welcome Email on Paid Membership Purchase

Fixed bug where welcome email was NOT sent after paid membership (contributing/founding) purchases.

**Problem:**
- Free signup: `sendWelcomeEmail` called via `/api/welcome-email` in `SignUpFlow.tsx`
- Gift membership: `sendGiftCodesEmail` called in webhook handler
- Paid membership: **No email sent** - bug in `app/api/webhook/route.ts`

**Fix:**
- Added `sendWelcomeEmail` call in `app/api/webhook/route.ts` after successful profile update
- Email sent with correct membership type, renewal date (1 year), and member ID
- Uses `session.customer_details?.email` for recipient address
- Falls back to profile name or "there" if name not available

### Session 2026-04-27: Grant Emails Branded Templates

Refactored grant email functions to use branded HTML templates from the `email_templates` database table.

**Database:**
- Updated `EMAIL_TEMPLATES` in `app/api/admin/emails/seed/route.ts` with 7 new grant email templates:
  - `grant-application-received` - Auto-sent when application submitted
  - `grant-under-review` - Sent when admin changes status to in_review
  - `grant-approved` - Sent when admin approves
  - `grant-not-approved` - Sent when admin marks not approved
  - `grant-payment-pending` - Sent when admin changes status to payment_pending
  - `grant-payment-sent` - Sent when admin changes status to payment_sent
  - `bank-info-request` - Already existed, refactored to use branded template

**Files Modified:**
- `lib/email.ts`:
  - Added `fetchEmailTemplate()` - Fetches template by slug from DB
  - Added `replaceTemplateVariables()` - Replaces `{{name}}`, `{{grantCycleName}}`, etc.
  - Created `sendGrantApplicationReceivedEmail()` - Uses `grant-application-received` template
  - Updated `sendGrantStatusEmail()` - Now uses 5 separate templates (slugMap lookup)
  - Updated `sendBankInfoRequestEmail()` - Now uses `bank-info-request` template from DB
- `app/api/grants/create/route.ts` - Added call to `sendGrantApplicationReceivedEmail()` after successful submission (fire-and-forget)

**How it works:**
1. Admin creates/edits branded HTML templates at `/admin/emails` with `{{variable}}` placeholders
2. On grant action, `fetchEmailTemplate()` loads the HTML from database
3. `replaceTemplateVariables()` swaps `{{name}}`, `{{grantCycleName}}`, etc. with actual values
4. `sendTemplateEmail()` sends the branded HTML via Resend

**Variable placeholders used:**
- `{{name}}` - Recipient's name
- `{{grantCycleName}}` - Grant cycle name
- `{{amount}}` - Grant amount (formatted with commas)
- `{{applicationId}}` - Application ID
- `{{siteUrl}}` - Site base URL
- `{{ctaUrl}}` - CTA button link

**Debug logging added** - Added console.log statements in `lib/email.ts` and `app/api/grants/create/route.ts` to debug email sending issues.

**Featured image added** - `public/images/featured.jpg` for social sharing metadata in `app/layout.tsx`.

**Social sharing metadata:**
- Added OpenGraph and Twitter card metadata to `app/layout.tsx`
- Points to `/images/featured.jpg` for social media previews
- Used in Facebook, Twitter, LinkedIn, and text message link previews

### Session 2026-04-28: Marquee Gap Fix + UI Updates

**Marquee Gap Fix:**
- `components/sections/PerksFeatureSection.tsx` - Fixed gap between last logo and first in scrolling marquee
- Problem: `react-fast-marquee` had visual gap when looping back to start
- Solution: Duplicated logos array within Marquee for seamless infinite loop with no gap
- Set `gap={0}` on Marquee since duplicates provide proper spacing via `gap-16`

**UI Fixes:**
- `components/contact/ContactClient.tsx` - Changed success checkmark background from green (`#d4f1ad`) to lilac (`bg-nfw-lilac`)
- `components/landing/Footer.tsx` - Moved "Thanks! You're on the list." success message below form instead of beside it
- `components/dashboard/YourZeroDollarStoreSection.tsx` - Made Latest Offerings cards clickable links to /store

**SEO Updates:**
- `/gift-membership` - H1: "Gift a Membership", SEO title/description added
- `/faq` - H1: "Frequently Asked Questions", SEO title/description added
- `/contact` - H1: "Contact Member Support", SEO title/description added
- `/auth/sign-up` - "Become a Member" now H1 (was H2 in SignUpFlow)
- `/auth/login` - "Member Login" now H1, SEO title/description updated
- `app/gift-membership/page.tsx` - Refactored to server wrapper pattern for metadata export

**Email System:**
- Newsletter Welcome email triggers on footer newsletter signup and coming soon page for new subscribers
- Duplicate detection: if email already subscribed, no welcome email sent
- Greeting uses "Dear Friend," generic format

**Favicon:**
- Added `app/icon.png` (500x500) as primary favicon
- Explicit icons configuration in `app/layout.tsx` metadata
- Deleted old `app/favicon.ico` to avoid conflicts

### Session 2026-04-28: Password Update Fix

**Problem:** Password reset form at `/auth/update-password` would hang on "Saving..." after submission.

**Root Cause:** Direct client-side Supabase calls (`supabase.auth.updateUser`) don't properly exchange the password reset code from the URL into a session.

**Solution:**
- Created new API route `/api/auth/update-password` (POST) that uses server-side `createClient()` 
- Server-side client properly exchanges the `?code=` parameter into a valid session
- Component now calls the API route instead of direct Supabase call

**Files Created:**
- `app/api/auth/update-password/route.ts` - Server-side API route for password updates

**Files Modified:**
- `components/update-password-form.tsx` - Refactored to call API route instead of direct Supabase

### Session 2026-04-28: Legal Pages Admin + Hero Template Enhancements

#### Legal Pages Admin

**Problem:** No way to manage Termly embed codes for Privacy Policy, Terms of Service, and Accessibility pages.

**Solution:**
- Created `legal_pages` table in Supabase with slug, title, termly_embed_code columns
- Created `/admin/legal` page with tabbed interface (3 tabs: Privacy, Terms of Service, Accessibility)
- Each tab has textarea for Termly embed code + Save button
- Created public pages at `/privacy`, `/terms-of-service`, `/accessibility` that render embed code via `dangerouslySetInnerHTML`

**Files Created:**
- `supabase/migrations/050_create_legal_pages.sql`
- `app/api/legal/[slug]/route.ts` - GET/POST API for legal pages
- `app/admin/legal/page.tsx` - Server wrapper with admin auth
- `app/admin/legal/LegalAdminClient.tsx` - Tabbed admin UI
- `app/privacy/page.tsx`, `app/terms-of-service/page.tsx`, `app/accessibility/page.tsx` - Public pages

**Admin Dropdown Links Added:**
- Added "Legal Pages" link to AuthButtonCombined, auth-button, and MobileMenu

#### Hero Template Enhancements

**Added two new editor fields:**
1. `subheadline_italic` - Toggle to make subheadline italic or not (default: true)
2. `image_position` - Select to swap image to left or right column (default: "right")

**Files Modified:**
- `lib/sections/types.ts` - Added `subheadline_italic?: boolean` and `image_position?: "left" | "right"` to `HeroContent`
- `lib/sections/registry.ts` - Added both fields to hero `editorFields` with types "toggle" and "select"
- `components/sections/HeroSection.tsx` - Applied conditional italic class and column swap via CSS order classes
- `components/admin/pages/SectionEditorPanel.tsx` - Added "toggle" field type UI component + fixed toggle switch (OFF=LEFT, ON=RIGHT, proper sizing to keep circle visible)

#### Hero Template Column Swap Fix

Fixed column proportions when swapping hero image from right to left.

**Solution:** CSS Grid with explicit width swapping:
- **Right (default):** `grid-cols-[53%_47%]` - text 53%, image 47%, image has `order-last`
- **Left:** `grid-cols-[47%_53%]` - image 47% (order-first), text 53%

**Files Modified:**
- `components/sections/HeroSection.tsx`:
  - Grid columns: `grid-cols-[53%_47%]` when image on right, `grid-cols-[47%_53%]` when image on left
  - Text column: always left column (no order class)
  - Image column: `order-last` when right, `order-first` when left
  - Removed flexbox approach in favor of explicit grid column swap

#### Duplicate Trash Icon Fix

**Problem:** `/admin/pages` showed two trash can icons on page cards.

**Fix:** Removed duplicate Trash2 button from `AdminPagesClient.tsx`

### Session 2026-04-28: Security Audit & Admin Route Protection

Conducted comprehensive security audit and fixed critical vulnerabilities.

#### Vulnerabilities Found

**4 Unprotected Admin API Routes:**
- `pages/create` - Anyone could create pages
- `pages/update` - Anyone could update any page
- `pages/delete` - Anyone could delete any page
- `pages/duplicate` - Anyone could duplicate any page

**No Edge Middleware Protection:**
- No root middleware protecting `/admin/*` routes at the edge

**Duplicate `requireAdmin` Implementations:**
- `/middleware/adminCheck.ts` - Used by admin pages (with redirect)
- `/lib/adminCheck.ts` - Used by some API routes (returns error object)

#### Fixes Applied

**1. Protected Page Management API Routes:**
Added admin authentication checks to all 4 vulnerable routes:
- `app/api/admin/pages/create/route.ts`
- `app/api/admin/pages/update/route.ts`
- `app/api/admin/pages/delete/route.ts`
- `app/api/admin/pages/duplicate/route.ts`

**2. Consolidated `requireAdmin`:**
- Updated `/lib/adminCheck.ts` to support both modes:
  - `redirectOnFailure: true` for pages (redirects to login/home)
  - Default for API routes (returns `{ authorized: false, ... }`)
- Updated `/middleware/adminCheck.ts` to re-export from lib with redirect enabled

**3. Added Edge Protection in proxy.ts:**
- Added `/admin/*` route protection at the edge
- Checks user authentication and admin status before allowing access
- Redirects to `/auth/login` if not authenticated
- Redirects to `/` if authenticated but not admin

**Files Modified:**
- `app/api/admin/pages/create/route.ts` - Added admin auth check
- `app/api/admin/pages/update/route.ts` - Added admin auth check
- `app/api/admin/pages/delete/route.ts` - Added admin auth check
- `app/api/admin/pages/duplicate/route.ts` - Added admin auth check
- `lib/adminCheck.ts` - Added options parameter for redirect behavior
- `middleware/adminCheck.ts` - Now re-exports from lib with redirect enabled
- `proxy.ts` - Added edge-level `/admin/*` protection

### Session 2026-04-29: Email System Fixes

#### Signup Flow Hang Fix

**Problem:** "Continue for free" button hung after clicking - `supabase.auth.getUser()` was causing a retry loop (multiple 2.25s requests).

**Root Cause:** Session/auth issue causing Supabase client to retry `getUser()` continuously.

**Solution:** Skip `getUser()` in step 3 - pass user ID through React state from step 1.

**Changes:**
- Added `userId` state to SignUpFlow
- Added `useEffect` to fetch and store user ID when step >= 1
- Modified `handleSelectPlan` to use stored `userId` instead of calling `getUser()`
- Uncommented welcome email and Access Perks sync calls

**Files Modified:**
- `components/SignUpFlow.tsx` - Added userId state, useEffect, updated handleSelectPlan

#### Email Template Structure Fix

**Problem:** Welcome emails showed "VISIT WEBSITE" twice in body CTA section. Membership snapshot div nested in template body was breaking email HTML structure.

**Root Cause:** Migration 065 simplified templates but placed membership snapshot (with nested `<div>`) in template body, breaking table layout in email clients.

**Solution:** Move membership snapshot to email shell - `buildEmailHtml` now accepts `membershipSnapshot` parameter and renders it in a dedicated `<tr>` section after headline, before body.

**Changes:**
- Added `membershipSnapshot` parameter to `EmailHtmlOptions` interface
- Added `membershipSection` variable in `buildEmailHtml` (renders after headline, before body)
- Added `membershipSnapshot` to `SendBrandedEmailOptions` interface
- Updated `sendBrandedEmail` to accept and pass `membershipSnapshot`
- Updated `sendWelcomeEmail` to build membership snapshot HTML and pass as parameter
- Templates remain simple body-only content (no nested tables/divs)

**Files Modified:**
- `lib/email.ts` - Added membershipSnapshot to shell, not template

**Database Migrations:**
- `068_fix_welcome_templates_remove_snapshot.sql` - Resets welcome templates to simple body content

#### send-test Route Fix

**Problem:** Test emails showed wrong headline ("Welcome Email - Free" instead of "Welcome to NFW!") and wrong membership tier ("Contributing" for all welcome templates).

**Root Cause:** send-test route was using `template.name` as headline and hardcoding "Contributing" for all templates.

**Fix:**
- For welcome-* templates, use "Welcome to NFW!" as headline (same for all tiers)
- Detect membership tier from slug: welcome-free=Free, welcome-contributing=Contributing, welcome-founding=Founding
- Use correct tier in both variable replacement and membershipSnapshot

**Files Modified:**
- `app/api/admin/emails/[slug]/send-test/route.ts` - Fixed headline and membership tier detection

### Session 2026-04-29: Access Perks Travel SDK Stage Configuration

**Problem:** Travel page at `/travel` was failing to authenticate with Access Perks SDK.

**Root Cause:** SDK URL was hardcoded to production (`booking.accessdevelopment.com`) but only stage credentials were available.

**Solution:** Updated SDK URL to stage endpoint for testing.

**Changes:**
- `app/travel/TravelClient.tsx` - Changed SDK URL from `https://booking.accessdevelopment.com/scripts/travel.client.v2.js` to `https://booking.accessdevelopment-stage.com/scripts/travel.client.v2.js`

**Environment Variables Required (Stage):**
- `ACCESS_TRAVEL_AUTH_URL`: `https://auth.adcrws-stage.com/api/v1/tokens`
- `ACCESS_OFFERS_TOKEN`: Stage API key from Access Perks

### Session 2026-04-29: Dashboard Mobile Responsiveness

Made `/dashboard` more mobile responsive starting from the top.

**Files Modified:**
- `components/dashboard/DashboardHero.tsx` - Hero buttons stack on mobile (`flex-col sm:flex-row`)
- `app/dashboard/page.tsx` - Changed profile/impact layout from CSS grid to flex (`flex-col md:flex-row`)
- `components/dashboard/MembershipImpactCard.tsx` - Stats columns stack on mobile (`grid-cols-1 sm:grid-cols-3`), border separators only on sm+
- `components/dashboard/PopularAcrossNFW.tsx` - Items 1 column on mobile, 2 on tablet, 5 on desktop; aspect-square mobile, aspect-[3/4] on sm+
- `components/dashboard/YourMicrograntsSection.tsx` - Header button stacks on mobile; Available Microgrants in 1-column grid (removed horizontal scroll); image height h-40 mobile, h-32 desktop
- `components/dashboard/YourPerksAndBenefits.tsx` - "Explore Perks" button stacks under header on mobile
- `components/dashboard/YourZeroDollarStoreSection.tsx` - Header button stacks on mobile; Latest Offerings in 1-column grid; card aspect-square mobile, aspect-[3/4] on sm+
- `components/dashboard/BottomActions.tsx` - Cards aspect-[4/3] on mobile (75% of square), aspect-square on desktop; "Share Your Story" label changed to "Share Your Story (Coming Soon)"; disabled button background changed to neutral-500 (grey)

### Session 2026-04-29: Supabase Custom Domain Setup

Activated `auth.nationalfundforwomen.org` as custom domain for Supabase Auth.

**Key Points from Supabase Docs:**
- Both project URL (`lirsaxhujjgnibcwyzpl.supabase.co`) and custom domain (`auth.nationalfundforwomen.org`) work interchangeably after activation
- No code changes strictly required - existing URLs continue to work
- Custom domain used by Supabase Auth immediately once activated
- OAuth flows will advertise custom domain as callback URL

**Manual Steps Completed:**
1. Google Cloud Console → Added redirect URI: `https://auth.nationalfundforwomen.org/auth/v1/callback` (kept existing project URL as backup)
2. Supabase Dashboard → Authentication → URL Configuration → Added redirect URIs:
   - `https://nationalfundforwomen.org/api/auth/callback`
   - `https://auth.nationalfundforwomen.org/auth/v1/callback`
3. Removed old Vercel preview URLs from Supabase redirect URIs (nfw-mvp-4n2i.vercel.app)
4. Activated custom domain in Supabase Dashboard

**Optional (not done - both URLs work):**
- Update `NEXT_PUBLIC_SUPABASE_URL` to `https://auth.nationalfundforwomen.org` in `.env.local` and Vercel env vars for branding consistency

**Documentation Updated:**
- `MEMBERSHIP.md` - Updated Google OAuth setup with both redirect URIs

**Files Modified:**
- `MEMBERSHIP.md` - Added second redirect URI to Google Cloud Console OAuth setup instructions

### Session 2026-04-30: Fix Custom Redemption Instructions for In-Store Methods

Fixed issue where custom redemption instructions were not showing for in-store and print coupon methods.

**Problem:** When clicking "Redeem In-Store" or "Print Coupon" on offers with custom redemption instructions, users were taken directly to the form instead of seeing the instructions first.

**Root Cause:** The API (`/api/access-perks/offers/[offerKey]/redeem/route.ts`) returns display instructions at root level (`display_message`), but `OfferDetailPanel.tsx` was checking `data.details?.display` which doesn't exist.

**Files Modified:**
- `components/perks/OfferDetailPanel.tsx` - Updated `instore` and `instore_print` methods to check `data.display_message || details.display` for custom instructions

**Also Fixed:** Terms of use fallback chain updated from `data.terms || details.terms_of_use` to `data.terms || data.details?.terms_of_use || details.terms` to ensure terms are displayed when available.

#### Display Terms Above Redemption Buttons

Added "Terms of Use" section immediately above the redemption buttons with citrine styling to ensure users see terms before redeeming.

**Changes:**
- Added `terms_of_use` field to Offer interface
- Replaced existing "Terms & Conditions" section with "Terms of Use" section
- Shows: `terms_of_use || terms_and_conditions` (prefers redemption-specific terms)
- Citrine background/border styling (`bg-nfw-citrine/20 border border-nfw-citrine`)
- Includes explanatory note: "These terms apply when redeeming this offer"
- Positioned immediately above "Redeem This Offer" buttons

**Files Modified:**
- `components/perks/OfferDetailPanel.tsx` - Added terms_of_use to interface, restyled terms section above redemption buttons

#### Offer Type Filter Bug Fix

**Bug:** "Unlimited Use" and "Limited Use" checkboxes in FilterSidebar weren't filtering results in Stores and Locations views.

**Root Cause:** The stores/locations branch in `fetchRollup` was missing the `offer_types` parameter. It had `category_key` and `facet` handling but no `offer_types`.

**Solution:** Added `offer_types` parameter handling to stores/locations branch:
```javascript
if (selectedOfferTypes.length > 0) {
  params.offer_types = selectedOfferTypes.join(",");
}
```

**Flow:**
1. Frontend sends `offer_types=unlimited,limited` to `/api/access-perks/rollup`
2. Rollup API reads `offer_types` (plural, line 14) and converts to `offer_type` (singular) for Access Perks API

**Note:** Offers view already worked correctly - it sends `offer_type` directly to `/api/access-perks/offers/search`.

**Files Modified:**
- `app/perks/page.tsx` - Added offer_types handling to stores/locations branch in fetchRollup

#### Allow Unlimited Redemptions + Uses Remaining Display

Fixed issue where all offers were limited to one redemption, even unlimited-use offers.

**Problem:** Local database check was blocking ALL redemptions if user had ANY active redemption, preventing unlimited offers from being redeemed multiple times.

**Solution:**
1. Removed hard block on duplicate redemptions in `/api/access-perks/offers/[offerKey]/redeem/route.ts`
2. Access Perks API now handles usage limits
3. Added better error handling for limit-exceeded responses (detects "limit", "use", "remaining" in error messages)

**Uses Remaining Feature:**
- Created `/api/access-perks/offers/[offerKey]/uses-remaining/route.ts` (uses existing `getOfferUsesRemaining()` from lib)
- Updated `OfferDetailPanel.tsx` to fetch and display uses remaining
- Shows citrine badge "X Uses Remaining" above redemption buttons
- Shows warning text when 3 or fewer uses remaining
- Disables all redemption buttons when `number_of_uses_remaining === 0`
- Button text changes to "Offer Limit Reached" when disabled
- Local tracking in database continues as before (for dashboard purposes)

**Files Created:**
- `app/api/access-perks/offers/[offerKey]/uses-remaining/route.ts`

**Files Modified:**
- `app/api/access-perks/offers/[offerKey]/redeem/route.ts` - Removed duplicate check, added limit-exceeded error handling
- `components/perks/OfferDetailPanel.tsx` - Added usesRemaining state, API fetch, badge display, button disabling

#### Travel Navigation & Reset

Added navigation between /perks and /travel, plus a reset button for the travel iframe.

**FilterSidebar Travel Link:**
- Added aubergine "Travel Benefits" link at top of sidebar with Plane icon
- Links to `/travel`
- Subtitle: "Hotels, Cars, Flights & More"

**Travel Page Header:**
- Desktop: Horizontal layout with "Back to Perks" on left, title centered, "Back to Travel Home" button on right
- Mobile: Stacked layout - navigation buttons on top row, centered title below
- Both buttons styled with white/10 background, rounded corners

**Back to Travel Home Button:**
- Uses `window.location.reload()` for a hard refresh to ensure full SDK reinitialization
- Previous attempts to call `initTravel()` didn't properly reset iframe state after navigation

**Travel SDK Loading Fix:**
- Changed script strategy from `lazyOnload` to `afterInteractive`
- This ensures SDK loads after page becomes interactive but before lazyOnload
- Fixes issue where navigating from /perks to /travel would hang because SDK wasn't loaded in time

**Bug Fixes:**
- `OfferDetailPanel.tsx`: Fixed `disabled` prop type errors (boolean | null not assignable to boolean | undefined) by using `!!` to coerce to boolean

**Files Modified:**
- `components/perks/FilterSidebar.tsx` - Added Travel link with Plane icon
- `app/travel/TravelClient.tsx` - Added responsive header with navigation buttons, Back to Travel Home uses window.location.reload(), SDK uses afterInteractive strategy
- `components/perks/OfferDetailPanel.tsx` - Fixed disabled prop type errors

#### Footer Mobile Layout Updates

**Email Signup Section:**
- Container uses `items-start sm:items-end` so label and form stay stacked (not side-by-side)
- On desktop (sm:), both label and form right-align together
- On mobile, both left-align together
- Input width increased to `sm:w-64` for better proportions

**Files Modified:**
- `components/landing/Footer.tsx` - Right-align email signup on desktop, keep full-width stacked layout on mobile
