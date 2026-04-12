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
- `age_range`, `household_income` (TEXT)
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
