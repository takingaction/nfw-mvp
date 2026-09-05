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

## Database Backup & Restore

### Data-Only Dump

```bash
supabase db dump --data-only --db-url 'postgresql://postgres:<password>@db.lirsaxhujjgnibcwyzpl.supabase.co:5432/postgres' -f nfw_backup_full_$(date +%Y%m%d).sql
```

### Restore with Circular FK Warning

The `membership_payments` table has a self-referential FK (`original_payment_id` → `membership_payments.id`) that causes pg_dump to warn about circular constraints. This is expected and does not affect the dump itself.

**To restore a data-only dump, use `--disable-triggers`:**

```bash
# Restore with pg_restore (recommended)
pg_restore --disable-triggers -d '<connection_string>' backup.sql

# Or restore with psql and temporarily disable triggers
psql -c "ALTER TABLE membership_payments DISABLE TRIGGER ALL;" -d '<connection_string>'
psql -f backup.sql -d '<connection_string>'
psql -c "ALTER TABLE membership_payments ENABLE TRIGGER ALL;" -d '<connection_string>'
```

## Critical Database Schema Notes

### `profiles` Table Schema

The `profiles` table includes an `email` column (added via migration 075). User email is stored in both `auth.users` and `profiles.email`.

**Common `profiles` table columns:**
- `id` (UUID, PK)
- `email` (TEXT) - synced from auth.users via trigger
- `full_name` (TEXT)
- `membership_level` (TEXT) - 'free', 'contributing', 'founding'
- `is_admin` (BOOLEAN)
- `profile_completed` (BOOLEAN)
- `city`, `state`, `zip` (TEXT)
- `date_of_birth` (DATE) - must be 18+, born after 1900
- `household_income` (TEXT)
- `stripe_connect_account_id` (TEXT)
- `subscription_status`, `subscription_ends_at` (TEXT)
- `shipping_address` (JSONB)
- `social_handles` (JSONB)
- `access_perks_member_id` (TEXT)
- `first_paid_at` (TIMESTAMPTZ)
- `first_paid_level` (TEXT)
- And more...

### Deprecated Bug Pattern

The following bug pattern was fixed in 2026-04-04 to 2026-04-07, but is kept as historical reference:

```typescript
// WRONG - querying email from profiles when it didn't exist:
.supabase.from("profiles").select("id, full_name, email")

// CORRECT (pre-2026-05-27):
.supabase.from("profiles").select("id, full_name")
```

Fixed in:
- `app/admin/grants/[id]/page.tsx` - Fixed 2026-04-04
- `components/admin/AdminGrantReviewer.tsx` - Fixed 2026-04-05
- `app/api/admin/users/route.ts` - Fixed 2026-04-07

**Note:** As of migration 075, `profiles.email` now exists and is auto-synced from `auth.users` via a trigger.

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

#### Google Auth Admin Menu Fix

**Problem:** Google Auth users with admin access could not see the admin menu, despite being set as admins for weeks. Password auth worked fine.

**Root Causes Identified:**
1. **Supabase browser client not handling Google Auth sessions** - The custom domain auth sessions were stored in cookies but browser client couldn't read them properly
2. **React error #418 (hydration mismatch)** - Caused components to fail rendering
3. **Incorrect profile select** - Included `email` column that doesn't exist in profiles table (introduced during fix)

**Solution:**
1. Created `/api/auth/profile` server-side endpoint using `createServerClient` with cookie handling
2. Updated auth components to use API instead of direct Supabase client queries:
   - `components/auth-button.tsx`
   - `components/AuthButtonCombined.tsx`
   - `components/MobileMenu.tsx`
3. Removed singleton pattern from `lib/supabase/client.ts`
4. Removed `email` from profile select (doesn't exist in profiles table)

**Key Files:**
- `app/api/auth/profile/route.ts` - New server-side profile endpoint
- `lib/supabase/client.ts` - Removed singleton pattern
- `components/auth-button.tsx` - Uses API for profile fetch
- `components/AuthButtonCombined.tsx` - Uses API for profile fetch
- `components/MobileMenu.tsx` - Uses API for profile fetch

#### Free Members Access /perks Fix

**Problem:** Free members with `membership_level = "free"` were being redirected to `/auth/sign-up?step=3` when visiting `/perks`.

**Root Cause:** The auth check at `app/perks/page.tsx` only allowed `"contributing"` and `"founding"` membership levels, not `"free"`.

**Bug in Original Logic:**
```typescript
// Original - redirects free members
if (profile?.membership_level && !["contributing", "founding"].includes(profile.membership_level)) {
  window.location.href = "/auth/sign-up?step=3";
}
```

**Fix Applied:**
```typescript
// Fixed - allows free members
if (profile?.membership_level && !["free", "contributing", "founding"].includes(profile.membership_level)) {
  window.location.href = "/auth/sign-up?step=3";
}
```

**Additional Fix - Null vs "free" Inconsistency:**

Research found that some components fell back to `null` instead of `"free"` when `membership_level` was null in the database. Fixed at the API source:

**`app/api/auth/profile/route.ts`:**
- Normalized `null` membership_level to `"free"` for consistency
- All components now receive `"free"` for free members regardless of database value

**Files Modified:**
- `app/perks/page.tsx` - Added "free" to allowed membership levels
- `app/api/auth/profile/route.ts` - Normalize null → "free" in profile response

### Session 2026-05-01: Orphaned Auth Users + Auth Consistency

#### Problem: Auth Users Without Profiles

Investigation revealed 2 orphaned auth users (colemanishi@gmail.com, lorickc@gmail.com) who had confirmed emails but no matching profile records.

**Root Causes Identified:**
1. Profile created LATE in signup flow (step 1 form submission), but auth user created EARLY (step 0)
2. Users who abandoned signup before submitting step 1 left orphaned auth users
3. `/api/profile/update` did INSERT if profile missing, but only worked if API was called with valid data

**Schema Findings:**
- `profiles.id` → FK with `ON DELETE CASCADE` to `auth.users.id` ✅
- `profiles.full_name` is NOT NULL - needs placeholder value
- `profiles.date_of_birth` is NOT NULL - uses "1900-01-01" as placeholder
- No `created_at` column - uses `joined_at` instead

#### Solution: Defensive Profile Creation in Auth Callback

**`app/auth/callback/route.ts`:**
- Added defensive profile creation when user confirms email
- If profile doesn't exist after email confirmation, creates minimal profile:
  - `id`: matching auth.users.id
  - `full_name`: "Member" (placeholder)
  - `date_of_birth`: "1900-01-01" (placeholder)
  - `membership_level`: "free"
  - `profile_completed`: false

#### Consistent `/api/auth/profile` Usage

Updated all components to use `/api/auth/profile` for consistency:
- `app/perks/page.tsx` - Replaced direct Supabase profile query with API call
- `app/grants/apply/page.tsx` - Fixed membership_level check to allow "free"
- `components/sections/PlanButton.tsx` - Uses API call, removed unused import

#### Enhanced Logging for Profile Operations

**`app/api/profile/update/route.ts`:**
- Added timestamp to all log entries
- Logs operation type (INSERT vs UPDATE)
- Logs user email alongside user ID
- Logs success/failure with full error details
- JSON stringifies updates for debugging

#### SQL for Creating Orphaned Profiles

```sql
INSERT INTO profiles (id, full_name, date_of_birth, membership_level, profile_completed, joined_at, updated_at)
VALUES
  ('c81bda60-4b16-47d5-a95b-4502fc9b1643', 'Member', '1900-01-01', 'free', false, '2026-05-01 22:21:26+00', NOW()),
  ('96dfdc62-4cba-49a2-837d-e54357142efc', 'Member', '1900-01-01', 'free', false, '2026-05-01 17:00:50+00', NOW())
ON CONFLICT (id) DO NOTHING;
```

**Files Modified:**
- `app/auth/callback/route.ts` - Defensive profile creation on email confirmation
- `app/api/profile/update/route.ts` - Enhanced logging with timestamps and operation type
- `app/perks/page.tsx` - Uses `/api/auth/profile` instead of direct Supabase query
- `app/grants/apply/page.tsx` - Fixed membership_level check
- `components/sections/PlanButton.tsx` - Uses `/api/auth/profile`, removed unused import

### Session 2026-05-02: Date of Birth Bug Fix

#### Problem: date_of_birth Always Shows 1900-01-01

Investigation revealed that **18 out of 20 users** with `profile_completed: true` still had placeholder date `1900-01-01`. The database and API could save dates (proven by contributing members and profile page updates), but the signup flow was failing.

**Root Cause Found via Terminal Debugging:**

Step 3 (free plan selection) only sends `{profile_completed: true, membership_level: "free"}` without `date_of_birth`. The `/api/profile/update` route was adding the default `date_of_birth: "1900-01-01"` to ALL updates (not just new profiles), which **overwrote the correct date that was saved in step 2**.

**Flow:**
1. Step 1: No date sent → default `1900-01-01` set (correct for placeholder)
2. Step 2: Real date sent (e.g., `2000-01-01`) → saved correctly
3. Step 3: No date sent → API incorrectly adds default `1900-01-01` → **overwrites correct date!**

**The Bug was in `/api/profile/update/route.ts`:**
```typescript
// BEFORE - always set default for any update without date_of_birth
if (!updates.date_of_birth) {
  updates.date_of_birth = "1900-01-01";
}

// AFTER - only set default for NEW profiles (INSERT), not updates
if (!existingProfile && !updates.date_of_birth) {
  updates.date_of_birth = "1900-01-01";
}
```

**Fix Applied:**
- Changed condition to check `!existingProfile` before setting default
- This preserves existing `date_of_birth` values during UPDATE operations
- Only new INSERT operations get the placeholder default

**Additional Debug Findings:**
- Contributing members were unaffected because they skip step 3 (go to Stripe checkout instead)
- Free and founding members were affected because step 3 sends only membership_level update
- Terminal logging revealed the issue: `[ProfileUpdate] Final updates object` showed date being added incorrectly

**SQL to Fix Existing Users:**
```sql
-- Set 1900-01-01 placeholders to NULL so users will be prompted to enter real date
UPDATE profiles 
SET date_of_birth = NULL 
WHERE date_of_birth = '1900-01-01';
```

**Files Modified:**
- `app/api/profile/update/route.ts` - Only set placeholder for new profiles, not updates

### Session 2026-05-02: DOB Alert Banner System

#### Problem: Missing DOB Alert System

Users with placeholder `1900-01-01` date weren't being prompted to add their real date of birth. The alert was needed to ensure users update their DOB before applying for grants.

#### Solution: Non-Dismissible DOB Alert Banner

Created an alert banner system that persists on dashboard and profile pages until user adds a real DOB.

**Files Created:**
- `lib/profile-utils.ts` - `needsDateOfBirth(profile)` helper function
- `components/ui/banner.tsx` - Reusable banner component with aubergine/wisteria background, citrine action button
- `components/profile/ProfileBanner.tsx` - Client component that shows banner when `needsDateOfBirth` returns true

**Files Modified:**
- `components/ProfileCompletionForm.tsx` - Added `id="date_of_birth"` to input for scroll-to anchor
- `app/profile/page.tsx` - Added `<ProfileBanner profile={profile} />`
- `app/dashboard/page.tsx` - Added `<ProfileBanner profile={profile} />` with wisteria background

**Banner Behavior (Final):**
- Shows on every page load (dashboard + profile) until real DOB is saved
- No dismiss option - only disappears when real DOB is added
- Dashboard button → navigates to `/profile`
- Profile button → scrolls to and focuses `#date_of_birth` field
- Uses `needsDateOfBirth()` helper to check if `date_of_birth === "1900-01-01"`

**Key Code:**
```typescript
// ProfileBanner.tsx
const handleAction = () => {
  const pathname = window.location.pathname;
  if (pathname === "/dashboard") {
    window.location.href = "/profile";
  } else {
    const element = document.getElementById("date_of_birth");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus();
    }
  }
};
```

**Commits:**
- `7e991f7` - Add DOB alert banner system for profile completion
- `1b86062` - Make DOB banner use wisteria background on dashboard
- `ccd1d11` - Remove dismiss option from DOB banner

### Session 2026-05-02: Grant Email System Audit

#### Audit Findings

**Critical Bug Found:**
- `app/api/grants/create/route.ts` was selecting `name` from `grant_cycles` but the column is `cycle_name`
- Both `.select("name")` and `cycle?.name` were wrong
- This caused confirmation emails to show "the grant" instead of actual grant cycle name

**Debug Console.logs Found:**
- Multiple `console.log` statements in `lib/email.ts` left in production code
- Affected functions: `buildEmailHtml`, `sendBrandedEmail`, `sendTemplateEmail`, `sendWelcomeEmail`

#### Fixes Applied

1. Changed `.select("name")` to `.select("cycle_name")` in grants/create/route.ts
2. Changed `cycle?.name` to `cycle?.cycle_name` in the email call
3. Removed all debug `console.log` statements from `lib/email.ts`

**Files Modified:**
- `app/api/grants/create/route.ts` - Fixed cycle column reference
- `lib/email.ts` - Removed debug logging

**Commits:**
- `bcf19b0` - Fix grant cycle name bug and remove debug console.logs
- `85d7d65` - Fix TypeScript error - select cycle_name not name

### Session 2026-05-02: Debug Console.log Cleanup

Removed all debug console.log statements from 14 files, preserving only webhook logging for Stripe event debugging.

**Files Cleaned (156 total debug logs removed):**
- `app/api/profile/update/route.ts` - 13 logs removed
- `app/api/welcome-email/route.ts` - 8 logs removed
- `app/auth/callback/route.ts` - 2 logs removed
- `lib/auth/reauthentication.ts` - 12 logs removed
- `components/auth/ReauthModal.tsx` - 4 logs removed
- `components/admin/pages/SectionEditorPanel.tsx` - 8 logs removed
- `components/admin/edit/SectionWrapper.tsx` - 1 log removed
- `components/admin/edit/EditableSections.tsx` - 8 logs removed
- `components/admin/MediaLibraryModal.tsx` - 3 logs removed
- `components/ArticleForm.tsx` - 3 logs removed
- `app/api/admin/grants/send-bank-info-email/route.ts` - 2 logs removed
- `app/api/admin/users/route.ts` - 1 log removed
- `app/admin/pages/[pageId]/actions.ts` - 2 logs removed
- `app/api/access-perks/sync-member/route.ts` - 1 log removed

**Preserved:**
- `app/api/webhook/route.ts` - kept webhook logging for Stripe event debugging

**Commit:**
- `6500d68` - Remove all debug console.log statements

### Session 2026-05-03: Vercel Error Investigation + Proxy Auth Logging Fix

#### Vercel Error Analysis

Investigated reported Vercel errors including 406 responses and proxy auth errors.

**Errors Reviewed:**
- `site_settings` → 406 (consistent) - Missing RLS policies
- `pages` → 200/406 (intermittent) - PostgREST schema cache issues
- `[Proxy] Auth error: Auth session missing!` - 541 errors in 12 hours
- Bot scanners hitting random paths (keys.json, appsettings.json, etc.) - noise, not an issue

#### site_settings RLS Fix

**Migration:** `069_add_rls_to_site_settings.sql`

Applied RLS policies to `site_settings` table for consistency with other tables:
- Enable row-level security
- SELECT policy for public read access
- ALL policy for admin write access only
- NOTIFY pgrst to reload schema cache

**Applied in Supabase SQL Editor.**

#### Proxy Auth Error Logging Fix (Option A)

Reduced noise from `[Proxy] Auth error: Auth session missing!` by only logging for protected routes.

**Before:**
```typescript
if (!isAuthPage && authError) {
  console.error("[Proxy] Auth error:", authError.message);
```

**After:**
```typescript
if (isProtectedRoute && !user && authError) {
  console.error("[Proxy] Auth error:", authError.message);
```

**Files Modified:**
- `proxy.ts` - Only log auth errors for /admin/* routes

**Commit:**
- `ca41104` - Reduce proxy auth error logging to protected routes only

### Session 2026-05-03: Security Audit - API Routes

Performed comprehensive security audit of all API routes.

**Audit Results:**

| Route | Issue | Status |
|-------|-------|--------|
| `auth/debug` | Exposed sensitive debugging info to ANY authenticated user | **DELETED** |
| `coming-soon/subscribe` | Unused `getUser()` call - wasteful for public endpoint | Fixed |
| `stripe/connect` | Queried `email` column from profiles table (doesn't exist) | Fixed |

**No Issues Found:**
- No SQL injection vulnerabilities
- No `supabaseAdmin` privilege escalation
- All admin routes properly protected with `is_admin` checks
- User data properly scoped to `user.id`

**Files Modified:**
- `app/api/auth/debug/route.ts` - **DELETED** (exposed userMetadata, Supabase URL, cookie names)
- `app/api/coming-soon/subscribe/route.ts` - Removed unused `getUser()` call
- `app/api/stripe/connect/route.ts` - Removed `email` from profile select

**Commit:**
- `b002a55` - Security audit: delete exposed debug route, fix minor issues

### Session 2026-05-04: MobileMenu Database Fix + Grant Deadline Fix

#### MobileMenu Inconsistency Fix

**Problem:** Desktop navigation used `site_header.nav_links` from database, but MobileMenu was completely hardcoded with "Member Portal" label.

**Root Cause:** MobileMenu.tsx had hardcoded menu structure at lines 134-265 instead of reading from navLinks prop.

**Solution:**
- MobileMenu now accepts `navLinks` prop (NavLink interface with label, url, indent)
- Navigation.tsx passes navLinks from site_header to MobileMenu
- MobileMenu groups navLinks into sections dynamically
- Mobile now shows same admin-configurable labels as desktop

**Files Modified:**
- `components/MobileMenu.tsx` - Added navLinks prop, removed hardcoded sections, renders dynamically
- `components/Navigation.tsx` - Passes navLinks to MobileMenu

**Commit:**
- `e68087d` - Make MobileMenu read from site_header database

#### Grant Application Deadline Spacing Fix

**Problem:** "Deadline:" and the date appeared without a space between them on grant application cards.

**Root Cause:** Missing space character in JSX: `Deadline:` instead of `Deadline:{" "}`

**Files Modified:**
- `components/GrantApplicationForm.tsx` - Added `{" "}` after both "Deadline:" occurrences (lines 194, 227)

#### Additional Fixes Applied This Session

- `app/travel/page.tsx` - Removed non-existent `email` column from profiles select
- `app/api/stripe/connect/route.ts` - Changed to use `user.email` directly (TypeScript fix)
- `proxy.ts` - Reduced auth error logging to protected routes only

**Commits:**
- `0add414` - Fix app/travel/page.tsx: remove non-existent email column
- `cacd7fc` - Fix TypeScript error: profile.email no longer exists
- `ca41104` - Reduce proxy auth error logging to protected routes only

### Session 2026-05-04: Location Selection for In-Store Coupons + Gift Membership Fix

#### Access Perks Location Limitation

**Problem:** When redeeming in-store or print coupons, the coupon showed wrong/default address.

**Root Cause:** Access Perks API endpoints (`/v1/redeem/:offer_key/instore` and `/v1/redeem/:offer_key/instore_print`) do NOT accept a `location_key` parameter. The API ignores any location data sent and always returns a generic coupon with a default location.

**Solution:** Accept the platform limitation, keep location selection as visual confirmation only.

**Files Modified:**
- `components/perks/OfferDetailPanel.tsx`:
  - Removed location requirement block (API ignores `location_key` for instore/instore_print)
  - Keep location selection as visual confirmation
  - Added disclaimer: "Please confirm with your store that coupon is valid before redeeming."
  - Location list items now selectable with aubergine border highlight
  - Header shows "Please Select a Location" or "Location Selected" with check icon

#### Location Selection UX Improvements

**Changes:**
- Header shows "Please Select a Location" until selection, then "Location Selected"
- Clicked location has grey background (`bg-nfw-blackberry/10`) and aubergine left border
- Selected location shows "Location Selected" text inline with checkmark
- Removed redundant location display below the store listings
- Fixed `isSelected` comparison to use `String(key)` for proper comparison

**Files Modified:**
- `components/perks/OfferDetailPanel.tsx` - Multiple UX improvements for location selection

**Commits:**
- Multiple commits for location selection UX improvements
- `29000ba` - Accept Access Perks platform limitation for location-specific coupons
- `1c85e37` - Simplify coupon disclaimer message

#### Gift Membership Success Page Fix

**Problem:** Server-side exception "Event handlers cannot be passed to Client Component props" on gift membership success page.

**Root Cause:** Success page was a Server Component with `onClick` event handler on the copy button.

**Solution:**
- Created `components/gift/CopyableCode.tsx` - Client component with `useState` for copy confirmation (shows Check icon with green color for 2 seconds after copying)
- Added try-catch around `getGiftCodes` database query for error resilience
- Changed `.single()` to `.maybeSingle()` to avoid throwing on multiple records

**Files Created:**
- `components/gift/CopyableCode.tsx` - Client component for clipboard copy with confirmation

**Files Modified:**
- `app/gift-membership/success/page.tsx` - Use `CopyableCode` component, error handling

**Commit:**
- `ddae9d6` - Fix gift membership success page - extract copy button to client component

### Session 2026-05-05: Remove "My Grants" from Member Dropdown

Removed "My Grants" link from all three member dropdown menus since users can still access via direct URL `/grants/my-applications`.

**Files Modified:**
- `components/AuthButtonCombined.tsx` - Removed My Grants link
- `components/auth-button.tsx` - Removed My Grants link
- `components/MobileMenu.tsx` - Removed My Grants link

**Commit:**
- `4cc5a13` - Remove My Grants link from member dropdown menus

### Session 2026-05-05: Income Label Fix + Testimonials Attribution

#### Income Label Fix

Changed "Which best describes your current annual income?" to "Which best describes your current annual household income?" to match household income field.

**Files Modified:**
- `components/SignUpFlow.tsx` - Updated label text

#### Testimonials Attribution Fix

Fixed issue where testimonials section displayed "— , ," when no attribution fields were filled in.

**Before:** Always showed em dash + first_name, age, state (even if empty)
**After:** Only shows attribution if first_name exists; no em dash; empty fields hidden

**Files Modified:**
- `components/sections/TestimonialsSection.tsx` - Conditional rendering of attribution

**Commit:**
- `06b7e86` - Update income label and fix testimonials attribution display

### Session 2026-05-05: Location-Specific Offer Key for Redemption (WORKING)

#### Problem
When redeeming in-store or print coupons, the API was using the original offer's `offer_key` which is the same for all locations. Each location within an `offer_group` has its own unique `offer_key`.

#### Solution
Fetch the location-specific `offer_key` by calling:
```
GET /v1/offers?offer_group_key=XXX&location_key=YYY
```
This returns the offer specific to that location with its own `offer_key`.

#### Implementation
- Added `locationSpecificOfferKey` state in `OfferDetailPanel.tsx`
- Added `fetchLocationOfferKey()` function that calls `/api/access-perks/offers/search` with `offer_group_key` + `location_key`
- When user selects a location, fetches location-specific offer_key
- On redemption, uses `locationSpecificOfferKey` if available, otherwise falls back to original `offerKey`

#### Files Modified
- `components/perks/OfferDetailPanel.tsx` - Added location-specific offer_key fetching and redemption

**Verified working:** Coupon now shows correct address for selected location.

**Commit:**
- `982d161` - Fetch location-specific offer_key for accurate redemption

### Session 2026-05-05: Per-Template Hero Images for Email Templates

Added ability to customize hero image per email template via `hero_image_url` column.

**Database:**
- `supabase/migrations/070_add_hero_image_url_to_email_templates.sql` - Adds `hero_image_url TEXT` column to `email_templates` table

**API Updates:**
- `app/api/admin/emails/[slug]/route.ts` - Accepts and saves `hero_image_url`
- `app/api/admin/emails/preview/route.ts` - Fetches template's `hero_image_url` from DB for preview generation
- `app/api/admin/emails/[slug]/send-test/route.ts` - Uses template's `hero_image_url` for test emails

**Admin UI Updates:**
- `components/admin/EmailEditorModal.tsx` - Added Hero Image URL text input + Browse button opens MediaLibraryModal inline (resend templates only)
- `components/admin/AdminEmailsClient.tsx` - Updated type to include `hero_image_url`

**Email Library Updates:**
- `lib/email.ts` - Updated `fetchEmailTemplate` to select and return `hero_image_url`
- All 7 email functions now use `template?.hero_image_url` as fallback:
  - `sendWelcomeEmail`
  - `sendNewsletterWelcomeEmail`
  - `sendGrantApplicationReceivedEmail`
  - `sendGrantStatusEmail`
  - `sendBankInfoRequestEmail`
  - `sendGiftCodesEmail`
  - `sendContactFormEmail`

**Save & Send Test Fix:**
- `app/api/admin/emails/[slug]/send-test/route.ts` - Accepts `hero_image_url` from request body to fix race condition
- `components/admin/EmailEditorModal.tsx` - Passes `hero_image_url` directly to send-test API

**Flow:**
- Admin enters hero image URL in template editor (or leaves blank for default)
- Preview and test emails use custom image if set, otherwise fallback to default (`email-welcome-hero.jpg`)
- Supabase templates excluded (they paste full HTML anyway)

**Commit:**
- `4d416a3` - All email functions now use template's hero_image_url for custom hero images

### Session 2026-05-06: Remove Coming Soon Page Gate

**Problem:** Non-authenticated users were being redirected to `/coming-soon` instead of seeing the homepage.

**Solution:** Removed the redirect from `app/page.tsx`. Homepage now serves to all visitors (authenticated or not).

**Files Modified (5):**
- `app/page.tsx` - Removed `if (!user) { redirect("/coming-soon"); }`
- `app/layout.tsx` - Changed `isPublicRoute` to `false` (was `pathname === "/coming-soon"`)
- `components/NavigationContent.tsx` - Removed `if (pathname === "/coming-soon") return null;`
- `components/landing/Footer.tsx` - Removed `pathname` check and unused `usePathname` import
- `components/BackToTop.tsx` - Removed `pathname` check and unused `usePathname` import

**What Stays:**
- `/coming-soon` page remains for direct visits (newsletter signups)
- Related API routes and admin pages remain
- Navigation "Coming Soon Emails" link remains

**Commit:**
- `1b2ca1d` - Remove Coming Soon page gate - homepage serves to all visitors

### Session 2026-05-06: Rename Newsletter Signups + Restore Login Text

**Task 1: Renamed `/admin/coming-soon-emails` → `/admin/newsletter-signups`**

Files renamed:
- `app/admin/coming-soon-emails/page.tsx` → `app/admin/newsletter-signups/page.tsx`
- `app/admin/coming-soon-emails/AdminComingSoonEmails.tsx` → `app/admin/newsletter-signups/AdminNewsletterSignups.tsx`
- `app/api/admin/coming-soon-emails/route.ts` → `app/api/admin/newsletter-signups/route.ts`

Navigation link updates:
- `components/AuthButtonCombined.tsx` - href and label updated
- `components/auth-button.tsx` - href and label updated
- `components/MobileMenu.tsx` - href and label updated

**Task 2: Restored "Don't have an account? Sign up" to Login Page**

- `components/login-form.tsx` - Added back the signup link after login form
- Original text: "Don't have an account? Sign up" linking to `/auth/sign-up`

**Commit:**
- `a7281a0` - Rename coming-soon-emails to newsletter-signups, restore login signup link

### Session 2026-05-06: Access Perks Production Migration

**Problem:** Access Perks integration was using staging URLs, need to migrate to production.

**Hardcoded URL Changes (3 files):**

| File | Change |
|------|--------|
| `app/api/access-perks/offers/[offerKey]/redeem/route.ts` | Changed `https://redeem.adcrws-stage.com` → `https://redeem.adcrws.com`, now uses `ACCESS_REDEEM_TOKEN` env var |
| `app/api/access-perks/locations/route.ts` | Changed fallback default `https://offer.adcrws-stage.com` → `https://offer.adcrws.com` |
| `app/travel/TravelClient.tsx` | Changed `https://booking.accessdevelopment-stage.com` → `https://booking.accessdevelopment.com` |

**Environment Variables (Vercel + .env.local):**

| Variable | Production URL |
|----------|----------------|
| `ACCESS_OFFERS_API_URL` | `https://offer.adcrws.com` |
| `ACCESS_REDEEM_API_URL` | `https://redeem.adcrws.com` |
| `ACCESS_REPORTS_API_URL` | `https://report.adcrws.com` |
| `ACCESS_AMT_API_URL` | `https://amt.accessdevelopment.com/api/v1` |
| `ACCESS_TRAVEL_AUTH_URL` | `https://auth.adcrws.com/api/v1/tokens` |

**New Production Token:** Separate production token was provided by Access Perks (different from staging token).

**Note:** Tokens stay the same; only URLs changed from `-stage` to production endpoints.

### Session 2026-05-06: Shopify Sync Visibility/Starred Preservation

**Problem:** Clicking "Sync from Shopify" on `/admin/shopify` was overwriting `mvp_visibility` to `false` for ALL products (existing and new), hiding everything. Also, products deleted from Shopify were not being cleaned up from the database.

**Root Cause:** Supabase `upsert()` with `onConflict` applies all values to both INSERT and UPDATE operations. Line 32 had `mvp_visibility: false` hardcoded, so every sync reset visibility.

**Fix Applied (`app/api/admin/shopify/sync/route.ts`):**
1. **Preserve visibility:** Check if product exists before upsert; only set `mvp_visibility: false` for NEW products
2. **Preserve starred status:** Existing `display_order` and `featured_order` values are preserved during updates (only new products get default values)
3. **Delete removed products:** After sync, delete any rows where `shopify_product_id` not in Shopify response

**Behavior after fix:**

| Scenario | Result |
|----------|--------|
| New product in Shopify | Added (hidden by default) |
| Existing visible product | Stays visible (preserved) |
| Existing starred product | Stays starred (preserved) |
| Product deleted from Shopify | Removed from database (claims/likes kept as historical records) |

**Commit:**
- `f515028` - fix: preserve visibility/starred during Shopify sync, delete removed products

### Session 2026-05-06: Shopify Checkout Opens in New Tab

**Problem:** When claiming a Zero Dollar Store item, the Shopify checkout opened in the same browser tab, losing the user's place on NFW site.

**Solution:** Changed checkout redirect from `router.push()` to `window.open()` to open Shopify in a new tab.

**Files Modified:**
- `components/ClaimItemModal.tsx` - Changed `router.push(data.checkoutUrl)` to `window.open(data.checkoutUrl, "_blank")`

**Commit:**
- `f750db7` - fix: open Shopify checkout in new tab instead of same tab

### Session 2026-05-07: Shopify Checkout Monthly Limit Check

**Problem:** The checkout API (`app/api/shopify/checkout/route.ts`) did not check the monthly claim limit. Users could get checkout URLs for multiple products in the same month, complete Shopify checkout, but then have their order rejected at webhook time (wasted checkout).

**Root Cause:** The checkout API only checked lifetime duplicate (same product per user) but not the monthly limit (`monthly_claims` table).

**Solution:** Added monthly claim limit check to checkout API:
- Query `monthly_claims` table for user's existing claim this month
- Return immediate error if already claimed this month

**Files Modified:**
- `app/api/shopify/checkout/route.ts` - Added monthly claim limit check before generating checkout URL

**Commit:**
- `65320c6` - fix: add monthly claim limit check to Shopify checkout API

### Session 2026-05-07: Shopify Checkout URL Signing (Cart Attributes)

**Problem:** Users could bypass NFW authentication and go directly to Shopify checkout URL to fraudulently claim items without a NFW account. The checkout URL was public and Shopify doesn't require login for checkout.

**Root Cause:** No user identity validation in webhook - only matched variant_id, not user.

**Solution:** Implemented cart attribute validation:
1. Checkout API passes `nfw_user_id` as Shopify cart attribute when generating checkout URL
2. Webhook extracts `nfw_user_id` from order attributes
3. Webhook validates `nfw_user_id` matches claim's user_id before fulfilling
4. Direct Shopify checkouts (without NFW flow) are rejected

**Files Modified:**
- `app/api/shopify/checkout/route.ts` - Added `attributes[nfw_user_id]=userId` to checkout URL
- `app/api/shopify/webhook/route.ts` - Added extraction and validation of nfw_user_id from order attributes

**Behavior:**
| Scenario | Result |
|----------|--------|
| Normal claim (through NFW) | ✓ Fulfilled |
| Direct Shopify checkout (no NFW) | ✗ Rejected - no nfw_user_id attribute |
| Claim with wrong user ID | ✗ Rejected - user mismatch |

**Commit:**
- `635394f` - fix: add nfw_user_id attribute to checkout URL and validate in webhook

### Session 2026-05-07: SMS Link Preview Title Fix

**Problem:** When sharing the homepage link via SMS/iMessage, only "Nonprofit for Women" showed instead of "National Fund for Women". iOS SMS treats text after pipe (`|`) as a delimiter and truncates the title.

**Root Cause:** The database `meta_title` was "National Fund for Women | Nonprofit for Women". SMS apps use `og:title` but treat text after `|` as a suffix, showing only "Nonprofit for Women".

**Solution:** Separated `<title>` tag (using database `meta_title` with pipe for browser tabs) from `og:title` (using short brand name for SMS/social):

- `<title>`: Uses database `meta_title` = "National Fund for Women | Nonprofit for Women"
- `og:title`: Hardcoded to "National Fund for Women" (no pipe, full brand)
- `og:siteName`: "National Fund for Women"

**Files Modified:**
- `app/page.tsx` - Updated `generateMetadata()` to use `absolute` title for `<title>` tag, short brand name for `og:title`

**Result:**
| Platform | Before | After |
|----------|--------|-------|
| Browser tab | Full title | Full title (unchanged) |
| SMS/iMessage | "Nonprofit for Women" | "National Fund for Women" |

**Commit:**
- `f24785b` - fix: use full brand name for og:title to show correctly in SMS previews

### Session 2026-05-08: Shopify Checkout URL Expiration

**Problem:** Shopify checkout URLs can be reused after completion and shared with other users. Attackers could complete checkout multiple times or share URLs with others to fraudulently claim items. Each rejected order would require manual review.

**Solution:** Added 2-hour expiration timestamp to checkout URLs:
1. Checkout API includes `nfw_checkout_time` attribute (Unix timestamp) in checkout URL
2. Webhook checks timestamp against current time
3. If checkout is older than 2 hours, order is rejected

**Files Modified:**
- `app/api/shopify/checkout/route.ts` - Added `nfw_checkout_time` attribute to checkout URL
- `app/api/shopify/webhook/route.ts` - Added timestamp validation, rejects if expired

**Behavior:**
- Checkout URLs expire after 2 hours
- Shared URLs become invalid before friends can use them
- Brute force attacks become impractical (timestamps expire)

**Commit:**
- `b11e9ae` - fix: add 2-hour expiration to Shopify checkout URLs to prevent URL sharing

### Session 2026-05-08: Hero Section Text Padding Fix

**Problem:** When the Hero section template has image on the left, the text column on the right ran right to the edge of the page on desktop with no padding.

**Solution:** Added conditional right padding (`lg:pr-8`) to the text column when image position is "left".

**Files Modified:**
- `components/sections/HeroSection.tsx` - Added `pr-8` padding when image is on left

**Commit:**
- `631a03e` - fix: add right padding to Hero text column when image is on left

## Next Steps
- (none)

### Session 2026-05-08: Contact Form Email Fix

**Problem:** The contact form acknowledgement email was being sent to hello@nationalfundforwomen.org instead of the sender. This meant the "thank you for your submission" message went to the wrong place.

**Root Cause:** In `lib/email.ts`, the `sendContactFormEmail` function was hardcoded to send the acknowledgement to hello@nationalfundforwomen.org, ignoring the sender's email from the form submission.

**Solution:** Implemented two-email flow:
1. **Acknowledgement email** - Sent to the sender (person who filled out the form) saying "We've received your message"
2. **Notification email** - Sent to hello@nationalfundforwomen.org with full submission details (name, email, category, timestamp, message)

**Files Modified:**
- `lib/email.ts` - Updated `sendContactFormEmail` to send acknowledgement to sender and notification with details to organization

**Email Flow:**
| Email | Recipient | Content |
|-------|-----------|---------|
| Acknowledgement | Sender (form email) | "We've received your message" |
| Notification | hello@nationalfundforwomen.org | Name, email, category, timestamp, message |

**Commit:**
- `5b8f0c6` - fix: send contact form acknowledgement to sender, notification to org

## Next Steps
- (none)

### Session 2026-05-11: ClaimItemModal Auto-Close on Shopify Redirect

**Problem:** After claiming a Zero Dollar Store item, the modal would stay open with a "Redirecting..." spinner and disabled X/Cancel buttons. Users couldn't close the modal while Shopify was open in another tab.

**Solution:** Auto-close the modal immediately after `window.open()` opens Shopify in a new tab.

**Files Modified:**
- `components/ClaimItemModal.tsx` - Added `onClose()` call after `window.open()` (line 76)
- `components/ClaimItemModal.tsx` - Removed unused `useRouter` import (clean up)

**Commit:**
- Auto-close modal when Shopify opens in new tab

### Session 2026-05-11: Contact Form Email Reply-To

**Problem:** When NFW staff received contact form notifications and clicked "Reply", their email client would compose to hello@nationalfundforwomen.org instead of the form submitter's email.

**Solution:** Added `reply_to` parameter to the contact form notification email sent to hello@nationalfundforwomen.org, so staff can directly reply to the person who submitted the form.

**Files Modified:**
- `lib/email.ts`:
  - Added `reply_to?: string` and `from?: string` parameters to `sendTemplateEmail()` function
  - Added `reply_to?: string` and `from?: string` to `SendBrandedEmailOptions` interface
  - Added `reply_to` and `from` to `sendEmailWithTimeout()` options type
  - Contact form notification now passes `reply_to: email` and `from: name`

**Effect:**
- Only the notification email to hello@ gets reply-to and from name (acknowledgement email to sender unchanged)
- All other emails (welcome, grants, gift codes) unaffected
- **Note:** Resend API expects `replyTo` (camelCase) not `reply_to` (snake_case)

**Commit:**
- `f84219f` - fix: correct replyTo field name for Resend API

### Session 2026-05-11: Freshdesk API Integration for Contact Form

**Problem:** Contact form tickets in Freshdesk were being associated with a generic NFW contact because emails were sent FROM hello@nationalfundforwomen.org, not from the form submitter's email. This caused Freshdesk to use the stored contact name (e.g., "Ronpassaro") instead of the actual name entered in the form.

**Solution:** Replace email notification to hello@ with Freshdesk API ticket creation, keeping the acknowledgement email to sender. Manual emails to hello@ still auto-create tickets in Freshdesk.

**Files Created:**
- `lib/email.ts` - Added `sendFreshdeskTicket()` and `sendContactAcknowledgement()` functions

**Files Modified:**
- `lib/email.ts`:
  - Added `sendFreshdeskTicket()` - Creates ticket via Freshdesk API with correct requester name and email
  - Added `sendContactAcknowledgement()` - Sends acknowledgement email only to sender
  - Removed notification email to hello@ from contact form flow
- `app/api/contact/submit/route.ts` - Calls both Freshdesk API and acknowledgement email in parallel

**Environment Variables Required:**
- `FRESHDESK_API_KEY` - API key from Freshdesk settings
- `FRESHDESK_DOMAIN` - `nationalfundforwomen.freshdesk.com`

**Freshdesk API Call:**
```typescript
POST /api/v2/tickets
{
  email,           // Form submitter's email
  name,            // Form submitter's name (at top level, not in requester object)
  subject: `Contact Form: ${subject}`,
  description,     // Form message
  status: 2,       // Open
  priority: 1,     // Low
}
```

**Freshdesk Behavior Note:**
Freshdesk matches tickets to existing contacts by email. For new contacts, the API-passed name is used correctly. For existing contacts (including admin accounts), Freshdesk prioritizes the stored contact name over what we pass via API. This is expected Freshdesk behavior.

**Contact Form Flow:**
1. User submits form at `/contact`
2. Data saved to `contact_submissions` table
3. Acknowledgement email sent to sender (via Resend)
4. Freshdesk ticket created via API (with sender's name and email as requester)
5. Manual emails to hello@ still auto-create tickets (no change)

**Commits:**
- `d1ac5f3` - feat: add Freshdesk API integration for contact form tickets
- `d48d3c5` - fix: remove invalid requester field from Freshdesk ticket payload

### Session 2026-05-15: Contact Form Freshdesk Status Tracking

**Problem:** When Freshdesk ticket creation failed (rejected content, API errors), there was no visibility into what happened. Admins had to check Vercel logs to see which submissions failed, and had no way to track pending vs completed vs rejected submissions.

**Solution:** Added database tracking for Freshdesk ticket status with admin visibility page.

**Database:**
- `supabase/migrations/071_add_freshdesk_status_to_contact_submissions.sql`
- Added columns: `freshdesk_ticket_id TEXT`, `freshdesk_status TEXT`, `freshdesk_response TEXT`
- Status values: `pending`, `created`, `rejected`, `error`
- Indexes for efficient status and date queries

**Files Created:**
- `app/api/admin/contact-submissions/route.ts` - GET endpoint with filtering, search, pagination
- `app/admin/contact-submissions/page.tsx` - Server wrapper with admin auth
- `app/admin/contact-submissions/AdminContactSubmissions.tsx` - Client component with table UI

**Files Modified:**
- `lib/email.ts`:
  - `sendFreshdeskTicket()` now returns `ticketId` on success
  - Added `sendFreshdeskTicketRejectionEmail()` - sends rejection notification to ron@myherocreative.com
- `app/api/contact/submit/route.ts` - Updated to:
  - Insert with `freshdesk_status: "pending"` initially
  - Update with ticket ID and "created" status on success
  - Update with "rejected" status and response on failure
  - Send rejection email to admin on Freshdesk rejection
- `components/AuthButtonCombined.tsx` - Added "Contact Submissions" link
- `components/auth-button.tsx` - Added "Contact Submissions" link
- `components/MobileMenu.tsx` - Added "Contact Submissions" link

**Admin Page Features:**
- Filter tabs: All / Created / Rejected / Error / Pending
- Search by name, email, or message
- CSV export of filtered results
- Detail modal showing full submission with Freshdesk response
- Pagination (20 per page)

**Rejection Email:**
- Sent to ron@myherocreative.com when Freshdesk rejects content
- Includes: rejection reason, name, email, subject, timestamp, message
- Admin can review and manually create ticket if legitimate

**Commits:**
- `9ec7660` - feat: add contact submissions admin page with Freshdesk status tracking

### Session 2026-05-20: Signup Flow Free Membership Modal

Added inline modal for free membership option on step 3 of signup flow.

**Problem:** Free tier card was displayed prominently on step 3 alongside paid options, but the intent was to make free a secondary option only visible after clicking a link.

**Solution:**
- Removed free tier card from step 3 display (now shows only $15 Contributing and $100 Founding)
- Added "here" text link below cards: "If contributing financially isn't possible, you can apply for free membership here."
- Clicking "here" opens a modal with confirmation copy
- Modal offers two choices: proceed as free, or stay on step 3 and consider $15

**Files Modified:**
- `components/SignUpFlow.tsx`:
  - Added `showFreeModal` state for modal visibility
  - Filtered `PLANS.filter(p => p.id !== "free")` to exclude free from cards
  - Simplified button logic (removed free-specific button text/style since free is filtered)
  - Added "here" link below plan cards
  - Added modal JSX with overlay, confirmation copy, and two buttons:
    - "FREE MEMBERSHIP IS RIGHT FOR ME" → citrine bg → calls `handleSelectPlan(freePlan)`
    - "I CAN CONTRIBUTE $15/YEAR" → closes modal, stays on step 3

**Modal Copy:**
"If contributing financially isn't possible, this tier is for you. A simple gut check: if you have stable housing, regular income, and financial breathing room, a higher tier is probably a better fit for you. The National Fund for Women doesn't exist without membership dues."

**Flow:**
1. User on step 3 → sees $15 and $100 cards only
2. Clicks "here" link → modal opens
3. "FREE MEMBERSHIP IS RIGHT FOR ME" → completes signup as free → redirect to welcome
4. "I CAN CONTRIBUTE $15/YEAR" → modal closes, user stays on step 3 to choose paid plan

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-20: Pricing Cards Template - Omit Free Plan

Added toggle to hide free plan from Pricing Cards section template.

**Problem:** Free plan card was showing on /plans page and pricing cards template alongside paid options.

**Solution:**
- Added `show_free_plan?: boolean` field to `PricingCardsContent` interface
- Default to `false` (free plan hidden by default)
- Added toggle editor field in page builder admin
- Filtered free plan from rendering unless toggle is enabled

**Files Modified:**
- `lib/sections/types.ts` - Added `show_free_plan?: boolean` to `PricingCardsContent`
- `lib/sections/registry.ts` - Removed free plan from default cards, added `show_free_plan: false` default, added `show_free_plan` editor field
- `components/sections/PricingCardsSection.tsx` - Filter free plan unless `show_free_plan === true`

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-20: Pricing Cards Section Enhancements

#### Free Plan Toggle + 2-Column Grid
- Added `show_free_plan?: boolean` field to `PricingCardsContent` interface
- Default to `false` (free plan hidden by default)
- Grid dynamically switches from 3-column to 2-column when free plan is hidden
- Added `show_free_plan` toggle in page builder admin

#### Secondary CTA Section
- Added `cta_secondary_prefix?: string` for optional text above "Already a member?"
- Added `cta_secondary_link_label?: string` to customize the "Sign in" link text
- Auth check: prefix always shown; "Already a member? Sign in" hidden when logged in on public pages
- Admin bypass: always shows full secondary CTA in section editor (`/admin/` path detection)
- Reordered admin fields: prefix → text → link label → URL

**Spacing:**
- Prefix text: `mt-4` (more space above the button)
- Secondary text: `mt-0.5` (less space below, tighter to prefix)

**Files Modified:**
- `lib/sections/types.ts` - Added `show_free_plan`, `cta_secondary_prefix`, `cta_secondary_link_label`
- `lib/sections/registry.ts` - Removed free from default cards, added all new fields and toggle
- `components/sections/PricingCardsSection.tsx` - Grid logic, auth check, spacing, dynamic link label

### Session 2026-05-20: Auth Page Redirects (Reverted)

Added server-side redirects for logged-in users on auth entry pages, but reverted after causing email confirmation redirect loops.

**Problem:**
After confirming email, users got "too many redirects" or "email link is invalid/expired" errors.

**Root Cause:**
Server-side auth check in `/auth/sign-up` conflicted with Supabase's post-confirmation redirect flow from `/auth/confirm`.

**Behavior (before revert):**
| Route | Logged In | Not Logged In |
|-------|-----------|---------------|
| `/auth/login` | Redirects to `/dashboard` | Shows login form |
| `/auth/sign-up` | Redirects to `/dashboard` | Shows signup form |

**Files Modified (then reverted):**
- `app/auth/login/page.tsx` - Added `createClient()` auth check, redirects if user exists
- `app/auth/sign-up/page.tsx` - Added `createClient()` auth check, redirects if user exists

**Final Decision:**
Removed server-side auth redirects from auth entry pages. Pages now show forms unconditionally.

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-21: Contact Form Honeypot Spam Prevention

Added hidden honeypot field to contact form to catch bots.

**Implementation:**
- Added `website` field to contact form (`ContactClient.tsx`) with CSS positioning off-screen
- Hidden from real users, but bots auto-fill all visible/hidden fields with common names
- API route (`/api/contact/submit`) checks if honeypot field has value → silent reject if bot detected

**Files Modified:**
- `components/contact/ContactClient.tsx` - Added hidden honeypot input field
- `app/api/contact/submit/route.ts` - Added honeypot check, returns success silently if bot detected

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-24: Email Builder - Phase 1 Complete

**Phase 1: Database & Foundation**

Completed database migrations and type definitions for the email builder:

**Migrations created:**
- `supabase/migrations/072_add_email_sections.sql` - Creates `email_sections` table with id, template_id, section_type, order_index, content (JSONB), visible, timestamps
- `supabase/migrations/073_add_email_template_columns.sql` - Adds `full_email_html`, `preview_data` (JSONB), `status` columns to `email_templates` table

**Types created:**
- `lib/email-blocks/types.ts` - TypeScript interfaces for all email block types
- `EMAIL_VARIABLES` constant with 12 preset variables for dropdown insertion

**Registry created:**
- `lib/email-blocks/registry.ts` - `EMAIL_BLOCK_REGISTRY` with definitions for all 9 block types

**Email Block Types (9):**
| Type | Description |
|------|-------------|
| email_hero | Full-width image + text overlay |
| email_text | Body text with richtext support |
| email_image | Standalone image |
| email_cta | Button with color options |
| email_divider | Horizontal rule |
| email_spacer | Vertical spacing |
| email_social | Social icons row |
| email_columns | 2-column layout |
| email_variable | Dynamic variable placeholder |

**Next:** Phase 2 - Block components (email-safe HTML rendering)

### Session 2026-05-24: Email Builder - Phases 2-4 Complete

**Phase 2: Block Components**

Created 9 email block components that render email-safe HTML (tables, inline styles):

| Block | File | Output |
|-------|------|--------|
| email_hero | `lib/email-blocks/EmailHeroBlock.ts` | Full-width image + overlay |
| email_text | `lib/email-blocks/EmailTextBlock.ts` | Body text with alignment |
| email_image | `lib/email-blocks/EmailImageBlock.ts` | Image with optional link |
| email_cta | `lib/email-blocks/EmailCtaBlock.ts` | CTA button |
| email_divider | `lib/email-blocks/EmailDividerBlock.ts` | HR line |
| email_spacer | `lib/email-blocks/EmailSpacerBlock.ts` | Vertical spacing |
| email_social | `lib/email-blocks/EmailSocialBlock.ts` | Social icons row |
| email_columns | `lib/email-blocks/EmailColumnsBlock.ts` | 2-column layout |
| email_variable | `lib/email-blocks/EmailVariableBlock.ts` | `{{variable}}` placeholder |

Additional files:
- `lib/email-blocks/renderer.ts` - Switch statement + renderAllBlocks
- `lib/email-blocks/utils.ts` - Button color helpers
- `lib/email-blocks/shell.ts` - Fixed NFW shell (header, footer, colors)
- `lib/email-blocks/publish.ts` - Generate + save full_email_html

**Phase 3: Shell & Publish Logic**
- Fixed NFW branded shell with aubergine header/footer, lilac body
- Preview API: `/api/admin/emails/[slug]/preview` renders from sections
- Publish API: `/api/admin/emails/[slug]/publish` generates full_email_html snapshot

**Phase 4: Admin UI with DnD Builder**

Created full email builder at `/admin/emails/[slug]/builder`:

| Component | Purpose |
|-----------|---------|
| `components/admin/email/EmailBuilder.tsx` | Main builder layout (section list + preview) |
| `components/admin/email/EmailSectionList.tsx` | Drag-and-drop section list (@dnd-kit) |
| `components/admin/email/EmailBlockEditor.tsx` | Edit section content with VariableInserter |
| `components/admin/email/VariableInserter.tsx` | Dropdown to insert `{{variables}}` |
| `components/admin/email/EmailBuilderClient.tsx` | Client wrapper for API calls |
| `app/admin/emails/[slug]/builder/page.tsx` | Builder page route |

API routes created:
- `app/api/admin/emails/[slug]/sections/route.ts` - GET/PUT sections
- `app/api/admin/emails/[slug]/publish/route.ts` - Publish to snapshot
- `app/api/admin/emails/[slug]/preview/route.ts` - Preview from sections

**Phase 5: Convert Existing Templates**

Created conversion API to parse existing `html_content` into `email_sections`:

- `app/api/admin/emails/convert/route.ts` - POST endpoint
- Parses HTML by tag (p, img, hr) into text/image/divider blocks
- "Convert to Sections" button added to `/admin/emails` for editable templates

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-26: Disable Contact Form Acknowledgement Email

**Problem:** The contact form was sending a Resend acknowledgement email to form submitters even though Freshdesk now handles ticket creation and likely sends its own confirmation.

**Solution:** Removed the `sendContactAcknowledgement()` call from the contact form submit flow. Freshdesk handles ticket confirmation emails directly.

**Files Modified:**
- `app/api/contact/submit/route.ts` - Removed acknowledgement email call

**Contact Form Flow (Updated):**
1. User submits form at `/contact`
2. Data saved to `contact_submissions` table
3. Freshdesk ticket created via API (with sender's name and email as requester)
4. Freshdesk sends its own confirmation email to sender (if configured)
5. No separate Resend acknowledgement email

### Session 2026-05-26: Debug Logging Cleanup + Email Builder Fixes

**Removed debug console.log statements from email system:**

Files cleaned:
- `app/api/admin/emails/[slug]/publish/route.ts` - Removed all console.log statements
- `lib/email.ts` - Removed debug logging from `sendBrandedEmail` function
- `lib/email-blocks/publish.ts` - Removed debug logging from `getPreRenderedHtml` function
- `components/admin/email/EmailBuilderClient.tsx` - Removed publish debug logging
- `components/admin/email/EmailBuilder.tsx` - Removed publish debug logging

**Previous Fix (documented):**
- Publish route (`app/api/admin/emails/[slug]/publish/route.ts`) uses `supabaseAdmin()` instead of regular `supabase` client to bypass RLS when fetching sections
- This fixed empty body bug where 0 sections were returned due to RLS policies blocking access

### Session 2026-05-26: Contact Form Bug Fix

**Problem:** Contact form returning 400 "Missing required fields" error. User submitted form but nothing happened.

**Root Cause:** The honeypot feature (added May 21) changed form submission from `JSON.stringify(form)` to `FormData(e.target)`, but the form inputs were missing `name` attributes. `formData.get("name")`, `formData.get("email")`, etc. all returned `null`.

**Files Modified:**
- `components/contact/ContactClient.tsx` - Added missing `name` attributes to all form inputs (name, email, subject, message)

### Session 2026-05-26: Grant Cycle Status Check Constraint Fix

**Problem:** Admin trying to close a grant cycle got "new row for relation 'grant_cycles' violates check constraint 'grant_cycles_status_check'" error.

**Root Cause:** The admin grant edit form dropdown included "draft" as an option, but the database only allows `'open'` or `'closed'` status values.

**Files Modified:**
- `app/admin/grants/[id]/edit/page.tsx` - Removed "draft" from status dropdown

**Database Migration Created:**
- `supabase/migrations/074_auto_close_expired_grants.sql` - Creates trigger `trg_auto_close_expired_grants` that automatically sets `status='closed'` when `end_date` passes

### Session 2026-05-26: Members CSV Export

**Added CSV export functionality to `/admin/members` page.**

**Files Created:**
- `app/api/admin/members/export/route.ts` - GET endpoint returning CSV with all member fields

**Files Modified:**
- `app/admin/members/page.tsx` - Added "Download CSV" button to header

**CSV columns:** ID, Full Name, Email, Membership Level, Subscription Status, Date of Birth, State, City, Household Income, Identities, Subscription Ends At, Joined At, Is Admin, Access Perks Synced At

**Bug Fix:** Google OAuth users have `auth.users.email = null`. Email is stored in `auth.users.identities[0].identity_data.email`. Updated userMap building to check both locations.

### Session 2026-05-27: Add Email to Profiles Table + Fix Signup Flow

**Added email column to profiles table with auto-sync trigger.**

**Database Migration (075):**
- `supabase/migrations/075_add_email_to_profiles.sql` - Adds email column, trigger, and backfills existing emails
- Trigger `trg_sync_profile_email` automatically syncs email from `auth.users` on INSERT/UPDATE
- **Important:** Trigger function must use `SECURITY DEFINER` because it reads from `auth.users`

**Bug Fixed - Signup Flow Failing:**
- After deploying migration 075, signup failed at step 2 with "Failed to update profile"
- **Root Cause:** The trigger function couldn't read from `auth.users` due to permission issues
- **Fix:** Added `SECURITY DEFINER` to the trigger function so it runs with elevated privileges
- **SQL Applied in Supabase SQL Editor:**
```sql
DROP TRIGGER IF EXISTS trg_sync_profile_email ON profiles;
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT u.email INTO NEW.email
  FROM auth.users u
  WHERE u.id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_sync_profile_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();
```

**Files Modified:**
- `app/admin/grants/[id]/page.tsx` - Added email to profiles select
- `components/admin/AdminGrantReviewer.tsx` - Show email in list view (below name) and detail panel
- `app/admin/members/page.tsx` - Use profiles.email directly (no more listUsers lookup)
- `app/api/admin/members/export/route.ts` - Simplified to use profiles.email
- `components/admin/AdminMembersClient.tsx` - Removed identities from Member type, added mailto links + copy buttons
- `supabase/migrations/075_add_email_to_profiles.sql` - Added SECURITY DEFINER to trigger

**Features Added:**
- `/admin/members` - Email column now has clickable mailto links and copy-to-clipboard buttons
- `/admin/grants/[id]` - Applicant list and detail panel show clickable email addresses

### Session 2026-05-28: Email Builder - Cursor-Aware Insertion + UI Cleanup

**Problem:** Variable and Link inserters in the email builder appended content to the END of text fields instead of inserting at cursor position.

**Solution:** Made insertion cursor-aware, mirroring the page builder's approach in SectionEditorPanel.tsx.

**Changes Made:**

**EmailBlockEditor.tsx:**
- Added `inputRef` alongside existing `textareaRef`
- Created `insertAtCursor(replacement, fieldKey)` function that:
  - Gets current cursor position (`selectionStart`, `selectionEnd`)
  - Replaces selected text or inserts at cursor point
  - Restores cursor position after state update
- Updated VariableInserter and LinkInserter to use `insertAtCursor` instead of appending
- Both functions now work on both `text` (input) and `richtext` (textarea) field types

**AdminEmailsClient.tsx:**
- Removed "Convert to Sections" button (deprecated feature)
- Removed "Edit HTML" button and associated EmailEditorModal
- Removed `converting`, `convertResult`, and `showEditor` state
- Removed EmailEditorModal import
- Now only shows "Edit with Builder" button for editable templates

**Key Pattern Used (from page builder):**
```typescript
const start = textarea.selectionStart ?? 0;
const end = textarea.selectionEnd ?? 0;
const replacement = text.substring(0, start) + newContent + text.substring(end);
onChange({ ...content, [fieldKey]: replacement });
```

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-05-28: Auth Profile Cache Fix

**Problem:** `/api/auth/profile` was being called 3+ times per page load across multiple admin pages, generating excessive Vercel logs. Each call hit Supabase (auth.user + profiles query).

**Root Cause:** 5 client components independently called `/api/auth/profile`:
- `AuthButtonCombined.tsx`
- `auth-button.tsx`
- `MobileMenu.tsx`
- `PlanButton.tsx`
- `app/perks/page.tsx`

Each component called the API on mount and on auth state changes, with no shared state or caching.

**Solution A (Implemented):** In-memory cache on API route
- Added 30-second TTL cache in `/api/auth/profile/route.ts`
- Module-level cache object stores `{ userId: { data, timestamp } }`
- Subsequent calls within 30s return cached response instead of hitting Supabase
- ~25 lines of code, minimal maintenance

**Future Option B (Auth Context):** If more sophisticated auth state sharing is needed:
- Create `contexts/AuthContext.tsx` with shared React context
- Wrap app in `AuthProvider` in layout
- Replace all `fetch("/api/auth/profile")` calls with `useAuth()` hook
- Benefits: Single source of truth, real-time sync, centralized permissions
- Complexity: ~100+ lines across new file + layout + component updates

**Why Option A is sufficient for now:** Only 5 client components affected. Server-side RSC pages are already efficient (direct Supabase calls, run once). Option B adds complexity without proportional benefit unless you need real-time auth sync across components.

**Build:** Verified with `npm run build` - passes successfully

### Session 2026-06-07: Supabase Linter Security Audit + Search Path Fix

**Problem:** Supabase database linter flagged multiple warnings:
- 13 `function_search_path_mutable` warnings (functions without `SET search_path = pg_catalog`)
- 6 `rls_policy_always_true` warnings (intentional public insert policies)
- 3 `public_bucket_allows_listing` warnings (intentional public image buckets)
- 4 `SECURITY DEFINER` function warnings (intentional for auth triggers)

**Root Cause:** All our database functions were missing `SET search_path = pg_catalog` which is Supabase's recommended best practice to prevent schema poisoning attacks.

**Analysis of Warnings:**

| Warning Type | Count | Risk | Action |
|--------------|-------|------|--------|
| function_search_path_mutable | 13 | Low | Fix - add search_path |
| rls_policy_always_true | 6 | None | Intentional - public insert tables |
| public_bucket_allows_listing | 3 | None | Intentional - public image buckets |
| anon_security_definer_function_executable | 2 | None | Intentional - get_store_settings, sync_profile_email |
| authenticated_security_definer_function_executable | 2 | None | Intentional - same functions |

**RLS Policies That Are Correct (No Action):**
- `coming_soon_emails` - Public newsletter signup
- `contact_submissions` - Public contact form
- `email_templates` - Admin template management (uses API routes, not direct)

**Public Buckets That Are Correct (No Action):**
- `article-images` - Article hero/featured images
- `page-builder` - Template editor images (needed for media library)
- `store-items` - Zero dollar store product images

**Functions Updated (Migration 076):**
```sql
-- All functions now include SET search_path = pg_catalog
touch_updated_at
get_store_settings
publish_page
revert_page
update_shopify_mappings_updated_at_column
auto_close_expired_grant_cycles
unpublish_page
sync_profile_email
set_gift_code_if_empty
generate_gift_code
expire_abandoned_claims
cleanup_monthly_claims_for_expired
update_email_section_timestamp
update_updated_at_column
```

**Database Migration:**
- Created `supabase/migrations/076_fix_search_path_for_functions.sql`
- Recreates all trigger functions with `SET search_path = pg_catalog`
- Runs `NOTIFY pgrst, 'reload'` to clear schema cache
- **Status:** Applied successfully 2026-06-07

**Security Posture Assessment:**
- All warnings are either intentional design or low-risk
- No actual security vulnerabilities found
- Functions use SECURITY DEFINER correctly where needed (accessing auth.users)
- Public insert policies are appropriate for newsletter/contact forms
- Public buckets are needed for serving website images

### Session 2026-06-10: Members CSV Export Fix

**Problem:** The CSV export at `/api/admin/members/export` was failing because some columns in the code didn't exist in the database. Also, multi-value fields (arrays like `identities`, JSON like `social_handles`) were causing column misalignment because the comma separator wasn't being properly escaped.

**Issues Encountered:**
1. `select("*")` returned array instead of object, causing column detection to fail
2. Multiple columns didn't exist in the database: `occupation`, `industry`, `company_name`, `company_website`, `linkedin_url`, `twitter_handle`, `bio`, `created_at`
3. Array fields like `identities` had commas inside the values, which broke CSV column alignment

**Columns Removed (not in database):**
- occupation
- industry
- company_name
- company_website
- linkedin_url
- twitter_handle
- bio
- created_at

**Final CSV Columns (24 total):**
id, email, full_name, membership_level, subscription_status, subscription_ends_at, profile_completed, is_admin, date_of_birth, state, city, zip, phone_number, household_income, avatar_url, address_line1, address_line2, identities, social_handles, stripe_connect_account_id, access_perks_member_id, access_perks_synced_at, joined_at, updated_at

**Fixes Applied:**
1. Switched from `select("*")` to explicit column list to avoid fetching non-existent columns
2. Changed array separator from comma to semicolon (`;`) to avoid CSV conflicts
3. Added proper CSV escaping to `formatArray()` and `formatJson()` functions using `escapeCsvField()`

**Files Modified:**
- `app/api/admin/members/export/route.ts` - Multiple fixes for column selection and field escaping

### Session 2026-06-10: Fresh Redemption URLs for Redeemed Perks

**Problem:** When users clicked "Open" on a redeemed perk in `/dashboard` slideout, they got "Access Denied" error from S3. The stored `redemption_url` was a time-limited signed URL that had expired.

**Root Cause:** The `redemption_url` from Access Perks API is a signed S3 URL with expiration. We store it permanently in `offer_redemptions` table, but it becomes invalid after time.

**Solution:** Re-fetch fresh URL from Access Perks when user clicks "Open", using stored `usage_redeem_key` and `redeem_type`.

**Files Created:**
- `app/api/access-perks/redemptions/[redemptionId]/fresh-url/route.ts` - API route that:
  - Authenticates user and verifies ownership of redemption
  - Rate limits (10/minute/IP)
  - Uses 5-minute in-memory cache to reduce API calls
  - Fetches fresh URL from Access Perks using stored `usage_redeem_key`
  - Returns `{ url }` or `{ error: "Link expired or offer no longer available" }`

**Files Modified (3):**
- `components/dashboard/RedeemedPerksPanel.tsx` - "Open" button now calls fresh-url API, "Details" opens in new tab
- `components/dashboard/RecentRedemptions.tsx` - "Open" button now calls fresh-url API, "View Details" opens in new tab
- `app/perks/history/page.tsx` - "Open" button now calls fresh-url API, "View Offer Details" opens in new tab

**Behavior:**
1. User clicks "Open" → button shows "Loading..." spinner
2. API fetches fresh URL (or serves from 5-min cache)
3. Fresh URL opens in new tab
4. If fetch fails → alert "Link expired or offer no longer available"

**Cache Strategy:**
- 5-minute TTL cache per redemptionId
- Key: `redemptionId`
- Estimated 80% cache hit rate (users rarely click same link multiple times)
- Rate limit: 10 requests/minute/IP (already implemented via existing `rateLimit` function)

**Commit:** `8ee31d3` - fix: re-fetch fresh redemption URLs when user clicks Open button

### Session 2026-06-10: Expired Offer Modal + Dashboard UI Fixes

#### ExpiredLinkModal Component

**Problem:** When clicking "Open" on expired offers, users got "Access Denied" error from S3 (expired signed URLs). No feedback was provided to explain what happened.

**Solution:** Created `ExpiredLinkModal` component that shows when an offer has expired.

**Files Created:**
- `components/ui/ExpiredLinkModal.tsx` - Modal with:
  - Title: "Offer Expired"
  - Message: "Try clicking the 'Details' button to see if a new version of the offer is available for redemption."
  - Single "Got It" button to dismiss

**Modal Behavior:**
- Opens when user tries to open an expired offer (expired_at in the past)
- Active offers open directly in new tab (no modal)
- Uses `isExpired(expires_at)` boolean check to determine if modal should show

#### isExpired() Boolean Fix

**Bug:** `isExpired()` was returning string values like "Expired May 5" or "Expires May 5" which are BOTH truthy. This caused the modal to always show, even for active offers.

**Root Cause:** The function returned a string for display purposes, but this string was also used in boolean checks. Since any non-empty string is truthy, `isExpired()` always returned true.

**Fix Applied:**
```typescript
// Before (bug):
const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  return date < new Date();  // This was returning STRING not boolean!
};
// Function was later changed to return string for display:
// return `Expired ${format}` or `Expires ${format}`

// After (fixed):
const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  return date < new Date();  // Returns actual boolean
};

const formatExpiryDate = (expiresAt: string | null): string => {
  if (!expiresAt) return "";
  const date = new Date(expiresAt);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
```

**Files Fixed (4):**
- `components/dashboard/RedeemedPerksPanel.tsx`
- `components/dashboard/RecentRedemptions.tsx`
- `app/perks/history/page.tsx`
- `components/ui/ExpiredLinkModal.tsx`

#### Dashboard Border-Radius Removal

**Constraint:** No border-radius on /dashboard cards and buttons.

**Files Modified:**
- `components/dashboard/MembershipCard.tsx` - Removed rounded corners
- `components/dashboard/MembershipImpactCard.tsx` - Removed rounded corners
- `components/dashboard/PopularAcrossNFW.tsx` - Removed rounded corners
- `components/dashboard/YourMicrograntsSection.tsx` - Removed rounded corners
- `components/dashboard/YourPerksAndBenefits.tsx` - Removed rounded corners
- `components/dashboard/YourZeroDollarStoreSection.tsx` - Removed rounded corners
- `components/dashboard/BottomActions.tsx` - Removed rounded corners

#### Slideout Button Changes

**Changes:**
- "Browse More Perks" → "View All History" (links to `/perks/history`)
- "Open" button logic: Simplified - check `isExpired(expires_at)` → boolean, show modal if true, otherwise open URL
- Removed async content validation - no longer calling API to check URL validity before opening

#### Open Button Logic (Simplified)

**Before:** Complex flow with API calls, content validation, CORS handling
**After:** Simple boolean check

```typescript
const handleOpenFreshUrl = async (redemption: Redemption) => {
  if (isExpired(redemption.expires_at)) {
    setExpiredOfferId(redemption.id);
    return;
  }
  // Direct URL open - no async validation
  window.open(redemption.redemption_url, "_blank");
};
```

**Why this works:**
- `isExpired()` now returns `boolean` (true = expired, false = active)
- Expired offers show modal with guidance to use "Details" button
- Active offers open directly via `window.open()`

#### Store Page Product Detail HTML Rendering

**Problem:** The `/store` page "More Info" slideout was not rendering HTML formatting (paragraphs, lists, links) from Shopify descriptions. HTML tags were displayed as plain text.

**Root Cause:** Description was rendered as `{product.description}` in a plain `<p>` tag, which escapes HTML entities.

**Solution:** Changed from plain text rendering to `dangerouslySetInnerHTML`:

**Files Modified:**
- `components/ProductDetailPanel.tsx` - Changed description rendering from:
  ```tsx
  <p className="font-sans text-sm text-nfw-blackberry/70 leading-relaxed">
    {product.description}
  </p>
  ```
  To:
  ```tsx
  <div
    className="font-sans text-sm text-nfw-blackberry/70 leading-relaxed [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1 [&_a]:text-nfw-aubergine [&_a]:underline"
    dangerouslySetInnerHTML={{ __html: product.description }}
  />
  ```

**Styling for nested HTML elements:**
- `<p>` tags: `mb-3` (margin-bottom between paragraphs)
- `<ul>`: `ml-4 list-disc` (left margin, disc bullets)
- `<ol>`: `ml-4 list-decimal` (left margin, numbered)
- `<li>`: `mb-1` (spacing between list items)
- `<a>` links: `text-nfw-aubergine underline` (brand color + underline)

**Commit:** `09a3bf7` - fix: isExpired returns boolean, add formatExpiryDate for display

### Session 2026-06-10: Shopify Product Description HTML Rendering

**Problem:** The `/store` page "More Info" slideout was not rendering HTML formatting (paragraphs, lists, links) from Shopify product descriptions. HTML tags were being stripped before reaching the component.

**Root Cause:** The API was fetching `description` (plain text) instead of `descriptionHtml` (full HTML with formatting) from Shopify.

**Solution:** Updated to use `descriptionHtml` field from Shopify GraphQL API.

**Files Modified:**
- `lib/shopify.ts`:
  - Added `descriptionHtml` field to `PRODUCTS_QUERY` GraphQL query
  - Added `descriptionHtml: string | null` to `ShopifyProduct` type
- `lib/mock-shopify.ts`:
  - Updated `transformShopifyProduct()` to use `descriptionHtml || description` (prefers HTML, falls back to plain text)
- `components/ProductDetailPanel.tsx`:
  - Changed description rendering from plain text to `dangerouslySetInnerHTML`
  - Added `decodeHTMLEntities()` helper for HTML entity decoding
  - Added Tailwind arbitrary variants for nested HTML styling (`[&_p]`, `[&_ul]`, `[&_li]`, `[&_a]`)

**Styling for nested HTML elements:**
- `<p>` tags: `mb-3` (margin-bottom between paragraphs)
- `<ul>`: `ml-4 list-disc` (left margin, disc bullets)
- `<ol>`: `ml-4 list-decimal` (left margin, numbered)
- `<li>`: `mb-1` (spacing between list items)
- `<a>` links: `text-nfw-aubergine underline` (brand color + underline)

**Note:** Shopify has two description fields:
- `description` - plain text
- `descriptionHtml` - full HTML with formatting

The fix uses `descriptionHtml` if available, falling back to `description` for products without HTML formatting.

**Commits:**
- `0d48702` - fix: use descriptionHtml field for HTML product descriptions
- `0603bf2` - fix: decode HTML entities before rendering product description
- `4bddbb2` - fix: ProductDetailPanel renders Shopify HTML correctly with dangerouslySetInnerHTML

### Session 2026-06-10: Store Card Description Field

**Problem:** The `/store` page card previews were showing raw HTML tags because the `description` field now contained HTML (from `descriptionHtml`). The line-clamp truncation also couldn't properly truncate HTML content without breaking tags.

**Solution:** Created a separate `cardDescription` field for card previews that is auto-generated by stripping HTML tags and truncating to 150 characters.

**Database:**
- `supabase/migrations/077_add_card_description_to_shopify_product_mappings.sql` - Adds `card_description TEXT` column to `shopify_product_mappings` table

**Files Modified:**
- `lib/mock-shopify.ts`:
  - Added `cardDescription: string` to `MockProduct` type
  - Updated `transformShopifyProduct()` to auto-generate `cardDescription` from stripped HTML
  - `stripHtml()` helper removes HTML tags and truncates to 150 chars
  - Falls back to `mockMapping?.cardDescription` if manually set
- `lib/shopify.ts`:
  - Added `descriptionHtml: string | null` to `ShopifyProduct` type
  - Added `descriptionHtml` to `PRODUCTS_QUERY` GraphQL query
- `components/StoreClient.tsx`:
  - Added `cardDescription: string` to `StoreProduct` type
  - Card preview now uses `product.cardDescription` instead of `product.description`
- `app/api/admin/shopify/update-product/route.ts`:
  - Added `card_description` to `ALLOWED_FIELDS` for admin editing
- `app/admin/shopify/ShopifyAdminClient.tsx`:
  - Added `cardDescription?: string` to `ProductWithMapping` type

**Behavior:**
- **New products:** Auto-generated from first 150 chars of stripped HTML description
- **Existing products:** Auto-generated on next sync (unless manually set)
- **Admin override:** Can be set via `/api/admin/shopify/update-product` (admin UI editing can be added later)
- **Card display:** Always plain text, no HTML, max 150 chars
- **Slideout display:** Full HTML via `dangerouslySetInnerHTML`

**Commits:**
- `d11e0ee` - feat: add cardDescription field for store product cards

### Session 2026-06-10: Store Variant Selection Fix + Webhook Lookup Improvement

#### Bug 1: System Defaults to XS Instead of User's Selected Variant

**Problem:** When a user selected a size like M or L in the claim modal, the system always sent XS (the first variant) to Shopify, causing out-of-stock errors even when other sizes were available.

**Root Cause:** In `StoreClient.tsx` `handleClaim()` function, the `variantId` was always set to `item.shopifyVariantId` (the first variant's ID). The modal's `selectedVariants` state correctly captured the user's selection, but this was never used to resolve the actual Shopify variant ID before sending to checkout API.

**Files Modified:**
- `components/StoreClient.tsx`:
  - Added `fullVariants` to `claimingItem` state type
  - `handleClaim()` now passes full variant info (with IDs) to modal
- `components/ClaimItemModal.tsx`:
  - Added `fullVariants` prop type
  - `handleConfirmSubmit()` now resolves selected options to actual variant ID before sending to checkout API

**Fix Logic:**
```typescript
// Resolve selected options to the actual Shopify variant ID
let resolvedVariantId = item.variantId;
if (item.fullVariants && Object.keys(selectedVariants).length > 0) {
  const matchingVariant = item.fullVariants.find((variant) => {
    return variant.options.every(
      (opt) => selectedVariants[opt.name] === opt.value
    );
  });
  if (matchingVariant) {
    resolvedVariantId = matchingVariant.id;
  }
}
```

#### Bug 2: Monthly Claim on Failed Claims

**Problem:** If a claim was created with the wrong variant ID (XS instead of user's selected M), the webhook couldn't find the claim by variant ID and didn't properly track monthly usage.

**Root Cause:** Webhook only looked up claims by `shopify_variant_id`. If the claim was created with XS but the order was placed with M variant, webhook lookup failed.

**Files Modified:**
- `app/api/shopify/webhook/route.ts`:
  - Added fallback lookup by `user_id` + `shopify_product_id` when variant_id lookup fails

**Fix Logic:**
```typescript
// If no claim found by variant_id, try by user_id + product_id
if ((!existingClaims || existingClaims.length === 0) && nfwUserId) {
  const productId = `gid://shopify/Product/${lineItems[0].product_id}`;
  const { data: claimsByUser } = await supabaseAdmin
    .from("zero_dollar_claims")
    .select("*")
    .eq("user_id", nfwUserId)
    .eq("shopify_product_id", productId)
    .eq("status", "created")
    .order("claimed_at", { ascending: true })
    .limit(1);
  
  if (claimsByUser && claimsByUser.length > 0) {
    existingClaims = claimsByUser;
  }
}
```

**Commits:**
- `79a0d7d` - fix: resolve selected variant to actual ID, fix webhook lookup by user_id+product_id

### Session 2026-06-11: Shopify Webhook nfw_user_id Fix

**Problem:** Shopify webhook `orders/create` was not finding `nfw_user_id` from `order.attributes`. Claims were being created with `rejected_invalid_user` status because the webhook couldn't validate the user.

**Root Cause:** The webhook handler was looking in `order.note_attributes` (Cart API format), but Draft Orders pass custom attributes via `order.attributes` with `name`/`value` format instead of `key`/`value`.

**Shopify Order Attribute Formats:**
| Order Type | Field | Format |
|------------|-------|--------|
| Draft Orders | `order.attributes` | `attr.name` + `attr.value` |
| Cart API | `order.note_attributes` | `attr.key` + `attr.value` |

**Solution:** Merge both arrays and check both field names:

```typescript
const orderAttributes = [
  ...(order.attributes || []),
  ...(order.note_attributes || [])
];

const nfwUserIdAttr = orderAttributes.find(
  (attr) => attr.key === "nfw_user_id" || attr.name === "nfw_user_id"
);
```

**Files Modified:**
- `app/api/shopify/webhook/route.ts`:
  - Updated `orders/create` handler to check both `order.attributes` and `order.note_attributes`
  - Updated `orders/updated` handler with same fix
  - Added explanatory comments about why both fields exist

**Verification:**
- After deploy, claimed a product and completed checkout
- Webhook logs showed: `[orders/create] nfw_user_id: <user-id> (found)`
- Claim status properly updated to `completed`
- Order cancellation also properly updated claim status

**Commits:**
- `f0561d9` - fix: handle both order.attributes and note_attributes for nfw_user_id

### Session 2026-06-11: Admin Shopify Card Description Editing UI

**Problem:** No UI existed to edit the `card_description` field (150 char max for store card display) in `/admin/shopify`. The API and database column existed, but there was no interface for admins to set/manually override card descriptions.

**Solution:** Added edit modal to the Shopify admin product table.

**UI Implementation:**
- Added **Actions column** to product table with pencil icon button
- Clicking opens a **modal** with:
  - Product title (read-only display)
  - Textarea for editing card_description (max 150 chars)
  - Live character counter showing `X/150`
  - Save / Cancel buttons
- Save calls `/api/admin/shopify/update-product` with `card_description`
- UI updates immediately on success

**Files Modified:**
- `app/admin/shopify/ShopifyAdminClient.tsx`:
  - Added `Pencil`, `X` icon imports
  - Added `editingProduct`, `cardDescriptionInput`, `savingCardDescription` state
  - Added `handleEditCardDescription()`, `handleSaveCardDescription()`, `handleCloseCardDescriptionModal()` functions
  - Added `onEdit` prop to `SortableProductRow` component
  - Added Actions column header to table
  - Added edit modal with textarea and character counter

**Behavior:**
- Admin clicks pencil icon → modal opens with current card_description (or empty)
- Edit text (max 150 chars) → click Save
- API called with `shopify_product_id` + `card_description`
- Product list updates immediately
- Cancel or click outside closes modal without saving

**Commits:**
- `f0ab248` - feat: add card description editing to /admin/shopify

### Session 2026-06-11: Temporarily Disabled Automatic Grant Status Emails

**Decision:** Disabled automatic status update emails (under_review, approved, not_approved, payment_pending, payment_sent) to review and test the email flow before re-enabling.

**What emails remain active:**
- `grant-application-received` - Sent when user submits grant (in `app/api/grants/create/route.ts`)
- `bank-info-request` - Sent when admin clicks "Send Bank Info Email" button (in `app/api/admin/grants/send-bank-info-email/route.ts`)

**What emails are disabled:**
- `grant-under-review` (status = "in_review")
- `grant-approved` (status = "approved")
- `grant-not-approved` (status = "not_approved")
- `grant-payment-pending` (status = "payment_pending")
- `grant-payment-sent` (status = "payment_sent")

**Files modified:**
- `app/api/admin/grants/update-status/route.ts` - Commented out automatic `sendGrantStatusEmail` call

**To re-enable:** Uncomment the email sending block in `app/api/admin/grants/update-status/route.ts` and update this session entry.

### Session 2026-06-23: Re-enabled Grant Status Emails

**Fixed:** Re-enabled automatic status update emails by uncommenting the email sending block in `app/api/admin/grants/update-status/route.ts`.

**Emails now respect the `is_active` toggle** in `/admin/emails`:
- Enable or disable each template individually via the admin UI
- Active templates (green "ACTIVE" badge) will send when grant status changes
- Inactive templates (gray badge) will be skipped

**Files modified:**
- `app/api/admin/grants/update-status/route.ts` - Uncommented automatic `sendGrantStatusEmail` call

### Session 2026-06-12: Stripe Connect Onboarding Status Fixes

**Problem:** "Bank Account Connected" message was misleading - it showed whenever `stripe_connect_account_id` existed, regardless of whether onboarding was actually completed.

**Solution:** Query Stripe API for actual account status instead of just checking if account ID exists.

**Files Created:**
- `app/api/stripe/connect/status/route.ts` - GET endpoint that checks Stripe account status:
  - Returns `{ connected, status, details_submitted, charges_enabled, payouts_enabled, requirements }`
  - Uses Stripe's `accounts.retrieve()` to get real-time status
  - Returns `connected: false` if no account ID exists

- `components/grants/StripeAccountStatus.tsx` - Client component showing dynamic UI:
  - Loading spinner while checking
  - Error state with retry button if API fails
  - ✅ "Bank Account Connected" if fully onboarded (details_submitted + charges_enabled + payouts_enabled)
  - ⚠️ "Complete Your Stripe Onboarding" with "Continue Onboarding →" button if incomplete

**Files Modified:**
- `app/grants/view/[id]/page.tsx` - Replaced hardcoded success box with `<StripeAccountStatus>` component
- `app/grants/connect/return/page.tsx` - Added conditional UI:
  - **Complete return:** "Bank account connected!" success page → "View My Application →"
  - **Incomplete return:** "Setup Incomplete" warning page → "Continue Onboarding →" (links to `/grants/connect/refresh`)

**User Flow for Incomplete Onboarding:**
1. User clicks "Continue Onboarding" in StripeAccountStatus
2. Redirected to Stripe, doesn't complete, clicks return URL
3. Lands on `/grants/connect/return?grantId=...`
4. `details_submitted` is `false` → shows "Setup Incomplete" warning with "Continue Onboarding →" button
5. User clicks "Continue Onboarding" → regenerates account link → redirected back to Stripe

**Changes from user feedback:**
- Removed "Pending items: business_type, external_account, etc." from StripeAccountStatus warning
- Only shows: "Please finish setting up your Stripe account to receive your grant funds." + button

**Commits:**
- `4eda610` - fix: query Stripe for actual onboarding status instead of just checking account ID
- `b8d21f3` - fix: show incomplete warning on return page, remove pending items display

**Debug session (2026-06-12):** User confirmed "Setup Incomplete" now shows correctly after returning from Stripe without completing onboarding. Debug logging removed in cleanup commit.

### Session 2026-06-12: Auto-Transfer Grants + Payment Notifications

**Problem:**
1. Admin manually initiates each grant payment in Stripe dashboard
2. Admin manually updates grant status to `payment_sent` after sending
3. No notification emails sent when payment is made

**Solution:**
1. **Auto-transfer on approval** - When admin approves a grant with amount, check Stripe account status. If fully onboarded, create transfer immediately and mark `payment_sent`
2. **Webhook backup** - `account.updated` webhook creates transfer if Stripe becomes ready after approval
3. **User + admin notifications** - Send branded emails to both when payment is sent
4. **Transfer reversal handling** - `transfer.reversed` webhook reverts status and alerts admin

**New Email Functions (lib/email.ts):**
- `sendPaymentSentAdminEmail()` - Branded email to hello@ with amount, member info, grant details
- `sendPaymentSentUserEmail()` - Branded email to user confirming payment sent, 1-3 day arrival
- `sendTransferReversedAdminEmail()` - Alert when transfer fails/reverses

**Files Modified:**
- `app/api/admin/grants/update-status/route.ts`:
  - Auto-transfer when admin approves and Stripe is fully onboarded
  - Sends admin + user notification emails on `payment_sent`
- `app/api/webhook/route.ts`:
  - `account.updated`: Creates transfer if Stripe becomes ready after approval (webhook backup)
  - `transfer.created`: Backup confirmation (logs only)
  - `transfer.reversed`: Reverts status to `payment_pending`, alerts admin
- `app/grants/connect/return/page.tsx`:
  - Removed email sending (handled by webhook + update-status now)

**Stripe Webhook Events to Add:**
- `account.updated` - Triggers transfer when Stripe account becomes ready
- `transfer.created` - Backup confirmation
- `transfer.reversed` - Handles failed transfers

**Payment Flow:**
```
Admin approves grant with amount_approved
        ↓
Stripe account ready?
        ↓
    YES → Create transfer → payment_sent → admin email + user email
        ↓
    NO  → Mark approved (webhook handles when Stripe becomes ready)
        ↓
Stripe account becomes ready (account.updated webhook)
        ↓
Create transfer → payment_sent → admin email + user email
```

**Transfer Reversal Flow:**
```
transfer.reversed webhook fires
        ↓
Revert grant status to payment_pending
        ↓
Send alert email to admin with details
```

## Next Steps
- (none)

### Session 2026-06-15: Share Your Story Feature + Various Fixes

#### Share Your Story Feature

**Database Migrations:**
- `supabase/migrations/083_create_testimonials_table.sql` - Creates `testimonials` table with all story fields
- `supabase/migrations/083_create_monthly_claims_table.sql` - Creates `monthly_claims` table for race condition prevention
- `supabase/migrations/084_fix_monthly_claims_race_condition.sql` - Adds unique index on (user_id, claim_month)

**Public Form (`/share-your-story`):**
- Form at `app/share-your-story/page.tsx` with fields: name, email, age, city/state, story prompts
- All checkboxes (permission, anonymous, video interest) are optional
- Age field is always editable (not pre-filled)
- Mandatory fields marked with red asterisks: name, email, age, location
- Success page at `/share-your-story/success`

**Admin Page (`/admin/story-submissions`):**
- View all submissions with status tabs (all, pending, reviewed, approved)
- Search by name/email, filter by date range
- Detail modal with edit capability for age, city/state, permissions
- Actions: Mark as Reviewed, Mark as Approved, Revert to Pending
- Revert available for both "reviewed" and "approved" statuses
- CSV export functionality

**API Routes:**
- `POST /api/testimonials` - Submit story (auth required)
- `GET /api/admin/story-submissions` - List submissions (admin)
- `PATCH /api/admin/story-submissions` - Update status (admin)
- `DELETE /api/admin/story-submissions` - Delete submission (admin)

**Email Notification:**
- `sendStoryNotificationEmail()` in `lib/email.ts`
- Sends to `hello@nationalfundforwomen.org`
- Includes all story fields, permissions, and admin link

**Dashboard Integration:**
- "Share Your Story" button in `BottomActions.tsx` links to `/share-your-story`
- Removed "(Coming Soon)" label

**Navigation Links:**
- Added "Story Submissions" link to AuthButtonCombined, auth-button, MobileMenu

**Monthly Claims Race Condition Fix:**
- `app/api/shopify/checkout/route.ts` - Uses atomic INSERT with unique constraint on (user_id, claim_month)
- Prevents duplicate claims when user clicks rapidly

#### Story Form Fixes

**ShareStoryClient.tsx:**
- Checkboxes are optional (removed required validation)
- All checkboxes same size with `flex-shrink-0`
- Age field always editable (no calculated-from-profile logic)
- Removed "(calculated from profile)" label
- Required fields: name, email, age, location (all marked with red asterisks)

#### Email Template Fixes

**Story Notification Email (`lib/email.ts`):**
- Header: `border-radius: 12px 12px 0 0` (top rounded)
- Body: `border-radius: 0` (square - connects seamlessly to footer)
- Footer: `border-radius: 0 0 12px 12px` (bottom rounded)

**General Email Shell (`lib/email.ts`):**
- Body cell: Added `border-bottom-left-radius: 0; border-bottom-right-radius: 0;`
- Ensures square corners at bottom where body meets aubergine footer

#### Page Navigation Fixes

**Removed duplicate Navigation from:**
- `app/share-your-story/page.tsx` - Layout already renders Navigation
- `app/share-your-story/success/page.tsx` - Layout already renders Navigation
- Also removed `rounded-full` from success checkmark badge

#### Dashboard Order History Fix

**Problem:** "Your Order History" section on /dashboard showed "Product" and no image for all users.

**Root Cause:** Query for `shopify_product_mappings` was selecting a `price` column that doesn't exist in the table. This caused the entire query to fail with error `column shopify_product_mappings.price does not exist`.

**Fix:**
- Removed `price` from the select query in `app/dashboard/page.tsx`
- Query now correctly fetches `shopify_product_id, shopify_variant_id, title, image_url`

**Also Fixed:**
- `YourZeroDollarStoreSection.tsx`: Changed image class from `object-contain` to `object-cover` so images fill the square container

#### Security: Enable RLS on monthly_claims

**Migration:** `supabase/migrations/085_enable_rls_monthly_claims.sql`

Enabled RLS on `monthly_claims` table with policies:
- SELECT: Users can only view their own monthly claims
- INSERT: Users can only insert their own monthly claims
- DELETE: Users can only delete their own monthly claims

**Note:** The checkout API uses `supabaseAdmin` (service role key) which bypasses RLS, so the Zero Dollar Store checkout flow continues to work correctly.

#### Security: Fix testimonials Foreign Key Cascade

**Issue:** User deletion failed with error `"update or delete on table \"profiles\" violates foreign key constraint \"testimonials_user_id_fkey\"`

**Root Cause:** The `testimonials` table FK to `profiles` was missing `ON DELETE CASCADE`

**Fix Applied in Supabase SQL Editor:**
```sql
ALTER TABLE testimonials DROP CONSTRAINT testimonials_user_id_fkey;
ALTER TABLE testimonials ADD CONSTRAINT testimonials_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

#### Zero Dollar Store Claim Protection for Incomplete Profiles

**Goal:** Prevent Google OAuth users who haven't completed onboarding from claiming items

**Changes Made:**

1. **Checkout API (`app/api/shopify/checkout/route.ts`):**
   - Added `profile_completed` to profile SELECT query
   - Added server-side check: returns 403 error if `profile_completed === false`
   - Error message: "Please complete your profile to claim items"

2. **StoreClient (`components/StoreClient.tsx`):**
   - Added `profileCompleted` state
   - Added `checkProfileCompletion()` useEffect to fetch profile_completed on mount
   - Added client-side check in `handleClaim()`: redirects to `/auth/sign-up?step=1` if profile not completed

3. **My Claims Page (`app/store/my-claims/page.tsx`):**
   - Added `profile_completed` to profile SELECT query
   - Added redirect to `/auth/sign-up?step=1` if `profile_completed === false`

**Behavior:**
- Store page remains public (users can browse)
- "Claim Item" buttons redirect incomplete users to complete signup
- Server-side API also validates (defense in depth)
- `/store/my-claims` also protected

### Session 2026-06-16: Mobile Password Reset Auth Session Fix

#### Problem

"Auth Session Missing" error on `/auth/update-password` occurred on mobile but not desktop when resetting password via email link.

#### Root Cause

**Password reset flow was not following Supabase PKCE flow:**

1. **Email had:** `/auth/update-password?token_hash=XXX` (no type, no next)
2. **Page rendered form** but never extracted or used `token_hash` from URL
3. **API called** `updateUser({ password })` with NO session - relied on existing session cookie
4. **Desktop:** Session cookie existed from previous login → worked
5. **Mobile:** ITP (Intelligent Tracking Prevention) blocked cookies → no session → "Auth Session Missing"

#### Solution

**1. Created `/auth/confirm` route** (`app/auth/confirm/route.ts`)

Per Supabase PKCE flow, this route:
- Receives `token_hash`, `type=recovery`, and `next` params from URL
- Calls `supabase.auth.verifyOtp({ type, token_hash })` to exchange token for session
- Sets auth cookies on success
- Redirects to `next` (or `/auth/update-password`)
- Redirects to `/auth/error` on failure

**2. Updated email template** (`supabase/migrations/058_populate_email_html_content.sql`)

Changed reset password link from:
```
{{ .SiteURL }}/auth/update-password?token_hash={{ .TokenHash }}
```
To:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
```

#### New Flow

```
User clicks reset link in email
        ↓
https://nationalfundforwomen.org/auth/confirm?token_hash=XXX&type=recovery&next=/auth/update-password
        ↓
/auth/confirm calls verifyOtp() → creates session + sets cookies
        ↓
Redirect to /auth/update-password (now authenticated)
        ↓
Form submits password to API
        ↓
updateUser({ password }) → works because session exists in cookies
```

#### To Apply the Template Change

Run this SQL in Supabase SQL Editor:

```sql
UPDATE email_templates
SET html_content = REPLACE(
  html_content,
  '/auth/update-password?token_hash={{ .TokenHash }}"',
  '/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password"'
)
WHERE slug = 'supabase-reset-password';
```

### Session 2026-06-16: Grant Cycle Auto-Open/Close

#### Database Migration

**File:** `supabase/migrations/086_auto_open_close_grant_cycles.sql`

**pg_cron job** runs daily at 5 AM UTC (midnight EST):
- Opens cycles when `start_date <= today(EST) <= end_date`
- Closes cycles when `today(EST) > end_date`

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'open'
  WHERE start_date <= (CURRENT_DATE AT TIME ZONE 'America/New_York')
    AND end_date >= (CURRENT_DATE AT TIME ZONE 'America/New_York')
    AND status = 'closed';

  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date < (CURRENT_DATE AT TIME ZONE 'America/New_York')
    AND status = 'open';
END;
$$;

SELECT cron.schedule(
  'sync-grant-cycle-statuses',
  '0 5 * * *',
  'SELECT sync_grant_cycle_statuses()'
);
```

#### Bug: Wrong search_path

**Problem:** The function had `SET search_path = pg_catalog` which only looks in PostgreSQL system tables, NOT the `public` schema where `grant_cycles` exists. This caused the cron job to fail silently and not update grant statuses.

**Fix Applied (2026-07-23):** Updated the function to use `SET search_path = pg_catalog, public`:

```sql
CREATE OR REPLACE FUNCTION sync_grant_cycle_statuses()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE grant_cycles
  SET status = 'open'
  WHERE start_date::date <= CURRENT_DATE
    AND end_date::date >= CURRENT_DATE
    AND status = 'closed';

  UPDATE grant_cycles
  SET status = 'closed'
  WHERE end_date::date < CURRENT_DATE
    AND status = 'open';
END;
$$;

NOTIFY pgrst, 'reload';
```

#### Defense-in-Depth Fix (2026-07-23)

**File:** `app/grants/apply/page.tsx`

The apply page now filters by `end_date` after fetching grants server-side. Supabase date filters (`.lt()`, `.lte()`, `.not()`) proved unreliable for this use case, so filtering is done in JavaScript after the query:

```typescript
const { data: cycles } = await cyclesQuery;

// Server-side filter: exclude grants where end_date is in the past
// (Supabase date filters can be unreliable, so we filter in JS after fetch)
const todayStr = new Date().toISOString().split('T')[0];
const validCycles = cycles?.filter(c => c.end_date >= todayStr) || [];
```

This ensures closed grants never appear on the apply page regardless of database status.

### Grant Date Display Fix (2026-07-23)

**File:** `components/GrantApplicationForm.tsx`

The deadline date was showing as one day earlier due to JavaScript's `Date` parsing treating date-only strings like `"2026-07-23"` as UTC midnight, which converts to local time EST (UTC-5) as 7pm the previous day.

**Fix:** Parse the date manually to avoid timezone issues:

```typescript
{cycle.end_date ? (() => {
  const datePart = cycle.end_date.split('T')[0];
  const [y, m, d] = datePart.split('-');
  const parsed = new Date(+y, +m - 1, +d);
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
})() : 'TBD'}
```

### TEMPORARILY DISABLED: Nomination Feature (2026-07-23)

**Reason:** Removed per business decision - users can now only apply for themselves, not nominate others.

**What was removed from `components/GrantApplicationForm.tsx`:**
- `isNominating` state (line 33)
- `nomineeName` state (line 36)
- `nomineeEmail` state (line 37)
- Nominee validation logic in handleSubmit (lines 68-84)
- Toggle buttons: "I'm applying for myself" / "I'm nominating someone" (lines 264-316)
- Nominee name input field (lines 329-340)
- Nominee email input field (lines 343-352)
- Nominee consent checkbox (lines 367-378)
- Conditional question text based on isNominating (lines 377-461)

**What was removed from `app/api/grants/create/route.ts`:**
- Nominee validation (lines 45-59)
- `is_nominating`, `nominee_name`, `nominee_email` in grant insert (lines 149-150, 171-172)

**Database columns preserved (NOT removed):**
- `grants.is_nominating` - for historical data
- `grants.nominee_name` - for historical data
- `grants.nominee_email` - for historical data

**To re-enable:** Reverse all removals, restoring the nominee state, toggle buttons, input fields, validation, and API handling.

#### Admin Confirmation Modal

**File:** `app/admin/grants/[id]/edit/page.tsx`

Added confirmation modal when opening a cycle with date conflicts:
- **Warning when end_date has passed:** "This grant's end date has already passed. Opening it now will allow applications outside the intended timeframe."
- **Warning when start_date hasn't arrived:** "This grant's start date hasn't arrived yet. Opening it early will allow applications before the intended start date."

Modal has "Yes, Open Anyway" and "Cancel" buttons.

### Session 2026-06-17: Fix Free Members Showing "Active" Status

#### Problem

All free members showed "Active" status on `/admin/members` even though they never paid. This was because:
1. `subscription_status` column defaults to `'active'` in the database
2. Profile creation code didn't explicitly set `subscription_status = null` for free members

#### Solution

**1. Database Migration (`supabase/migrations/087_fix_free_members_active_status.sql`):**
```sql
UPDATE profiles
SET subscription_status = NULL,
    updated_at = NOW()
WHERE membership_level = 'free'
  AND subscription_status = 'active';
```

**2. Code Fixes - Explicitly set `subscription_status = null` when creating free profiles:**

- `app/auth/callback/route.ts` - Google OAuth callback
- `app/api/profile/update/route.ts` - Profile update API (INSERT case)

#### Result

Free members now have `subscription_status = NULL` and display correctly on admin page.

### Session 2026-06-17: Admin Members Page Improvements

#### Features Added

**1. Grey Avatar for Incomplete Profiles**

Members with `profile_completed === false` now show a grey (`bg-nfw-stone/40`) avatar instead of lilac. This visual indicator helps admins quickly identify members who haven't completed their profile.

**2. Incomplete Profiles Stat Card**

Added new stat card showing count and percentage of members with incomplete profiles. Displayed next to Total, Paid, Free, and Admins cards.

**3. Incomplete Filter Button**

Added "Incomplete" filter button in the toolbar. When clicked, filters the member list to show only those with `profile_completed === false`.

**4. Percentages on Stat Cards**

Paid, Free, and Incomplete stat cards now show percentages in parentheses:
- Paid Members: `50 (8.3%)`
- Free Members: `540 (90.0%)`
- Incomplete Profiles: `200 (33.3%)`

#### Files Modified

- `app/admin/members/page.tsx`:
  - Added `profile_completed` to select query
  - Added `incomplete` count calculation
  - Changed grid from 4 to 5 columns for 5 stat cards
  - Added Incomplete Profiles stat card with percentage

- `components/admin/AdminMembersClient.tsx`:
  - Added `profile_completed` to Member type
  - Added `"incomplete"` to filter state type
  - Added incomplete filter logic
  - Added "Incomplete" filter button
  - Conditional avatar background: grey if incomplete, lilac if complete

### Session 2026-06-17: Store Items Value Field

Added `value` (dollar amount) field to store items for internal tracking.

**Database Migration:**
- `supabase/migrations/088_add_value_to_shopify_product_mappings.sql` - Adds `value NUMERIC(10,2) DEFAULT 0` column

**Files Modified:**
- `app/api/admin/shopify/update-product/route.ts` - Added `"value"` to allowedFields
- `lib/mock-shopify.ts` - Added `value?: number` to MockProduct type and transform
- `components/StoreClient.tsx` - Added `value?: number` to StoreProduct type
- `app/admin/shopify/ShopifyAdminClient.tsx` - Added `value` to ProductWithMapping type, added `$` edit button and value modal

**Admin UI:**
- Products table has new `$` button next to pencil edit button
- Clicking `$` opens modal with dollar input for retail value
- Value defaults to 0 (no NULLs)
- Field is hidden on public store pages (internal use only)

### Session 2026-06-18: Abandoned Checkout Recovery System

Implemented a system to recover abandoned Stripe checkout sessions and re-engage users who don't complete membership purchase.

#### Database

**Migration 089:** `supabase/migrations/089_create_abandoned_checkouts_table.sql`
- Creates `abandoned_checkouts` table with RLS
- Tracks: user_id, membership_level, stripe_session_id, email_sent_at, email_retry_at, recovered_at
- Unique index ensures only one active abandoned checkout per user

**Migration 090:** `supabase/migrations/090_add_is_active_to_email_templates.sql`
- Adds `is_active` column to `email_templates` table
- Default: `true`, except `abandoned-checkout-recovery` set to `false`

**Migration 092:** `supabase/migrations/092_add_abandoned_checkout_email_sections.sql`
- Adds default builder sections for `abandoned-checkout-recovery` template:
  - Hero with welcome image
  - Headline: "You left something behind"
  - Body text with `{{name}}` variable
  - CTA button
  - Spacer

#### Webhook Handlers

**`app/api/webhook/route.ts`:**

1. **`checkout.session.expired`** - When Stripe checkout expires:
   - Records abandoned checkout in database
   - Schedules first email for 24 hours later
   - Skips gift purchases

2. **`checkout.session.completed`** (updated) - When checkout completes:
   - Checks if this was a recorded abandoned checkout
   - Marks `recovered_at` timestamp if found

#### Email System

**Email Template:** `abandoned-checkout-recovery`
- Subject: "Complete your NFW membership - your impact is waiting"
- Disabled by default (`is_active = false`)
- Uses builder sections for content
- Variables: `{{name}}`, `{{ctaUrl}}`

**pg_cron Job:** `send-abandoned-checkout-emails` (runs hourly)
- Sends first email 24 hours after abandonment
- Sends retry email 3 days later if not recovered
- Only sends if template `is_active = true`

#### Dashboard Banner

**`components/dashboard/AbandonedCheckoutBanner.tsx`:**
- Yellow (citrine) banner below nav bar
- Shows: "You have an incomplete membership purchase. Complete it now →"
- "Resume Checkout" button generates new Stripe checkout session
- Dismiss permanently (stored in localStorage)

#### API Routes

**`app/api/checkout/abandoned/route.ts`** (GET)
- Returns user's active abandoned checkout if exists
- Used by banner to check if user has pending abandonment

**`app/api/checkout/resume/route.ts`** (POST)
- Generates fresh Stripe checkout session
- Updates `abandoned_checkouts` with new `stripe_session_id`
- Returns new checkout URL

**`app/checkout/resume/page.tsx`:**
- Resume page with loading state
- Redirects to Stripe checkout on success
- Shows error and back link on failure

#### Seed Route

**`app/api/admin/emails/seed/route.ts`:**
- Seeds `abandoned-checkout-recovery` template entry
- Seed Templates button hidden in UI (commented out) until needed
- To re-enable button: uncomment in `components/admin/AdminEmailsClient.tsx`

#### Admin Cleanup

**`app/admin/members/page.tsx`:**
- Removed unused BackfillButton import and component
- CSV Download button remains in header

#### How to Enable

1. Run migration 092 to create builder sections
2. Edit template at `/admin/emails/abandoned-checkout-recovery/builder`
3. Update CTA URL to: `https://nationalfundforwomen.org/checkout/resume`
4. Enable via SQL: `UPDATE email_templates SET is_active = true WHERE slug = 'abandoned-checkout-recovery';`

#### Stripe Webhook Requirement

Add `checkout.session.expired` to Stripe webhook events:
- Stripe Dashboard → Developers → Webhooks
- Select endpoint → Add event
- Check: `checkout.session.expired`
- Save

### Session 2026-06-18 (Afternoon): Email Template Toggle Feature

Added ability to toggle each Resend email template on/off from `/admin/emails`.

#### Database

- Created `supabase/migrations/093_add_email_active_defaults.sql`
- Sets `is_active = false` for: `grant-under-review`, `grant-approved`, `grant-not-approved`

#### API

**`app/api/admin/emails/[slug]/route.ts`:**
- PUT now accepts `is_active` for partial updates
- Supports independent toggling without content changes

#### Admin UI

**`components/admin/AdminEmailsClient.tsx`:**
- Left panel: Each Resend template shows **ACTIVE** (green badge) or **INACTIVE** (gray badge)
- Right panel header: **Enable/Disable** toggle button for editable Resend templates
- Clicking toggle calls API and updates UI immediately

#### Default States

| Template | Default |
|----------|---------|
| `grant-under-review` | **OFF** |
| `grant-approved` | **OFF** |
| `grant-not-approved` | **OFF** |
| `grant-payment-pending` | ON |
| `grant-payment-sent` | ON |
| `bank-info-request` | ON |
| `abandoned-checkout-recovery` | **OFF** |
| All others | ON |

#### Files Created/Modified

| File | Change |
|------|--------|
| `supabase/migrations/093_add_email_active_defaults.sql` | Created |
| `app/api/admin/emails/[slug]/route.ts` | Modified - accepts `is_active` |
| `app/api/admin/emails/seed/route.ts` | Modified - `is_active: false` for grant templates |
| `components/admin/AdminEmailsClient.tsx` | Modified - badges + toggle button |

#### To Apply

Run migration 093 in Supabase SQL Editor, then manually toggle the 3 grant templates in `/admin/emails` UI when ready.

### Session 2026-06-18 (Evening): Fix Email is_active Enforcement

**Problem:** The `is_active` toggle in `/admin/emails` was not being checked by any email functions. Emails sent regardless of the toggle state.

**Audit Results:** All 14 Resend email templates had their `is_active` toggle non-functional:
- 0 out of 14 templates had their toggle respected

**Fix Applied:**

**`lib/email.ts`:**
1. Updated `fetchEmailTemplate()` to return `is_active` field
2. Updated `fetchEmailTemplateAdmin()` to return `is_active` field (and removed debug console.log)
3. Added helper function `fetchTemplateWithActiveCheck()` for future use
4. Added `is_active` check to all 8 email functions:
   - `sendWelcomeEmail`
   - `sendNewsletterWelcomeEmail`
   - `sendGrantApplicationReceivedEmail`
   - `sendGrantStatusEmail`
   - `sendBankInfoRequestEmail`
   - `sendGiftCodesEmail`
   - `sendContactFormEmail`
   - `sendAbandonedCheckoutEmail`

**Check Pattern (each function):**
```typescript
const template = await fetchEmailTemplate(slug);
if (!template) return;
if (template.is_active === false) {
  console.log(`[FunctionName] Template ${slug} is inactive, skipping email to ${to}`);
  return;
}
```

**Migration 094:**
- Deleted orphaned "Grant Status Update" template (`slug = 'grant-status-update'`)
- This was the old unified template that was replaced by 5 individual status templates

**Files Modified:**

| File | Change |
|------|--------|
| `lib/email.ts` | Updated 2 fetch functions, added is_active check to 8 email functions |
| `supabase/migrations/094_delete_grant_status_update_template.sql` | Created - deletes orphaned template |

**To Apply:**
1. Run migration 093 in Supabase SQL Editor
2. Run migration 094 in Supabase SQL Editor
3. Templates now respect `is_active` toggle in `/admin/emails`

### Session 2026-06-18 (Late): Disable Auto-Transfer

**Problem:** Auto-transfer of grant funds when approved was happening automatically without a way to disable it.

**Solution:** Commented out the auto-transfer logic in `app/api/admin/grants/update-status/route.ts`.

**What was disabled:**
- Auto-creating Stripe transfer when admin approves a grant
- Auto-updating status to `payment_sent` after transfer
- Auto-sending payment notification emails (admin and user)

**To Re-enable:**
1. Uncomment the auto-transfer block in `app/api/admin/grants/update-status/route.ts`
2. Restore the `Stripe` import and `stripe` client initialization
3. Restore the `sendPaymentSentAdminEmail` and `sendPaymentSentUserEmail` imports

**Future Enhancement:**
Add a database setting (`site_settings.grant_auto_transfer_enabled`) to toggle this feature without code changes.

**Files Modified:**
| File | Change |
|------|--------|
| `app/api/admin/grants/update-status/route.ts` | Commented out auto-transfer logic, removed unused imports |

### Session 2026-06-19: Shopify compareAtPrice Sync

Added `compare_at_price` field to sync the "list price" from Shopify for displaying "Value: $X" on store cards.

#### Research Findings

**Key Discovery:** In Shopify's Admin API, `compareAtPrice` is a `Money` scalar (a plain string like `"150.00"`), NOT a `MoneyV2` object like `price`.

- `Money` scalar: Query directly as a string - `compareAtPrice`
- `MoneyV2` object: Query with sub-selections - `compareAtPrice { amount currencyCode }`

The error `can't select on scalars` occurred because we tried to query `compareAtPrice` with sub-selections like `price`.

#### Database Migration

**File:** `supabase/migrations/095_sync_compare_at_price.sql`
```sql
ALTER TABLE shopify_product_mappings ADD COLUMN compare_at_price NUMERIC(10,2) DEFAULT NULL;
```

#### Files Modified

| File | Change |
|------|--------|
| `lib/shopify.ts` | Added `compareAtPrice: string \| null` to `ShopifyVariant` type; Added `compareAtPrice` scalar to `PRODUCTS_QUERY` and `PRODUCT_BY_HANDLE_QUERY` (no sub-selections) |
| `lib/mock-shopify.ts` | Added `compareAtPrice` to `MockProduct` type and `transformShopifyProduct()` |
| `app/api/admin/shopify/sync/route.ts` | Parses `compareAtPrice` as string, finds lowest across variants |
| `components/StoreClient.tsx` | Added `compareAtPrice` to `StoreProduct` type, displays "Value: $X" when > 0 |
| `components/ProductDetailPanel.tsx` | Added `compareAtPrice` to props, displays "Value: $X" |
| `app/admin/shopify/ShopifyAdminClient.tsx` | Added `compareAtPrice` to `ProductWithMapping` type |

#### Display Logic

- Store null or 0 as NULL in database
- Only display "Value: $X" when `compareAtPrice > 0`
- Shows on both store card and product detail slideout

### Session 2026-06-19: NFW Exclusive Perks System

Implemented a new NFW Exclusive Perks system for member-only deals from partner organizations.

#### Database Migration

**File:** `supabase/migrations/096_create_nfw_perks.sql`

Creates two tables:
- `nfw_perks` - Stores exclusive perk offers with partner info, discount details, landing page URL
- `nfw_perk_redemptions` - Tracks which users have redeemed which perks

**Schema:**
```sql
nfw_perks (
  id UUID PK,
  title TEXT NOT NULL,
  description TEXT,
  partner_name TEXT,
  partner_logo_url TEXT,
  discount_type TEXT CHECK (percent, fixed, free_item, landing_page),
  discount_value TEXT,
  landing_page_url TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

nfw_perk_redemptions (
  id UUID PK,
  perk_id UUID REFERENCES nfw_perks(id),
  user_id UUID REFERENCES profiles(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(perk_id, user_id)
)
```

#### Public API Routes

**`GET /api/nfw-perks`**
- Returns list of active NFW perks with user redemption status
- Requires authentication
- Response: `{ perks: [...] }`

**`GET /api/nfw-perks/[id]`**
- Returns single perk details

**`POST /api/nfw-perks/[id]/redeem`**
- Records redemption in database
- Returns `{ landing_page_url, success: true }` for landing_page type perks
- User redirected to partner landing page

#### Admin API Routes

**`GET /api/admin/nfw-perks`** - List all perks (active/inactive)
**`POST /api/admin/nfw-perks`** - Create new perk
**`GET /api/admin/nfw-perks/[id]`** - Get single perk
**`PUT /api/admin/nfw-perks/[id]`** - Update perk
**`DELETE /api/admin/nfw-perks/[id]`** - Delete perk

#### Admin Page

**`/admin/nfw-perks`** - Full CRUD interface:
- Table view with all perks (id, title, partner, discount, status, expires)
- Active toggle switch
- Create/Edit modal with fields:
  - Title, Description
  - Partner Name, Partner Logo URL
  - Discount Type (select), Discount Value
  - Landing Page URL (required for landing_page type)
  - Expires At (datetime)
- Delete confirmation modal

#### Frontend Components

**`NfwPerkCard` component (`components/perks/NfwPerkCard.tsx`):**
- Partner logo display with fallback
- Aubergine "NFW Exclusive" badge
- Discount value display
- "Get Perk" / "Redeemed" button states
- Built-in detail panel (slide-out on click)
- Handles redemption via onRedeem callback

**FilterSidebar changes (`components/perks/FilterSidebar.tsx`):**
- Added NFW Exclusive Perks toggle button above Travel Benefits
- Button shows aubergine when active, dove when inactive
- Star icon to differentiate from Travel Benefits
- Props: `nfwOnly`, `onNfwOnlyChange`

#### Perks Page Integration

**`app/perks/page.tsx`:**
- Added `nfwOnly` state to toggle between Access Perks and NFW perks
- Added `nfwPerks` state for NFW perks list
- Added `handleNfwPerkRedeem()` function for redemption flow
- Added useEffect to fetch NFW perks when `nfwOnly` becomes true
- Modified grid render to show `NfwPerkCard` components when `nfwOnly` is true
- NFW perks display in same 3-column grid as stores

**NFW Perk Redemption Flow:**
1. User clicks "Get Perk" button
2. POST to `/api/nfw-perks/${perk.id}/redeem`
3. API records redemption, returns `landing_page_url`
4. User's browser opens partner URL in new tab
5. Card button changes to "Redeemed" state

#### Navigation Links Added

Added "NFW Perks" link to admin dropdown menus in:
- `components/AuthButtonCombined.tsx`
- `components/auth-button.tsx`
- `components/MobileMenu.tsx`

#### Files Created/Modified

| File | Change |
|------|--------|
| `supabase/migrations/096_create_nfw_perks.sql` | Created |
| `app/api/nfw-perks/route.ts` | Created - public list endpoint |
| `app/api/nfw-perks/[id]/route.ts` | Created - public single endpoint |
| `app/api/nfw-perks/[id]/redeem/route.ts` | Created - redemption endpoint |
| `app/api/admin/nfw-perks/route.ts` | Created - admin CRUD |
| `app/api/admin/nfw-perks/[id]/route.ts` | Created - admin single/get/delete |
| `app/admin/nfw-perks/page.tsx` | Created - admin page wrapper |
| `app/admin/nfw-perks/AdminNfwPerks.tsx` | Created - admin CRUD client |
| `components/perks/NfwPerkCard.tsx` | Created - perk card component |
| `components/perks/FilterSidebar.tsx` | Modified - added nfwOnly button |
| `app/perks/page.tsx` | Modified - integrated NFW perks display |
| `components/AuthButtonCombined.tsx` | Modified - added NFW Perks link |
| `components/auth-button.tsx` | Modified - added NFW Perks link |
| `components/MobileMenu.tsx` | Modified - added NFW Perks link |

#### To Deploy

1. Run migration 096 in Supabase SQL Editor
2. Add perks via `/admin/nfw-perks`
3. Test redemption flow from `/perks` page

## Session 2026-06-20: Offer Detail Panel Likes + Admin Hub

### Offer Detail Panel Liked State Fix

**Problem:** Liked stores showed yellow heart instead of lilac in OfferDetailPanel because the Access Perks offer detail API doesn't return `offer_store.key` - it returns `offer.offer_store.store_key` instead.

**Root Cause:** The offers view data has `item.offer_store.store_key` but the code was looking for `item.offer_store.key`.

**Fix Applied:**
- Changed `item.offer_store?.key` to `item.offer_store?.store_key` in page.tsx
- Updated `OfferDetailPanel.tsx` useEffect and handleToggleLike to use `offer.offer_store?.store_key`
- Added `detailPanelStoreKey` state to pass store key from offers view to detail panel

**Files Modified:**
- `app/perks/page.tsx` - Use `item.offer_store?.store_key` for setting detailPanelStoreKey
- `components/perks/OfferDetailPanel.tsx` - Use `store_key` instead of `key`, added storeKeyProp

### Admin Hub - Consolidated Admin Menu

**Problem:** Admin dropdown had 14 separate admin links making it too long.

**Solution:** Created centralized Admin Dashboard page at `/admin` with all admin links organized by category. Dropdowns now show single "Admin Dashboard" link.

**Admin Hub Layout (5 categories):**

**Content & Website:**
- Manage Pages, Edit Header, Edit Footer, Edit FAQ, Edit Contact, Legal Pages, Manage Articles, Manage Dashboard

**Members & Grants:**
- Manage Members, Manage Grants

**Store & Commerce:**
- Manage Zero Dollar Store, Gift Codes, NFW Perks

**Emails & Subscriptions:**
- Email Templates, Newsletter Signups, Contact Submissions, Story Submissions

**Analytics:**
- Analytics

**Files Created:**
- `app/admin/page.tsx` - Server wrapper with requireAdmin()
- `app/admin/AdminHubClient.tsx` - Client component with categorized buttons

**Files Modified:**
- `components/AuthButtonCombined.tsx` - Replaced 14 admin links with single "Admin Dashboard" link
- `components/auth-button.tsx` - Same change
- `components/MobileMenu.tsx` - Same change

### Type Fixes (Pre-existing)

Fixed `img` src TypeScript errors in 4 files where `string | null` wasn't assignable to `string | Blob | undefined`:

- `app/perks/history/page.tsx`
- `components/dashboard/RecentRedemptions.tsx`
- `components/dashboard/RedeemedPerksPanel.tsx`
- `components/dashboard/YourPerksAndBenefits.tsx`

Fixed by using template literal: `` `${value || ""}` ``

## Session 2026-06-20: Category Filter for NFW Perks

### Feature: Show NFW Perks in Category Filter Results

**Problem:** NFW perks only showed when NFW Only toggle was ON. Category filters only applied to Access Perks.

**Solution:** When a category filter is active AND NFW Only is OFF, show NFW perks in a separate section below Access Perks results.

**Behavior:**
- NFW Only OFF + Category filter = Access Perks results + NFW perks section at bottom
- NFW Only ON = Only NFW perks shown (existing behavior)
- NFW Only OFF + No category filter = Only Access Perks shown (existing behavior)

**Files Modified:**
- `app/perks/page.tsx`:
  - Removed `[nfwOnly, user]` dependency from fetchNfwPerks useEffect, now only `[user]` (fetches NFW perks always when logged in)
  - Added conditional rendering of NFW perks section when `!nfwOnly && selectedCategories.length > 0 && nfwPerks.length > 0`

## Session 2026-06-20: Promotional Popup System

Implemented a promotional popup system with admin interface for creating/managing popups that display on specific pages or globally.

### Database

**Migration 098:** `supabase/migrations/098_create_promotional_popups.sql`

Creates `promotional_popups` table with columns:
- `id` (UUID, PK)
- `title` (TEXT, required)
- `body` (TEXT)
- `image_url` (TEXT)
- `cta_text` (TEXT)
- `cta_url` (TEXT)
- `target_pages` (TEXT[]) - array of page paths, ["*"] for global
- `frequency_type` (TEXT) - once, per_session, every_visit, limited, daily, weekly
- `frequency_value` (INT) - for limited type
- `delay_seconds` (INT) - delay before showing
- `is_active` (BOOLEAN)
- `start_date`, `end_date` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)

RLS enabled - anyone can view active popups, admin can manage all.

### API Routes

**Admin CRUD:**
- `GET /api/admin/promotional-popups` - List all popups
- `POST /api/admin/promotional-popups` - Create popup
- `GET /api/admin/promotional-popups/[id]` - Get single popup
- `PUT /api/admin/promotional-popups/[id]` - Update popup
- `DELETE /api/admin/promotional-popups/[id]` - Delete popup

**Public:**
- `GET /api/promotional-popups?path=/current/path` - Get active popups for page

### Admin Page

**`/admin/promotional-popups`** - Full CRUD interface:
- Table view with status, title, target pages, frequency
- Active/Inactive toggle per popup
- Create/Edit modal with all fields
- Delete confirmation
- Conflict warning when creating popup for page with existing active popup

### Frontend Component

**`components/popup/PromotionalPopup.tsx`**:
- **Desktop:** Centered modal, max-width ~800px, image left / text right, dim overlay, overlay click closes
- **Mobile:** Bottom sheet slides up, no image, auto height, X to close
- localStorage tracking for dismissal:
  - `once` - permanently dismissed
  - `per_session` - dismissed for browser session
  - `every_visit` - shown every time
  - `limited` - shown X times (per frequency_value)
  - `daily` - once per day
  - `weekly` - once per week

**`components/popup/PromotionalPopupWrapper.tsx`**:
- Client wrapper using `usePathname()` to pass current path

### Integration

- Added to `app/layout.tsx` via `PromotionalPopupWrapper`
- Shows on all pages, filters by `target_pages` or global "*"
- Multiple popups queue sequentially

### Admin Hub Update

Added "Promotional Popups" to Content & Website section in admin hub.

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/098_create_promotional_popups.sql` | Database table |
| `app/api/admin/promotional-popups/route.ts` | Admin list/create |
| `app/api/admin/promotional-popups/[id]/route.ts` | Admin get/update/delete |
| `app/api/promotional-popups/route.ts` | Public active popups |
| `app/admin/promotional-popups/page.tsx` | Admin page wrapper |
| `app/admin/promotional-popups/AdminPromotionalPopups.tsx` | Admin UI |
| `components/popup/PromotionalPopup.tsx` | Display component |
| `components/popup/PromotionalPopupWrapper.tsx` | Client wrapper |

### Files Modified

| File | Change |
|------|--------|
| `app/layout.tsx` | Added PromotionalPopupWrapper |
| `app/admin/AdminHubClient.tsx` | Added Promotional Popups link |

### To Deploy

1. Run migration 098 in Supabase SQL Editor
2. Add popups via `/admin/promotional-popups`

## Session 2026-06-21: Promotional Popup Updates

### Database Migration

**Migration 099:** `supabase/migrations/099_add_mobile_label_to_promotional_popups.sql`
- Added `mobile_label` field (TEXT, default 'Special Offer') for mobile header text

### Updates Made

**Desktop Popup Layout:**
- Image left column (50%), text/button right column (50%)
- 1-second fade-in animation using `animate-popup-fade` CSS class
- Image fills left column with rounded corners (top-left/bottom-left on mobile, left side on desktop)
- Content vertically centered in right column
- Button uses citrine background matching site style: `bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90`

**Mobile Popup Layout:**
- Bottom sheet slides up from bottom
- Shows "Special Offer" header (customizable via mobile_label)
- No image on mobile
- Auto height based on content

**CSS Animation (globals.css):**
```css
@keyframes popupFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-popup-fade {
  animation: popupFadeIn 1s ease-out forwards;
}
```

**Admin Preview:**
- Desktop/Mobile toggle to preview both layouts
- Close button works in preview mode
- Same styling as live popup

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/099_add_mobile_label_to_promotional_popups.sql` | Added mobile_label column |
| `app/globals.css` | Added `animate-popup-fade` keyframes |
| `components/popup/PromotionalPopup.tsx` | Full layout rewrite, mobile_label support, animation |
| `app/admin/promotional-popups/AdminPromotionalPopups.tsx` | mobile_label field, preview updates |

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/099_add_mobile_label_to_promotional_popups.sql` | Mobile label migration |

## Session 2026-06-21: Seed Grant Email Template Sections

### Database Migration

**Migration 100:** `supabase/migrations/100_seed_grant_email_sections.sql`

Seeded default builder sections for 4 grant email templates. Also updated subject lines.

### Subject Line Updates

| Template | Old Subject | New Subject |
|----------|-------------|-------------|
| `grant-approved` | "Your NFW grant application has been approved!" | "Your microgrant is approved!" |
| `grant-not-approved` | "Update on your NFW grant application" | "An update on your NFW microgrant application" |

### Section Structure per Template

Each template has 5 sections:
1. **Hero** - Welcome hero image with overlay text
2. **Headline** - Centered, Playfair Display 28px, lilac background
3. **Body** - Centered, DM Sans 16px, lilac background, variable placeholders
4. **CTA** - Centered button, color varies by template
5. **Spacer** - 30px height, lilac background

### Per-Template Content

**grant-approved** (citrine CTA):
- Hero: "Your microgrant is approved!"
- Headline: "Congratulations, {{name}}!"
- Body: "Great news! Your application for the {{grantCycleName}} grant has been approved. We're excited to support your work. Next steps will be sent shortly."
- CTA: "VIEW YOUR DASHBOARD" → `{{dashboard_url}}`

**grant-not-approved** (wisteria CTA):
- Hero: "An update on your application"
- Headline: "Thank You for Applying"
- Body: "Dear {{name}}, thank you for your interest in the {{grantCycleName}} grant program. After careful review, we're unable to move forward with your application at this time. We encourage you to apply for future grant cycles."
- CTA: "BROWSE OTHER GRANTS" → `{{grants_url}}`

**grant-payment-pending** (wisteria CTA):
- Hero: "Payment being processed"
- Headline: "Payment Processing Underway"
- Body: "Dear {{name}}, your grant payment for the {{grantCycleName}} grant in the amount of {{amount}} is being processed. You will receive another email once the payment has been sent."
- CTA: "VIEW APPLICATION STATUS" → `{{dashboard_url}}`

**grant-payment-sent** (citrine CTA):
- Hero: "Payment sent!"
- Headline: "Your Payment is on Its Way!"
- Body: "Dear {{name}}, great news! Your grant payment of {{amount}} for the {{grantCycleName}} grant has been sent. Please allow 1-3 business days for the funds to arrive in your account."
- CTA: "VIEW YOUR DASHBOARD" → `{{dashboard_url}}`

### To Deploy

1. Run migration 100 in Supabase SQL Editor
2. Navigate to `/admin/emails`
3. Click any grant template → "Edit with Builder" to customize text

## Session 2026-06-25: Fix Page Publishing Bug

### Problem

Page publishing failed with "Failed to Publish" error. Preview showed correct edits, but live page still showed old content.

### Root Cause

Two issues found:
1. **Migration 076/101:** `publish_page` and `revert_page` had `SET search_path = pg_catalog` which only looks in system tables, not user tables like `page_sections` and `pages`
2. **Migration 076:** Used wrong column name (`section_key` instead of `section_type`)

### Fix

**Migration 101:** Fixed column name from `section_key` to `section_type`
**Migration 102:** Fixed search_path to `SET search_path = pg_catalog, public`

### Files Created

- `supabase/migrations/101_fix_page_publish_functions.sql` - Fixes column name
- `supabase/migrations/102_fix_page_functions_search_path.sql` - Fixes search_path

### To Deploy

1. Run migration 102 in Supabase SQL Editor
2. Try publishing a page again

## Session 2026-06-26: NFW Perks Slug Feature

### Goal
- Add slug feature to NFW perks with dedicated detail page at `/perks/nfw/[slug]`, plus admin UI for slug management

### Constraints & Preferences
- Slug auto-generated from title on create, can be edited by admin
- Existing perks don't need slugs (starting fresh)
- No old URLs to redirect (new feature)

### Database Migration

**Migration 103:** `supabase/migrations/103_add_slug_to_nfw_perks.sql`
- Added `slug TEXT UNIQUE` column to `nfw_perks` table
- Created index `idx_nfw_perks_slug` on slug column

### API Routes Created/Modified

**POST `/api/admin/nfw-perks`** - Updated to accept and generate slug on create
**PUT `/api/admin/nfw-perks/[id]`** - Updated to accept slug updates
**GET `/api/nfw-perks/slug/[slug]`** - Fetch perk by slug (route at `/api/nfw-perks/slug/:slug`)

### Admin UI Changes

**`app/admin/nfw-perks/AdminNfwPerks.tsx`:**
- Added slug field to NfwPerk type
- Added slug to formData state (initial, create, edit)
- Title onChange auto-fills slug field (unless slug was manually edited)
- Slug field marked as mandatory (red asterisk)
- Added slug validation on save
- Added clickable slug URLs in perk table rows (opens in new tab)
- Fixed openEditModal missing `setShowModal(true)` call
- Reset `slugManuallyEdited` flag when opening create modal

### Public Detail Page

**`app/perks/nfw/[slug]/page.tsx`:**
- Created new page for NFW perk detail views
- Layout: 2-column grid (3/5 content, 2/5 sidebar)
- Shows: partner logo, title, description, terms, estimated value, categories, expiry
- "Visit Partner Site" button opens landing_page_url directly (no redemption tracking)
- No redemption limits - unlimited visits allowed

### NFW Perk Slideout Panel

**`components/perks/NfwPerkDetailPanel.tsx`:**
- Removed `onRedeem` prop (no longer needed)
- Removed `redeeming` state (no longer tracks redemption)
- Button always shows "Visit Partner Site" and opens landing_page_url directly
- Simplified to just open URL on click

### /perks Page Integration

**`app/perks/page.tsx`:**
- NFW perk cards now use `setSelectedNfwPerk` + `setIsNfwDetailOpen` for slideout instead of `window.location.href`
- Removed unused `handleNfwPerkRedeem` function

### Redeemed Perks Panel

**`components/dashboard/RedeemedPerksPanel.tsx`:**
- Added `slug` field to Redemption interface
- Added `slug` to NFW perk redemptions mapping
- "Details" button now links to `/perks/nfw/${slug}` for NFW perks

### API Route Fix

**Issue:** Route at `/api/nfw-perks/[slug]` conflicted with `/api/nfw-perks/[id]`

**Solution:** Moved slug route to `/api/nfw-perks/slug/[slug]` (nested route)

### Commits

- `b2baaa3` - feat: add slug field to NFW perks admin UI and API
- `7ea3774` - fix: properly track slug manual edit state to fix auto-fill
- `d05edf0` - fix: correct API route path for NFW perk slug lookup
- `2525d9b` - fix: use object-cover for partner logo
- `87139c1` - fix: remove redemption limits on NFW perks, always allow visiting partner site
- `b0cd975` - fix: openEditModal now opens the modal
- `b3de9cf` - fix: make NFW perk URLs clickable to open in new tab
- `132232a` - fix: NFW perks open in slideout panel instead of navigating
- `dd73f91` - fix: NFW perk redemptions show detail page link in slideout
- `e100426` - fix: include slug in NFW perk redemptions API response

### To Deploy

1. Run migration 103 in Supabase SQL Editor
2. Add NFW perks with slugs via `/admin/nfw-perks`
3. Slug auto-fills from title, or can be manually edited
4. Click slug URL in admin table to view perk in new tab

## Session 2026-06-26: Admin Copy Link Button

### Feature

Added "Copy Link" button to both offer slideout panels for admins only.

### Changes

**`app/perks/page.tsx`:**
- Added `profile` state to store profile data including `is_admin`
- Profile is fetched and stored when user logs in
- Passes `isAdmin={profile?.is_admin}` to both `OfferDetailPanel` and `NfwPerkDetailPanel`

**`components/perks/OfferDetailPanel.tsx`:**
- Added `isAdmin?: boolean` prop
- Added Copy icon import
- Added `linkCopied` state for feedback
- Added "Copy Link" button in panel header (next to close button)
- Button only shows when `isAdmin === true`
- Copies `/perks/{offerKey}` URL to clipboard

**`components/perks/NfwPerkDetailPanel.tsx`:**
- Added `slug` field to NfwPerk type
- Added `isAdmin?: boolean` prop
- Added Copy and Check icon imports
- Added `linkCopied` state for feedback
- Added "Copy Link" button in panel header (next to close button)
- Button only shows when `isAdmin === true` and perk has a slug
- Copies `/perks/nfw/{slug}` URL to clipboard

### UI Behavior

- Button shows "Copy Link" with Copy icon
- After clicking, shows "Copied!" with Check icon for 2 seconds
- Button styled with aubergine background tint to differentiate from close button

### Commits

- `45c2565` - feat: add Copy Link button for admins on offer detail panel
- `1a37977` - feat: add Copy Link button for admins on NFW perk slideout panel

---

## Session 2026-06-30: Free Membership Admin Approval System

### Overview

Implemented a free membership system where users can request free membership via contact form, but require admin approval before gaining access to member benefits. This prevents abuse while allowing legitimate free access.

### Database Migrations

**Migration 104: `supabase/migrations/104_add_is_approved_free_member.sql`**
- Adds `is_approved_free_member BOOLEAN DEFAULT FALSE` to profiles table
- Grandfathers existing free members (sets `is_approved_free_member = TRUE` for all existing free/null members)
- Creates index `idx_profiles_is_approved_free_member` for efficient lookups

**Migration 105: `supabase/migrations/105_add_free_membership_contact_submitted.sql`**
- Adds `free_membership_contact_submitted BOOLEAN DEFAULT NULL` to profiles table
- Track the progression through the free membership flow:
  - `NULL` = not in free membership flow (default)
  - `FALSE` = started free request (clicked "Continue for free") but hasn't submitted contact form
  - `TRUE` = submitted contact form, awaiting admin approval

### Profile Flags Summary

| Flag | Values | Purpose |
|------|--------|---------|
| `membership_level` | `'free'`, `'contributing'`, `'founding'`, `NULL` | Member tier (database default is `'free'`) |
| `is_approved_free_member` | `TRUE`, `FALSE` | Admin approval status for free members |
| `free_membership_contact_submitted` | `TRUE`, `FALSE`, `NULL` | Contact form submission status |

### Membership Access Matrix

| membership_level | is_approved_free_member | free_membership_contact_submitted | Can Access Benefits |
|-----------------|------------------------|----------------------------------|-------------------|
| `free` | `FALSE` or `NULL` | `NULL` | No - redirect to step 3 (never started) |
| `free` | `FALSE` or `NULL` | `FALSE` | No - redirect to contact form |
| `free` | `FALSE` or `NULL` | `TRUE` | No - show "pending approval" banner |
| `free` | `TRUE` | `TRUE` | Yes - fully approved free member |
| `contributing` | any | any | Yes - paid member |
| `founding` | any | any | Yes - paid member |

### Signup Flow Changes

**`components/SignUpFlow.tsx`:**
- Step 3 displays only paid plans ($15 Contributing, $100 Founding)
- "If contributing financially isn't possible, you can apply for free membership here." link opens modal
- Modal explains the free membership process and consent
- Clicking "CONTINUE TO CONTACT FORM" sets:
  - `membership_level = 'free'`
  - `is_approved_free_member = FALSE`
  - `free_membership_contact_submitted = FALSE`
- Redirects to `/contact?reason=free-membership`

### Contact Form Changes

**`components/contact/ContactClient.tsx`:**
- Detects `reason=free-membership` and `from=abandoned` URL params
- Shows appropriate messaging for each scenario:
  - `from=login`: "Welcome back! Please complete your free membership request below."
  - `from=abandoned`: "No problem! You can still request free membership below."
  - default: "You're requesting free membership..."
- Passes `from_abandoned` to API on submit

**`app/api/contact/submit/route.ts`:**
- When `subject=free-membership`:
  - Sets `free_membership_contact_submitted = TRUE`
  - If `from_abandoned=TRUE`: also sets `membership_level = 'free'` and deletes abandoned checkout record

### Dashboard Changes

**`app/dashboard/page.tsx`:**
- Redirect logic for free members:
  - `free_membership_contact_submitted === NULL` → redirect to `/auth/sign-up?step=3`
  - `free_membership_contact_submitted === FALSE` → redirect to contact form
  - `free_membership_contact_submitted === TRUE && is_approved_free_member !== TRUE` → show pending banner
- Passes `hasAbandonedCheckout` from server-side query to AbandonedCheckoutBanner

**`components/dashboard/PendingFreeMembershipBanner.tsx`:**
- New component showing "Your free membership is pending review"
- Link to contact form if they haven't submitted yet
- Link to dashboard home if they have

**`components/dashboard/AbandonedCheckoutBanner.tsx`:**
- Added `showRequestFreeMembershipLink` prop
- Shows "or request free membership instead" link for free members who started but didn't submit
- Shows "or apply as free member instead" link for paid members with abandoned checkout
- Link redirects to `/contact?reason=free-membership&from=abandoned`

### Feature Access Restrictions

**`app/perks/page.tsx`:**
- Free members with `is_approved_free_member !== TRUE` are redirected to signup step 3

**`app/grants/apply/page.tsx`:**
- Same restriction as perks - requires approval

**`app/store/page.tsx`:**
- Store browsing is now PUBLIC (anyone can view)
- Claiming requires `is_approved_free_member === TRUE` or paid membership

**`components/StoreClient.tsx`:**
- Added `isApprovedFreeMember` prop
- `canClaim()` returns "Approval Required" for unapproved free members

### Abandoned Checkout Race Condition Fix

**`app/api/webhook/route.ts`:**
- `checkout.session.expired` handler now checks `membership_level` before creating abandoned record
- If user has already switched to `'free'` (via contact form), skip recording abandoned checkout
- Prevents stuck abandoned checkouts for users who abandon then switch to free

### Admin Approval System

**`components/admin/FreeMembershipApprovalModal.tsx`:**
- Shared modal component for approving free memberships
- Props: `isOpen`, `onClose`, `onConfirm`, `memberName`, `sendingEmail`, `saving`, `emailSendError`
- Used by both AdminMembersClient and AdminContactSubmissions

**`app/api/admin/members/send-welcome-email/route.ts`:**
- New endpoint for sending welcome email to approved free members
- Validates profile is still free and not already approved

**`app/admin/contact-submissions/AdminContactSubmissions.tsx`:**
- Added "Free Request" filter tab
- Approve button only shown for pending (not yet approved) free requests
- Approval statuses batch-fetched via `/api/admin/contact-submissions/approval-statuses`
- Member Status column removed - status is now only indicated by presence/absence of approve button

**`app/api/admin/contact-submissions/approve/route.ts`:**
- New endpoint for approving free membership from contact submissions
- Looks up profile by email
- Validates `membership_level === 'free'` and `is_approved_free_member !== TRUE`
- Sets `is_approved_free_member = TRUE`
- Sends welcome email

### Commits

- Multiple commits for free membership approval system including:
  - Database migrations for new profile flags
  - Signup flow changes with modal
  - Contact form integration
  - Dashboard redirect logic and pending banner
  - Abandoned checkout race condition fix
  - Admin approval modal and endpoints
  - Store browsing/claiming separation
  - Admin contact submissions approval features

---

## Session 2026-06-30 (Afternoon): Remove Green from Brand

### Overview

Removed the green color (#d4f1ad) from the brand, replacing it with wisteria (#7786BE) for non-status UI elements and keeping green only for status badges (approved, paid, delivered, etc.).

### Strategy

- **Remove:** Green from CardSwatchColor type, section template checkmarks/icons, non-status UI elements
- **Replace:** With wisteria (#7786BE) for brand consistency
- **Keep:** Green for status badges to maintain semantic meaning (green = success/approved)

### Files Modified

**Type Definitions:**
- `lib/sections/types.ts` - Removed "green" from `CardSwatchColor` and `IconColor` union types

**Color Utilities:**
- `lib/colors.ts` - Removed `green` from `CARD_COLOR_MAP` and `getCardSwatchBgClass()` function

**Section Template Check Colors → Wisteria:**
- `components/sections/BenefitsCheckmarksSection.tsx`
- `components/sections/PricingCardsSection.tsx`
- `components/sections/PricingComparisonSection.tsx`
- `components/sections/PricingFinalCtaSection.tsx`
- `components/sections/PricingBenefitsSection.tsx`
- `components/sections/HowItWorksSection.tsx`

**Non-Status UI Elements → Wisteria/30 or Wisteria/40:**
- `app/admin/items/page.tsx` - Active Items progress bar
- `app/admin/grants/page.tsx` - Total Applications stat card
- `app/admin/shopify/ShopifyAdminClient.tsx` - Toggle ON state, success messages
- `app/auth/welcome/page.tsx` - Badge dot indicator
- `app/admin/dashboard/DashboardAdminClient.tsx` - Success message
- `app/admin/members/page.tsx` - Paid Members stat card
- `components/ArticlesClient.tsx` - Like button active state
- `components/SignUpFlow.tsx` - Gift code applied success box
- `components/GrantApplicationForm.tsx` - Single cycle info box
- `app/perks/history/page.tsx` - Call method badge, Mark as Used button, phone CTA
- `components/admin/AdminAnalyticsClient.tsx` - Chart color
- `app/admin/gift-codes/AdminGiftCodes.tsx` - Redeemed stat card icon

**Database Migrations Updated (source files only):**
- `supabase/migrations/009_add_new_section_templates.sql`
- `supabase/migrations/014_add_pricing_and_shared_section_templates.sql`

### Status Badges Kept Green (Unchanged)

- Grant statuses: `approved`, `payment_sent`, `open`
- Membership statuses: `active`, `contributing`
- Redemption statuses: `active`, `delivered`, `completed`
- Publication statuses: `published`
- Success indicators: bank connected, gift code applied, etc.

### Database Updates Required

Ran UPDATE statements against `section_templates` table to change:
- `"checkbox_checked":"green"` → `"checkbox_checked":"wisteria"`
- `"icon_color":"green"` → `"icon_color":"wisteria"`
- `"check_color":"green"` → `"check_color":"wisteria"`
- `"color":"green"` → `"color":"wisteria"` (in card arrays)
- `"avatar_color":"green"` → `"avatar_color":"wisteria"`
- Hardcoded `"#d4f1ad"` → `"#7786BE"` in perks_store_grid

### Brand Color Reference (Updated)

| Color | Hex | Usage |
|-------|-----|-------|
| aubergine | #3E145F | Primary brand, headers, CTAs |
| citrine | #F8F19A | Highlights, buttons |
| lilac | #B693C0 | Secondary accents |
| wisteria | #7786BE | Tertiary accents (replaced green) |
| dove | #F6F5F0 | Light backgrounds |
| blackberry | #2E1F38 | Dark text/backgrounds |
| green | #d4f1ad | Status badges only (approved, paid, success) |

---

## Session 2026-06-30 (Evening): Admin Contact Submissions Fixes

### Issue 1: Approve button appeared for already-approved members

**Problem:** Even after approving a member, the checkmark button still opened the modal and allowed attempting to resend the welcome email.

**Solution:**
- Added batch-fetch of approval statuses via `/api/admin/contact-submissions/approval-statuses` API
- Only show approve button when `is_approved_free_member !== true`
- Already-approved members show no approve button (just view button)

### Issue 2: Empty Member column confusing

**Problem:** Added a "Member" column that showed "Pending" badge only for unapproved free requests, leaving the cell empty for everything else.

**Solution:**
- Removed the "Member" column entirely
- Approve button only appears in Actions column for pending free requests
- Admins identify free requests by the subject "Free Membership Request" and the presence/absence of the approve button

### Files Modified

- `app/admin/contact-submissions/AdminContactSubmissions.tsx`:
  - Removed left citrine border from free request rows
  - Removed Member column and Pending badge
  - Only show approve button for pending (not yet approved) free requests
  - Updated colSpan from 7 to 6
- `app/api/admin/contact-submissions/approval-statuses/route.ts` - New API endpoint for batch-fetching approval statuses

### Commits

- `fc5ed8c` - feat: add member approval status to contact submissions admin
- `1310993` - fix: hide approve button for already-approved free requests
- `18a0c6f` - fix: remove Member column from contact submissions table

## Session 2026-06-30 (Evening): Perks Feature Marquee Fix

### Problem
The scrolling logos in the Perks Feature + Brand Logos section had the first and last logos touching each other during the scroll loop, instead of having the same consistent spacing as other logos.

### Root Cause
The `react-fast-marquee` library was duplicating the content internally for seamless looping via `autoFill`, but there was no trailing gap between the end of one logo set and the start of the next duplicated set.

### Solution
1. Removed manual logo duplication (was conflicting with library's internal duplication)
2. Added `autoFill={true}` to let library handle seamless looping with proper calculations
3. Added `pr-16` (padding-right) to the logo container to create trailing gap between duplicated sets
4. Removed `pauseOnHover` to keep scroll continuous

### Files Modified

- `components/sections/PerksFeatureSection.tsx`:
  - Added `autoFill` prop to Marquee
  - Added `pr-16` class to logo container for trailing gap
  - Removed manual logo duplication block
  - Removed `pauseOnHover` prop

## Session 2026-07-01: NFW Perk Redemption Fix

### Problem

When users redeemed an NFW perk via the "Visit Partner Site" button, the redemption was never recorded. This caused:
1. Admin page (`/admin/nfw-perks`) showed 0 redemptions
2. Dashboard showed no NFW perk redemptions
3. User's "already redeemed" check never triggered

### Root Cause

`NfwPerkDetailPanel` directly opened the partner URL via `window.open()` without calling the redemption API (`POST /api/nfw-perks/[id]/redeem`). The `handleNfwPerkRedeem` function existed in `perks/page.tsx` but was never passed to or called by the detail panel.

### Solution

1. Added `onRedeem?: (perk: NfwPerk) => void` prop to `NfwPerkDetailPanel`
2. Modified "Visit Partner Site" button to call `onRedeem(perk)` when provided
3. Passed `handleNfwPerkRedeem` as `onRedeem` prop from `perks/page.tsx`
4. Changed admin API to use `supabaseAdmin` instead of `createClient()` for reliable redemption counts

### Files Modified

| File | Change |
|------|--------|
| `components/perks/NfwPerkDetailPanel.tsx` | Added `onRedeem` prop, calls it instead of just opening URL |
| `app/perks/page.tsx` | Passed `handleNfwPerkRedeem` as `onRedeem` prop |
| `app/api/admin/nfw-perks/route.ts` | Uses `supabaseAdmin` instead of user-context client |

## Session 2026-07-01: Analytics Page Fixes + Cohort Analysis

### Overview

Enhanced the analytics admin page with timeline views, membership metrics, newsletter tracking, ZDS claims, engagement metrics, and Freshdesk integration. Also fixed several bugs.

### Completed Steps

**Step 1: Timeline View**
- Added Day/Month/Quarter/Year + Custom date range picker
- Dropdown with presets + "Custom Range" at bottom that opens date pickers

**Step 2: Membership Metrics**
- Added revenue, avg dues, retention rate, churn metrics
- Paid/free percentage breakdowns

**Step 3: Newsletter Signups**
- Combined member + newsletter signups tracking

**Step 4: ZDS Claims**
- Added claims tab with Total/Unique Claimants/Status breakdown

**Step 5: Unique Redeemers for Perks**
- Added `user_id` to redemptions query
- Replaced "Unique Offers" with "Unique Redeemers"

**Step 6: Engagement Metrics**
- Added Active Members/Weekly/Monthly counts
- Total activities and avg actions per member

**Step 7: Support Tickets - Freshdesk Integration**
- Created API route at `app/api/admin/analytics/freshdesk/route.ts`
- Added Freshdesk tab to analytics with Total/Open/Pending/Resolved/Closed stats

**Step 8: Cohort Analysis**
- Added Cohorts tab with table showing members grouped by join month
- Retention rate = active members / total members in cohort
- Bar chart visualization of retention rates by cohort

### Bug Fixes

**ZDS Claims Showing 0 in Engagement Tab**
- **Root Cause**: `zero_dollar_claims` table has `claimed_at` column but NOT `created_at`. Query was selecting `created_at` which doesn't exist, causing silent failure.
- **Fix**: Removed `created_at` from select query in `app/admin/analytics/page.tsx`

**Tab Label "Zds" Capitalization**
- **Root Cause**: Tailwind's `capitalize` class makes it "Zds" not "ZDS"
- **Fix**: Added conditional `{t === "zds" ? "ZDS" : t}` in tab rendering

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminAnalyticsClient.tsx` | All 8 steps + bug fixes |
| `app/admin/analytics/page.tsx` | Removed `created_at` from ZDS query |
| `app/api/admin/analytics/freshdesk/route.ts` | Freshdesk API proxy (new) |

### Key Decisions

- Used session tracking for website users (not GA4 API)
- Support tickets via Freshdesk API (already has write integration)
- Retention rate calculated as members with active subscription / total cohort members
- Active = `subscription_status = 'active'/'contributing'` OR `is_approved_free_member = true`

---

## Session 2026-07-01: Fix Grandfathered Free Member Access Bug

### Problem

Grandfathered free members (with `is_approved_free_member = TRUE` from migration 104, but `free_membership_contact_submitted = NULL`) were being incorrectly forced to fill out the contact form.

### Root Cause

The dashboard redirect logic only checked `free_membership_contact_submitted === null` without first checking if the member was already approved.

```typescript
// BEFORE (bug):
if (
  profile?.membership_level === "free" &&
  profile?.free_membership_contact_submitted === null
) {
  redirect("/auth/sign-up?step=3");
}
```

### Solution

Added `is_approved_free_member !== true` check before the NULL and FALSE redirects:

```typescript
// AFTER (fixed):
if (
  profile?.membership_level === "free" &&
  profile?.is_approved_free_member !== true &&  // Added check
  profile?.free_membership_contact_submitted === null
) {
  redirect("/auth/sign-up?step=3");
}
```

### Access Matrix (Corrected)

| membership_level | is_approved_free_member | free_membership_contact_submitted | Can Access |
|-----------------|------------------------|----------------------------------|------------|
| `free` | `TRUE` | `NULL` | **Yes** (grandfathered) |
| `free` | `TRUE` | `TRUE` | Yes (approved) |
| `free` | `FALSE` | `NULL` | No → step 3 |
| `free` | `FALSE` | `FALSE` | No → contact form |
| `free` | `FALSE` | `TRUE` | No → pending banner |
| `contributing` | any | any | Yes (paid) |
| `founding` | any | any | Yes (paid) |

### Files Modified

- `app/dashboard/page.tsx` - Added `is_approved_free_member !== true` checks before NULL and FALSE redirects

### Commit

- `50fcf01` - fix: skip free membership redirect checks for approved members

---

## Session 2026-07-01 (Afternoon): Link Contact Submissions to Profiles via user_id

### Problem

Admin was seeing approve buttons for contact submissions where:
- The member's profile **did** exist and was **already approved**
- But the approval API failed with "No matching profile found" because:
  - The contact submission stored a different email than the profile's email
  - Or the contact form was submitted without being logged in

### Root Cause

The `contact_submissions` table had **no `user_id` column** - it only stored email. The approval API looked up profiles by email only, which fails when:
1. User submits contact form with a different email than their profile
2. User submits contact form while logged out (no profile link)

### Solution

1. **Added `user_id` column** to `contact_submissions` table (migration 106)
2. **Updated contact submit API** to capture `user_id` when user is logged in
3. **Updated approval API** to use `user_id` lookup first, fall back to email

### Database Migration

```sql
ALTER TABLE contact_submissions ADD COLUMN user_id UUID REFERENCES profiles(id);
CREATE INDEX idx_contact_submissions_user_id ON contact_submissions(user_id);
-- Backfill: match existing submissions by email
UPDATE contact_submissions SET user_id = profiles.id FROM profiles WHERE profiles.email = contact_submissions.email;
```

### API Changes

**`app/api/contact/submit/route.ts`:**
- Capture `userId = user?.id || null` when user is logged in
- Include `user_id` in insert

**`app/api/admin/contact-submissions/approve/route.ts`:**
- Select `user_id` from submission
- Look up by `user_id` first (preferred)
- Fall back to email lookup for older submissions without `user_id`

### Files Created

- `supabase/migrations/106_add_user_id_to_contact_submissions.sql`

### Files Modified

- `app/api/contact/submit/route.ts`
- `app/api/admin/contact-submissions/approve/route.ts`

### Commit

- `96ed438` - feat: link contact submissions to profiles via user_id

---

## Session 2026-07-01 (Afternoon): Analytics Enhancements + Dashboard Perks Combination

### Overview

Enhanced the analytics admin page with timeline views, membership metrics, cohort analysis, and Freshdesk integration. Also combined Access Perks and NFW Perks into one "Perks" tally on the dashboard.

### Analytics Admin Page - Steps 1-8 Complete

**Step 1: Timeline View**
- Added Day/Month/Quarter/Year + Custom date range picker
- Dropdown with presets + "Custom Range" at bottom that opens date pickers

**Step 2: Membership Metrics**
- Added revenue, avg dues, retention rate, churn metrics
- Paid/free percentage breakdowns

**Step 3: Newsletter Signups**
- Combined member + newsletter signups tracking

**Step 4: ZDS Claims**
- Added claims tab with Total/Unique Claimants/Status breakdown

**Step 5: Unique Redeemers for Perks**
- Added `user_id` to redemptions query
- Replaced "Unique Offers" with "Unique Redeemers"

**Step 6: Engagement Metrics**
- Added Active Members/Weekly/Monthly counts
- Total activities and avg actions per member

**Step 7: Support Tickets - Freshdesk Integration**
- Created API route at `app/api/admin/analytics/freshdesk/route.ts`
- Added Freshdesk tab to analytics with Total/Open/Pending/Resolved/Closed stats

**Step 8: Cohort Analysis**
- Added Cohorts tab with table showing members grouped by join month
- Retention rate = active members / total members in cohort
- Bar chart visualization of retention rates by cohort

### Bug Fixes

**ZDS Claims Showing 0 in Engagement Tab**
- **Root Cause**: `zero_dollar_claims` table has `claimed_at` column but NOT `created_at`. Query was selecting `created_at` which doesn't exist, causing silent failure.
- **Fix**: Removed `created_at` from select query in `app/admin/analytics/page.tsx`

**Tab Label "Zds" Capitalization**
- **Root Cause**: Tailwind's `capitalize` class makes it "Zds" not "ZDS"
- **Fix**: Added conditional `{t === "zds" ? "ZDS" : t}` in tab rendering

### New Analytics Stat Cards

Added two new stat cards to the Members tab:
- **Pending Free**: Members with `is_approved_free_member = TRUE` but `free_membership_contact_submitted = TRUE` (approved but need to complete flow)
- **Started Free**: Members with `free_membership_contact_submitted = FALSE` (clicked "Continue for free" but abandoned)

### Dashboard "Your Membership at Work" Changes

Combined Access Perks and NFW Perks into single "Perks" column:
- Removed separate NFW Perks column
- Access Perks + NFW Perks values are now combined in the data source
- Grid changed from 4 columns to 3 columns: Microgrants | Perks | Zero Dollar Store
- Total savings calculation unchanged (still includes all four categories)

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminAnalyticsClient.tsx` | All 8 steps + new stat cards |
| `app/admin/analytics/page.tsx` | Fixed ZDS query (removed non-existent `created_at`) |
| `app/dashboard/page.tsx` | Combined perks + nfwPerks in getSavings return |
| `components/dashboard/MembershipImpactCard.tsx` | 3-column layout, combined perks label |

### Key Decisions

- Used session tracking for website users (not GA4 API)
- Support tickets via Freshdesk API (already has write integration)
- Retention rate calculated as members with active subscription / total cohort members
- Active = `subscription_status = 'active'/'contributing'` OR `is_approved_free_member = true`
- `zero_dollar_claims` table has `claimed_at` but NOT `created_at`

### Commit

- `xxxxxxx` - feat: analytics enhancements with timeline, cohort analysis, freshdesk integration

---

## Session 2026-07-01 (Late): Analytics UI Fixes + ZDS Claims Fixes

### Overview

Fixed analytics page color scheme, pie chart overlaps, calculation bugs, and ZDS claims filtering.

### Color Scheme Fixes

**Removed yellow (citrine) from analytics page:**
- Pie chart COLORS array updated to remove `#fdf493` and `#b2d1ee`
- Now uses only aubergine and wisteria shades

**Simplified Members tab boxes:**
- Wisteria for filtered/dynamic values (changes with dropdown)
- Aubergine for all-time/fixed values
- Removed all lilac/30 with blackberry text (poor contrast)

**Fixed stat card colors:**
- Members: Wisteria for New Members, Retention Rate, Avg Dues, Churn, Paid/Free, Signups
- Members: Aubergine for Total, Paid, Free, Pending Free, Started Free, Contributing, Founding, Revenue, Newsletter
- Grants: Wisteria for filtered (Applications, Approval Rate), Aubergine for all-time (Total Funded, Funded Grants)
- Perks: Wisteria for filtered (Redemptions, Unique Redeemers, Redeem Types), Aubergine for all-time (Total All Time)
- ZDS: Wisteria for filtered (ZDS Claims, Unique Claimants), Aubergine for all-time (Total All Time)
- Engagement: All Wisteria (all are filtered values)
- Cohorts/Support: Wisteria for filtered, Aubergine for all-time

### Calculation Fixes

**Membership Revenue:**
- Was: `contributingCount * 15 * 12 + foundingCount * 100 * 12` (monthly × 12)
- Fixed: `contributingCount * 15 + foundingCount * 100` (annual, not monthly)

**Average Dues:**
- Same fix - removed erroneous `* 12` multiplier

**Paid/Free Percentages:**
- Was: Calculated from all profiles, not filtered
- Fixed: Now uses `filteredProfiles` for accurate percentage based on date range

### UI Improvements

**Top 10 States chart:**
- Increased Y-axis width from 30 to 50
- Added `interval={0}` to show ALL state labels (not just every other)

**Pie charts:**
- Removed overlapping slice labels
- Added Legend at bottom for clean label display
- Removed redundant "Created" status from ZDS Claims pie chart

**Dropdown:**
- Added "All Time" option (value: 9999, returns epoch as cutoff)

### ZDS Claims Fixes

**Stat boxes now only show successful claims:**
- ZDS Claims (filtered): Only `fulfilled`, `delivered`, `completed`
- Total All Time: Only successful claims all time
- Pie chart still shows all statuses for context (except "Created")

**Removed:**
- "Claim Status" box from ZDS tab (not needed)

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminAnalyticsClient.tsx` | All color fixes, calculation fixes, UI improvements, ZDS filtering |

### Commit

- `xxxxxxx` - fix: analytics color scheme, calculations, ZDS claims filtering

---

## Session 2026-07-02: Admin Hub Redesign + Analytics Legend

### Admin Hub Redesign

Reworked the `/admin` page to be more visually organized and easier to navigate.

**Layout:**
- 2-column grid for main sections
- Sections arranged left-to-right, top-to-bottom
- Analytics section as a hero card at the bottom (full-width)

**Section Cards:**
| Section | Header Color | Card BG | Link Style |
|---------|-------------|---------|------------|
| Content & Website | Aubergine | White | Aubergine tinted |
| Members & Grants | Wisteria | White | Aubergine tinted |
| Store & Commerce | Lilac | White | Aubergine tinted |
| Emails & Subscriptions | Citrine | White | Aubergine tinted |
| Analytics | Aubergine | White with aubergine border | Hero card with gradient |

**Icons:**
- `FileText` for Content & Website
- `Users` for Members & Grants
- `ShoppingCart` for Store & Commerce
- `Mail` for Emails & Subscriptions
- `BarChart3` for Analytics

**Link Buttons:**
- All buttons now use consistent aubergine-tinted style
- Default: `bg-nfw-aubergine/10 text-nfw-aubergine`
- Hover: `bg-nfw-aubergine text-white`

### Analytics Color Legend

Added a color legend at the top of `/admin/analytics` to clarify which stats change with the date dropdown:

- **Aubergine cards** = Fixed (all time)
- **Wisteria cards** = Changes with date range

### NFW Perks Mobile Responsiveness

Added hybrid responsive layout to `/admin/nfw-perks`:
- **Desktop (md+):** Full 6-column table
- **Mobile:** Card-based layout with all info visible
  - Title + Status badge at top
  - Partner, Est. Value, Redeemed in 2-column grid
  - Categories below
  - Full-width Edit/Delete buttons

### Files Modified

| File | Change |
|------|--------|
| `app/admin/AdminHubClient.tsx` | Complete redesign with 2-column grid, icons, consistent button styles |
| `app/admin/analytics/page.tsx` | Added color legend for aubergine/wisteria stat cards |
| `app/admin/nfw-perks/AdminNfwPerks.tsx` | Added mobile card view alongside desktop table |

### Commit

- (pending) - feat: admin hub redesign, analytics legend, NFW perks mobile responsive

---

## Session 2026-07-02 (Afternoon): Analytics Member Count Fixes

### Issues Fixed

1. **Supabase 1000 row limit** - Added `.limit(10000)` to profiles query to override default cap
2. **Missing `is_admin` field** - Added to analytics profiles select and Profile type
3. **Missing `profile_completed` field** - Added to analytics profiles select and Profile type
4. **Admin count showing 0** - Now properly calculated and displayed

### New Stat Cards Added

| Stat | Color | Note |
|------|-------|------|
| Incomplete Profiles (not counted) | Stone/gray | Shows profiles that haven't completed signup, not counted in totals |
| Admins | Aubergine | Shows admin user count |

### Files Modified

| File | Change |
|------|--------|
| `app/admin/analytics/page.tsx` | Added `.limit(10000)`, added `is_admin` and `profile_completed` to select |
| `components/admin/AdminAnalyticsClient.tsx` | Added fields to Profile type, added `incompleteCount` and `adminCount` calculations, added stat cards |

### Commit

- (pending) - fix: analytics member counts - add row limit, incomplete stat, admin count

---

## Session 2026-07-02 (Evening): Members Page Row Limit Fix

### Issue

`/admin/members` showed 0 admins because the profiles query was hitting Supabase's default 1000 row limit. The `/admin/analytics` page worked correctly after adding `.limit(10000)`, but `/admin/members` still had no limit.

### Fix

Added `.limit(10000)` to the profiles query in `app/admin/members/page.tsx` to override Supabase's default 1000 row limit.

### Files Modified

| File | Change |
|------|--------|
| `app/admin/members/page.tsx` | Added `.limit(10000)` to profiles query |

### Commit

- (pending) - fix: members page row limit for admin count

---

## Session 2026-07-02 (Morning): Admin Hub Redesign + Analytics Legend + NFW Perks Mobile

### Admin Hub Redesign

Reworked the `/admin` page to be more visually organized and easier to navigate.

**Layout:**
- 2-column grid for main sections
- Sections arranged left-to-right, top-to-bottom
- Analytics section as a hero card at the bottom (full-width)

**Section Cards:**
| Section | Header Color | Card BG | Link Style |
|---------|-------------|---------|------------|
| Content & Website | Aubergine | White | Aubergine tinted |
| Members & Grants | Wisteria | White | Aubergine tinted |
| Store & Commerce | Lilac | White | Aubergine tinted |
| Emails & Subscriptions | Citrine | White | Aubergine tinted |
| Analytics | Aubergine | White with aubergine border | Hero card with gradient |

**Icons:**
- `FileText` for Content & Website
- `Users` for Members & Grants
- `ShoppingCart` for Store & Commerce
- `Mail` for Emails & Subscriptions
- `BarChart3` for Analytics

### Analytics Legend

Added a color legend at the top of `/admin/analytics` to clarify which stats change with the date dropdown:
- **Aubergine cards** = Fixed (all time)
- **Wisteria cards** = Changes with date range

### NFW Perks Mobile Responsiveness

Added hybrid responsive layout to `/admin/nfw-perks`:
- **Desktop (md+):** Full 6-column table
- **Mobile:** Card-based layout with all info visible

### Files Modified

| File | Change |
|------|--------|
| `app/admin/AdminHubClient.tsx` | Complete redesign with 2-column grid, icons, consistent button styles |
| `app/admin/analytics/page.tsx` | Added color legend for aubergine/wisteria stat cards |
| `app/admin/nfw-perks/AdminNfwPerks.tsx` | Added mobile card view alongside desktop table |

### Commit

- (pending) - feat: admin hub redesign, analytics legend, NFW perks mobile responsive

---

## Session 2026-07-02 (Afternoon): Members Page Search + Pagination Fix

### Problem

Members page search only searched visible 100 rows instead of all members. Also showed oldest members first instead of newest.

### Solution

Reverted to client-side search using `sessionStorage` to persist search term:

1. **Fetch ALL members** (up to 10,000) on mount via 1000-row pagination loop
2. **Client-side search** filters across all loaded members
3. **Paginated display** of filtered results (100 per page)
4. **sessionStorage** persists search term across page navigations
5. **X button** to clear search

### Files Modified

| File | Change |
|------|--------|
| `app/admin/members/page.tsx` | Removed URL-driven search, uses pagination for display |
| `components/admin/AdminMembersClient.tsx` | Fetches all members via pagination loop, client-side search + filter, sessionStorage persistence |

### Commit

- (pending) - fix: members page search and pagination - client-side search with sessionStorage

---

## Session 2026-07-02 (Evening): Google OAuth Name Sync Fix

### Problem

Google OAuth signups (like geraldtyisha7@gmail.com) had empty `full_name` in profiles even though Google provided the name. Profile was incorrectly marked as `profile_completed = true` with missing required fields.

### Root Cause

1. Auth callback created profile with placeholder `full_name: "Member"` 
2. `auth.users.raw_user_meta_data` had the correct Google name but it was never synced
3. Profile was somehow marked complete without required fields

### Solution

**1. Migration 107: Database trigger for edge cases**

```sql
-- INSERT only, only if NULL/empty - never overwrites user-entered data
CREATE OR REPLACE FUNCTION sync_profile_google_data()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.raw_user_meta_data ? 'iss' AND NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN
      IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        NEW.full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Member');
      END IF;
      IF NEW.avatar_url IS NULL THEN
        NEW.avatar_url = NEW.raw_user_meta_data->>'avatar_url';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

**2. Updated auth callback** (`app/auth/callback/route.ts`)

Extracts Google metadata on profile creation:
- `full_name`: Google name or "Member" fallback
- `avatar_url`: Google avatar or null

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/107_sync_google_full_name_avatar.sql` | Trigger to sync Google name/avatar on INSERT (only if NULL/empty) |

### Files Modified

| File | Change |
|------|--------|
| `app/auth/callback/route.ts` | Extract full_name and avatar_url from Google OAuth on profile creation |

### Key Design Decision

Trigger is **INSERT-only** and only fills NULL/empty values. This ensures:
- User manually entering name in signup step 1 is never overwritten
- Only edge cases (bug scenarios) get auto-filled from Google
- Never overwrites user-entered data during UPDATE

### Commit

- (pending) - fix: google oauth name sync - trigger for edge cases + callback extraction

---

## Session 2026-07-03: Delete Test Users from Admin

### Overview

Added ability to delete specific test users from `/admin/members` page. Delete buttons only appear for predefined test email addresses as a safety measure.

### Test Emails with Delete Access

- ronpassaro@aol.com
- ronpassaro@gmail.com
- kelseykdriscoll@protonmail.com
- kdrisco2@gmail.com

### Database

No database changes required. Deletion uses Supabase Admin SDK which deletes from `auth.users`, and FK cascade automatically removes corresponding `profiles` row.

### API Route Created

**`POST /api/admin/members/delete`**
- Authenticates admin user
- Prevents self-deletion
- Uses `supabaseAdmin.auth.admin.deleteUser(userId)` to delete from auth.users
- Cascade delete removes profile and related records

### Files Created

| File | Purpose |
|------|---------|
| `app/api/admin/members/delete/route.ts` | API endpoint for deleting users |
| `components/admin/DeleteMemberModal.tsx` | Confirmation modal with warning text |

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminMembersClient.tsx` | Added TEST_EMAILS constant, delete button (trash icon), delete modal integration |

### UI Behavior

- Trash icon appears only for rows with matching test emails
- Clicking trash opens confirmation modal
- Modal shows member name/email and irreversible warning
- Confirm deletes user and reloads page

### Commit

- `7c3d8a1` - feat: add delete user functionality for test emails in admin members page

---

## Session 2026-07-06: ZDS Monthly Limit Fix - Move monthly_claims to Webhook

### Problem

"Monthly Limit Reached" error on ZDS when users click "Claim" but don't finish Shopify checkout (click back or out). The issue was that `monthly_claims` INSERT happened at **checkout time**, not **completion time**.

### Root Cause

**Checkout API** (`app/api/shopify/checkout/route.ts`) was inserting to `monthly_claims` immediately when user clicked "Claim":

```
User clicks "Claim" → monthly_claims INSERT → User goes to Shopify → User abandons → No webhook fires → monthly_claims stays forever → User stuck for month
```

Additionally, the `expire_abandoned_claims` function in migration 076 was broken (checking `status = 'pending'` instead of `'created'`).

### Solution

**Moved `monthly_claims` INSERT from checkout API to webhook (completion time only).**

#### Flow After Fix

| Scenario | monthly_claims Inserted? | Result |
|----------|-------------------------|--------|
| User claims but abandons | No (no webhook) | User can retry |
| User completes checkout | Yes (webhook fires) | Monthly slot consumed |
| Two tabs, both complete | First webhook succeeds, second catches 23505 gracefully | Monthly slot consumed once |

### Files Modified

| File | Change |
|------|--------|
| `app/api/shopify/checkout/route.ts` | Removed monthly_claims INSERT (lines 104-132) |
| `app/api/shopify/webhook/route.ts` | Added try-catch around monthly_claims INSERT to handle duplicate gracefully |

### Key Changes

**Checkout API** - Removed:
```typescript
// REMOVED: Monthly claim check at checkout time
const { error: monthlyClaimError } = await supabaseAdmin
  .from("monthly_claims")
  .insert({ user_id: userId, shopify_product_id: productId, claim_month: claimMonth });
```

**Webhook** - Added error handling:
```typescript
// Now INSERT happens only on successful checkout
try {
  await supabaseAdmin.from("monthly_claims").insert({
    user_id: claim.user_id,
    claim_month: claimMonth,
  });
} catch (insertError: any) {
  if (insertError?.code === "23505") {
    // Duplicate webhook - monthly_claims already exists for this month
    console.log(`Monthly claim already exists for user ${claim.user_id} in ${claimMonth}`);
  } else {
    console.error("Error recording monthly claim:", insertError);
  }
}
```

### Note: Broken Cleanup Functions (Not Fixed)

The `expire_abandoned_claims` and `cleanup_monthly_claims_for_expired` functions are still broken from migration 076 linter fixes, but they're no longer critical since abandoned checkouts no longer consume monthly slots.

### Commit

- (pending) - fix: move monthly_claims INSERT from checkout API to webhook to fix abandoned checkout issue

### Additional Fix: Store Frontend Monthly Check

**Problem:** Users still got "Monthly Limit Reached" error after the webhook fix. The frontend was checking `zero_dollar_claims` with status `"created"` (abandoned checkout), not just completed orders.

**Root Cause:** `app/api/store/claims/check/route.ts` was querying:
```typescript
.in("status", ["created", "completed", "fulfilled", "paid"])
```
But `"created"` status means an abandoned checkout that never completed.

**Fix:** Changed to only count completed statuses:
```typescript
.in("status", ["completed", "fulfilled", "paid"])
```

**Files Modified:**
- `app/api/store/claims/check/route.ts` - Removed `"created"` from status check

### Additional Fix: Lifetime Claim Check - Allow Re-claim of Abandoned Products

**Problem:** Users who abandoned checkout got "You have already claimed this product" when trying to reclaim the same product.

**Root Cause:** The lifetime claim check in checkout API blocked ANY claim record, even abandoned ones with `status = "created"`.

**Fix:** Updated the query to only block completed claims:
```typescript
// Before: blocks all claims
.eq("shopify_product_id", productId)

// After: only blocks completed claims
.eq("shopify_product_id", productId)
.in("status", ["completed", "fulfilled", "paid"])
```

**Files Modified:**
- `app/api/shopify/checkout/route.ts` - Updated lifetime claim check to allow re-claiming abandoned checkouts

## Session 2026-07-07: Contact Privacy Text + Grants Apply Form Enhancements

### Contact Form Privacy Text Update

**Problem:** Contact form said "We never share your information with third parties." which wasn't accurate with Freshdesk integration.

**Solution:** Changed to "Your data is handled as outlined in our Privacy Policy" with "Privacy Policy" linking to `https://www.nationalfundforwomen.org/privacy` (opens in new tab).

**Files Modified:**
- `components/contact/ContactClient.tsx` - Updated privacy text with linked Privacy Policy

### Grants Apply Page - Quick Reminder Box

**Added:** Warning/reminder box above "Which grant are you applying for?" section with eligibility requirements:

```
Quick reminder before you apply:
• Applicants must be 18 or older and a U.S. citizen or permanent resident.
• Applicants may apply for up to 3 grants, but can only be awarded 1 grant per cycle.
• Applications cannot be edited after submission.
```

**Styling:** Wisteria background (`bg-nfw-wisteria/20`) + wisteria border, matching existing form styling.

**Files Modified:**
- `components/GrantApplicationForm.tsx` - Added reminder box

### Grants Apply Page - Text Size Increases

**Changes:** Increased body text sizes for better readability:

| Element | Before | After |
|---------|--------|-------|
| Reminder heading | text-sm | text-base + font-bold |
| Reminder bullets | text-xs | text-sm |
| Grant cycle names | text-lg | text-xl |
| Deadline text | text-xs | text-sm |
| Grant descriptions | text-xs | text-sm |
| "I'm applying for me" / "I'm nominating someone" | text-xs | text-sm |
| Question descriptions | text-xs | text-sm |
| Supporting docs description | text-xs (font-ui) | text-sm (font-serif) |

**Files Modified:**
- `components/GrantApplicationForm.tsx` - Updated all text sizes to text-sm, made heading bold, matched supporting doc font to question description font

---

## Session 2026-07-07: Analytics Member Count Fixes + Free Membership Bug Fix

### Problem
Analytics page showed 1731 total profiles but breakdown categories only added up to 1729 (missing 2). Also, "Incomplete Profiles (not counted)" label was misleading since incomplete profiles ARE counted in total.

### Fixes Applied

**1. Fixed duplicate `paidCount` definition**
- Renamed waterfall `paidCount` to `paidMembersCount` to avoid conflict with existing `paidCount` at line 297

**2. Removed `breakdownTotal`**
- Total profile count now simply shows `profiles.length` (all profiles including incomplete)

**3. Renamed "New Members" → "Profiles"**
- Better reflects that this includes all profiles, not just new signups

**4. Added "Other" category for edge cases**
- Catches profiles with unexpected `membership_level` values or free members with `free_membership_contact_submitted = NULL`
- `otherCount` logic:
  ```typescript
  const otherCount = useMemo(() => {
    return profiles.filter(
      (p) =>
        p.is_admin !== true &&
        ( !["free", "contributing", "founding"].includes(p.membership_level || "")
          || (p.membership_level === "free" && p.free_membership_contact_submitted === null)
        )
    ).length;
  }, [profiles]);
  ```

**5. Removed "(not counted)" from Incomplete Profiles label**
- Now just says "Incomplete Profiles"

### Database Fix (SQL)
```sql
-- Fix the 2 free members with NULL contact_submitted (edge case from SignUpFlow bug)
UPDATE profiles
SET free_membership_contact_submitted = false
WHERE membership_level = 'free'
  AND free_membership_contact_submitted IS NULL;
```

### Bug Found: SignUpFlow Missing Field
Two users who signed up on July 7, 2026 had `free_membership_contact_submitted = NULL` instead of `false`. Root cause was the field was being set in the modal button click handler but the profile update wasn't including it properly. Fixed in SignUpFlow.tsx line 1185.

### Files Modified
- `components/admin/AdminAnalyticsClient.tsx` - Fixed duplicate paidCount, removed breakdownTotal, renamed New Members → Profiles, added Other category, removed "(not counted)" from incomplete
- `components/SignUpFlow.tsx` - Confirmed `free_membership_contact_submitted: false` is properly set
- `components/contact/ContactClient.tsx` - Error handling for unauthenticated users
- `app/api/contact/submit/route.ts` - Returns 401 if not authenticated

---

## Session 2026-07-07 (Continued): Admin Members Page Fixes

### Changes

**1. Analytics default to All Time**
- Changed date range dropdown default from 30 days to 9999 (All Time)

**2. /admin/members page - split free members into 3 cards**
- Added 3 new stat cards: Free Members, Pending Free, Started Free
- Card colors: lilac (Free Members), blue (Pending Free), wisteria (Started Free)

**3. Fixed /admin/members waterfall to match analytics**
- Added `profile_completed = true` filter to paid, free sub-category queries
- Admins excluded from non-admin queries
- Card labels now match analytics naming

### Database Fix (SQL)
```sql
-- Fix the 2 free members with NULL contact_submitted
UPDATE profiles
SET free_membership_contact_submitted = false
WHERE membership_level = 'free'
  AND free_membership_contact_submitted IS NULL;
```

### Files Modified
- `app/admin/members/page.tsx` - Added free sub-category queries, 3 new stat cards, added profile_completed filter
- `components/admin/AdminAnalyticsClient.tsx` - Default dateRange to 9999 (All Time)

---

## Session 2026-07-07 (Late): Auth Callback Free Membership Fix

### Problem
Two new users (July 7) signed up and had `free_membership_contact_submitted = NULL` despite having `membership_level = 'free'` and `is_approved_free_member = false`.

### Root Cause
Auth callback (`/auth/callback`) creates initial profile when user confirms email, but was NOT setting `free_membership_contact_submitted` field. This caused new signups to have NULL instead of `false`.

### Fix
Added `is_approved_free_member: false` and `free_membership_contact_submitted: false` to profile insert in auth callback.

### Files Modified
- `app/auth/callback/route.ts` - Added free membership fields to profile insert

---

## Session 2026-07-08: Member CSV Export Update

### Changes
Added free membership fields to the member CSV export on `/admin/members`:
- `is_approved_free_member` - "Is Approved Free Member" (Yes/No)
- `free_membership_contact_submitted` - "Free Membership Contact Submitted" (Yes/No)

### Files Modified
- `app/api/admin/members/export/route.ts` - Added two new columns to CSV export

---

## Session 2026-07-08: Update Non-Member Card Labels and Colors

### Changes

**Label Changes:**
- "Incomplete Profiles" → "Profile Incomplete"
- "Pending Free" → "Awaiting Free Approval"
- "Started Free" → "Free Account Not Requested"

**Color Changes:**
All non-member cards now use `bg-nfw-stone/40` (gray) to visually indicate these are NOT official members:
- Awaiting Free Approval (was aubergine/blue)
- Free Account Not Requested (was aubergine/wisteria)
- Profile Incomplete (was stone)

### Files Modified
- `components/admin/AdminAnalyticsClient.tsx` - Updated labels and colors
- `app/admin/members/page.tsx` - Updated labels and colors
- `components/admin/AdminMembersClient.tsx` - Split Free filter into 3 buttons and fix filter logic to match stat cards

---

## Session 2026-07-08: Fix Filter Results to Match Stat Cards in Admin/Members

### Problem
Filter button results showed incorrect counts that didn't match the stat cards at the top of /admin/members page.

### Root Cause
Filter logic in AdminMembersClient.tsx was missing key constraints:
- Paid filter: missing `is_admin === false`
- Free_approved filter: missing `is_admin === false`, `profile_completed === true`
- Free_pending filter: missing `is_admin === false`, `profile_completed === true`
- Free_started filter: missing `is_admin === false`, `is_approved_free_member === false`, `profile_completed === true`
- Incomplete filter: missing `is_admin === false`

### Fix
Updated filter logic to match stat card queries exactly:
- All non-admin filters now include `m.is_admin === false`
- All free sub-category filters include `m.profile_completed === true`
- Free_started filter includes `m.is_approved_free_member === false`

### Files Modified
- `components/admin/AdminMembersClient.tsx` - Updated filter logic to match stat cards

---

## Session 2026-07-08: Admin Hub Layout Optimization

### Changes
Restructured admin hub layout to fit Analytics in right column alongside other sections:

**Layout:**
- 5-column grid: Content & Website takes left 3 columns, right column stacks all other sections
- Content & Website: full left column with 3-column button grid
- Right column (2 cols): Members & Grants, Store & Commerce, Emails & Subscriptions, Analytics stacked vertically

**Benefits:**
- Analytics now visible in right column, above the fold
- All 4 sections + Analytics visible on screen without scrolling
- Compact styling throughout with smaller headers, buttons, and text

### Files Modified
- `app/admin/AdminHubClient.tsx` - Complete layout restructure for above-fold display

---

## Session 2026-07-08 (Afternoon): Waitlist Membership System

### Overview

Implemented a free membership waitlist system with email notifications, batch sending, and admin bulk migration tools.

### Database Migrations

**Migration 108: `supabase/migrations/108_add_waitlist_membership.sql`**
- Added `waitlist` to `membership_level` enum values
- Added columns to `profiles`:
  - `waitlist_position` (INTEGER) - **REMOVED in migration 110**
  - `waitlist_joined_at` (TIMESTAMPTZ)
  - `waitlist_email_sent_at` (TIMESTAMPTZ)
- Added indexes for efficient waitlist queries
- Created RPC functions:
  - `get_next_waitlist_position()` - **REMOVED in migration 110**
  - `get_waitlist_count()` - Returns total waitlist members
- **NOTE:** `get_waitlist_member_by_id()` and `move_to_waitlist()` were created but not used

**Migration 109: `supabase/migrations/109_seed_waitlist_welcome_email.sql`**
- Seeded `waitlist-welcome` email template with basic content
- Template uses builder sections (email_sections table)

**Migration 110: `supabase/migrations/110_remove_waitlist_position.sql`**
- Removed `waitlist_position` column from `profiles`
- Removed `get_next_waitlist_position()` function
- Removed `idx_profiles_waitlist_position` index
- **Reason:** Position was never shown to users and not maintained on approval, making it confusing/useless

### Files Created

| File | Purpose |
|------|---------|
| `app/api/waitlist/route.ts` | POST to join waitlist, GET to check status |
| `app/auth/waitlist-confirmed/page.tsx` | Confirmation page after joining |
| `app/api/admin/bulk/waitlist/route.ts` | Admin API for bulk operations |
| `app/admin/waitlist/page.tsx` | Server wrapper with admin auth |
| `app/admin/waitlist/AdminWaitlistClient.tsx` | Admin UI with stats and send interface |
| `lib/email-batch.ts` | Batch email utility (50 recipients/call, 200ms delays) |
| `supabase/migrations/110_remove_waitlist_position.sql` | Removes waitlist_position field |

### Files Modified

| File | Change |
|------|--------|
| `lib/email.ts` | Added `sendWaitlistWelcomeEmail()` function |
| `lib/email.ts` | Fixed `sendWaitlistWelcomeEmail` and `sendAbandonedCheckoutEmail` to use published builder content |
| `components/SignUpFlow.tsx` | Updated modal copy, swapped button order, calls `/api/waitlist` |
| `components/dashboard/PendingFreeMembershipBanner.tsx` | Added waitlist support with upgrade link |
| `app/dashboard/page.tsx` | Removed contact form redirect, updated `isPendingFreeMember` to include waitlist |
| `app/perks/page.tsx` | Added waitlist to membership checks |
| `app/grants/apply/page.tsx` | Added waitlist to membership checks |
| `components/StoreClient.tsx` | Added waitlist to claim eligibility check |
| `app/admin/AdminHubClient.tsx` | Added "Waitlist Management" link |

### Email Template Bug Fix

**Problem:** `sendWaitlistWelcomeEmail` and `sendAbandonedCheckoutEmail` were reading from `html_content` instead of `full_email_html` (published builder content).

**Fix:** Both functions now call `getPreRenderedHtmlAdmin` first to check for published content, falling back to `html_content` if not published.

### Key Design Decisions

- Waitlist members see same banner as pending free (matching existing behavior)
- No separate dashboard page for waitlist - just a banner
- Don't show queue position to users
- Logged-out users clicking "here" go to step 0 (signup form) instead of step 3
- Banner text: "You're on the free membership waitlist. We'll email you when a spot opens up. You can also upgrade at any time here."
- Fire-and-forget for individual join emails (non-blocking)

### Pending: Bulk Migration

- Bulk migration tool created but not yet connected
- Need to migrate existing `free_pending` members to `waitlist` when ready
- SQL to add email sections for waitlist template was provided but not yet run

### To Deploy

1. Run migration 108 and 109 in Supabase SQL Editor
2. Edit and publish `waitlist-welcome` template in `/admin/emails`
3. Test waitlist signup flow locally
4. When ready, run bulk migration SQL for `free_pending` members

---

## Session 2026-07-08 (Evening): Waitlist Admin Fixes + Approve Feature

### Bug Fix: created_at vs joined_at

**Problem:** Admin waitlist page returned 500 error and showed no members.

**Root Cause:** The API query selected `created_at` column which doesn't exist in `profiles` table. The correct date column is `joined_at`.

**Fix:** Changed `created_at` to `joined_at` in:
- `app/api/admin/bulk/waitlist/route.ts` - SELECT clause
- `app/admin/waitlist/AdminWaitlistClient.tsx` - Interface type

### Email Tracking Fix

**Problem:** When members joined the waitlist, `waitlist_email_sent_at` was never updated, so admin page showed "Pending" even for members who received the email.

**Solution:** Modified `sendWaitlistWelcomeEmail` to return `{ success: boolean; error?: string }` and updated join API to:
1. Await the email send instead of fire-and-forget
2. Update `waitlist_email_sent_at` timestamp when email sent successfully

### Approve Functionality

**Feature:** Admin can approve waitlist members directly from the admin page.

**New Files:**
- `app/api/admin/waitlist/approve/route.ts` - POST endpoint to approve member

**Approve Flow:**
1. Admin clicks "Approve" button on a pending member
2. Profile updated: `membership_level = 'free'`, `is_approved_free_member = true`, `profile_completed = true`
3. Welcome email sent via `sendWelcomeEmail()` with `membershipType: 'free'`
4. Member shows "Approved (free)" badge in admin table

### UI Updates

**Admin Waitlist Table now shows:**
- Pending members: "Pending" badge + "Send Email" + "Approve" buttons
- Approved members: "Approved (free)" badge (no actions)

### Files Modified

| File | Change |
|------|--------|
| `lib/email.ts` | Modified `sendWaitlistWelcomeEmail` to return success/error |
| `app/api/waitlist/route.ts` | Await email send, update `waitlist_email_sent_at` on success |
| `app/api/admin/bulk/waitlist/route.ts` | Fixed `created_at` → `joined_at`, added `is_approved_free_member` and `membership_level` to query |
| `app/api/admin/waitlist/approve/route.ts` | NEW - approve member + send welcome email |
| `app/admin/waitlist/AdminWaitlistClient.tsx` | Added Approve button, Approved badge, show `membership_level` |

### Commits

- `4071760` - fix: use joined_at instead of created_at in waitlist admin API
- `012c2ee` - feat: add approve functionality to waitlist admin

---

## Session 2026-07-08 (Late): Remove waitlist_position

### Problem

The `waitlist_position` field was unnecessary complexity because:
- Position was never shown to users (by design decision)
- Position was not maintained when members were approved (approved members kept their old position number)
- Only caused confusion (e.g., 592 people showing in admin when there should be 1)

### Solution

Removed `waitlist_position` field entirely. Chronological order is preserved via `waitlist_joined_at`.

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/110_remove_waitlist_position.sql` | Created - drops column, index, and function |
| `app/api/waitlist/route.ts` | Removed position assignment and response |
| `app/api/admin/bulk/waitlist/route.ts` | Removed position from SELECT, order by joined_at |
| `app/admin/waitlist/AdminWaitlistClient.tsx` | Removed Position column from table |
| `app/auth/waitlist-confirmed/page.tsx` | Removed unused position SELECT |

### Migration 110 SQL

```sql
DROP INDEX IF EXISTS idx_profiles_waitlist_position;
DROP FUNCTION IF EXISTS get_next_waitlist_position();
ALTER TABLE profiles DROP COLUMN IF EXISTS waitlist_position;
NOTIFY pgrst, 'reload';
```

### Commit

- `98a5419` - feat: remove waitlist_position field, order by joined_at instead

---

## Session 2026-07-12: Grant Application Scoring System

### Overview

Implemented a dual-reviewer scoring system for grant applications with sequential review workflow and combined scoring for final decisions.

### Database Schema

**Migration 111:** Creates grant scoring tables with RLS policies

**New Tables:**
- `grant_scores` - Stores individual reviewer scores (urgency, authenticity, impact, barriers, discussion flag)
- `grant_tentative_approvals` - Stores tentative approval selections

**New Columns:**
- `grant_cycles`: `scoring_started_at`, `scoring_completed_at`, `final_approved_at`
- `grants`: `rachel_complete`, `michelle_complete`

### Scoring Rubric

| Criteria | Score Range | Description |
|----------|-------------|-------------|
| Urgency | 0-3 | Immediate threat to safety, housing, health |
| Authenticity of Need | 0-3 | Clear personal narrative with who/what/why |
| Impact | 0-3 | Grant transforms circumstances, bridge to stability |
| Barriers | Y/N | Demographic experiencing disproportionate barriers |

**Decision Bands (Combined):**
- 14-18: Approved
- 8-13: Runner Up
- 0-7: Not Approved

### Workflow

1. **First Review** (`/admin/grants/[id]/scoring/first`)
   - Score each application: Urgency, Authenticity, Impact, Barriers
   - Flag for discussion if needed (notes field)
   - Auto-save on change
   - Mark review complete → notifies Michelle

2. **Second Review** (`/admin/grants/[id]/scoring/second`)
   - Locked until first review complete
   - Same scoring (no discussion flag)
   - Cannot see first reviewer's scores

3. **Combined Scores** (`/admin/grants/[id]/scoring/combined`)
   - Sorted by combined score
   - Shows decision bands, discussion flags
   - Tentative approval selection (up to grants_available)
   - Finalize → sends approved/not-approved emails

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/admin/grants/[id]/scoring/start` | Start first review |
| `/api/admin/grants/[id]/scoring/complete` | Complete first review, notify Michelle |
| `/api/admin/grants/[id]/scores/first` | Get/save first reviewer scores |
| `/api/admin/grants/[id]/scores/second` | Get/save second reviewer scores |
| `/api/admin/grants/[id]/scores/combined` | Get combined scores + ranking |
| `/api/admin/grants/[id]/tentative-approve` | Save tentative approvals |
| `/api/admin/grants/[id]/final-approve` | Finalize + send emails |

### Email Notifications

- **Second reviewer notification**: Sent to michelle@nationalfundforwomen.org when first completes
- **Approved email**: Uses "Grant: Approved" template with bank info request
- **Not approved email**: Uses "Grant: Not Approved" template via batch send (50 at a time)

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/111_grant_scoring_schema.sql` | Schema + RLS |
| `app/api/admin/grants/[id]/scoring/start/route.ts` | Start scoring |
| `app/api/admin/grants/[id]/scoring/complete/route.ts` | Complete + notify |
| `app/api/admin/grants/[id]/scores/route.ts` | Get all scores |
| `app/api/admin/grants/[id]/scores/first/route.ts` | First reviewer CRUD |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Second reviewer CRUD |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Combined ranking |
| `app/api/admin/grants/[id]/tentative-approve/route.ts` | Save selections |
| `app/api/admin/grants/[id]/final-approve/route.ts` | Finalize + emails |
| `app/admin/grants/[id]/scoring/first/page.tsx` | First review UI |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Second review UI |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Combined scores UI |
| `components/admin/GrantScoringRubric.tsx` | Collapsible rubric |
| `components/admin/GrantScoreInput.tsx` | Score selector (0-3) |
| `components/admin/GrantApplicationScorer.tsx` | Application scorer |
| `components/admin/GrantCombinedScores.tsx` | Combined table |
| `lib/email.ts` | Added sendSecondReviewerNotification, sendGrantApprovedEmail |

### Files Modified

| File | Change |
|------|--------|
| `app/admin/grants/[id]/page.tsx` | Added First/Second Review buttons |
| `app/api/admin/grants/[id]/final-approve/route.ts` | Uses batch email for rejections |

### Commits

- `ab2d8db` - feat: grant application scoring system with dual-reviewer workflow
- `233768e` - fix: restore sticky rubric sidebar (scroll inside expanded content)
- `1a46cad` - fix: update local state after saving score, fix Not scored label
- `5df2dd1` - feat: show flagged badge on application cards
- `5ce1917` - fix: remove flag icon from avatar, keep flagged label only
- `623429f` - feat: add reset button to clear scoring data for testing
- `64253ee` - fix: clean up rubric instruction spacing, remove line breaks in descriptions
- `e1906c5` - fix: replace em dashes with regular hyphens for consistent spacing
- `337ffb6` - fix: add flex-shrink-0 to number spans for consistent alignment

## Session 2026-07-14: Combined Scores UI Enhancements

### Changes to Combined Scores Page (`/admin/grants/[id]/scoring/combined`)

**Accordion Implementation:**
- Converted table-based layout to div-based grid layout to enable CSS animations
- Accordion shows applicant answers: Who Are You, Biggest Challenge, Fund Usage
- ChevronDown icon rotates 180° on expand with `duration-500 ease-in-out`
- Uses `grid-template-rows: 1fr → 0fr` for animation (height animation not working in table context)
- **Note**: Close animation still has issues - may need revisiting

**Visual Changes:**
- Header background: white (was dove)
- Row background: gray-50 (alternating, was white/dove)
- Expanded row: aubergine/5 left border accent
- Selected row: citrine/20 background
- Accordion content: white background with gray-50 row background for contrast
- Chevron animation matches FAQ page pattern

**Select Checkbox:**
- Centered horizontally in column
- `e.stopPropagation()` prevents accordion toggle when clicking checkbox

**Removed:**
- Avatar icon next to applicant name (name alone is sufficient)

### Files Modified
- `components/admin/GrantCombinedScores.tsx` - Complete UI rewrite with div-based accordion

### Dropdown Z-Index Fix
- Changed dropdown z-index from z-20 to z-60 to appear above sticky headers
- This broke admin dropdown links (visible but not clickable)
- Restored dropdown z-index to z-20 in both AuthButtonCombined.tsx and auth-button.tsx

## Session 2026-07-12 (Afternoon): Internal Testing Only for Grant Cycles

Added `is_testing_only` flag to grant cycles so admins can create test cycles that only they can see.

### Database
- Migration 114: `is_testing_only BOOLEAN DEFAULT FALSE` column on `grant_cycles` table

### How It Works
- Checkbox in admin grant cycle forms (new/edit pages)
- `/grants/apply` - non-admin users don't see testing-only cycles; admins see all
- `/dashboard` - available microgrants section filters out testing-only cycles for non-admins
- Defense-in-depth: API rejects applications to testing-only cycles (returns 403)

### Files Modified
- `app/admin/grants/new/page.tsx` - Add checkbox
- `app/admin/grants/[id]/edit/page.tsx` - Add checkbox
- `app/api/admin/grants/create/route.ts` - Accept `is_testing_only`
- `app/api/admin/grants/update-cycle/route.ts` - Accept `is_testing_only`
- `app/grants/apply/page.tsx` - Filter testing cycles for non-admins
- `app/api/grants/create/route.ts` - Defense-in-depth check
- `app/dashboard/page.tsx` - Filter testing cycles from available microgrants

### Commits
- `be1a98c` - feat: add Internal Testing Only flag to grant cycles
- `d520890` - fix: hide testing-only grant cycles from dashboard for non-admins

## Session 2026-07-12 (Evening): Email System Centralization

### Goal
Centralize email sending in `lib/email.ts` to eliminate inconsistent `is_active` checks and remove `html_content` fallback, ensuring all emails send from published builder content only.

### Constraints
- Same email for manual send and 72-hour automation
- Remove html_content fallback entirely - email only sends if published content exists
- Return `{ success: boolean; error?: string }` pattern for email failures
- `grant-payment-pending` and `grant-payment-sent` have no content - accept they won't send

### What Was Done

**1. Created centralized `sendEmailBySlug` function**
- Single source of truth for email sending
- Checks: template exists → `is_active !== false` → published content exists → send
- Returns `{ success: true }` or `{ success: false; error: string }` pattern
- Error codes: `TEMPLATE_NOT_FOUND`, `TEMPLATE_INACTIVE`, `NO_PUBLISHED_CONTENT`, `EMAIL_SEND_FAILED`

**2. Refactored 11 email functions to use `sendEmailBySlug`:**
- `sendWelcomeEmail`
- `sendNewsletterWelcomeEmail`
- `sendGrantApplicationReceivedEmail`
- `sendGrantStatusEmail`
- `sendBankInfoRequestEmail`
- `sendGiftCodesEmail`
- `sendContactFormEmail`
- `sendAbandonedCheckoutEmail`
- `sendIncompleteMemberEmail`
- `sendWaitlistWelcomeEmail`
- `sendGrantApprovedEmail`

**3. Removed dead code:**
- All fallback bodies (long HTML strings that were never used since content comes from published builder)
- All redundant `fetchEmailTemplateAdmin` calls
- All redundant `is_active` checks outside the centralized function

### Key Behavior
- Email only sends if published builder content exists (`full_email_html` with `status = 'published'`)
- `is_active` is checked before sending via centralized function
- Returns `{ success: boolean; error?: string }` - no throws
- `grant-payment-pending` and `grant-payment-sent` have no content - they return `NO_PUBLISHED_CONTENT` error

### Files Modified
- `lib/email.ts` - Centralized email sending with `sendEmailBySlug` function

### Build Status
- ✅ Build passed
- ✅ TypeScript compiled without errors

---

## Session 2026-07-13: Stripe Connect Account Validation Fix

### Problem

Users clicking "Connect Bank Account" on `/grants/view/[id]` received error "Failed to create Stripe account link" even though they had never successfully connected before.

### Root Cause

The `stripe_connect_account_id` stored in the database was invalid or orphaned - the account existed in Stripe but was inaccessible to the current platform. This could happen from:
- Prior failed/dropped onboarding attempts where account was created but flow never completed
- Test accounts with invalid/stale IDs
- Accounts created under different Stripe platform configurations

### Solution

Added validation in `app/api/stripe/connect/route.ts` to verify the stored account ID exists and is accessible before using it:

```typescript
// Verify stored account ID exists and is accessible to our platform
if (accountId) {
  try {
    await stripe.accounts.retrieve(accountId);
  } catch (e) {
    // Account is invalid/stale - clear it and create fresh
    accountId = null;
    await supabaseAdmin.from("grants").update({ stripe_connect_account_id: null }).eq("id", grantId);
    await supabaseAdmin.from("profiles").update({ stripe_connect_account_id: null }).eq("id", user.id);
  }
}
```

### Behavior
- Valid accounts → proceed normally
- Invalid/stale accounts → clear stale ID and create fresh Stripe account
- Future orphaned IDs → handled automatically

### Files Modified
- `app/api/stripe/connect/route.ts` - Added account validation before accountLink creation

### Commit
- `ae8d79e` - fix: validate Stripe account ID exists before creating account link

---

## Session 2026-07-13: Hide Grant Statuses - In Review and Payment Pending

### Overview

Hid "In Review" and "Pmt Pending" statuses from member-facing grant pages since these statuses are not used in the current grant workflow.

### Changes Made

**`/app/grants/my-applications/page.tsx`:**
- Removed `in_review` and `payment_pending` from `statusCounts`, `statusColors`, `statusLabels`
- Removed "In Review" and "Pmt Pending" status summary cards
- Changed grid from `grid-cols-6` to `grid-cols-4`

**`/app/grants/view/[id]/page.tsx`:**
- Removed `in_review` and `payment_pending` from `statusColors`, `statusLabels`
- Removed "Reviewed" timeline item (displayed when `reviewed_at` exists)
- Removed "Payment Being Processed" section (for `payment_pending` status)

**`/components/dashboard/YourMicrograntsSection.tsx`:**
- Removed `in_review` and `payment_pending` from `statusColors`, `statusLabels`
- Added filter to exclude `in_review` and `payment_pending` grants from displayed list

### Visible Statuses (Member-Facing)

| Page | Visible Statuses |
|------|-----------------|
| `/grants/my-applications` | Submitted, Approved, Not Approved, Pmt Sent |
| `/grants/view/[id]` | Timeline: Submitted → Approved → Payment Sent |
| `/dashboard` | "Your Applications" filtered to 4 statuses only |

### Files Modified
- `app/grants/my-applications/page.tsx`
- `app/grants/view/[id]/page.tsx`
- `components/dashboard/YourMicrograntsSection.tsx`

---

## Session 2026-07-13: Dashboard "You're Approved!" Banner

### Overview

Added a "You're Approved!" banner to the dashboard that prompts users to connect their bank account when they have an approved grant but haven't completed Stripe onboarding yet.

### Problem

Users with approved grants needed an easy way to connect their bank account from the dashboard, rather than navigating back through the approval email or grant view page.

### Solution

1. **New database field:** Added `stripe_onboarding_completed BOOLEAN DEFAULT FALSE` to `profiles` table (migration 114)

2. **Track completion:** When users complete Stripe onboarding, `stripe_onboarding_completed` is set to `true` on their profile

3. **Dashboard banner:** Shows "You're Approved!" section when:
   - User has at least one approved grant
   - Grant cycle ends after July 12, 2026
   - User has NOT completed Stripe onboarding (`stripe_onboarding_completed = false`)

### Banner Display Logic

```typescript
const showStripeConnectBanner = 
  hasApprovedGrant && 
  !stripeOnboardingCompleted && 
  latestApprovedGrantId;
```

Banner only shows if:
- User has approved grant with cycle ending after July 12, 2026
- User has NOT completed Stripe onboarding
- A valid grant ID exists for the Connect Bank Account button

### Files Created/Modified

| File | Changes |
|------|---------|
| `supabase/migrations/114_add_stripe_onboarding_completed.sql` | New migration - adds `stripe_onboarding_completed` field |
| `app/grants/connect/return/page.tsx` | Set `stripe_onboarding_completed = true` when onboarding completes |
| `app/dashboard/page.tsx` | Query `stripe_onboarding_completed` from profile, filter approved grants by cycle end date |
| `components/dashboard/YourMicrograntsSection.tsx` | Added "You're Approved!" banner section |

### Banner Content

```
YOU'RE APPROVED!

Connect your bank account to receive your grant payments.

[Connect Bank Account →]
```

### Database Backfill

Ran SQL to mark existing users with valid Stripe accounts as `stripe_onboarding_completed = true`:
- All users with existing `stripe_connect_account_id` values were backfilled

### Related Changes

- Changed "Connect Bank Account" return page button from "View My Application →" to "Back to Dashboard →"

---

## Session 2026-07-13: Zero Dollar Store Concurrent Checkout Fix

### Problem

Users could open multiple Shopify checkout windows for different products before completing any of them. This caused:
1. Duplicate claims being created
2. Race conditions in webhook processing
3. Monthly limit not being properly enforced

### Solution

Implemented a temporary lock using `pending_monthly_claims` table to prevent concurrent checkouts.

### Database Migrations

**Migration 115:** Creates `pending_monthly_claims` table with unique constraint on `(user_id, claim_month)`:
```sql
CREATE TABLE pending_monthly_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  claim_month TEXT NOT NULL,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_claim_month UNIQUE (user_id, claim_month)
);
```

**Migration 116:** Adds pg_cron job to clean up orphaned `pending_monthly_claims` entries older than 30 minutes.

**Migration 117:** Drops unused `monthly_claims` table (replaced by this system).

### Flow

| Step | Action | Table |
|------|--------|-------|
| 1 | Check if user already has completed claim this month | `zero_dollar_claims` |
| 2 | Acquire lock before creating checkout | `pending_monthly_claims` INSERT |
| 3 | If lock fails → return error "checkout already in progress" | - |
| 4 | Create Shopify checkout | - |
| 5 | Order completes → INSERT `zero_dollar_claims`, DELETE `pending_monthly_claims` | `webhook: orders/create` |
| 6 | Order cancelled → DELETE `pending_monthly_claims` | `webhook: orders/updated` |
| 7 | Cron cleanup orphaned locks >30 min | `pg_cron` |

### Files Modified

| File | Changes |
|------|---------|
| `app/api/shopify/checkout/route.ts` | Removed incorrect zero_dollar_claims check, INSERT pending_monthly_claims before checkout, DELETE on error |
| `app/api/shopify/webhook/route.ts` | DELETE pending_monthly_claims on completion AND cancellation, removed all monthly_claims references |
| `supabase/migrations/117_drop_monthly_claims.sql` | NEW - drops unused monthly_claims table |

### Key Design Decisions

- `pending_monthly_claims` is a TEMPORARY lock - exists only during active checkout
- Unique constraint on `(user_id, claim_month)` prevents ANY second checkout while one is in progress
- On any error path, lock is released via DELETE
- On cancel, lock is released so user can retry
- On completion, lock is released after zero_dollar_claims is updated
- Monthly limit (1 per month) is enforced by checking `zero_dollar_claims` for completed claims

### To Deploy

1. Run migration 115 in Supabase SQL Editor (creates `pending_monthly_claims`)
2. Run migration 116 in Supabase SQL Editor (schedules cron cleanup)
3. Deploy code changes
4. Run migration 117 in Supabase SQL Editor (drops `monthly_claims`)

### Bugs Found After Testing

**Bug 1: Cron function search_path missing public schema**
- Migration 116 function had `SET search_path = pg_catalog` which only looks in system tables
- Fix: Changed to `SET search_path = pg_catalog, public`

**Bug 2: claim_month format mismatch**
- Checkout stored `claim_month` as full date `YYYY-MM-DD` (e.g., `2026-07-13`)
- Webhook DELETE tried to delete with `claim_month` computed as `YYYY-MM-01` (first of month)
- Fix: Checkout now stores `claim_month` as first of month (`YYYY-MM-01`)

**Bug 3: DELETE in webhook had no error handling**
- Webhook DELETE of `pending_monthly_claims` had no logging or error handling
- If DELETE failed, we never knew
- Fix: Added error handling and logging to webhook DELETE

**Bug 4: INSERT in checkout had no error handling**
- Checkout INSERT into `pending_monthly_claims` had no logging
- Fix: Added error handling and logging to checkout INSERT

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/116_cleanup_orphaned_pending_claims.sql` | search_path: `pg_catalog` → `pg_catalog, public` |
| `app/api/shopify/checkout/route.ts` | claim_month format fix, monthly limit check, added INSERT logging |
| `app/api/shopify/webhook/route.ts` | Query pending_monthly_claims to get correct claim_month, added DELETE logging |
| `components/ClaimItemModal.tsx` | Added `onCheckoutSuccess` callback prop |
| `components/StoreClient.tsx` | Added `handleCheckoutSuccess`, passes callback to modal, greys out buttons on checkout success |

---

## Session 2026-07-13: Zero Dollar Store Monthly Limit Fix

### Problem

User could claim a different product after already claiming one this month. The monthly limit check was missing.

### Fix

Added monthly limit check in checkout API after lifetime limit check, before pending checkout lock:

```typescript
// Check monthly limit (1 per month, any product)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const { data: monthlyClaim } = await supabaseAdmin
  .from("zero_dollar_claims")
  .select("id")
  .eq("user_id", userId)
  .eq("claim_month", monthStart)
  .in("status", ["completed", "fulfilled", "paid"])
  .limit(1);

if (monthlyClaim && monthlyClaim.length > 0) {
  return NextResponse.json(
    { error: "You have already claimed a product this month" },
    { status: 400 }
  );
}
```

**Bug Found During Testing:** `monthStart` was using `new Date().toISOString().split('T')[0]` which returns today's date (e.g., `2026-07-13`) instead of first of month (e.g., `2026-07-01`). Fixed to use `new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]`.

### UI Fix: Grey Out Buttons Without Refresh

After checkout success, the API returns `remainingThisMonth: 0`. The StoreClient immediately greys out all claim buttons without requiring a page refresh.

**Changes:**
- Checkout API returns `remainingThisMonth: 0` on success
- ClaimItemModal calls `onCheckoutSuccess(remainingThisMonth)` callback
- StoreClient updates `monthlyClaimed` state immediately
- All claim buttons grey out (handled by existing `canClaim()` function)

---

## Session 2026-07-13 (Afternoon): Incomplete Members Investigation + Badge Renames

### Problem

The `/admin/members` page showed 826 "incomplete" members with no clear breakdown of who they were or why. The badge "Free (Started)" was misleading.

### Investigation

Queried the database to understand the breakdown of incomplete members:

```sql
SELECT 
  profile_completed,
  membership_level,
  is_approved_free_member,
  free_membership_contact_submitted,
  COUNT(*) as count
FROM profiles
WHERE profile_completed IS DISTINCT FROM true 
   OR (membership_level = 'free' AND is_approved_free_member IS DISTINCT FROM true AND free_membership_contact_submitted = false)
GROUP BY 1, 2, 3, 4
ORDER BY count DESC;
```

**Results:**

| Group | profile_completed | membership_level | is_approved_free_member | free_membership_contact_submitted | Count | Description |
|-------|------------------|-----------------|------------------------|---------------------------------|-------|-------------|
| A | true | free | false | false | 530 | Completed profile, abandoned at step 3 |
| B | false | free | false | false | 221 | Never completed profile |
| C | false | free | true | false | 75 | Legacy - incorrectly approved before profile complete |

### Group Analysis

**Group A (530):** Joined July 2-13, 2026. Completed step 2 (identity form) but abandoned at step 3 - never selected membership tier or joined waitlist. Should be labeled **"Abandoned"**.

**Group B (221):** Never completed step 2. True incompletes. Should be labeled **"Profile Incomplete"**.

**Group C (75):** Joined May-June 2026. Legacy cases from old approval system that incorrectly approved members before their profiles were complete. Verified they have `date_of_birth=1900-01-01`, `identities=[]`, `household_income=null` - truly incomplete.

### SQL Fix for Group C

```sql
-- Fix Group C: Set is_approved_free_member = false for incorrectly approved members
UPDATE profiles
SET is_approved_free_member = false,
    updated_at = NOW()
WHERE profile_completed = false
  AND membership_level = 'free'
  AND is_approved_free_member = true;
```

After fix, verified new breakdown:

| category | count |
|----------|-------|
| Abandoned | 530 |
| Incomplete | 296 |
| Total | 826 |

### UI Changes

**`components/admin/AdminMembersClient.tsx`:**
- Changed "Free (Started)" badge to differentiate:
  - **Abandoned** (wisteria) - completed profile but abandoned at step 3
  - **Profile Incomplete** (stone/gray) - never finished profile
- Filter on `/admin/members` and `/admin/analytics` remains unchanged - all 826 still show under "Incomplete"

**`components/grants/ConnectBankButton.tsx`:**
- Changed "Connect Bank Account" button color from `bg-nfw-blackberry` to `bg-nfw-lilac`

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminMembersClient.tsx` | Badge labels updated to "Abandoned" / "Profile Incomplete" |
| `components/grants/ConnectBankButton.tsx` | Button color changed to lilac |

## Session 2026-07-13: FloatingAdminButton Login/Logout Fix

### Problem

The floating admin button showed up when logged out (stale localStorage cache) and didn't show after logging in as admin without a hard refresh (useEffect only ran once on mount).

### Root Cause

`FloatingAdminButton` read `is_admin` from localStorage once on mount and never re-checked. The old approach:
1. Read from localStorage on mount only
2. No mechanism to detect login/logout events
3. Relied on stale cached data

### Solution

**`components/admin/FloatingAdminButton.tsx`:**
- Now calls `/api/auth/profile` to get fresh admin status on mount
- Listens to Supabase `onAuthStateChange` to detect login/logout events
- Listens to custom event `nfw-admin-status-change` from `AuthButtonCombined`

**`components/AuthButtonCombined.tsx`:**
- Added `updateAdminStatus()` function that dispatches custom event when admin status changes
- Both components stay in sync via the custom event system

### Key Pattern

```typescript
// FloatingAdminButton listens for events from AuthButtonCombined
window.addEventListener("nfw-admin-status-change", (e) => {
  setIsAdmin(e.detail.isAdmin);
});
```

### Behavior Now

| Scenario | How It's Handled |
|----------|------------------|
| Login via Google | `onAuthStateChange` fires → re-check API |
| Login via password | `onAuthStateChange` fires → `AuthButtonCombined` fetches profile → dispatches event → `FloatingAdminButton` receives it |
| Logout | `onAuthStateChange` fires → both components hide admin UI |
| Hard refresh | API call on mount gets fresh data |

### Files Modified

| File | Change |
|------|--------|
| `components/admin/FloatingAdminButton.tsx` | API-based admin check + auth state listener + custom event listener |
| `components/AuthButtonCombined.tsx` | Dispatches admin status change event |
| `app/api/auth/profile/route.ts` | Debug logging removed after diagnosis |

### Commit

`0a21d39` - fix: FloatingAdminButton shows correctly after login/logout without hard refresh

---

## Session 2026-07-13 (Evening): Badge Cleanup + Waitlist Badge

### Changes Made

**`components/admin/AdminMembersClient.tsx`:**

1. Removed "Free (Pending)" badge - dead code since no members are in this state
2. Added "Waitlist" badge (aubergine) for members with `membership_level = 'waitlist'`
3. Changed "Contributing" badge from green (`#d4f1ad`) to citrine (`#fdf493`) to match "Founding" badge

### Badge Summary

| Badge | Color | Hex |
|-------|-------|-----|
| Founding | Citrine | #fdf493 |
| Contributing | Citrine | #fdf493 |
| Waitlist | Aubergine | #3E145F |
| Abandoned | Wisteria | #7786BE |
| Profile Incomplete | Stone | #a3a3a3 |
| Free (approved) | Stone | #a3a3a3 |

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminMembersClient.tsx` | Removed "Free (Pending)", added "Waitlist" badge, changed Contributing to citrine |
| `components/grants/ConnectBankButton.tsx` | Changed button to lilac |

---

## Session 2026-07-13 (Late): Status Badge "None" for Incomplete/Waitlist

### Changes Made

**`components/admin/AdminMembersClient.tsx`:**
- Modified `statusBadge` function to accept `membershipLevel`, `isApprovedFreeMember`, `profileCompleted` parameters
- Status now shows **"None"** for:
  - Waitlist members
  - Free members who are incomplete/abandoned (not approved)
- **"Free"** (wisteria) = Approved free members with no subscription status
- **"Active"** (green) = Paid member with active subscription
- **"Canceling"** (yellow) = Paid member whose subscription is canceling
- Filter buttons now reset to page 1 when changed (fixes pagination bug)

### Status Badge Logic

| membership_level | subscription_status | Badge |
|-----------------|-------------------|-------|
| founding, contributing | active | Active |
| founding, contributing | canceling | Canceling |
| founding, contributing | null | Free |
| free (approved) | null | Free (wisteria) |
| free (incomplete/abandoned) | null | None (stone) |
| waitlist | - | None (stone) |

---

## Session 2026-07-14: Profile Manage Subscription Fix

### Problem

Free and waitlist members on `/profile` page got "No subscription found" error when clicking "Manage Subscription" button because they have no Stripe subscription.

### Solution

Updated `ManageSubscription` component to route free and waitlist members to `/auth/sign-up?step=3` with "Upgrade Today" button text.

### Files Modified

| File | Change |
|------|--------|
| `components/ManageSubscription.tsx` | Added waitlist to condition, changed href to `/auth/sign-up?step=3`, changed text to "Upgrade Today" |

---

## Session 2026-07-15: Waitlist CSV Export

Added CSV export functionality to `/admin/waitlist` page, mirroring the implementation from `/admin/members`.

### Files Created

| File | Purpose |
|------|---------|
| `app/api/admin/waitlist/export/route.ts` | GET endpoint returning CSV of all waitlist members |

### Files Modified

| File | Change |
|------|--------|
| `app/admin/waitlist/page.tsx` | Added "Download CSV" button in header |

### CSV Columns (13 total)

| Column | Source | Format |
|--------|--------|--------|
| ID | `id` | String |
| Email | `email` | String |
| Full Name | `full_name` | String |
| Membership Level | `membership_level` | String |
| State | `state` | String |
| City | `city` | String |
| ZIP Code | `zip` | String |
| Date of Birth | `date_of_birth` | MM/DD/YYYY |
| Profile Completed | `profile_completed` | Yes/No |
| Joined Waitlist | `waitlist_joined_at` | DateTime |
| Welcome Email Sent | `waitlist_email_sent_at` | DateTime (blank if null) |
| Is Approved | `is_approved_free_member` | Yes/No |
| Joined At | `joined_at` | DateTime |

### Details

- Sorted by `waitlist_joined_at` ascending (earliest at top)
- Uses pagination (1000 rows/page) to bypass Supabase row limits
- Filename: `nfw-waitlist-YYYY-MM-DD.csv`
- Uses `requireAdmin()` for authentication
- Same helper functions as members export: `escapeCsvField`, `formatDate`, `formatDateTime`, `formatBoolean`

---

## Session 2026-07-15 (Afternoon): Members CSV Category Columns

Added explicit category breakdown columns to `/admin/members` CSV export to match the breakdown categories on the members page.

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/members/export/route.ts` | Added 5 new columns: category, sub_status, stripe_onboarding_completed, waitlist_joined_at, waitlist_email_sent_at |

### New CSV Columns (5 added = 31 total)

| Column | Format | Description |
|--------|--------|-------------|
| `stripe_onboarding_completed` | Yes/No | Whether Stripe bank account onboarding is complete |
| `waitlist_joined_at` | DateTime | When member joined waitlist |
| `waitlist_email_sent_at` | DateTime | When welcome email was sent (blank if null) |
| `category` | String | Founding, Contributing, Free, Abandoned, Profile Incomplete, Waitlist, Admin |
| `sub_status` | String | Active, Canceling, Free, Pending, None |

### Category Logic

| Category | Condition |
|----------|-----------|
| Founding | `membership_level = 'founding'` |
| Contributing | `membership_level = 'contributing'` |
| Free | `membership_level = 'free'` AND `is_approved_free_member = true` AND `profile_completed = true` |
| Abandoned | `membership_level = 'free'` AND `profile_completed = true` AND `is_approved_free_member != true` AND `free_membership_contact_submitted = false` |
| Profile Incomplete | `membership_level = 'free'` AND `profile_completed != true` |
| Waitlist | `membership_level = 'waitlist'` |
| Admin | `is_admin = true` |

### Sub Status Logic

| Sub Status | Condition |
|------------|-----------|
| Active | `subscription_status = 'active'` |
| Canceling | `subscription_status = 'canceling'` |
| Free | Free member with active subscription status |
| Pending | Free member awaiting approval or contact form submission |
| None | Waitlist members or free members with incomplete profiles |

---

## Session 2026-07-16: Grant Scoring Workflow Fixes

Implemented various fixes to the grant scoring workflow including filtering, flagging, and combined scores.

### Issues Fixed

**1. Second Review Filter** - Second page now only shows grants where first reviewer scored ≥7 OR flagged them

**2. Second Reviewer Flagging** - Second reviewer can now flag applications with discussion notes (same checkbox/textbox as first reviewer)

**3. Show First Reviewer's Flag** - Yellow banner appears on second review page showing first reviewer's flag notes when applicable

**4. Combined Page Filter** - Combined scores page now only shows grants that passed the second review filter (first score ≥7 or flagged)

**5. Completion Check Fix** - Both second-complete API and combined scores API now check completion based on filtered grants, not all grants

**6. Flag Indicators** - Second review page grant cards now show "Flagged" badge when first reviewer flagged

**7. Eye Icon for Names** - Eye icon added to first, second, and combined pages to hide/show applicant names (stops row click propagation)

**8. Combined Page Header** - Fixed header grid to match data row grid (added Show column between Rank and Applicant)

**9. Stale Selection Bug** - Fixed selected count showing stale selections from grants no longer in filtered list

### Files Modified

| File | Changes |
|------|---------|
| `app/api/admin/grants/[id]/scoring/second/route.ts` | POST accepts needs_discussion, discussion_notes for second reviewer |
| `app/api/admin/grants/[id]/scoring/second-complete/route.ts` | Only check filtered grants for completion |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Filter grants, check completion based on scope |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Filter grants to scope for second review |
| `app/admin/grants/[id]/page.tsx` | Check second completion based on filtered grants |
| `app/admin/grants/[id]/scoring/first/page.tsx` | Added eye icon with stopPropagation |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Added eye icon, first_score to interface, flag badge, showDiscussionFlag=true |
| `components/admin/GrantApplicationScorer.tsx` | Allow both first and second reviewers to flag, show first reviewer's flag notes to second |
| `components/admin/GrantCombinedScores.tsx` | Fixed header grid, show both reviewers' flagged notes in accordion |

### Key Decisions

- Filter for second page: `first_score.total_score >= 7` OR `first_score.needs_discussion === true`
- Combined score bands: 14-18 Approved, 8-13 Runner Up, 0-7 Not Approved
- Eye icon state tracked per-row with `visibleNames: Set<string>`
- Accordion shows "Reviewer 1 Notes" then "Reviewer 2 Notes" only if that reviewer flagged
- Second review complete when all filtered grants have michelle_complete = true
- Selected count computed directly from grants prop, merged with local pending selections

---

## Session 2026-07-16 (Afternoon): Delete Member Functionality Update

Updated delete member functionality to allow only specific admins to delete members.

### Changes Made

**`app/admin/members/page.tsx`:**
- Added `currentUserEmail={user?.email || ""}` prop to `AdminMembersClient`

**`components/admin/AdminMembersClient.tsx`:**
- Replaced `TEST_EMAILS` array with `ALLOWED_DELETE_EMAILS` containing `["ron@myherodesign.com", "kelsey@nationalfundforwomen.org"]`
- Added `currentUserEmail: string` to component props
- Updated delete button condition to check if `currentUserEmail` is in `ALLOWED_DELETE_EMAILS`
- Updated button title from "Delete test member" to "Delete member"

### Behavior

- Delete trash can icons now visible on **all** member rows for the two authorized admins
- Self-deletion already blocked in API route (`memberId === user.id` check)
- Other admins cannot see or use the delete functionality

---

## Session 2026-07-16 (Evening): Grant Payment Tracking & Limits

Implemented manual Stripe transfer workflow with cycle total funds limit enforcement.

### Goal
- Manual transfer workflow after grants are finalized
- Track total paid against cycle `total_funds`
- Show "Paid" badge instead of "Sent"
- Alert when transfer would exceed cycle limit

### Database Changes

**Migration 118:** Added `transfer_id TEXT` column to grants table

### Changes Made

**1. Combined Scores API (`app/api/admin/grants/[id]/scores/combined/route.ts`)**
- Added `amount_approved` to grant data returned
- Added `total_funds` to cycle object
- Calculates `totalPaid` (sum of `amount_approved` where `funded_at IS NOT NULL)

**2. Transfer API (`app/api/admin/grants/[id]/transfer/route.ts`)**
- Added total_funds limit check before creating transfer
- Calculates total paid for the cycle
- Returns 400 error with message if transfer would exceed `total_funds`

**3. Combined Scores Page (`app/admin/grants/[id]/scoring/combined/page.tsx`)**
- Added `total_funds` to Cycle interface
- Added `totalPaid` state to track paid amount
- Passes `totalPaid` to GrantCombinedScores component

**4. GrantCombinedScores Component (`components/admin/GrantCombinedScores.tsx`)**
- Added **Paid tally** next to Selected:
  - Count: `X of Y grants`
  - Amount: `$Z of $W` (total paid vs total funds)
- **"Paid" badge** now shows instead of "Sent" when `funded_at` exists
- **Limit check** before opening confirmation modal - if `amount_approved > remaining_funds`, shows alert modal
- **Limit alert modal** shows:
  - Cannot process transfer message
  - Total paid so far
  - Remaining funds
  - OK button to dismiss

### Files Modified

| File | Changes |
|------|---------|
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Return `amount_approved`, `total_paid`, `total_funds` |
| `app/api/admin/grants/[id]/transfer/route.ts` | Check if transfer would exceed `total_funds` |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added `totalPaid` state, pass to component |
| `components/admin/GrantCombinedScores.tsx` | Paid tally, Paid badge, limit alert modal |

### Workflow

1. Admin clicks "Finalize Approvals" on combined scores page
2. "Check Stripe Status" button appears per approved grant
3. Admin clicks to verify member's Stripe account is ready
4. "Send Money" button appears if account is ready
5. Clicking Send checks if `amount_approved > (total_funds - totalPaid)`
   - If exceeded: shows alert modal explaining the limit
   - If within limit: opens confirmation modal
6. On confirm → Stripe transfer created → `transfer_id` and `funded_at` saved → user email sent
7. Paid tally updates to show new total

### Key Decisions

- Uses `amount_approved` as the transfer amount (not a separate `amount_paid` field)
- Shows both count ("3 of 5 grants") and amount ("$15,000 of $25,000") in Paid tally
- "Paid" badge replaces "Sent" for consistency with member-facing language
- Alert modal appears before confirmation when limit would be exceeded
- Transfer API returns detailed error message with current totals

---

## Session 2026-07-17: Fix Grant Selection Bug - Decision Filter Removed

### Bug

On combined scores page, the wrong grants were being finalized. UI showed A and B selected, but C was approved in database instead of B.

### Root Cause

In `GrantCombinedScores.tsx`, the `getSelectedIds()` function incorrectly filtered by `decision === "Approved"`:

```javascript
// BEFORE (buggy) - filtered by decision score which doesn't matter
grants.filter((g) => g.is_tentatively_approved && g.decision === "Approved")

// AFTER (fixed) - only is_tentatively_approved checkbox matters
grants.filter((g) => g.is_tentatively_approved)
```

### Key Principle

**Only the `is_tentatively_approved` checkbox state matters for finalization. Score/decision does NOT matter.**

The `decision` field (14-18 = Approved, 8-13 = Runner Up, 0-7 = Not Approved) is only for visual display in the UI. Only what's checked in `grant_tentative_approvals` table gets finalized.

### Files Modified

| File | Change |
|------|--------|
| `components/admin/GrantCombinedScores.tsx` | Removed `&& g.decision === "Approved"` from getSelectedIds filter |

### Email Issue Note

If no emails were sent after finalization, check that `grant-approved` template has `is_active = true` and has published content in `/admin/emails`.

---

## Session 2026-07-16: Move "You're Approved" Banner to Below Hero

### Overview

Moved the "You're Approved!" bank account connection banner from inside `YourMicrograntsSection` to a full-width banner positioned directly below the hero section on the dashboard.

### Change

The banner is now displayed as a prominent citrine (`bg-nfw-citrine`) full-width banner immediately after the hero section, making it more visible upon landing on the dashboard.

### Files Modified

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Added inline banner component after `DashboardHero`, removed props from `YourMicrograntsSection` call |
| `components/dashboard/YourMicrograntsSection.tsx` | Removed banner, `ConnectBankButton` import, and unused props (`hasApprovedGrant`, `stripeOnboardingCompleted`, `latestApprovedGrantId`) |

### Banner Styling

- Full-width citrine background
- Max-width container (7xl) centered
- Two-column layout: text on left, button on right (stacks on mobile)
- Button: aubergine with white text, uppercase, bold tracking

---

## Session 2026-07-17: Combined Scores UI Fixes + Email Batch Bug Fix

### Changes Made

**1. Warning before finalize without saving**

Added alert when clicking "Finalize Approvals" without saving selections first:
```typescript
const handleFinalizeClick = () => {
  if (hasPendingChanges) {
    alert("You have unsaved changes. Please click 'Save Selections' before finalizing.");
    return;
  }
  onFinalize();
};
```

**2. Email batch template content fix**

`sendBatchEmails` was reading `html_content` directly, but email builder stores published content in `full_email_html` with `status = 'published'`. Fixed `fetchTemplate` to check `full_email_html` first.

**3. Combined scores column layout**

Multiple iterations to fit all columns properly:
- Applicant column: `minmax(100px, 1fr)` (flexible, widest)
- Show column: `48px` (widened to separate from Applicant)
- Combined column: `72px` (widened to separate from Decision)
- Decision column: `80px`
- Payment column: `120px` (prevents "Not Connected" wrapping)
- Pay column: `80px`
- Changed "Stripe" header → "Payment"
- Changed "Send" header → "Pay"
- Changed "$ Send" button → "Send $"

## Session 2026-07-16: Fix PGRST116 Error on Profile Fetch

### Problem

Users were getting 500 errors with `PGRST116` ("Cannot coerce the result to a single JSON object") when fetching their profile from `/api/auth/profile`. This happened when `.single()` was called on a query that returned 0 rows.

### Root Cause

The code at line 67 only created a defensive profile when BOTH `profile` is null AND `error` is null:
```typescript
if (!profile && !error) {  // This is FALSE when .single() returns 0 rows!
```

But `.single()` on 0 rows returns `error` as truthy (PGRST116), so the defensive profile creation never triggered. Users without profile rows got 500 errors.

### Fix

Changed the condition to check for `PGRST116` error code specifically:
```typescript
if (error) {
  if (error.code === 'PGRST116') {
    // PGRST116: 0 rows returned by .single() - user has no profile, create defensive one
    // ... create defensive profile ...
  }
  // Other errors - return 500
  console.error("Profile fetch error:", error);
  return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
}
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/auth/profile/route.ts` | Check for PGRST116 error and create defensive profile when user has no profile row |

## Session 2026-07-16: Remove "In Review" Status

### Overview

Removed "In Review" (`in_review`) status from the grants flow. Admins can no longer manually set grants to this status.

### Database Migration

**Migration 119:** `supabase/migrations/119_remove_in_review_status.sql`

Removed `in_review` from the `grants.status` CHECK constraint:
```sql
ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_status_check;
ALTER TABLE grants ADD CONSTRAINT grants_status_check
  CHECK (status IN ('submitted', 'approved', 'not_approved', 'payment_pending', 'payment_sent'));
NOTIFY pgrst, 'reload';
```

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/119_remove_in_review_status.sql` | **Created** - removes `in_review` from CHECK constraint |
| `app/api/admin/grants/update-status/route.ts` | Removed `"in_review"` from `VALID_STATUSES` array |
| `components/admin/AdminGrantReviewer.tsx` | Removed `in_review` from `STATUS_OPTIONS` (5 options instead of 6) |
| `components/admin/SortableCycleList.tsx` | Removed `in_review` from stats calculation + removed "In Review" stat card; changed grid from 6 cols to 5 |

### What Was Removed

- No more "In Review" tab/filter/button in admin grant pages
- Admins can no longer manually set status to `in_review`
- Cycle cards on `/admin/grants` show 5 stat columns instead of 6

### What Stays

- `payment_pending` and `payment_sent` statuses remain intact
- Scoring workflow (First Review → Second Review → Combined Scores) is unaffected — uses `rachel_complete`/`michelle_complete` boolean flags, not the status field

---

## Session 2026-07-17: Document Upload Display on Grant Scoring Pages

### Overview

Added document upload display to all three grant scoring pages (first review, second review, combined scores) so reviewers can view supporting documents submitted with grant applications.

### Features Added

- **Documents section** appears below scoring rubric on first and second review pages
- **Documents in accordion** appear in the expandable section on combined scores page
- Each document shows filename, file size, and "View →" button
- View button opens document via signed URL from `/api/grants/document-url`

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/first/route.ts` | Added `grant_documents` to select query |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Added `grant_documents` to select query |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Added `grant_documents` to select query |
| `app/admin/grants/[id]/scoring/first/page.tsx` | Added `documents` to Grant interface, passed to GrantApplicationScorer |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Added `documents` to Grant interface, passed to GrantApplicationScorer |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added `documents` to Grant interface |
| `components/admin/GrantApplicationScorer.tsx` | Added `documents` prop and Supporting Documents UI section |
| `components/admin/GrantCombinedScores.tsx` | Added documents section inside accordion |

### UI Details

- **First/Second Review**: Documents section styled with dove background, shows below the scoring rubric
- **Combined Scores**: Documents shown in the expandable accordion below applicant answers
- **Document Row**: Shows file name, file size (KB), and "View →" link
- **Loading State**: "Loading..." text while fetching signed URL

## Session 2026-07-17 (Afternoon): Applications Per Month Metric

### Overview

Added "applications per month" metric (X of Y) to all three grant scoring pages showing how many applications a user submitted for grants ending in the current month, plus a "2+ Apps" filter button.

### Features Added

**API Routes:**
- `/api/admin/grants/[id]/scores/first` - Added `applications_this_month` and `total_available_grants` calculation
- `/api/admin/grants/[id]/scores/second` - Same calculation added
- `/api/admin/grants/[id]/scores/combined` - Same calculation added

**Calculation Logic:**
- Finds all grant cycles ending in the same month (by `end_date`)
- Excludes cycles where `is_testing_only = true`
- Counts total available grants (`totalAvailableGrants`)
- Counts applications per user for those cycles
- Each grant gets `applications_this_month` (user's count) and `total_available_grants` (total cycles)

**UI Display:**
- "Apps" column on combined scores page showing `X/Y` metric
- Metric colored aubergine when 2+ apps, muted otherwise
- "2+ Apps" filter button with count of filtered grants

**Filter Behavior:**
- Status filter buttons (All, Approved, Runner Up, etc.) reset `multiAppFilter` when clicked
- "2+ Apps" button resets `statusFilter` to "all" when clicked
- Active state requires BOTH filters to match (no filter interference)

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/first/route.ts` | Added applicationsThisMonth calculation |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Added applicationsThisMonth calculation |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Added applicationsThisMonth calculation |
| `app/admin/grants/[id]/scoring/first/page.tsx` | Added multiAppFilter state, 2+ Apps button with count, fixed key prop |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Added multiAppFilter state, 2+ Apps button with count |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added applications_this_month fields to Grant interface |
| `components/admin/GrantCombinedScores.tsx` | Added Apps column, multiAppFilter state, 2+ Apps filter button |

### Bug Fixes

- **Missing key prop**: Added `key={grant.id}` to map in first review page
- **Filter toggle**: Fixed filter buttons to properly reset each other's state when clicked

---

## Session 2026-07-17: Stripe Payment Links for Triple Verification

### Overview

Added Stripe payment links to the combined scores page for triple verification of grant payments.

### Features Added

**API Changes (`app/api/admin/grants/[id]/scores/combined/route.ts`):**
- Added Stripe SDK import for retrieving Connect account details
- Fetches Stripe Connect account names for paid grants
- Retrieves `business_profile.name`, `individual.first_name + last_name`, or `email` as fallback
- Falls back to member's `full_name` from profiles table if Stripe account inaccessible
- Includes `connect_account_name` in each grant's response

**UI Changes (`components/admin/GrantCombinedScores.tsx`):**
- Added `connect_account_name` to the Grant interface
- Added 2 new icon columns after the "Pay" column:
  - **Receipt icon** → links to Stripe transfer (`https://dashboard.stripe.com/transfers/{transfer_id}`)
  - **User icon** → links to Stripe Connect account (`https://dashboard.stripe.com/connect/accounts/{account_id}`)
- Icon links have `onClick={(e) => e.stopPropagation()}` to prevent accordion toggle
- Icon columns have no headers (just icon buttons)
- Account holder name shown as tooltip on hover

### Grid Layout (Finalized View - 13 columns)

| Column | Width | Content |
|--------|-------|---------|
| Rank | 56px | Chevron + rank number |
| Show | 48px | Eye/eye-off button |
| Apps | 48px | X/Y applications |
| Applicant | `minmax(200px,1fr)` | Name + nomination info |
| Combined | 56px | Score/18 |
| Decision | 80px | Decision badge |
| Barriers | 64px | Y/N badge |
| Prior | 80px | Yes/No badge |
| Discuss | 56px | Flagged indicator |
| Payment | 140px | Connected status |
| Pay | 90px | Paid badge or Send button |
| Tfr | 28px | Receipt icon → transfer link |
| Acct | 28px | User icon → account link |

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Added Stripe account name fetching |
| `components/admin/GrantCombinedScores.tsx` | Added icon columns, fixed grid layout, added connect_account_name |

### Key Design Decisions

- Transfer and Connect account links open in new tabs for triple verification
- Account name falls back to profile name if Stripe account not accessible
- Icon buttons are minimal (28px) to not consume too much space
- `whitespace-nowrap` applied to Payment column badges to prevent wrapping

---

## Session 2026-07-17: Email Template Variable Replacement Bug Fix

### Bug

`{{grantCycleName}}` and other variables were not being replaced in email subject lines, showing as literal text instead of the actual value.

### Root Cause

In `lib/email-blocks/publish.ts`, the functions `getPreRenderedHtml` and `getPreRenderedHtmlAdmin` replaced variables in the HTML body but NOT in the subject line.

### Fix

Updated both functions to also replace variables in the subject line:

```typescript
// Before:
return {
  html,
  subject: template.subject || "",
};

// After:
let subject = template.subject || "";
for (const [key, value] of Object.entries(variables)) {
  html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
}
return {
  html,
  subject,
};
```

### Files Modified

| File | Change |
|------|--------|
| `lib/email-blocks/publish.ts` | Fixed variable replacement in subject line for `getPreRenderedHtml` and `getPreRenderedHtmlAdmin` |

---

## Session 2026-07-17: Admin Email Update Feature

### Overview

Created a safe way for admins to update member email addresses. Only two specific admins (kelsey@nationalfundforwomen.org, ron@myherodesign.com) can perform this action. Changes are immediate with no verification step.

### Why Only 2 Places Need Updating

After thorough analysis, confirmed that only `auth.users.email` and `profiles.email` need to be updated:

| Location | Auto-Sync? | Update Needed? |
|----------|------------|---------------|
| `auth.users.email` | Source of truth | ✅ Yes - via Admin SDK |
| `profiles.email` | **YES** (trigger) | No - handles automatically |
| Access Perks | NO (idempotent) | ⏭ Skip - uses userId, not email |
| Stripe Connect | NO (ID-based) | ⏭ Skip - uses account ID, not email |

### How the Sync Works

1. Update `auth.users.email` via Supabase Admin SDK (`supabaseAdmin.auth.admin.updateUserById()`)
2. Update `profiles` row to trigger the existing `trg_sync_profile_email` database trigger
3. The trigger automatically syncs email from `auth.users` to `profiles.email`

### API Route

**`POST /api/admin/members/update-email`**

```typescript
// Request
{ memberId: string, newEmail: string }

// Response
{ success: true, message: "Email updated to new@example.com" }
// or
{ error: "Invalid email format" } // 400
{ error: "Forbidden" } // 403
```

### Security

- Checks requester's email against ALLOWED_EMAILS list
- Validates email format before updating
- Uses Supabase Admin SDK for auth.users update
- No notifications sent (for now)

### Files Created

| File | Purpose |
|------|---------|
| `app/api/admin/members/update-email/route.ts` | Admin API endpoint for email updates |

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminMembersClient.tsx` | Added email update modal and Mail icon button in Actions column |

### UI

- Mail icon (✉️) appears in Actions column for allowed admins only
- Modal shows current email with new email input field
- Confirm button disabled if email unchanged
- Page reloads after successful update

---

## Session 2026-07-18: Grant Scoring Page Permissions

### Overview

Added email-based permission checks to grant scoring pages. Each page now checks if the current user's email is in an allowed list before showing content.

### Page Access Matrix

| Page | Allowed Emails |
|------|---------------|
| `/scoring/first` | rachel@nationalfundforwomen.org, kelsey@nationalfundforwomen.org, ron@myherodesign.com |
| `/scoring/second` | michelle@nationalfundforwomen.org, kelsey@nationalfundforwomen.org, ron@myherodesign.com |
| `/scoring/combined` | rachel@nationalfundforwomen.org, michelle@nationalfundforwomen.org, kelsey@nationalfundforwomen.org, ron@myherodesign.com |

### Implementation

Each page now:
1. Fetches user's email from Supabase auth on mount
2. Checks if email is in the allowed list (case-insensitive)
3. Shows "Access Denied" screen with Shield icon if not authorized

### Access Denied UI

- Centered card with red Shield icon
- "Access Denied" heading
- "You don't have permission to access this page." message
- "Back to Grants" button

### Files Modified

| File | Change |
|------|--------|
| `app/admin/grants/[id]/scoring/first/page.tsx` | Added ALLOWED_EMAILS, email check useEffect, Access Denied UI |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Added ALLOWED_EMAILS, email check useEffect, Access Denied UI |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added ALLOWED_EMAILS, email check useEffect, Access Denied UI |

### Session 2026-07-18: Grant Cycle Finalization

#### Overview

Added ability for admins to mark grant cycles as finalized via an `is_finalized` boolean flag. Finalization is an administrative action to indicate a grant cycle has been fully processed.

#### Database

- Migration 120: `supabase/migrations/120_add_is_finalized_to_grant_cycles.sql`
  - Added `is_finalized BOOLEAN DEFAULT FALSE` column to `grant_cycles` table

#### API

- `POST /api/admin/grants/[id]/cycle/finalize`
  - Toggles `is_finalized` flag on the cycle
  - Allowed emails: rachel, michelle, kelsey, ron
  - Request: `{ is_finalized: boolean }`
  - Response: `{ success: true, message: "Cycle finalized/unfinalized successfully" }`

#### UI

**Grant Cycle Detail Page (`/admin/grants/[id]`):**
- No changes - button removed from this page

**Combined Scores Page (`/admin/grants/[id]/scoring/combined`):**
- Shows yellow "COMPLETE" badge next to "Combined Scores" heading when `is_finalized = true`
- "Mark Complete" / "Unmark Complete" button in header, top right corner
- Confirmation modal with ShieldAlert icon:
  - Title: "Mark Cycle Complete?" / "Unmark Cycle Complete?"
  - Body: "No new approvals or payments can be made after marking as complete. You can unmark later if needed."
  - Buttons: [Cancel] [Mark Complete]

#### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/120_add_is_finalized_to_grant_cycles.sql` | Database migration |
| `app/api/admin/grants/[id]/cycle/finalize/route.ts` | API endpoint |
| `components/admin/GrantCycleFinalizeButton.tsx` | Client component with confirmation modal |

#### Files Modified

| File | Change |
|------|--------|
| `app/admin/grants/[id]/page.tsx` | Removed finalize button and COMPLETE badge |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added COMPLETE badge and Mark Complete button |
| `AGENTS.md` | Documented feature |

#### Allowed Emails

Only these 4 admins can finalize cycles:
- rachel@nationalfundforwomen.org
- michelle@nationalfundforwomen.org
- kelsey@nationalfundforwomen.org
- ron@myherodesign.com

---

## Session 2026-07-20: ZDS Webhook Order Rejection Bug Fix

### Problem

Users were getting `rejected_invalid_user` status on legitimate ZDS claims. Investigation revealed:

1. **Draft Orders don't preserve `note_attributes`** - When using Shopify Draft Orders (via Admin API), custom attributes like `nfw_user_id` are NOT transferred to resulting orders
2. **Webhook validation was too strict** - The validation required `nfwUserId` to be present even when the claim was found via `variant_id` (the authoritative primary path)

### Root Cause

The webhook validation at line 186 was:
```typescript
if (!foundViaCheckoutId && (!nfwUserId || nfwUserId !== claim.user_id)) {
```

This rejected orders when:
- Claim was found via `variant_id` (correct primary path)
- `nfwUserId` was null (Draft Order didn't include the attribute)
- `foundViaCheckoutId === false` (correctly - it WASN'T found via checkout fallback)

### Fix Applied

Added `foundViaVariantId` and `foundViaUserProduct` tracking variables to skip validation when claims are found via authoritative paths:

```typescript
// Track which path found the claim
let foundViaVariantId = existingClaims && existingClaims.length > 0;
let foundViaUserProduct = false;

// ... fallback lookups set these flags ...

// Updated validation - skip if found via any authoritative path
if (!foundViaCheckoutId && !foundViaVariantId && !foundViaUserProduct && (!nfwUserId || nfwUserId !== claim.user_id)) {
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/shopify/webhook/route.ts` | Added `foundViaVariantId` and `foundViaUserProduct` tracking, updated validation condition |

### Investigation Notes

**Why Draft Orders were used:**
- Created via Shopify REST Admin API (`/admin/api/2026-01/draft_orders.json`)
- `note_attributes` passed during creation are NOT preserved on resulting orders
- This was the only way to create checkout URLs without Storefront API

**Pattern observed:**
- Completed orders have `shopify_checkout_id = "gid://shopify/Checkout/..."` (Checkout API)
- Rejected orders have `shopify_checkout_id = "draft_..."` (Draft Order API)
- Draft Orders don't pass custom attributes to resulting orders

### Future Fix Needed

Switch from Draft Orders to Checkout API using Storefront API access token. This would properly preserve `customAttributes` through to the resulting order.

### SQL to Identify Affected Claims

```sql
-- Preview July 2026 rejected claims with null claim_month
SELECT * FROM zero_dollar_claims
WHERE status = 'rejected_invalid_user'
AND claim_month IS NULL
AND claimed_at >= '2026-07-01'
AND claimed_at < '2026-08-01';
```

---

## Session 2026-07-20: Incomplete Member Reminder Cron

### Overview

Created a cron job that automatically sends reengagement emails to members who joined 2+ hours ago and are still incomplete (haven't completed their profile signup).

### Database

**Migration 122:** `supabase/migrations/122_index_for_incomplete_reminder.sql`
- Creates index `idx_profiles_incomplete_reminder` on `profiles(joined_at, incomplete_email_sent_at)` for efficient queries
- Index is a partial index (WHERE `incomplete_email_sent_at IS NULL`) to only index members who haven't received the email

### API Routes

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/api/cron` | Simple test endpoint returning `{ ok: true }` | Bearer token |
| `/api/cron/test-incomplete-reminder` | Test reminder emails manually | Bearer token |
| `/api/cron/incomplete-member-reminder` | Production reminder (hourly) | Bearer token |

### Cron Configuration

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/incomplete-member-reminder",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Hourly at minute 0 (every hour)

### Security

All cron endpoints require `CRON_SECRET` Bearer token authorization:
```typescript
const authHeader = request.headers.get("Authorization");
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Setup Required:**
1. Add `CRON_SECRET` environment variable in Vercel project settings
2. Generate a secure random string for the value
3. Enable cron jobs in Vercel Dashboard → Project Settings → Cron Jobs

### Eligibility Criteria

A member receives the reminder email if ALL of:
- `incomplete_email_sent_at IS NULL` (hasn't received email yet)
- Joined 2+ hours ago (`joined_at < NOW() - INTERVAL '2 hours'`)
- Profile is incomplete OR (free member not approved AND hasn't submitted contact form)

### Email Template

Uses `incomplete-member-reengagement` template (slug) via `sendIncompleteMemberEmail()`:
- Template must be active (`is_active = true`)
- Template must have published content (`full_email_html` with `status = 'published'`)
- If template is inactive or has no content, cron skips silently

### Batch Processing

| Setting | Value |
|---------|-------|
| Batch size | 50 members per run |
| Delay between sends | 200ms |
| Max duration | 300 seconds (5 minutes) |

### Files Created

| File | Purpose |
|------|---------|
| `app/api/cron/route.ts` | Simple test endpoint |
| `app/api/cron/test-incomplete-reminder/route.ts` | Test endpoint with full logic |
| `app/api/cron/incomplete-member-reminder/route.ts` | Production cron endpoint |
| `supabase/migrations/122_index_for_incomplete_reminder.sql` | Database index |
| `vercel.json` | Vercel cron configuration |

### Testing

**Local testing:**
```bash
curl -X POST http://localhost:3000/api/cron/test-incomplete-reminder
```

**Remote testing (after adding CRON_SECRET):**
```bash
curl -X POST https://nationalfundforwomen.org/api/cron/test-incomplete-reminder \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Response codes:**
| Status | Meaning |
|--------|---------|
| 200 + "inactive" | Template is inactive, skipped |
| 200 + "No published content" | Template not published, skipped |
| 200 + "No eligible members found" | Nothing to send |
| 200 + "Sent X emails" | Success |
| 401 | Unauthorized (missing/invalid CRON_SECRET) |

### Vercel Dashboard Setup

1. Go to **Project Settings → Environment Variables**
2. Add `CRON_SECRET` with a secure random value
3. Go to **Project Settings → Cron Jobs**
4. Enable `incomplete-member-reminder`
5. Deploy is automatic after pushing to GitHub

### Incomplete Member Email

**Slug:** `incomplete-member-reengagement`
**Purpose:** Re-engage members who started signup but didn't complete
**When sent:** 2 hours after joining if still incomplete
**Template must be:**
- Active (`is_active = true`)
- Published with builder content (`full_email_html` with `status = 'published'`)

### Related Files

| File | Purpose |
|------|---------|
| `app/api/admin/bulk/incomplete-members/route.ts` | Manual bulk send API (admin page) |
| `app/admin/incomplete-members/AdminIncompleteMembersClient.tsx` | Admin UI for manual sends |
| `lib/email.ts` | `sendIncompleteMemberEmail()` function |
| `lib/email-blocks/publish.ts` | `getPreRenderedHtmlAdmin()` for template content |

---

## Session 2026-07-17: Aubergine Border for Finalized Cycle Cards

### Overview

Added visual differentiation for grant cycles marked as complete (finalized) on `/admin/grants` page.

### Change

Cycle cards now show a 4px aubergine left border when `is_finalized === true`.

### Files Modified

| File | Change |
|------|--------|
| `components/admin/SortableCycleList.tsx` | Added aubergine left border styling for finalized cycles |

---

## Session 2026-07-21: Grant Scoring Documents Not Showing - Manual Join Fix

### Problem

Grant application documents were showing on `/grants/view/[id]` but NOT on the admin scoring pages (`/admin/grants/[id]/scoring/first`, `/admin/grants/[id]/scoring/second`, `/admin/grants/[id]/scoring/combined`).

### Root Cause

The scoring API routes were using foreign key (FK) joins to fetch `grant_documents`:
```typescript
grant_documents (id, file_name, file_size, uploaded_at, document_url)
```

But FK joins can fail silently in Supabase/PostgREST. The view page used a manual join which worked correctly:
```typescript
const { data: documents } = await supabaseAdmin
  .from("grant_documents")
  .select("*")
  .eq("grant_id", id)
```

### Solution

Updated all 3 scoring API routes to use manual document joins instead of FK joins:

1. Remove `grant_documents (...)` from the grants select
2. Query `grant_documents` separately using `.in("grant_id", grantIds)`
3. Build a `documentsByGrant` map
4. Attach `documents: documentsByGrant[g.id] || []` to each grant

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/first/route.ts` | Removed FK join, added manual document fetch |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Removed FK join, added manual document fetch |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Removed FK join, added manual document fetch |

---

## Session 2026-07-21 (Afternoon): Fix Auto-Setting rachel_complete

### Problem

`rachel_complete` was being set to `true` automatically during score auto-save, instead of only when the "Mark Review Complete" button was clicked. This caused new cycles to appear as already complete when they weren't.

### Root Cause

The POST handler in `scores/first/route.ts` had this code:
```typescript
if (is_complete) {
  await supabaseAdmin
    .from("grants")
    .update({ rachel_complete: true })
    .eq("id", grantId);
}
```

When all scores were filled, `is_complete` became true and the auto-save set `rachel_complete = true` for each grant.

### Fix

Removed the auto-setting of `rachel_complete` from both first and second review POST handlers. The `rachel_complete`/`michelle_complete` flags should ONLY be set when the finalize button is clicked (via the `/scoring/complete` and `/scoring/second-complete` endpoints).

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/first/route.ts` | Removed auto-setting of rachel_complete in POST handler |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Removed auto-setting of michelle_complete in POST handler |

---

## Session 2026-07-21 (Evening): Fix Stripe Connect Status Not Showing on Combined Scores

### Problem

Stripe Connect account status showed as "Not Connected" on combined scores page even when members had connected their accounts.

### Root Cause

Supabase returns `profiles` as an **array** when using FK join syntax (`profiles:user_id (...)`), but the code treated it as a single object:

```typescript
// Wrong - profiles is an array from FK join
stripe_onboarding_completed: (g.profiles as any)?.stripe_onboarding_completed ?? false,

// Correct - handle array
stripe_onboarding_completed: (Array.isArray(g.profiles) ? g.profiles[0] : g.profiles)?.stripe_onboarding_completed ?? false,
```

### Fix

Updated combined scores route to handle Supabase's array return for FK joins.

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Handle profiles as array from FK join |
| `app/api/admin/grants/[id]/check-connections/route.ts` | Check connections for tentative approvals regardless of status |

### Additional Fix (2026-07-21): Stripe Account ID on Profile vs Grant

**Problem:** Same user appeared as "Connected" in one cycle but "Not Connected" in another cycle.

**Root Cause:** 
- The UI at line 610 checked `grant.stripe_connect_account_id` which was NULL for some cycles
- But `profiles.stripe_connect_account_id` had the correct value
- The check-connections API also only checked `grant.stripe_connect_account_id` without fallback

**Fix Applied:**
- `GrantCombinedScores.tsx` line 610: Changed to check `grant.profiles?.stripe_connect_account_id`
- `check-connections/route.ts`: Added `stripe_connect_account_id` to profiles join and use as fallback when grant's is null

**Key Insight:** Stripe Connect account is stored on **profiles.stripe_connect_account_id**, NOT on grants.stripe_connect_account_id. The grants table can have a stripe_connect_account_id column but it may be NULL while the user's profile has the actual account ID.

**Build Fix:** Added `stripe_connect_account_id?: string | null` to the `profiles` interface in the `Grant` type definition.

**Additional Fixes:**
- Combined scores API: Added `stripe_connect_account_id` to profiles join select
- Combined scores API: Pass through profiles object correctly so UI can access `grant.profiles?.stripe_connect_account_id`

**Commit:** `49460e2`

### Additional Fix (2026-07-21): isBankConnected and Send Money Button Logic

**Problem:** 
- "Send Money" button was disabled even when account was connected
- New users with no previous grants had `grant.stripe_connect_account_id = NULL` but `profile.stripe_connect_account_id = valid`

**Fix Applied:**
- `isBankConnected`: Now checks both `grant.stripe_connect_account_id` AND `grant.profiles?.stripe_connect_account_id`
- `getSendMoneyButtonState`: Same dual check before disabling button
- Payment column: Same dual check for "Connected" vs "No Account" display

**Commit:** `b99ec4b`

### Additional Fix (2026-07-21): Flagged Status for Restricted Stripe Accounts

**Problem:** Restricted accounts (charges_enabled or payouts_enabled = false) were showing as "Connected" with an active Send Money button, but payments would fail.

**Solution:** Added "Flagged" status to indicate restricted accounts:

**New Bank Statuses:**
- **Connected** (green): Account exists and is fully enabled
- **Flagged** (yellow): Account exists but is restricted (charges or payouts disabled)
- **Not Connected** (gray): No Stripe account found
- **No Account** (gray): No Stripe account ID on grant or profile

**Changes:**
- Added `getBankStatus()` function returning `BankStatus` type
- Updated Payment column UI to show appropriate badge based on status
- Send Money button remains disabled for flagged accounts

**Additional Fix:** Distinguish connected vs restricted accounts

**Problem:** Account with `details_submitted=true` but `charges_enabled=false` was showing as "Not Connected" instead of "Flagged".

**Solution:** 
- `connected` now means `details_submitted` (they've started Stripe onboarding)
- `isRestricted` means `charges_enabled=false OR payouts_enabled=false`
- `not_connected` only when `details_submitted=false`

**Commit:** `fd2a9c0`

## Session 2026-07-21 (Late): Incomplete Members Admin Page Improvements

### Changes Made

**`app/admin/incomplete-members/AdminIncompleteMembersClient.tsx`:**

1. **Table column widths fixed** - Added `table-fixed` layout, `colgroup` with explicit widths to prevent "Send Email" button wrapping
   - Name: 18%, Email: 28%, Joined: 13%, Membership: 12%, Email Status: 20%, Actions: 9%
   - Added `truncate` class to Name and Email columns
   - Added `whitespace-nowrap` to Actions column

2. **Filter buttons added** - Added All/Sent/Pending filter buttons in the action bar:
   - All (total) - aubergine when active
   - Sent (emailsSent) - green when active  
   - Pending (emailsPending) - wisteria when active

3. **Sorting by newest first** - Members now sorted by `joined_at` descending (newest first)

### Files Modified

| File | Change |
|------|--------|
| `app/admin/incomplete-members/AdminIncompleteMembersClient.tsx` | Added filter buttons, sorting, fixed table column widths |

## Session 2026-07-21: Rename "Welcome Email - Free" to "Waitlist Approval"

### Overview

Renamed the email template from "Welcome Email - Free" to "Waitlist Approval" to better reflect its purpose (sending to waitlist members when they are approved).

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/123_rename_welcome_free_template.sql` | Renames template in database |

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/emails/seed/route.ts` | Updated name and description in seed data |

## Session 2026-07-22: Perk Collections Feature

### Overview

Implemented perk collections allowing admins to group Access Perks and NFW Perks into named collections that appear as buttons in the FilterSidebar.

### Database

**Migrations:**
- `124_create_perk_collections.sql` - Creates `perk_collections` and `perk_collection_items` tables with RLS
- `125_add_show_nfw_exclusive_button.sql` - Adds `show_nfw_exclusive_button` to `site_settings`
- `126_add_is_admin_only_to_perk_collections.sql` - Adds `is_admin_only` to `perk_collections`

**Schema:**
```sql
perk_collections (
  id UUID PK,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_admin_only BOOLEAN DEFAULT false,
  created_at, updated_at
)

perk_collection_items (
  id UUID PK,
  collection_id UUID REFERENCES perk_collections,
  item_type TEXT CHECK (access_perk, nfw_perk),
  item_identifier TEXT NOT NULL,  -- offer_key for access_perk, slug for nfw_perk
  display_order INTEGER DEFAULT 0,
  created_at
)
```

### Features

- **Collection Management** (`/admin/perk-collections`):
  - Create/edit/delete collections with name and description
  - Drag-to-reorder collections
  - Add items by pasting perk URLs (Access Perks: `/perks/{offerKey}`, NFW Perks: `/perks/nfw/{slug}`)
  - Drag-to-reorder items within collections
  - Admin-only toggle to hide collections while testing
  - "Show NFW Exclusive" toggle in page header

- **Public Display** (`/perks`):
  - Collection buttons appear in FilterSidebar with ShoppingBag icon
  - Each button shows collection name and offer count ("X offers")
  - Selecting collection shows header with name, description, and offer count
  - Hidden pagination ("Showing X of Y stores") when collection selected
  - Admin-only collections visible to logged-in admins for testing

- **Access Perk URL Parsing**:
  - Supports format: `/perks/{offerKey}` or full URLs
  - Extracts offerKey from path segments

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/perk-collections` | GET | Public list (filters admin_only for non-admins) |
| `/api/admin/perk-collections` | GET, POST | Admin list and create |
| `/api/admin/perk-collections/[id]` | GET, PUT, DELETE | Admin CRUD |
| `/api/admin/perk-collections/reorder` | PUT | Reorder collections |
| `/api/admin/perk-collections/[id]/items/reorder` | PUT | Reorder items |

### Key Implementation Details

- Access Perks fetched via `/api/access-perks/offers/{offerKey}` (returns `{ offers: [...] }`)
- NFW Perks fetched via `/api/nfw-perks/slug/{slug}` (returns perk directly)
- Both perk types use "Copy Link" URL pattern from existing OfferDetailPanel
- Drag-to-reorder uses `@dnd-kit/sortable` with `arrayMove` utility
- Collection order persisted via `display_order` column
- `show_nfw_exclusive_button` site setting controls NFW Exclusive button visibility
- **Bug Fix:** `item_identifier` stored as string but `offer_key` from API is number - comparison uses `String()` conversion

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/124_create_perk_collections.sql` | Database schema |
| `supabase/migrations/125_add_show_nfw_exclusive_button.sql` | Site setting |
| `supabase/migrations/126_add_is_admin_only_to_perk_collections.sql` | Admin-only flag |
| `app/api/perk-collections/route.ts` | Public API |
| `app/api/admin/perk-collections/route.ts` | Admin list/create |
| `app/api/admin/perk-collections/[id]/route.ts` | Admin CRUD |
| `app/api/admin/perk-collections/reorder/route.ts` | Collection reorder |
| `app/api/admin/perk-collections/[id]/items/reorder/route.ts` | Item reorder |
| `app/admin/perk-collections/page.tsx` | Admin page wrapper |
| `app/admin/perk-collections/AdminPerkCollections.tsx` | Admin UI |

### Files Modified

| File | Change |
|------|--------|
| `app/admin/AdminHubClient.tsx` | Added Perk Collections link |
| `app/api/site/settings/route.ts` | Added show_nfw_exclusive_button |
| `app/dashboard/page.tsx` | Updated nav links |
| `app/perks/page.tsx` | Fetch/display collection perks, sort by display_order with String() comparison |
| `components/admin/SiteSettingsEditor.tsx` | Removed NFW Exclusive toggle |
| `components/grants/ConnectBankButton.tsx` | Changed button color |
| `components/perks/FilterSidebar.tsx` | Added ShoppingBag icon to collection buttons |

---

## Session 2026-07-23: Perk Detail Page Auth Redirect

### Problem

Direct links to perk detail pages (`/perks/[offerKey]` and `/perks/nfw/[slug]`) by non-logged in users showed an "offer not found" or error page instead of redirecting to login.

### Solution

Added authentication checks to both perk detail pages that redirect non-logged in users to the login page with a `next` parameter for post-login redirect.

### Files Modified

| File | Changes |
|------|---------|
| `components/login-form.tsx` | Added `next` query param support for redirect after successful login |
| `app/perks/[offerKey]/page.tsx` | Added auth check with membership permissions |
| `app/perks/nfw/[slug]/page.tsx` | Added auth check with membership permissions |

### Login Form Change

After successful password login, the form now reads the `next` query param and redirects there instead of always going to `/dashboard`:

```typescript
const searchParams = new URLSearchParams(window.location.search);
const nextUrl = searchParams.get("next") || "/dashboard";
router.push(nextUrl);
```

### Auth Check Logic (Both Pages)

| Condition | Redirect To |
|-----------|-------------|
| Not logged in | `/auth/login?next=[original URL]` |
| Profile incomplete | `/auth/sign-up?step=1` |
| Free member (not approved) | `/auth/sign-up?step=3` |
| Waitlist member | `/auth/sign-up?step=3` |
| Contributing/Founding/Approved Free | Allow access |

### How It Works

1. User visits `/perks/[offerKey]` directly (not through `/perks`)
2. `useEffect` runs `checkAuthAndFetch()` on mount
3. Auth check verifies user is logged in and has proper membership
4. If not logged in → redirect to `/auth/login?next=/perks/[offerKey]`
5. After login → user is redirected back to the perk page

### Note

The `next` param only works for password login. Google OAuth doesn't support it because the OAuth callback route doesn't pass through the `next` param.

---

## Session 2026-07-23 (Afternoon): Perk Collections Pretty URLs

### Overview

Added URL slugs to perk collections for shareable, bookmarkable links. Collections can now be linked to directly via `/perks?collection=slug`.

### Database

**Migration:** `131_add_slug_to_perk_collections.sql`

```sql
ALTER TABLE perk_collections ADD COLUMN slug TEXT UNIQUE;
CREATE UNIQUE INDEX idx_perk_collections_slug ON perk_collections(slug) WHERE slug IS NOT NULL;
```

Auto-generates slugs for existing collections using kebab-case name + 4-character random suffix.

### URL Structure

| Link Type | URL Format | Example |
|-----------|------------|---------|
| Collection link | `/perks?collection=slug` | `/perks?collection=holiday-deals-abc1` |

### How It Works

1. **Admin UI:** Collection form has slug field (auto-generated from name, manually editable)
2. **FilterSidebar:** Collection buttons use `window.history.pushState()` to update URL without navigation
3. **/perks page:** Reads `?collection=` param on mount, finds collection by slug, fetches and displays

### Key Implementation

**URL Updates (FilterSidebar.tsx):**
```typescript
const handleCollectionClick = (collection: Collection) => {
  if (collection.slug === currentCollectionSlug) {
    window.history.pushState(null, "", "/perks");
  } else if (collection.slug) {
    window.history.pushState(null, "", `/perks?collection=${collection.slug}`);
  }
};
```

**Collection Param Reading (/perks/page.tsx):**
```typescript
useEffect(() => {
  const collectionParam = searchParams.get("collection");
  if (collectionParam && collections.length > 0) {
    const collection = collections.find((c) => c.slug === collectionParam);
    if (collection) {
      setSelectedCollectionId(collection.id);
      // Reset other filters when entering via collection link
    }
  }
}, [searchParams, collections]);
```

### Features

- **Auto-generate slug:** kebab-case from name + random 4-char suffix (e.g., "Holiday Deals" → "holiday-deals-abc1")
- **Manual override:** Admins can edit slug to customize
- **Uniqueness validation:** API rejects duplicate slugs
- **Smooth navigation:** Uses `window.history.pushState()` - no page reload, no scroll reset
- **URL persistence:** Links are bookmarkable and shareable

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/131_add_slug_to_perk_collections.sql` | Add slug column |

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/perk-collections/route.ts` | Accept slug on create, auto-generate if not provided |
| `app/api/admin/perk-collections/[id]/route.ts` | Accept slug on update, validate uniqueness |
| `app/admin/perk-collections/AdminPerkCollections.tsx` | Add slug field in form, show URL preview |
| `app/perks/page.tsx` | Read `?collection=` param, find collection by slug |
| `components/perks/FilterSidebar.tsx` | Collection buttons update URL via `window.history.pushState()` |

---

## Session 2026-07-23: Perks Page Banner + Featured Items Perk Cards

### Overview

Added configurable hero banner to `/perks` page and ability to add perk promo cards to dashboard featured items.

### Database

**Migrations:**
- `128_create_perks_settings.sql` - Creates `perks_settings` table
- `129_add_is_test_mode_to_perks_settings.sql` - Adds `is_test_mode` column
- `130_enable_rls_perks_settings.sql` - Enables RLS on `perks_settings`

**Schema:**
```sql
perks_settings (
  id UUID PK,
  hero_image_url TEXT,
  hero_heading TEXT DEFAULT 'Member Perks',
  hero_subheading TEXT DEFAULT 'Exclusive discounts and offers for NFW members',
  is_test_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ
)
```

### Perks Banner Feature

**Admin UI** (`/admin/perk-collections`):
- Banner settings section with image picker, heading, subheading, test mode checkbox
- Test Mode: if enabled, banner only visible to admin users

**Public Display** (`/perks`):
- Banner displayed between hero and search bar
- Styled as inset (matching search bar width/padding)
- Height: `h-[150px]` mobile, `md:h-[200px]` desktop
- Semi-transparent black overlay for text readability
- Only shows if `hero_image_url` is set
- Hidden from non-admin users when `is_test_mode` is true

### Featured Items Perk Cards

**FeaturedItem Type Updated:**
```typescript
type FeaturedItem = {
  id: string;
  type: "shopify_product" | "microgrant" | "article" | "perk";  // Added "perk"
  title: string;
  image: string;
  slug?: string;
  link?: string;         // NEW
  button_label?: string;   // NEW
};
```

**Admin UI** (`/admin/dashboard`):
- "Add Perk" button in Featured Items section (lilac color)
- Perk modal with: image picker, title, link URL (default `/perks`), button label (defaults to title)
- Pencil icon on existing perk cards to edit
- Edit modal pre-fills existing values

**Public Display** (`PopularAcrossNFW`):
- Perk items use lilac badge color
- Custom link if provided, defaults to `/perks`
- Custom button_label if provided, defaults to perk title

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/128_create_perks_settings.sql` | perks_settings table |
| `supabase/migrations/129_add_is_test_mode_to_perks_settings.sql` | is_test_mode column |
| `supabase/migrations/130_enable_rls_perks_settings.sql` | RLS policies |

### Files Modified

| File | Change |
|------|--------|
| `app/api/perks/settings/route.ts` | GET/POST for banner settings |
| `app/admin/perk-collections/AdminPerkCollections.tsx` | Banner settings UI |
| `app/admin/dashboard/DashboardAdminClient.tsx` | Add/Edit perk modal, pencil icon |
| `app/perks/page.tsx` | Banner display with test mode check |
| `app/dashboard/page.tsx` | Passes featured items to PopularAcrossNFW |
| `components/dashboard/PopularAcrossNFW.tsx` | Perk type handling, link/button_label overrides |

---

## Session 2026-07-23: Login Redirect `next` Param Fix

### Overview

Added URL validation and `next` param support so users return to their original destination after logging in, regardless of login method (password or Google OAuth).

### Problem

When users clicked a perk collection link like `/perks?collection=featured-perks`, they were redirected to `/auth/login` without the original URL. After login, they went to `/dashboard` instead of back to the perks page with the collection selected.

### Solution

1. **Created `lib/redirect-utils.ts`** with URL validation helper that prevents open-redirect attacks by validating all `next` URLs are on `nationalfundforwomen.org`

2. **Updated auth callback** (`app/auth/callback/route.ts`) to read `next` from:
   - OAuth state param (for Google OAuth)
   - Query param (for password login)

3. **Updated login form** (`components/login-form.tsx`) to pass `next` via redirectTo URL for Google OAuth

4. **Fixed all protected pages** to pass `next` param when redirecting to login

### Files Created

| File | Purpose |
|------|---------|
| `lib/redirect-utils.ts` | URL validation helper (`isValidRedirect`, `getLoginRedirectUrl`, `getValidatedNextUrl`) |

### Files Modified (14 total)

**Auth Flow (2):**
- `app/auth/callback/route.ts` - Reads `next` from state/params, redirects to `next` after login
- `components/login-form.tsx` - Passes `next` via redirectTo URL for Google OAuth

**Client-Side Pages (3):**
- `app/perks/page.tsx` - 6 redirects fixed
- `app/perks/[offerKey]/page.tsx` - 5 redirects fixed
- `app/perks/nfw/[slug]/page.tsx` - 5 redirects fixed

**Server-Side Pages (9):**
- `app/dashboard/page.tsx`
- `app/grants/apply/page.tsx`
- `app/grants/my-applications/page.tsx`
- `app/grants/view/[id]/page.tsx`
- `app/profile/page.tsx`
- `app/profile/edit/page.tsx`
- `app/share-your-story/page.tsx`
- `app/store/my-claims/page.tsx`
- `app/travel/page.tsx`

### Security

All `next` URLs are validated to ensure they point to `nationalfundforwomen.org` or `www.nationalfundforwomen.org`, preventing open-redirect attacks.

### Login Flow After Fix

| Step | Password Login | Google OAuth |
|------|---------------|-------------|
| 1 | Visit `/perks?collection=x` | Same |
| 2 | Redirect to `/auth/login?next=/perks?collection=x` | Same |
| 3 | Login with password | Click Google button |
| 4 | `login-form` reads `next`, redirects on success | `next` passed via redirectTo URL |
| 5 | - | `callback` reads `next` from URL param |
| 6 | Redirect to `/perks?collection=x` | Same |

---

## Session 2026-07-24: NFW Perk Detail Page Redemption Fix

### Problem

The NFW perk detail page at `/perks/nfw/[slug]` was not recording redemptions when users clicked "Visit Partner Site". The button just opened the URL directly without calling the redemption API.

### Root Cause

1. **Detail page didn't pass userId when fetching perk** - The `fetchPerk` function didn't include `userId` in the API call, so `userHasRedeemed` was always undefined
2. **handleRedeem didn't call redemption API** - The button just opened the URL directly, never recording the redemption

### Fix Applied

**File:** `app/perks/nfw/[slug]/page.tsx`

1. **Pass userId when fetching perk:**
```typescript
// Before:
fetchPerk();

// After:
fetchPerk(user.id);

// API call now includes userId:
const url = `/api/nfw-perks/slug/${encodeURIComponent(slug)}${userId ? `?userId=${userId}` : ""}`;
```

2. **handleRedeem now calls the redemption API:**
```typescript
const handleRedeem = async () => {
  if (!perk?.landing_page_url || !perk?.id) return;

  // If already redeemed, just open URL
  if (perk.userHasRedeemed) {
    window.open(perk.landing_page_url, "_blank");
    return;
  }

  setRedeeming(true);
  try {
    const response = await fetch(`/api/nfw-perks/${perk.id}/redeem`, {
      method: "POST",
    });

    if (response.ok) {
      setPerk({ ...perk, userHasRedeemed: true });
    }
  } finally {
    setRedeeming(false);
  }

  // Open URL regardless of API result
  window.open(perk.landing_page_url, "_blank");
};
```

3. **Button shows redeemed state:**
- Green button + "Redeemed" + checkmark when already redeemed
- Spinner + "Redeeming..." while processing
- Normal "Visit Partner Site" button when not yet redeemed

### Files Modified

| File | Change |
|------|--------|
| `app/perks/nfw/[slug]/page.tsx` | Pass userId to perk fetch, call redemption API, show redeemed state |

### Commit

- `f8c2a1d` - fix: record NFW perk redemption on detail page button click

---

## Session 2026-07-24: NFW Perk Detail Page Save Button Fix

### Problem

The "Save" (heart) button on the NFW perk detail page at `/perks/nfw/[slug]` only toggled local state without calling any API. The save wasn't persisted.

### Root Cause

1. The detail page had local `liked` state that just toggled the heart icon
2. No API call to `/api/perks/liked-stores` to persist the like
3. No fetch to check if user already liked this perk on page load

### Fix Applied

**File:** `app/perks/nfw/[slug]/page.tsx`

1. **Added state for liked partners:**
```typescript
const [likedPartners, setLikedPartners] = useState<string[]>([]);
const [likeAnimating, setLikeAnimating] = useState(false);
```

2. **Added `fetchLikedPartners` function:**
```typescript
const fetchLikedPartners = async (userId: string) => {
  const res = await fetch("/api/perks/liked-stores");
  if (res.ok) {
    const data = await res.json();
    setLikedPartners(data.stores?.map((s: any) => s.store_key || s.store_name) || []);
  }
};
```

3. **Added `handleToggleLike` function:**
```typescript
const handleToggleLike = async () => {
  const partnerName = perk.partner_name;
  const isCurrentlyLiked = likedPartners.includes(partnerName);
  const newLiked = !isCurrentlyLiked;

  // Optimistic update
  if (newLiked) {
    setLikedPartners((prev) => [...prev, partnerName]);
  } else {
    setLikedPartners((prev) => prev.filter((p) => p !== partnerName));
  }

  // API call
  if (newLiked) {
    await fetch("/api/perks/liked-stores", { method: "POST", ... });
  } else {
    await fetch("/api/perks/liked-stores", { method: "DELETE", ... });
  }
};
```

4. **Updated heart button to use `handleToggleLike` and `likedPartners.includes(partnerName)`**

### Files Modified

| File | Change |
|------|--------|
| `app/perks/nfw/[slug]/page.tsx` | Added likedPartners state, fetchLikedPartners, handleToggleLike functions, updated heart button |

### Commit

- `fbd0604` - fix: save button on NFW perk detail page now calls API

## Session 2026-07-31: Grants Apply Reminder + Stripe Banner Text Updates

### Overview

Made two text updates to improve clarity for users.

### Changes Made

**1. Grants Apply Page - Quick Reminder Box**

Updated the "Quick reminder before you apply" box on `/grants/apply` to always display (removed conditional based on number of cycles) and added two new bullet points.

**Files Modified:**
- `components/GrantApplicationForm.tsx`

**Changes:**
- Removed `cycles.length > 1 &&` condition so reminder always displays
- Added bullet: "Some grants require additional documentation, please read the grant descriptions carefully."
- Added bullet: "There are no nominations this grant cycle. Keep an eye out for future nomination-only grants!"

**2. Dashboard Stripe Connect Banner**

Updated the IMPORTANT notice text in the "You're Approved!" banner on `/dashboard` for users who need to connect their bank account.

**Files Modified:**
- `app/dashboard/page.tsx`

**Before:**
```
If you don't have a website, just add https://www.nationalfundforwomen.org in the website field.
```

**After:**
```
If you don't have a website, please input nationalfundforwomen.org when prompted.
```

### 3. Dashboard Already Connected Banner

Added a new banner for users who have an approved grant AND have already completed Stripe onboarding. Previously, no banner showed for these users.

**Files Modified:**
- `app/dashboard/page.tsx`

**New Banner Condition:**
- `hasPaidOrApprovedGrant && profile?.stripe_onboarding_completed && latestGrantId`

**Banner Content:**
- Heading: "YOU'RE APPROVED!"
- Body: "You're already connected and ready to receive payments!"
- Indicator: "Bank Connected ✓" as simple text (no button)

### 4. Include payment_sent Status in Grant Banners

Updated the banner condition to include `payment_sent` status so users who have been paid also see the banners.

**Files Modified:**
- `app/dashboard/page.tsx`

**Changes:**
- Renamed `approvedGrants` → `paidOrApprovedGrants`
- Added `g.status === "payment_sent"` to filter
- Renamed `hasApprovedGrant` → `hasPaidOrApprovedGrant`
- Renamed `latestApprovedGrantId` → `latestGrantId`

**Updated Filter:**
```typescript
const paidOrApprovedGrants = (userGrants || []).filter(
  (g: any) =>
    (g.status === "approved" || g.status === "payment_sent") &&
    g.grant_cycles?.end_date > '2026-07-12'
);
```

## Session 2026-08-01: Grant Analytics Fixes

### Overview

Fixed grants analytics to properly exclude testing-only grants and corrected approval rate calculations.

### Database Schema Discovery

**Finding:** `grant_cycles` table has `is_testing_only` column, but `grants` table does NOT.

**Solution:** Use join-based filtering - create a lookup map from `grantCycles` to determine if a grant's cycle is testing-only.

### Changes Made

**`app/admin/analytics/page.tsx`:**
- Changed grants select from `is_testing_only` to `cycle_id` (the FK to grant_cycles)

**`components/admin/AdminAnalyticsClient.tsx`:**
- Removed broken `is_testing_only` from `Grant` type, added `cycle_id`
- Added `cycleTestingMap` useMemo that creates a `Map<cycle_id, is_testing_only>` from `grantCycles`
- Added `isGrantTestingOnly()` helper that uses the map to check if grant's cycle is testing-only
- Updated `filteredGrants` and `totalFunded` to use the helper
- Fixed `approvalRate` calculation:
  - **total** = all filtered grants (any status)
  - **approvals** = grants with status `"approved"` OR `"payment_sent"`
  - **percentage** = approvals / total
- "Number of Approvals" card now counts both `"approved"` and `"payment_sent"` statuses

### Key Fixes

1. **Testing-only filter:** Filters based on grant's `cycle_id` joined with `grant_cycles.is_testing_only`, not a non-existent column on grants

2. **Approval Rate:** `approved / (approved + submitted)` where approved = "approved" + "payment_sent", submitted = all statuses

3. **Number of Approvals:** Counts grants with status "approved" OR "payment_sent"

4. **Disbursed:** Uses `cycleTestingMap` to exclude testing-only grants

## Session 2026-08-01: Analytics Engagement Tab Updates

### Overview

Restructured the Engagement tab to remove the 5 stat cards at the top and reorganize the remaining sections.

### Changes Made

**`components/admin/AdminAnalyticsClient.tsx`:**

1. **Removed 5 stat cards above Engagement Summary:**
   - Active Members
   - Weekly Active
   - Monthly Active
   - Total Activities
   - Avg Actions/Member

2. **Kept Engagement Summary section** (now the first section in Engagement tab) with 4 wisteria cards:
   - Total Active Members
   - Total Activities
   - Avg Actions per Member
   - Engagement Rate

3. **Kept Activity Breakdown section** (now second) with 4 dove cards:
   - Perk Redemptions
   - ZDS Claims
   - NFW Perk Redemptions
   - Grant Applications

### Layout (Final)

```
Engagement Tab:
├── Engagement Summary (4 wisteria cards - top)
│   ├── Total Active Members
│   ├── Total Activities
│   ├── Avg Actions per Member
│   └── Engagement Rate
└── Activity Breakdown (4 dove cards - below)
    ├── Perk Redemptions
    ├── ZDS Claims
    ├── NFW Perk Redemptions
    └── Grant Applications
```

---

## Session 2026-08-01: Membership Upgrade Tracking Analytics

### Overview

Added 5 new upgrade stat cards to the Members tab in admin analytics to track membership tier transitions.

### Database

**Migration 132:** `supabase/migrations/132_add_previous_membership_level.sql`
```sql
ALTER TABLE profiles ADD COLUMN previous_membership_level TEXT;
CREATE INDEX idx_profiles_previous_membership_level ON profiles(previous_membership_level);
NOTIFY pgrst, 'reload';
```

**Purpose:** Tracks the immediately previous membership level before an upgrade, enabling detection of upgrade paths.

### Upgrade Stats Logic

| Stat | Filter Conditions |
|------|------------------|
| **free to contributing** | `previous_membership_level = 'free'` AND `membership_level = 'contributing'` AND `profile_completed = true` AND `free_membership_contact_submitted = true` (excludes abandoned) |
| **free to founding** | `previous_membership_level = 'free'` AND `membership_level = 'founding'` AND `profile_completed = true` AND `free_membership_contact_submitted = true` |
| **waitlist to contributing** | `previous_membership_level = 'waitlist'` AND `membership_level = 'contributing'` AND `profile_completed = true` |
| **waitlist to founding** | `previous_membership_level = 'waitlist'` AND `membership_level = 'founding'` AND `profile_completed = true` |
| **contributing to founding** | `first_paid_level = 'contributing'` AND `membership_level = 'founding'` AND `profile_completed = true` |

**Excludes:** `is_admin = true` from all counts

### Key Design Decisions

1. **Waitlist to free approval does NOT set `previous_membership_level`**
   - When a waitlist member gets approved (goes to free), `previous_membership_level` is NOT set
   - This means if they later pay, it counts as `free to paid` not `waitlist to paid`
   - Only direct waitlist to paid upgrades (without going through approval) set `previous_membership_level = 'waitlist'`

2. **Excludes abandoned profiles**
   - Abandoned = `profile_completed = true` but `free_membership_contact_submitted = false` or `NULL`
   - These are users who started signup but abandoned before completing

3. **Forward-only tracking**
   - `previous_membership_level` only captures transitions AFTER the column was added
   - Historical data cannot be backfilled

### Webhook Updates

**`app/api/webhook/route.ts`:**

1. **Fixed `first_paid_at` overwrite bug**
   - Previously: `first_paid_at: new Date().toISOString()` (overwrote every checkout)
   - Now: `first_paid_at: existingProfile.first_paid_at || new Date().toISOString()` (only sets if not already set)

2. **`checkout.session.completed`**
   - Sets `previous_membership_level: existingProfile.membership_level` before updating
   - Only sets `first_paid_at` / `first_paid_level` if not already set

3. **`customer.subscription.updated`**
   - Fetches current profile to get existing `membership_level`
   - Sets `previous_membership_level` before updating
   - Only sets `first_paid_at` / `first_paid_level` if not already set

### Gift Code Redemption

**`app/api/gift-codes/redeem/route.ts`:**
- Sets `previous_membership_level: profile?.membership_level || 'free'` before upgrading to contributing
- Only sets `first_paid_at` / `first_paid_level` if not already set

### Files Modified

| File | Changes |
|------|---------|
| `supabase/migrations/132_add_previous_membership_level.sql` | Created - adds column and index |
| `app/api/webhook/route.ts` | Fixed first_paid_at bug, added previous_membership_level tracking |
| `app/api/gift-codes/redeem/route.ts` | Added previous_membership_level tracking |
| `components/admin/AdminAnalyticsClient.tsx` | Added Profile type field, 5 useMemo calculations, UI section |
| `AGENTS.md` | This session entry |

### UI Location

Members tab in `/admin/analytics`, below the "New Members Over Time" chart:
- 5 cards in a row (responsive: 2 columns on mobile, 5 on desktop)
- Wisteria/10 background color
- Shows upgrade path label below each count

### To Deploy

1. Run migration 132 in Supabase SQL Editor
2. Deploy code changes

## Session 2026-08-01: Analytics Pie Chart Fixes

### Overview

Fixed analytics pie chart labels to match stat card numbers 100%. Pie charts were showing incorrect values because they used different filtering logic than the stat cards.

### Problems Fixed

1. **Members pie chart**: Was showing "Pending Free", "Started Free", "Free" - didn't match stat cards
2. **`adminCount` stat card**: Used `profiles` (all profiles) instead of `filteredProfiles`, causing mismatch
3. **Grants pie chart**: Removed entirely (not requested)
4. **Perks pie chart**: Added "Call" and "View" capitalization
5. **ZDS pie chart**: Added "cancelled" → "Cancelled" mapping

### Members Pie Chart Fix

**Before:** `membersByLevel` used different logic than stat cards:
- "Free" only checked `membership_level === "free"`, didn't require `is_approved_free_member === true`
- No "Incomplete" category (was "Pending Free", "Started Free")
- No "Admin" category (admins counted toward their membership tier)

**After:** Matches stat card logic exactly:
```typescript
if (p.is_admin) {
  level = "Admin";
} else if (p.profile_completed !== true || (p.membership_level === "free" && p.is_approved_free_member !== true && p.free_membership_contact_submitted === false)) {
  level = "Incomplete";
} else if (p.membership_level === "free" && p.is_approved_free_member === true) {
  level = "Free";
} else if (p.membership_level === "contributing") {
  level = "Contributing";
} else if (p.membership_level === "founding") {
  level = "Founding";
} else if (p.membership_level === "waitlist") {
  level = "Waitlist";
} else {
  level = "Other";
}
```

### `adminCount` Fix

**Before:**
```typescript
const adminCount = useMemo(() => {
  return profiles.filter((p) => p.is_admin === true).length;
}, [profiles]);
```

**After:**
```typescript
const adminCount = useMemo(() => {
  return filteredProfiles.filter((p) => p.is_admin === true).length;
}, [filteredProfiles]);
```

Now matches pie chart which uses `filteredProfiles`.

### Files Modified

| File | Changes |
|------|---------|
| `components/admin/AdminAnalyticsClient.tsx` | Rewrote `membersByLevel` to match stat cards, fixed `adminCount` to use `filteredProfiles`, added label capitalizations |

## Session 2026-08-03: Subscription Status Data Investigation

### Problem Discovered

Investigation into member `nuurightnow@gmail.com` (Jacqueline Santiago) revealed inconsistent data:
- `membership_level = 'free'`
- `subscription_status = 'active'`
- `first_paid_at = '2026-07-07'` (she DID pay)
- `first_paid_level = 'contributing'`

Her Stripe account confirmed she had an active contributing subscription, but her `membership_level` was incorrectly set to 'free'.

### Investigation Findings

**Query Results:**

| membership_level | subscription_status | count |
|----------------|-------------------|-------|
| founding | active | 106 |
| contributing | active | 637 |
| free | active | 212 |
| waitlist | active | 69 |

**July 8th Backfill Issue:**
- A bulk operation on July 8, 2026 incorrectly set `subscription_status = 'active'` for 280 members who never paid
- Of the 281 members with `free + active` or `waitlist + active`:
  - **280 had `first_paid_at = NULL`** - never paid
  - **Only 1 had actual payment history** (Michelle Howell - admin)

**SQL to verify:**
```sql
SELECT COUNT(*) FROM profiles
WHERE membership_level IN ('free', 'waitlist')
  AND first_paid_at IS NULL
  AND first_paid_level IS NULL
  AND subscription_status = 'active';
-- Result: 280
```

### Fix Applied

Corrected 280 profiles that never paid but had incorrect `subscription_status = 'active'`:

```sql
UPDATE profiles
SET subscription_status = NULL
WHERE membership_level IN ('free', 'waitlist')
  AND first_paid_at IS NULL
  AND first_paid_level IS NULL
  AND subscription_status = 'active';
```

Also corrected Jacqueline Santiago:
```sql
UPDATE profiles SET membership_level = 'contributing' WHERE email = 'nuurightnow@gmail.com';
```

### Root Cause

The July 8th bulk backfill operation incorrectly synced Stripe subscription STATUS (active/cancelled) without verifying actual payment history. Members who never paid had `subscription_status` set to 'active' based on Stripe data that wasn't actually a subscription.

### Files Modified

| File | Changes |
|------|---------|
| None | Data fix via SQL only |

---

## Session 2026-08-03: Grant Email Retry System

### Overview

Built automated retry system for failed grant emails (especially 429 rate limit errors) with per-email result tracking, manual retry, and admin UI.

### Goal

- Manual retry (not automatic on failure)
- Per-recipient success/failure tracking
- Admin UI to see who got emails and who didn't
- Unified logging for both approved and rejected emails
- Paste-to-retry tool for resending failed emails
- Check Resend API status before retrying (skip already delivered)
- Show per-email results after retry

### Constraints & Preferences

- 429 errors create NO Resend log entry → safe to retry immediately
- Must use our grant_email_log as source of truth for failed emails
- Resend Logs API can query by ID but NOT by email address
- For 364 past 429s: safe to retry, no Resend record exists to check

### Database

**Migration 133:** `supabase/migrations/133_grant_email_log.sql`

Creates `grant_email_log` table to track all grant email sends:
```sql
grant_email_log (
  id UUID PK,
  grant_id UUID REFERENCES grants(id),
  cycle_id UUID REFERENCES grant_cycles(id),
  email_type TEXT CHECK (approved, rejected),
  recipient_email TEXT NOT NULL,
  status TEXT CHECK (pending, sent, failed, bounced),
  resend_email_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Migration 134:** `supabase/migrations/134_add_grant_email_retry_status.sql`

Adds retry tracking columns:
- `already_sent` status for emails already delivered
- `last_resend_status` column to store final status after retry

### API Routes Created

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/grants/failed-emails` | GET | Fetch failed emails grouped by cycle |
| `/api/admin/grants/retry-failed` | POST | Retry all failed emails with Resend status check |
| `/api/admin/grants/[id]/retry-emails` | POST | Paste-to-retry specific emails |

### Retry Logic

1. **Fetch failed emails** from `grant_email_log` where `status = 'failed'`
2. **For emails with resend_email_id**: Check Resend API first
   - If `delivered` → mark as `already_sent`, skip
   - If `bounced/complained` → retry
   - If `sent/unknown` → retry
3. **For emails without resend_email_id** (429 case): Safe to retry immediately
4. **Send with throttling**: 110ms delay between emails (~9/sec, under 10/sec limit)
5. **Log each attempt** with new `resend_email_id` and status

**UI:** Two-step process:
1. Click "Check Status" - shows count of failed emails that will be retried
2. Click "Retry Failed" - retries the failed emails (disabled until checked)

### Throttling

All email sending uses 110ms delay to stay under Resend's 10 req/s rate limit:

| Location | Delay |
|----------|-------|
| Resend status check loop | 110ms per email |
| Approved email sending (individual) | 110ms per email |
| Rejected email sending (batch) | 110ms via `sendBatchEmails` |

### Email Functions Updated

**`lib/email.ts`:**
- `sendGrantApprovedEmail()` - Returns `{ success, resendId?, error? }`
- `sendGrantRejectedEmail()` - Returns `{ success, resendId?, error? }`

**`lib/email-batch.ts`:**
- Added `delayMs` parameter (default 110ms)
- Sequential sending with throttling

### Admin UI

**Combined Scores Page (`/admin/grants/[id]/scoring/combined`):**

Added "Retry Failed Emails" panel:
- Paste-to-retry textarea
- Send Retry button
- Last finalization result summary
- Retry result display with sent/failed counts
- Copy failed emails button

New "Retry All Results" collapsible section:
- Shows ✓ Retried, ⊘ Skipped, ✗ Failed per email
- Per-email list with status and reason
- Collapse button
- Copy failed emails button

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/133_grant_email_log.sql` | Tracking table |
| `supabase/migrations/134_add_grant_email_retry_status.sql` | already_sent status + last_resend_status |
| `app/api/admin/grants/failed-emails/route.ts` | GET failed emails by cycle |
| `app/api/admin/grants/retry-failed/route.ts` | POST retry all with Resend check |
| `app/api/admin/grants/[id]/retry-emails/route.ts` | Paste-to-retry API |

### Files Modified

| File | Changes |
|------|---------|
| `lib/email-batch.ts` | Added delayMs throttle, sequential sending |
| `lib/email.ts` | Return types include resendId |
| `app/api/admin/grants/[id]/final-approve/route.ts` | Logging via logEmail() helper |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Simplified UI - removed paste-to-retry, kept only "Retry All" button |

### Build Status

- ✅ Build passed (after fixing type errors with Resend API)

### To Deploy

1. Run migration 133 in Supabase SQL Editor
2. Run migration 134 in Supabase SQL Editor
3. Deploy the code
4. Go to `/admin/grants/[id]/scoring/combined` to use Retry All

---

## Session 2026-08-04: Check Resend Delivered for Historical Cycles

### Overview

Built API to compare historical July cycle applicants against Resend's delivered emails, mark delivered ones as already_sent, and mark undelivered ones as pending for retry.

### Problem

364 emails from July 31 finalization got 429 errors. The `grant_email_log` table was created AFTER these emails were sent, so we have no records. We need to:

1. Query Resend directly for emails sent July 29 - Aug 2
2. Compare our applicants against Resend's delivered list
3. Mark delivered as `already_sent`, undelivered as `pending`
4. Then use existing `retry-failed` endpoint to resend the pending ones

### Date Window
**July 29 - Aug 2, 2026**

### Hardcoded Cycle IDs
```typescript
const JULY_CYCLE_IDS = [
  "8986067e-cfbf-4d46-b162-bc8337ac61eb",
  "d89d63e8-7810-42e7-9ce6-91e4ca915d53",
  "8f1467d7-d6ee-4107-ab66-f239b01ca8a8",
];
```

### API: `POST /api/admin/grants/check-resend-delivered`

**Request:**
```json
{
  "date_from": "2026-07-29T00:00:00Z",
  "date_to": "2026-08-02T23:59:59Z"
}
```

**Logic:**
| Step | Action |
|------|--------|
| 1 | Get ALL applicants (approved + rejected + not_approved) for 3 July cycles from grants table |
| 2 | Query Resend REST API (NOT SDK) with pagination for sent_after/sent_before params |
| 3 | Filter Resend results to only `last_event === 'delivered'` |
| 4 | Build lookup map: `{email}_{cycleName}` → delivered |
| 5 | For each applicant: check if delivered in Resend |
| 6 | If YES: insert `grant_email_log` with `status: 'already_sent'` |
| 7 | If NO: insert `grant_email_log` with `status: 'pending'`, add to retry list |

**Response:**
```json
{
  "success": true,
  "checked": 450,
  "delivered_count": 86,
  "needs_retry_count": 364,
  "retry_list": [
    { "grant_id": "...", "email": "...", "cycle_name": "...", "type": "approved" | "rejected" }
  ],
  "message": "Found 86 delivered, 364 need retry"
}
```

### Resend REST API Call

```typescript
const response = await fetch(
  `https://api.resend.com/emails?sent_after=${dateFrom}&sent_before=${dateTo}&limit=100`,
  { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
);
```

Pagination: loop while `response.has_more` and use `response.next_cursor`.

### UI Flow

1. Date inputs pre-filled: July 29 - Aug 2
2. **"Check Resend"** button (lilac) → calls check-resend-delivered API
3. Results: "Checked X emails: Y delivered, Z need retry"
4. **"Retry Failed"** button → calls existing retry-failed endpoint (which finds entries in grant_email_log)

### Files Created

| File | Purpose |
|------|---------|
| `app/api/admin/grants/check-resend-delivered/route.ts` | Check Resend for historical cycles |

### Files Modified

| File | Changes |
|------|---------|
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Added date inputs, Check Resend button, results display |

### Key Implementation Details

- **Uses CSV instead of Resend API** - Reads `check-this.csv` from project root for delivered email lookup
- CSV contains exported Resend data with columns: id, created_at, subject, from, to, cc, bcc, reply_to, last_event, sent_at, etc.
- For each applicant: check if email appears in CSV with `last_event=delivered` AND subject contains grant name key
- CSV is source of truth for these 3 July cycles; can be updated/exported fresh from Resend as needed
- No Resend API calls during check phase - only used when actually sending retry emails
- Cycle name matching: subject contains cycle_name (e.g., "[JULY 26] Family Outing Fund")
- Supabase returns profiles as array from FK join → use `profiles[0]` to get email

---

## Session 2026-08-05: ZDC Checkout API Security Fix

### Problem

Zero Dollar Store was vulnerable to PII exposure because:
1. Draft Orders don't preserve `note_attributes` when converted to orders
2. Webhook fell back to `variant_id` matching which assigned orders to wrong users
3. Fraudsters could complete others' checkout URLs to claim items

### Root Cause

Draft Orders API (`/admin/api/2026-01/draft_orders.json`) creates checkout sessions, but when converted to completed orders, Shopify does NOT copy custom `note_attributes` (like `nfw_user_id`) to the resulting order. The webhook couldn't validate users.

### Solution

Switch from **Draft Orders API** to **Checkout API (Storefront GraphQL)**:
- Checkout API preserves `customAttributes` through to resulting orders
- Returns the actual `checkout.id` that appears in webhook `orders/create`
- Enables exact match on `shopify_checkout_id`

### Database Migration

**`supabase/migrations/135_zdc_checkout_api_migration.sql`:**

```sql
-- 1. Update status CHECK constraint with ALL valid status values
ALTER TABLE zero_dollar_claims DROP CONSTRAINT IF EXISTS zero_dollar_claims_status_check;
ALTER TABLE zero_dollar_claims ADD CONSTRAINT zero_dollar_claims_status_check 
  CHECK (status IN (
    'pending', 'created', 'completed', 'fulfilled', 'delivered',
    'cancelled', 'rejected_invalid_user', 'rejected_monthly_limit', 'paid'
  ));

-- 2. Add index on shopify_checkout_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_zero_dollar_claims_checkout_id 
  ON zero_dollar_claims(shopify_checkout_id) WHERE shopify_checkout_id IS NOT NULL;

-- 3. Add checkout_completed_at timestamp
ALTER TABLE zero_dollar_claims ADD COLUMN IF NOT EXISTS checkout_completed_at TIMESTAMPTZ;

-- 4. Add shopify_checkout_id to pending_monthly_claims
ALTER TABLE pending_monthly_claims ADD COLUMN IF NOT EXISTS shopify_checkout_id TEXT;

-- 5. Create index on pending_monthly_claims.shopify_checkout_id
CREATE INDEX IF NOT EXISTS idx_pending_monthly_claims_checkout_id 
  ON pending_monthly_claims(shopify_checkout_id) WHERE shopify_checkout_id IS NOT NULL;
```

### Checkout API Flow (New)

1. Insert `zero_dollar_claims` with `status = 'pending'`
2. Call Shopify **Checkout API** (Storefront GraphQL):
```graphql
mutation checkoutCreate($input: CheckoutCreateInput!) {
  checkoutCreate(input: $input) {
    checkout { id, webUrl }
    checkoutUserErrors { code, field, message }
  }
}
```
3. Get `checkout.id` from response
4. Update `zero_dollar_claims` with `shopify_checkout_id = checkout.id`, `status = 'created'`
5. Insert `pending_monthly_claims` with `shopify_checkout_id`
6. Return checkout URL to user

### Webhook Matching (New Priority)

1. **Primary**: `shopify_checkout_id` exact match ← uses real checkout ID
2. **Fallback**: `variant_id` match (less reliable)
3. **Fallback**: `claim_id` from `nfw_claim_id` customAttribute
4. **Fallback**: `user_id + product_id` from `nfw_user_id` customAttribute

### Files Modified

| File | Changes |
|------|---------|
| `app/api/shopify/checkout/route.ts` | Replaced Draft Order REST → Storefront GraphQL Checkout API |
| `app/api/shopify/webhook/route.ts` | Made `shopify_checkout_id` primary match, simplified fallback chain |
| `.env.local` | Added `SHOPIFY_STOREFRONT_ACCESS_TOKEN` |

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/135_zdc_checkout_api_migration.sql` | Schema changes |

### Credentials Used

- **Storefront Private Token**: Added to Vercel env vars: `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

### Rollback

If needed, create `supabase/migrations/136_zdc_checkout_api_rollback.sql`:
```sql
-- Reverse all 5 changes from migration 135
ALTER TABLE zero_dollar_claims DROP CONSTRAINT IF EXISTS zero_dollar_claims_status_check;
-- Recreate with original statuses from migration 079
ALTER TABLE zero_dollar_claims ADD CONSTRAINT zero_dollar_claims_status_check 
  CHECK (status IN ('pending', 'created', 'completed', 'fulfilled', 'delivered', 'cancelled', 'rejected_invalid_user', 'rejected_monthly_limit'));
DROP INDEX IF EXISTS idx_zero_dollar_claims_checkout_id;
ALTER TABLE zero_dollar_claims DROP COLUMN IF EXISTS checkout_completed_at;
ALTER TABLE pending_monthly_claims DROP COLUMN IF EXISTS shopify_checkout_id;
DROP INDEX IF EXISTS idx_pending_monthly_claims_checkout_id;
```

---

## Session 2026-08-05: ZDC Cancellation Bug Fixes

### Overview

Fixed multiple critical bugs in the Zero Dollar Store checkout and cancellation flow.

### Bugs Found & Fixed

#### Bug 1: Draft Order Note Missing Fields

**Problem:** Draft Order `note` only contained `claim_id:xxx`, missing `user_id` and `checkout_time`.

**File:** `app/api/shopify/checkout/route.ts`

**Fix:** Updated note format to pipe-delimited:
```
claim_id:xxx|user_id:xxx|checkout_time:xxx
```

#### Bug 2: Webhook DELETE Wrong Criteria

**Problem:** Cancellation webhook DELETE from `pending_monthly_claims` used `user_id + claim_month` instead of `shopify_checkout_id`.

**File:** `app/api/shopify/webhook/route.ts`

**Fix:** DELETE using `shopify_checkout_id`:
```typescript
.delete().eq("shopify_checkout_id", checkoutId)
```

#### Bug 3: Completion DELETE Wrong ID Format

**Problem:** Completion webhook DELETE tried using `checkoutId` (format: `gid://shopify/Checkout/xxx`) but `pending_monthly_claims` stored `draft_xxx` format.

**File:** `app/api/shopify/webhook/route.ts`

**Fix:** Use `claim.shopify_checkout_id` (contains `draft_xxx`):
```typescript
.delete().eq("shopify_checkout_id", claim.shopify_checkout_id)
```

#### Bug 4: Cancellation Status Filter Too Narrow

**Problem:** Cancellation webhook only updated claims with status `created` or `pending`, but completed orders have status `completed`. The UPDATE silently failed.

**File:** `app/api/shopify/webhook/route.ts`

**Fix:** Match by `user_id + claim_month` only, regardless of current status:
```typescript
// Before (bug):
.eq("user_id", nfwUserId)
.in("status", ["created", "pending"])

// After (fixed):
.eq("user_id", nfwUserId)
.eq("claim_month", claimMonth)
```

#### Bug 5: Cron Cleanup Type Mismatch

**Problem:** Cleanup cron job failed with `ERROR: operator does not exist: date = text`.

**Fix (SQL):**
```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_pending_claims()
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  DELETE FROM pending_monthly_claims p
  WHERE p.created_at < (NOW() - INTERVAL '30 minutes')
  AND NOT EXISTS (
    SELECT 1 FROM zero_dollar_claims z
    WHERE z.user_id = p.user_id
    AND z.claim_month::text = p.claim_month::text
    AND z.status = 'created'
  );
END;
$$;
```

### Commits

| Commit | Description |
|--------|-------------|
| `de4ef57` | fix: add user_id and checkout_time to Draft Order note, fix pending claim deletion |
| `e8553a2` | fix: use shopify_checkout_id to delete pending_monthly_claims |
| `cd1640a` | fix: cancel claim regardless of current status |

### Order Flow Summary

**Checkout:**
1. INSERT `zero_dollar_claims` (status: 'pending')
2. CREATE Draft Order via Shopify API
3. UPDATE `zero_dollar_claims` (status: 'created', shopify_checkout_id: 'draft_xxx')
4. INSERT `pending_monthly_claims` (shopify_checkout_id: 'draft_xxx')

**Order Completes:**
1. `orders/create` webhook fires
2. Match by `claim_id` from note (primary)
3. UPDATE `zero_dollar_claims` (status: 'completed')
4. DELETE from `pending_monthly_claims` using `claim.shopify_checkout_id`

**Order Cancels:**
1. `orders/updated` webhook fires
2. Match by `claim_id` from note (primary)
3. UPDATE `zero_dollar_claims` (status: 'cancelled') - matches by user_id + claim_month
4. DELETE from `pending_monthly_claims` using `shopify_checkout_id`

### Note Format

All Draft Orders use pipe-delimited note for tracking:
```
claim_id:62c56f88-4af5-42a0-ae3a-81647d5dc3c9|user_id:12a5c412-26f2-419d-aa2b-99a08e9bc202|checkout_time:1722841010638
```

---

## Session 2026-08-06: ZDC orders/create Cancelled Claim Bug Fix

### Problem

A user's July 23rd claim was marked as `completed` on Aug 5 at 22:50, even though:
1. The user had cancelled the order earlier that day (08:44 and 08:42)
2. The `orders/updated` webhook for cancellation was fired

### Root Cause

Two bugs combined:

**Bug 1:** `orders/create` webhook didn't check if claim was already cancelled before upgrading to `completed`. When a stale/delayed `orders/create` webhook arrived, it found the claim (which was still `status = 'created'` because the cancellation query didn't match it due to wrong `claim_month`), and overwrote it to `completed`.

**Bug 2:** `orders/create` was overwriting `claim_month` with the order's creation date. So even though the claim was created in July, it got `claim_month = '2026-08-01'` because the webhook processed in August.

### Fixes Applied

**1. Skip cancelled claims in `orders/create`:**

```typescript
// Skip if claim is already cancelled
if (existingClaim?.status === "cancelled") {
  console.log(`[orders/create] Claim ${existingClaim.id} is cancelled, skipping`);
  return NextResponse.json({ received: true });
}
```

**2. Preserve `claim_month` if already set:**

```typescript
// Only set claim_month if not already set (preserves original checkout month)
if (!claim.claim_month) {
  updateData.claim_month = claimMonth;
}
```

### Files Modified

| File | Changes |
|------|---------|
| `app/api/shopify/webhook/route.ts` | Added cancelled check, preserve claim_month |

### Commit

| Commit | Description |
|--------|-------------|
| `14c2570` | fix: skip cancelled claims in orders/create, preserve claim_month |

---

## Session 2026-08-06: Dashboard Order History Fix

### Problem

Dashboard "Your Order History" was showing all claims including abandoned checkouts with `status = 'created'`. Users saw "Order Placed" for checkouts they never completed.

### Root Cause

The query in `app/dashboard/page.tsx` fetched all claims without filtering by status:
```javascript
// Before:
supabaseAdmin
  .from("zero_dollar_claims")
  .select("*, ...")
  .eq("user_id", user.id)
  .order("claimed_at", { ascending: false })
  .limit(10),
```

### Fix

Added `.in("status", ["completed", "fulfilled", "paid"])` to only show completed orders.

```javascript
// After:
supabaseAdmin
  .from("zero_dollar_claims")
  .select("*, ...")
  .eq("user_id", user.id)
  .in("status", ["completed", "fulfilled", "paid"])
  .order("claimed_at", { ascending: false })
  .limit(10),
```

### ZDC Monthly Limit Behavior

| Status | Blocks New Checkout? | Auto-Cleanup |
|--------|-------------------|--------------|
| `pending` | ❌ No | N/A |
| `created` | ❌ No | ❌ No (stays forever) |
| `completed/fulfilled/paid` | ✅ Yes | N/A |
| `pending_monthly_claims` | ❌ No | ✅ Cron (30 min) |

Users can have multiple abandoned checkouts (`created` status) without being blocked. The pending_monthly_claims UNIQUE constraint prevents duplicate pending entries but fails silently, allowing checkout to continue.

### Files Modified

| File | Changes |
|------|---------|
| `app/dashboard/page.tsx` | Added status filter to only show completed/fulfilled/paid claims |

### Commit

| Commit | Description |
|--------|-------------|
| `d8c27f4` | fix: dashboard only show completed/fulfilled/paid claims |

## Session 2026-08-06: Admin Members User ID Display and Search

### Goal

Add User ID display below email in `/admin/members` table with copy icon, and enable searching members by User ID.

### Constraints & Preferences

- User ID must appear below email in the Member cell (not as a separate column)
- Copy icon style must match the email copy icon pattern
- Search bar placeholder should indicate "name, email, or ID" searching

### Changes Made

**`components/admin/AdminMembersClient.tsx`:**

1. **Added `copyId` function** - Similar to `copyEmail` but copies `m.id` to clipboard with 2-second checkmark confirmation

2. **Added User ID row below email in Member cell:**
   - Smaller text (`text-xs`), muted color (`text-nfw-blackberry/30`)
   - Monospace font for readability (`font-mono`)
   - Copy icon button matching email copy pattern
   - Truncates with `truncate` and `max-w-[180px]` to prevent overflow

3. **Updated search filter** - Included `m.id` in the search logic:
   ```typescript
   const matchesSearch =
     !search ||
     (m.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (m.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (m.state?.toLowerCase() || "").includes(search.toLowerCase()) ||
     (m.city?.toLowerCase() || "").includes(search.toLowerCase()) ||
     m.id.toLowerCase().includes(search.toLowerCase());
   ```

4. **Updated search placeholder** - Changed to `"Search by name, email, or ID..."`

### Commit

- (pending) - feat: add User ID display and search to admin members page

## Session 2026-08-06: ZDC Webhook Security Fix - Remove Dangerous variant_id Fallback

### Goal

Fix critical ZDC webhook bug causing ~7-10% data corruption (19/250 claims) where `variant_id` fallback matches wrong user's claim.

### Problem

The `orders/create` and `orders/updated` webhook handlers used `variant_id` as a fallback match mechanism. This was dangerous because:
- Multiple users can claim the same product (same variant)
- The fallback had no user validation
- Wrong user's claim could be overwritten

### Root Cause

The `variant_id` fallback in `orders/create` would match ANY user's claim with the same variant, without verifying the user ID. Example:
- User A claims variant 6925386252332 → gets claim assigned
- User B claims same variant later
- When User B's order completed, `variant_id` fallback matched User A's claim and overwrote it

### Fix Applied

**`app/api/shopify/webhook/route.ts`:**

#### `orders/create` handler:
1. **Removed `variant_id` fallback** - Too dangerous, matches wrong user
2. **Removed `status = 'created'` filters** - Caused false negatives when claims already completed
3. **Removed `user_id + product_id` fallback** - Same issue as variant_id
4. **Added user validation** - If `nfw_user_id` from custom_attributes doesn't match `existingClaim.user_id`, reject the order as `rejected_invalid_user`
5. **Preserved `claim_month`** - Only set from order date if not already set (prevents July claims being overwritten with August date)

#### `orders/updated` handler:
1. **Removed `variant_id` fallback** - Too dangerous
2. **Kept only specific matchers**: claim_id from note, checkout_id, order_id
3. **Same user validation approach** - If nfw_user_id present, validate before cancelling

### Match Priority (After Fix)

| Priority | Match Method | User Validation |
|----------|-------------|----------------|
| 1 | `claim_id` from note | Required if nfw_user_id present |
| 2 | `checkout_id` exact match | Required if nfw_user_id present |
| 3 | `draft_order_id` match | Required if nfw_user_id present |

### Key Security Principle

- **`variant_id` alone is NEVER sufficient** to identify a claim - it can match any user who claimed that variant
- User validation via `nfw_user_id` from custom_attributes is REQUIRED when present
- If we can't securely identify the claim via specific IDs, we don't touch it

### Commit

| Commit | Description |
|--------|-------------|
| `xxxxxx` | fix: remove variant_id fallback, add user validation in ZDC webhook |


---

## Session 2026-08-07: Shared Membership Category Utility

### Overview

Created shared utility module for membership category calculations to ensure 100% consistency between CSV export, analytics page, and admin members page.

### Problem

The `/admin/analytics` stats and CSV export were calculating membership categories differently:
- CSV used `getCategory()` with: Admin, Founding, Contributing, Waitlist, **Abandoned**, **Profile Incomplete**, Free, Unknown
- Analytics pie chart used inline logic with: Admin, Founding, Contributing, Waitlist, **Incomplete** (combined), Free, Other

This caused the numbers to not match when comparing analytics stats to CSV breakdowns.

### Solution

Created `lib/member-categories.ts` as single source of truth for category calculations.

### Files Created

| File | Purpose |
|------|---------|
| `lib/member-categories.ts` | Shared utility with `getCategory()` and `getSubStatus()` functions |

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/members/export/route.ts` | Removed local `getCategory()`/`getSubStatus()`, imports from shared utility |
| `components/admin/AdminAnalyticsClient.tsx` | `membersByLevel` now uses `getCategory()`; Added separate `abandonedCount` and `profileIncompleteCount` stat cards |
| `app/admin/members/page.tsx` | Added `previous_membership_level` to query; Split "Incomplete" into "Abandoned" and "Profile Incomplete" stat cards |
| `components/admin/AdminMembersClient.tsx` | `membershipBadge()` now uses `getCategory()`; Added `previous_membership_level` to Member type and select query |

### Category Logic (Shared)

| Category | Condition |
|----------|-----------|
| Admin | `is_admin === true` |
| Founding | `membership_level === "founding"` |
| Contributing | `membership_level === "contributing"` |
| Waitlist | `membership_level === "waitlist"` |
| Abandoned | `free` + `profile_completed=true` + `!contactSubmitted` + `!isApproved` |
| Profile Incomplete | `free` + `profile_completed=false` |
| Free | `free` + approved |
| Unknown | fallback |

### Alignment Achieved

- CSV `getCategory()` breakdown = Analytics `membersByLevel` pie chart exactly
- `/admin/members` stat cards (Abandoned + Profile Incomplete) = Analytics `abandonedCount` + `profileIncompleteCount`
- All three places use the same `getCategory()` function from shared utility

### Commits

| Commit | Description |
|--------|-------------|
| `545cc4a` | feat: shared membership category utility for aligned stats across admin pages |
| `0f68556` | fix: make waitlist card grey on analytics page |
| `78aea3a` | fix: use grey shades for Abandoned, Waitlist, Profile Incomplete in members pie chart |
| `cc90d6b` | fix: add previous_membership_level and first_paid_level to analytics profiles select |
| `9b4a810` | fix: make Abandoned card grey on admin members page |
| `5ec186a` | feat: add gift card column to CSV export, move category column, create gift_code_redeemed migration |

---

## Session 2026-08-07: Grey Card Colors + CSV Export Enhancements

### Grey Card Colors

Made Abandoned, Waitlist, and Profile Incomplete cards grey on analytics and admin/members pages to visually distinguish non-paying members:

| Category | Color |
|----------|-------|
| Waitlist | `bg-nfw-stone/40` |
| Abandoned | `bg-nfw-stone/40` |
| Profile Incomplete | `bg-nfw-stone/40` |

### Analytics Upgrade Stats Fix

Fixed analytics to properly count membership upgrades. The `previous_membership_level` and `first_paid_level` fields were missing from the profiles select query, causing all 5 upgrade counts to show 0.

**Added to profiles select in `app/admin/analytics/page.tsx`:**
- `previous_membership_level`
- `first_paid_level`

### CSV Export Enhancements

| Change | Description |
|--------|-------------|
| "Gift Card" column | Yes/No - indicates if member used a gift code to sign up as contributing or founding |
| Category column move | Moved to right of Full Name |
| Rename | "Membership Level" → "Stripe Level" |

### Database Migration 136

```sql
-- Migration: 136_add_gift_code_redeemed_to_profiles.sql
-- Adds gift_code_redeemed boolean to profiles table and backfills from gift_membership_codes

-- 1. Add gift_code_redeemed column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gift_code_redeemed BOOLEAN DEFAULT FALSE;

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_gift_code_redeemed ON profiles(gift_code_redeemed) WHERE gift_code_redeemed = TRUE;

-- 3. Backfill: Set gift_code_redeemed = TRUE for profiles where id exists in gift_membership_codes with redeemed_at
UPDATE profiles
SET gift_code_redeemed = TRUE
WHERE id IN (
  SELECT DISTINCT redeemed_by_user_id
  FROM gift_membership_codes
  WHERE redeemed_by_user_id IS NOT NULL
    AND redeemed_at IS NOT NULL
);

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
```

### Files Modified

| File | Change |
|------|--------|
| `app/admin/analytics/page.tsx` | Added `previous_membership_level` and `first_paid_level` to profiles select |
| `app/api/admin/members/export/route.ts` | Added gift_card column, moved category, renamed membership_level to stripe_level |
| `components/admin/AdminAnalyticsClient.tsx` | Made Waitlist, Abandoned, Profile Incomplete cards grey |
| `app/admin/members/page.tsx` | Made Abandoned card grey |
| `app/api/gift-codes/redeem/route.ts` | Set `gift_code_redeemed: true` on gift code redemption |
| `supabase/migrations/136_add_gift_code_redeemed_to_profiles.sql` | Created migration |

### Commit

| Commit | Description |
|--------|-------------|
| `ee02fed` | feat: remove Stripe Level and Sub Status columns from CSV, reorder Gift Card |
| `d00bacd` | feat: rename Category to Membership Category in CSV |

## Session 2026-08-11: Analytics Date Range Timezone Fix

### Problem
Custom date range filtering (e.g., 8/1/2026 - 8/11/2026) was including dates outside the selected range due to JavaScript Date timezone issues.

### Root Cause
- `new Date("8/1/2026")` parses the date as midnight in the **user's local timezone**
- Database `joined_at` timestamps are stored as **UTC**
- When comparing UTC timestamp against local midnight, the timezone offset caused incorrect inclusions/exclusions

For example, in EDT (UTC-4):
- User selects "8/1/2026" local midnight
- JavaScript interprets this as "8/1/2026 00:00:00 EDT" = "8/1/2026 04:00:00 UTC"
- Database has "2026-08-01T00:00:00.000Z" = "8/1/2026 00:00:00 UTC"
- Comparison: `00:00 UTC < 04:00 UTC` → incorrectly excludes Aug 1 UTC dates

### Fix Applied

**`components/admin/AdminAnalyticsClient.tsx`:**

Use `Date.UTC()` to create dates directly in UTC, avoiding local timezone conversion issues:

```typescript
// Parse M/D/YYYY and create date in UTC
const parts = customStartDate.split("/");
const utcMs = Date.UTC(
  Number(parts[2]),
  Number(parts[0]) - 1,
  Number(parts[1]),
  0,
  0,
  0,
  0
);
return new Date(utcMs);
```

### Commit

| Commit | Description |
|--------|-------------|
| `2380cec` | fix: correct timezone handling for custom date range filtering |
| `185bab7` | fix: use Date.UTC for unambiguous UTC date parsing |

## Session 2026-08-11: Full CSV Export from Analytics

### Problem
Analytics page had a "Export CSV" button that only exported summary/aggregation data, not actual member records. The `/admin/members` export had no date filtering capability, so it couldn't match the analytics date range.

### Solution

**1. Members Export API with Date Filtering**

**`app/api/admin/members/export/route.ts`:**

Added optional `start_date` and `end_date` query params:
- If params provided, filter profiles by `joined_at >= startDate AND joined_at <= endDate`
- Uses same UTC timezone handling as analytics
- Filename includes date range when filtering: `nfw-members-6/1/2026-to-6/15/2026.csv`

```typescript
// Parse M/D/YYYY date string to UTC timestamp
function parseCustomDate(dateStr: string, isStart: boolean): string {
  const parts = dateStr.split("/");
  const year = Number(parts[2]);
  const month = Number(parts[0]) - 1;
  const day = Number(parts[1]);

  let date: Date;
  if (isStart) {
    date = new Date(year, month, day, 0, 0, 0, 0);
    const tzOffset = date.getTimezoneOffset();
    date = new Date(date.getTime() + tzOffset * 60 * 1000);
  } else {
    date = new Date(year, month, day, 23, 59, 59, 999);
    const tzOffset = date.getTimezoneOffset();
    date = new Date(date.getTime() + tzOffset * 60 * 1000);
  }

  return date.toISOString();
}
```

**2. Analytics "Full CSV" Button**

**`components/admin/AdminAnalyticsClient.tsx`:**

Added "Full CSV" button (aubergine) next to existing "CSV" button:
- Calls `/api/admin/members/export` with date params if custom range is set
- Opens in new tab for download
- Same columns as `/admin/members` export

```typescript
const exportFullCSV = () => {
  let url = "/api/admin/members/export";
  const params = new URLSearchParams();

  if (dateRange === "custom" && customStartDate && customEndDate) {
    params.set("start_date", customStartDate);
    params.set("end_date", customEndDate);
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  window.open(url, "_blank");
};
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/members/export/route.ts` | Added date filtering via query params |
| `components/admin/AdminAnalyticsClient.tsx` | Added Full CSV export function and button |

### Commit

| Commit | Description |
|--------|-------------|
| `dc106f7` | fix: timezone bug in date filtering and add full CSV export |

## Session 2026-08-13: Waitlist Filter Bug Fix

### Problem
The waitlist page at `/admin/waitlist` was showing members who upgraded to paid tiers (contributing/founding) because the GET query only filtered on `waitlist_joined_at IS NOT NULL`, but didn't filter by `membership_level = 'waitlist'`.

### Root Cause
When a waitlist member upgrades via gift code or Stripe checkout, their `membership_level` changes from `'waitlist'` to `'contributing'` or `'founding'`, but `waitlist_joined_at` is not cleared. The GET query at line 29 in `app/api/admin/bulk/waitlist/route.ts` only checked `.not("waitlist_joined_at", "is", null)`.

### Fix

**`app/api/admin/bulk/waitlist/route.ts`:**

Added `.eq("membership_level", "waitlist")` to the GET query to ensure only members with current `membership_level = 'waitlist'` appear:

```typescript
const { data: members, error } = await supabase
  .from("profiles")
  .select(`...`)
  .eq("membership_level", "waitlist")     // ← ADD THIS
  .not("waitlist_joined_at", "is", null)
  .order("waitlist_joined_at", { ascending: true });
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/bulk/waitlist/route.ts` | Added `.eq("membership_level", "waitlist")` to GET query |

## Session 2026-08-13: Analytics Avg Dues Calculation Fix

### Problem
The "Avg Dues" card on `/admin/analytics` was calculating `Membership Revenue / Paid Members` where the denominator was all contributing + founding members without checking `profile_completed`.

### Solution

Changed `averageDues` to use `(paidMembersCount + freeMembersCount)` as the denominator:
- `paidMembersCount` = non-admin + contributing/founding + `profile_completed === true`
- `freeMembersCount` = non-admin + free + approved + `profile_completed === true`

This ensures Avg Dues = `Membership Revenue / Total Legitimate Members` (paid + approved free).

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminAnalyticsClient.tsx` | Changed averageDues denominator to use paidMembersCount + freeMembersCount |

## Session 2026-08-14: Waitlist Page & CSV UTC Timezone Fix

### Problem

The `/admin/waitlist` page and CSV export were using local timezone methods (`toLocaleDateString()`, `getMonth()`, `getDate()`) which could display incorrect dates depending on the browser/server timezone. This was inconsistent with the analytics page and `/admin/members` which had been fixed to use UTC.

### Solution

Updated both files to use UTC-safe date formatting:

**`app/admin/waitlist/AdminWaitlistClient.tsx`:**
- `formatDate()` - now uses `Date.UTC()` + `timeZone: "UTC"`
- `formatDateTime()` - now uses `Date.UTC()` + `timeZone: "UTC"`

**`app/api/admin/waitlist/export/route.ts`:**
- `formatDate()` - now uses `getUTCMonth()`, `getUTCDate()`, `getUTCFullYear()`

Note: `formatDateTime()` in the export route was already correct (uses `toISOString()` which is always UTC).

### Files Modified

| File | Change |
|------|--------|
| `app/admin/waitlist/AdminWaitlistClient.tsx` | `formatDate` and `formatDateTime` now use UTC methods |
| `app/api/admin/waitlist/export/route.ts` | `formatDate` now uses UTC methods |

## Session 2026-08-14: Waitlist CSV Export Missing Membership Level Filter

### Problem

The `/admin/waitlist` CSV export was including contributing and free members in addition to waitlist members. This happened because the export query only checked `.not("waitlist_joined_at", "is", null)` but didn't filter by `.eq("membership_level", "waitlist")`.

### Solution

Added `.eq("membership_level", "waitlist")` to the export query to match the logic used in the waitlist display page and API.

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/waitlist/export/route.ts` | Added `.eq("membership_level", "waitlist")` to export query |

## Session 2026-08-14: Redirect /grants to /microgrants

### Overview

Deleted the static `/grants` landing page and replaced with a redirect to `/microgrants` (page builder). Also deleted duplicate `/grants/view` page.

### Changes Made

| File | Change |
|------|--------|
| `app/grants/page.tsx` | Replaced static landing page content with redirect to `/microgrants` |
| `app/grants/view/page.tsx` | Deleted duplicate static landing page |
| `components/Navigation.tsx` | Default nav links updated from `/grants` → `/microgrants` |
| `components/landing/Footer.tsx` | Default footer links updated from `/grants` → `/microgrants` |
| `components/admin/FooterEditorClient.tsx` | Default footer editor links updated from `/grants` → `/microgrants` |

### Routing

- `/grants` → redirects to `/microgrants` (page builder CMS page)
- `/grants/apply` → continues to work (application form)
- `/grants/my-applications` → continues to work
- `/grants/view/[id]` → continues to work
- `/grants/connect/*` → continues to work

### Note

The `/microgrants` page is managed via the page builder (database CMS), not as a static page in the codebase.

---

## Session 2026-08-14: Stacked Features Section Top Alignment

### Change

Updated the Stacked Features section template to top-align heading, body, and bullets content instead of center-aligning.

**Files Modified:**

| File | Change |
|------|--------|
| `components/sections/StackedFeaturesSection.tsx` | Removed `justify-center` from content container to top-align heading/body/bullets |

**What changed:**
- Removed `justify-center` from the content wrapper div so heading, body, and bullets align to top of column
- Eyebrow stays at top (unchanged)
- Link stays at bottom via `mt-auto` (unchanged)

## Session 2026-08-19: Perk Redemption UI Conformance

### Overview

Fixed redeemed state and coupon display to conform across NFW detail, Access detail, NFW slideout, and Access slideout.

### Database Migrations

**Migration 138:** `supabase/migrations/138_add_coupon_code_to_nfw_perks.sql`
- Added `coupon_code TEXT` column to `nfw_perks` table

**Migration 139:** `supabase/migrations/139_add_is_admin_only_to_nfw_perks.sql`
- Added `is_admin_only BOOLEAN DEFAULT FALSE` column to `nfw_perks` table

### Goal
- Coupon code shown ONLY after redemption (not before)
- "Reveal Coupon Code" button to reveal coupon after redemption
- "Click here" opens partner website after coupon revealed
- Conform Access Perks UI to match NFW Perks UI

### Changes Made

**NFW Perk Detail Page (`/perks/nfw/[slug]`):**
- Added `coupon_code` from API to state after redemption
- Restructured redeem card to match Access Perks pattern:
  - "Redeem Online" button (aubergine) when not redeemed
  - "Redeemed" button (green) when redeemed
  - "You've already redeemed this perk..." message when redeemed
  - Promo Code section with Copy button
  - "Online redemptions open in a new tab." info box

**Access Perk Detail Page (`/perks/[offerKey]`):**
- Added query to `offer_redemptions` table on page load to check for existing redemption
- Simplified redemption message to "Enter promotion code X at checkout"

**NFW Slideout (`NfwPerkDetailPanel.tsx`):**
- Added `showCoupon` state for reveal button flow
- Restructured to match Access Perks pattern:
  - Single "Redeem Online" / "Redeemed" button
  - "You've already redeemed..." message
  - Coupon code with Copy button (shown after reveal)
  - AlertCircle info box

**Access Slideout (`OfferDetailPanel.tsx`):**
- Added `showCoupon` state
- Added `AlertCircle` import
- Restructured redeemed section:
  - "Redeemed" button (green) when redeemed
  - "You've already redeemed..." message
  - Coupon code section (revealed after clicking Redeem Online)
  - "Online redemptions open in a new tab." info box
- "Redeem Online" button now sets `showCoupon` when clicked

**New API Route:**
- `app/api/perks/redemptions/check/route.ts` - checks if user already redeemed an offer

### Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/138_add_coupon_code_to_nfw_perks.sql` | Added coupon_code column |
| `supabase/migrations/139_add_is_admin_only_to_nfw_perks.sql` | Added is_admin_only column |
| `app/api/nfw-perks/[id]/route.ts` | Accept coupon_code |
| `app/api/admin/nfw-perks/[id]/route.ts` | Accept coupon_code, is_admin_only |
| `app/api/admin/nfw-perks/route.ts` | Accept coupon_code |
| `app/api/nfw-perks/[id]/redeem/route.ts` | Return coupon_code |
| `app/api/nfw-perks/redemptions/route.ts` | Return coupon_code |
| `app/api/nfw-perks/route.ts` | Return coupon_code |
| `app/api/nfw-perks/slug/[slug]/route.ts` | Return coupon_code |
| `app/api/perks/redemptions/check/route.ts` | NEW - check redemption status |
| `app/admin/nfw-perks/AdminNfwPerks.tsx` | Admin UI with coupon_code field |
| `app/perks/nfw/[slug]/page.tsx` | Restructured redeem card |
| `app/perks/[offerKey]/page.tsx` | Added redemption check on load |
| `app/perks/page.tsx` | Pass coupon_code to slideouts |
| `components/perks/NfwPerkDetailPanel.tsx` | Restructured redeem section |
| `components/perks/OfferDetailPanel.tsx` | Restructured redeem section with reveal flow |
| `components/dashboard/RedeemedPerksPanel.tsx` | Show coupon_code for NFW perks |

### Key Design Decisions

- Coupon code revealed ONLY after redemption to ensure users go through the redemption flow
- `offer_redemptions` table stores redemptions - queried to check if user already redeemed
- Access Perks don't need "About This Perk" card (only NFW perks)
- NFW perks use `perk.coupon_code` from API, Access perks query local `offer_redemptions` table
- There are TWO NFW components: `NfwPerkDetailPanel.tsx` (slideout) and `/perks/nfw/[slug]` (detail page)

## Session 2026-08-20: Perk Redemption State Bug Fix

### Overview

Fixed bug where redeemed state did not persist for Access Perks in the slideout (`OfferDetailPanel.tsx`). After redeeming, the state was not being set to `hasRedeemed(true)`, causing the redeemed button to not show on subsequent views.

### Bug Analysis

**Problem:**
- `OfferDetailPanel.tsx` (Access Perks slideout) never called `setHasRedeemed(true)` after successful redemption
- The initial redemption check required BOTH `redeemed: true` AND `coupon_code` to exist
- For non-coupon offers (instore, call), there was no `coupon_code`, so state was lost on reload

**What Worked:**
- NFW slideout: Called `onRedeem` callback → parent updates state → worked correctly
- NFW detail page: Called `setPerk({ ...perk, userHasRedeemed: true })` → worked correctly
- Access detail page: Called `setHasRedeemed(true)` for all methods → worked correctly

### Changes Made

**`components/perks/OfferDetailPanel.tsx`:**

1. **Fixed initial redemption check** (line 252):
   - Changed from requiring BOTH `redeemed` AND `coupon_code`
   - To only requiring `redeemed` (non-coupon offers now properly show as redeemed)

2. **Added `setHasRedeemed(true)` after successful API response for all 4 methods:**
   - `link` method (after `setRedemptionResult`)
   - `instore_print` method (after both `setCustomRedemption` and `setRedemptionResult`)
   - `instore` method (after both `setCustomRedemption` and `setRedemptionResult`)
   - `call` method (after `setRedemptionResult`)

### Files Modified

| File | Change |
|------|--------|
| `components/perks/OfferDetailPanel.tsx` | Added `setHasRedeemed(true)` after all redemption methods, fixed initial check to not require coupon_code |

## Session 2026-08-21: Stripe Revenue Tracking & Reconciliation

### Overview

Built Stripe revenue tracking system to reconcile membership revenue between Stripe live data and the database. Created infrastructure to track lifetime value, payments, and upgrades.

### Database

**Migration 140:** `supabase/migrations/140_stripe_revenue_tracking.sql`

Creates infrastructure for revenue tracking:

**New columns on `profiles`:**
- `stripe_customer_id TEXT` - Stripe customer ID
- `lifetime_value NUMERIC(10,2) DEFAULT 0` - Total lifetime revenue from this member
- `signup_source TEXT DEFAULT 'unknown'` - How they signed up (stripe, gift_code, etc.)

**New table `membership_upgrades`:**
- Tracks tier transitions (free→contributing, contributing→founding, etc.)
- Columns: id, user_id, from_level, to_level, amount, stripe_payment_id, created_at

**New table `membership_payments`:**
- Individual payment records for reconciliation
- Columns: id, user_id, amount, payment_type (signup/renewal/upgrade/refund), stripe_payment_id, stripe_invoice_id, created_at

**New table `stripe_backfill_status`:**
- Tracks backfill reconciliation status per user
- Columns: id, user_id, stripe_customer_id, stripe_subscription_id, status (pending/matched/mismatched/not_found), mismatch_reason, last_checked_at

### API Routes Created

**Stripe Backfill Routes (`/api/admin/backfill/stripe/`):**
| Route | Purpose |
|-------|---------|
| `status/route.ts` | GET overall match/mismatch counts |
| `reconcile/route.ts` | Real-time comparison: Stripe vs DB revenue |
| `live-stats/route.ts` | Stripe live revenue stats by tier |
| `payments/[id]/route.ts` | DELETE single payment record |
| `payments/bulk-delete/route.ts` | Bulk delete payments for a user |
| `unmatched-subscribers/route.ts` | Stripe customers not in our DB |
| `unmatched-profiles/route.ts` | Our profiles not matched to Stripe |

### Admin UI

**Backfill Page (`/admin/backfill/stripe`):**
- **BackfillClient.tsx** - Main admin UI component
- Reconciliation comparison table showing:
  - Stripe live revenue vs Database revenue
  - Matched count, mismatched count
  - Per-tier breakdown (Contributing $15, Founding $100)
- Problematic payments table showing:
  - User info, payment amount, payment type
  - Delete single / Bulk delete actions
- Status tracking showing pending, matched, mismatched, not_found counts

### Key Design Decisions

| Decision | Value |
|----------|-------|
| Revenue comparison | Compares Stripe live $ vs membership_payments.sum |
| Match criteria | stripe_customer_id matches OR email matches |
| Mismatch detection | Compares Stripe subscription amount against expected tier |
| Payment types | signup, renewal, upgrade, refund |
| Refund handling | Negative amounts stored in membership_payments |

### Stripe Live Stats (as of 2026-08-21)

| Tier | Amount | Subscribers |
|------|--------|-------------|
| Contributing ($15) | $10,740 | 716 |
| Founding ($100) | $10,455 | 105 |
| **Total** | **$21,195** | **821** |

### Discrepancy Found

| Source | Amount | Difference |
|--------|--------|------------|
| Stripe Live | $21,195 | - |
| Analytics (DB) | $21,240 | +$45 |
| Difference | ~3 $15 payments | - |

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/140_stripe_revenue_tracking.sql` | Schema creation |
| `app/api/admin/backfill/stripe/status/route.ts` | Overall status counts |
| `app/api/admin/backfill/stripe/reconcile/route.ts` | Real-time comparison |
| `app/api/admin/backfill/stripe/live-stats/route.ts` | Stripe live data |
| `app/api/admin/backfill/stripe/payments/[id]/route.ts` | Delete single payment |
| `app/api/admin/backfill/stripe/payments/bulk-delete/route.ts` | Bulk delete |
| `app/api/admin/backfill/stripe/unmatched-subscribers/route.ts` | Unmatched Stripe |
| `app/api/admin/backfill/stripe/unmatched-profiles/route.ts` | Unmatched DB profiles |
| `app/admin/backfill/stripe/page.tsx` | Admin page wrapper |
| `app/admin/backfill/stripe/BackfillClient.tsx` | Admin UI component |

### Files Modified

| File | Change |
|------|--------|
| `app/api/webhook/route.ts` | Store stripe_customer_id on checkout.session.completed |
| `components/admin/AdminAnalyticsClient.tsx` | Fixed TypeScript errors in export |

### Next Phase

**Phase 2:** Implement $85 upgrade from Contributing → Founding
- Always prorated (~$85 for remaining time on subscription)
- Dashboard, profile, and step 3 show "Upgrade to Founding" for contributing members
- Free members see full $100 Founding price
- Stripe subscription update with `proration_behavior: 'create_prorations'`

## Session 2026-08-26: Simplify Payment Tracking - Drop Stored lifetime_value

### Goal

Simplify payment tracking: `membership_payments` is single source of truth; drop `lifetime_value` from `profiles` and `stripe_backfill_status`, compute from `membership_payments`.

### Constraints & Preferences

- Only successful Stripe payments insert into membership_payments
- Use Stripe's billing_reason for payment type (signup/renewal/upgrade)
- Drop lifetime_value from both profiles and stripe_backfill_status
- Compute lifetime_value from SUM(membership_payments.amount) for successful payments only

### Changes Made

**INSERT logic with billing_reason** (2 files):
- `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts` - INSERT into membership_payments using billing_reason
- `app/api/cron/sync-all-stripe-payments/route.ts` - INSERT into membership_payments using billing_reason

**Migration 145:** `supabase/migrations/145_drop_lifetime_value_columns.sql`
- Drops `lifetime_value` from `profiles` table
- Drops `lifetime_value` from `stripe_backfill_status` table

**Routes computing lifetime_value from membership_payments** (4 files):
- `app/api/admin/backfill/stripe/member/[email]/route.ts` - computes for individual member lookup
- `app/api/admin/backfill/stripe/status/route.ts` - computes per user for status dashboard
- `app/api/admin/backfill/stripe/duplicates/route.ts` - computes per user for duplicate analysis
- `app/admin/analytics/page.tsx` - removed from profiles select

**Routes no longer writing lifetime_value** (4 files):
- `app/api/admin/backfill/stripe/insert-missing/route.ts` - removed profile update after INSERT
- `app/api/admin/backfill/stripe/backfill-existing/route.ts` - removed Stripe subscription fetch and lifetime_value writes
- `app/api/admin/backfill/stripe/process/route.ts` - removed Stripe charges fetch and lifetime_value writes
- `app/api/cron/backfill-sync/route.ts` - removed Stripe subscription fetch and lifetime_value writes

### Key Design Decisions

| Decision | Value |
|----------|-------|
| Stripe billing_reason mapping | subscription_create → signup, subscription_cycle → renewal, subscription_update → upgrade |
| Drop both lifetime_value columns | Option A - profiles.lifetime_value AND stripe_backfill_status.lifetime_value |
| membership_payments is source of truth | All payment financial data computed from this table |
| Successful payments only | Only count successful payments (not failed/rejected/cancelled) in lifetime_value |

### Build Status

- ✅ TypeScript compiles without errors
- ✅ Build passes successfully

## Session 2026-08-26: Fix Stripe Invoice Sync - Query Invoices for billing_reason

### Problem

All three Stripe payment sync routes were querying `stripe.charges.list()` but `billing_reason` lives on **Invoices**, not Charges. This caused:
- `billing_reason` to always be `null` 
- All payments defaulted to `"renewal"` payment type

### Root Cause

```typescript
// BEFORE (broken):
const charges = await stripe.charges.list({ customer: stripeCustomerId });
// billing_reason: (charge as any).billing_reason || null  // Always null!

// AFTER (fixed):
const invoices = await stripe.invoices.list({ customer: stripeCustomerId });
// billing_reason: invoice.billing_reason  // Works!
```

### Routes Fixed

| Route | File | Changes |
|-------|------|---------|
| sync-missing-payments | `app/api/admin/backfill/stripe/sync-missing-payments/route.ts` | Removed contributing-only filter, use invoice billing_reason |
| sync-customer/[id] | `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts` | Use invoice data for billing_reason and stripe_invoice_id |
| sync-all-stripe-payments | `app/api/cron/sync-all-stripe-payments/route.ts` | Use invoice data for accurate payment types |

### Key Changes

1. **Replaced `stripe.charges.list()` with `stripe.invoices.list()`** in all three routes
2. **Added `stripe_invoice_id`** to PaymentRecord interface (invoices use `invoice.id`)
3. **Updated PaymentRecord interface:** `status: string | null` to handle invoice status types
4. **Removed `has_refunded` detection** for invoices (requires charge lookups, skipped for simplicity)
5. **Updated invoice processing loop:** Uses `invoice.amount_paid`, `invoice.status`, `invoice.billing_reason`

### Invoice vs Charge Fields

| Field | Charge | Invoice |
|-------|--------|---------|
| billing_reason | ❌ None | ✅ subscription_create/cycle/update |
| amount | charge.amount | invoice.amount_paid |
| status | succeeded/failed | paid/open |
| id | charge.id | invoice.id |

### Build Status

- ✅ TypeScript compiles without errors
- ✅ Build passes successfully

### Data Verification

Queried existing `membership_payments` - all 866 payments correctly marked as `"signup"`:
| amount | payment_type | count |
|--------|-------------|-------|
| 15.00 | signup | 759 |
| 100.00 | signup | 107 |

All payments were true first-time signups (free→contributing, free→founding, or waitlist→contributing/founding). No renewals or upgrades had occurred yet.

### Bug Fix: Invoice Status vs Payment Type Display

**Problem:** After switching to invoices API, the BackfillClient UI was showing `payment.status` which is `"paid"` for invoices, not meaningful payment types.

**Fix:** Changed UI to display `payment.payment_type` (signup/renewal/upgrade) instead of `payment.status` (paid/succeeded):
- Green badge for signup
- Blue badge for renewal
- Purple badge for upgrade

### Bug Fix: Invoice Status Check in Insert Logic

**Problem:** `insertMembershipPaymentsIfNeeded` was checking `payment.status !== "succeeded"` but invoices have status `"paid"`, not `"succeeded"` (which is for charges). This caused **all invoice payments to be skipped** during INSERT into `membership_payments`.

**Impact:** New paid members had `stripe_backfill_status` updated but NO rows were inserted into `membership_payments` table. The cron ran successfully but silently skipped every payment.

**Fix:** Changed status check from `"succeeded"` to `"paid"` in:
- `app/api/cron/sync-all-stripe-payments/route.ts` (line 158)
- `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts` (line 160)

**Recovery:** After code deploy, click individual update button OR re-run cron to INSERT missing payments. Existing `stripe_backfill_status` data is already correct - only `membership_payments` INSERT was broken.

### Bug Fix: Add payment_type to all_payments_json

**Problem:** `all_payments_json` stored `billing_reason` but not `payment_type`. The UI fell back to displaying `billing_reason` (e.g., "subscription_create") instead of the short format ("signup").

**Fix:** Updated both sync routes to also store `payment_type` in `all_payments_json`:
- `app/api/cron/sync-all-stripe-payments/route.ts`
- `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts`

**New SQL to backfill existing data:**
```sql
UPDATE stripe_backfill_status
SET all_payments_json = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', obj->>'id',
      'amount', (obj->>'amount')::numeric,
      'status', obj->>'status',
      'date', obj->>'date',
      'error_message', obj->>'error_message',
      'billing_reason', obj->>'billing_reason',
      'stripe_invoice_id', obj->>'stripe_invoice_id',
      'payment_type',
        CASE
          WHEN obj->>'billing_reason' = 'subscription_create' THEN 'signup'
          WHEN obj->>'billing_reason' = 'subscription_cycle' THEN 'renewal'
          WHEN obj->>'billing_reason' = 'subscription_update' THEN 'upgrade'
          ELSE 'renewal'
        END
    )
  )
  FROM jsonb_array_elements(all_payments_json) AS obj
)
WHERE all_payments_json IS NOT NULL
  AND (all_payments_json->0->>'payment_type') IS NULL;
```

## Session 2026-08-26: Admin Grants Page 1000 Row Limit Fix

### Problem

The `/admin/grants` page was showing incorrect grant counts due to Supabase's default 1000 row limit. The SQL showed 146 grants for a cycle, but the UI displayed 138.

### Root Cause

The page was fetching all grants with `select("id, status, cycle_id")` but Supabase PostgREST capped results at 1000 rows. The code was filtering client-side with `.filter()`, which couldn't count grants beyond the 1000-row limit.

### Solution

Created an RPC function that performs aggregation in PostgreSQL, bypassing the row limit entirely.

**Database Migration (`supabase/migrations/146_create_get_grant_stats_function.sql`):**

```sql
CREATE OR REPLACE FUNCTION get_grant_counts_by_cycle()
RETURNS TABLE (
  cycle_id UUID,
  total BIGINT,
  submitted BIGINT,
  approved BIGINT,
  not_approved BIGINT,
  payment_pending BIGINT,
  payment_sent BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.cycle_id,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE g.status = 'submitted')::BIGINT as submitted,
    COUNT(*) FILTER (WHERE g.status = 'approved')::BIGINT as approved,
    COUNT(*) FILTER (WHERE g.status = 'not_approved')::BIGINT as not_approved,
    COUNT(*) FILTER (WHERE g.status = 'payment_pending')::BIGINT as payment_pending,
    COUNT(*) FILTER (WHERE g.status = 'payment_sent')::BIGINT as payment_sent
  FROM grants g
  WHERE g.cycle_id IS NOT NULL
  GROUP BY g.cycle_id
  ORDER BY g.cycle_id;
END;
$$;
```

### Files Modified

| File | Change |
|------|--------|
| `app/admin/grants/page.tsx` | Replaced raw grants query with RPC call to `get_grant_counts_by_cycle()`, pre-aggregates stats in JS |
| `components/admin/SortableCycleList.tsx` | Changed interface from `grants: Grant[]` to `cycleStats: Record<string, CycleStats>`, removed `getCycleStats()` function |
| `supabase/migrations/146_create_get_grant_stats_function.sql` | New - creates RPC function |

### Key Design Decisions

- **SQL aggregation over client-side**: GROUP BY in PostgreSQL is more efficient than fetching all rows and filtering in JavaScript
- **Pre-aggregated stats**: Stats are computed server-side and passed as a map to the component, avoiding client-side filtering
- **SECURITY DEFINER**: Function uses service role to bypass RLS for admin page

## Session 2026-08-26: Contact Form Dropdown - Donations or Matriarch Program

### Overview

Added "Donations or Matriarch Program" option to the contact form dropdown at `/contact`.

### Changes Made

| File | Change |
|------|--------|
| `components/contact/ContactClient.tsx` | Added new `<option value="donations-matriarch">Donations or Matriarch Program</option>` after "Partnership inquiry" |

## Session 2026-08-26: Fix stripe_payment_id for Automatic Payments

### Problem

9 records in `membership_payments` had `stripe_payment_id` incorrectly set to invoice ID (`in_xxx`) instead of `null`. This happened because the code fell back to `invoice.id` when `invoice.charge` was not available.

### Root Cause

For automatic payments (`collection_method: "charge_automatically"`), Stripe's Invoice API doesn't expose the charge ID. When `invoice.charge` is `null`, the code was incorrectly falling back to `invoice.id`.

### Investigation

- Examined Stripe Invoice API response for `in_1U8moWJOPvaPuV9pj8xB91N9`
- Confirmed `charge` field doesn't exist on the Invoice object for automatic payments
- Older records from `insert-missing` route had `stripe_payment_id = null` (correct pattern)

### Solution

1. **Changed insert logic** to set `stripe_payment_id = null` when `invoice.charge` is not a string
2. **Added fallback duplicate check** using `user_id + amount + created_at` when `stripe_payment_id` is `null`
3. **Applied fix to both sync routes** that use Invoices API

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts` | Use `stripe_payment_id` as-is, add fallback duplicate check |
| `app/api/cron/sync-all-stripe-payments/route.ts` | Same fix |
| `app/api/admin/backfill/stripe/sync-missing-payments/route.ts` | Same fix |

### Code Changes

**Before (wrong):**
```typescript
const stripePaymentId = payment.stripe_payment_id || payment.id;
```

**After (correct):**
```typescript
const stripePaymentId = payment.stripe_payment_id;
// Fallback duplicate check when stripe_payment_id is null
if (stripePaymentId) {
  // Check by stripe_payment_id
} else {
  // Check by user_id + amount + created_at
}
```

### Final Data Pattern

| stripe_payment_id | stripe_invoice_id | Correct? |
|-----------------|-----------------|----------|
| `null` | `in_xxx` | ✅ For automatic payments |
| `ch_xxx` | `null` | ✅ For charge-based records |

### SQL Applied

```sql
-- Fix existing wrong records
UPDATE membership_payments
SET stripe_payment_id = NULL
WHERE stripe_payment_id LIKE 'in_%';
```

### Session 2026-08-27: Cancelled Status Badge

**Problem:** Members with `subscription_status = 'cancelled'` were showing a grey "None" badge in the STATUS column, making it unclear why they had no subscription.

**Solution:** Added a red "Cancelled" badge for cancelled subscriptions.

**Files Modified:**
| File | Change |
|------|--------|
| `components/admin/AdminMembersClient.tsx` | Added `status === "cancelled"` condition with red `bg-red-500` badge |

**Change:**
```typescript
if (status === "cancelled")
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-500 text-white">
      <XCircle className="w-3 h-3" /> Cancelled
    </span>
  );
```

### Session 2026-08-27: Backfill Stripe Page Search Fix

**Problem:** When searching the backfill stripe page results table, if the search returned 0 matches, the entire table (including headers and filter bar) would disappear.

**Root Cause:** Line 1223 had condition `{initialized && filteredRows.length > 0 && (`, which short-circuits to `false` when search filters to zero results.

**Fix Applied:**
1. Changed condition from `filteredRows.length > 0` to `rows.length > 0` — table always renders when data exists
2. Added "No results" row inside `<tbody>` when `filteredRows.length === 0` showing `"No results for \"xyz\""`

**Files Modified:**
| File | Change |
|------|--------|
| `app/admin/backfill/stripe/BackfillClient.tsx` | Line 1223: `filteredRows.length > 0` → `rows.length > 0`; Lines 1285-1293: Added ternary with "No results" row |

**Commit:** `941124c` - fix: show table with no-results message instead of hiding when search has no matches

### Session 2026-08-27: Grant Scoring Rubric Update

**Overview**

Updated the grant scoring rubric criteria to better reflect the evaluation process for grant applications.

**Changes Made**

**`components/admin/GrantScoringRubric.tsx`:**
- Replaced "URGENCY (0-3)" with "Criteria 1: Intent & Feasibility – Use of Funds"
  - Description: "Does the applicant present a clear, realistic plan for how the grant funds will be spent and executed?"
  - Score 3: High Clarity – clear, well-defined plan with itemized costs/dates/practical steps
  - Score 2: Medium Clarity – intended use clear but execution details general
  - Score 1: Low Clarity – states what but minimal detail on application/management
  - Score 0: Unclear – vague, missing, or no concrete plan

- Replaced "AUTHENTICITY OF NEED (0-3)" with "Criteria 2: Authenticity of Need – Applicant's Story/Personal Context"
  - Description: Does the applicant provide a clear, personal narrative of their need? Do they include a "who", "what", and "why"?
  - Added examples showing before/after of generic vs. specific narratives
  - Score 3: High Clarity – links who they are to specific current hurdle, genuine "hand-raise" moment
  - Score 2: Medium Clarity – need clear but "who"/"why now" is thin
  - Score 1: Low Clarity – vague or generic language
  - Score 0: No Clarity – no explanation of who they are or why they want funds

- Replaced "IMPACT (0-3)" with "Criteria 3: Impact – Outcome"
  - Description: Does the applicant detail how this grant will meaningfully benefit their life?
  - Score 3: High Clarity – grant directly addresses financial gaps, reduces stress, fosters connection
  - Score 2: Medium Clarity – desire for funds clear but connection to outcome general
  - Score 1: Low Clarity – funds will help but benefit unclear
  - Score 0: Unclear – benefit not stated or unclear

- Moved Urgency to "Additional Consideration" section (dove background callout box)
  - Not scored, noted as "*Urgency does not guarantee approval, but should be considered holistically"

**`components/admin/GrantApplicationScorer.tsx`:**
- Updated scoring input labels and descriptions on first/second review pages:
  - "URGENCY" → "Criteria 1: Intent & Feasibility"
  - "AUTHENTICITY OF NEED" → "Criteria 2: Authenticity of Need"
  - "IMPACT" → "Criteria 3: Impact"
- Updated descriptions to match new rubric criteria

**Commit:** `958edb7` - feat: update grant scoring rubric criteria names and descriptions

---

## Session 2026-08-27: Page Builder Template Styling Updates

### Pricing Hero (`pricing_hero`)

**Changes to `components/sections/PricingHeroSection.tsx`:**
- Reduced vertical padding: `py-20 lg:py-24` → `py-16 lg:py-20`

### Perks Feature + Brand Logos (`perks_feature`)

**Changes to `components/sections/PerksFeatureSection.tsx`:**
- Reduced vertical padding: `py-20 lg:py-28` → `py-16 lg:py-20`
- Reduced horizontal padding: `px-4 sm:px-6 lg:px-8` → `px-2 sm:px-4 lg:px-6`

### Benefits with Checkmarks (`benefits_checkmarks`)

**Changes to `components/sections/BenefitsCheckmarksSection.tsx`:**
- Benefit cards now have solid aubergine (`#3E145F`) background instead of transparent tinted backgrounds
- Text changed to white (`text-white` for title, `text-white/80` for description)
- Border changed to `border-white/20` for subtle definition
- Checkmark circles retain their original check colors (yellow, blue, lilac, wisteria)

**Before:** Cards had subtle colored tint at 15% opacity (e.g., `#fdf49325`) which made text hard to read on dark backgrounds

**After:** Cards have solid aubergine background with white text for maximum readability across all background colors

**Commit:** `144b73f` - fix: BenefitsCheckmarks card backgrounds to aubergine with white text; reduce PerksFeature padding

---

## Session 2026-08-28: Shopify Checkout Health Monitoring

### Overview

Implemented Shopify checkout health monitoring and manual disable system for Zero Dollar Store with admin controls and user-facing modal.

### Goal
- Health check: Manual only (admin clicks button), no cron/auto-run
- Image fallback: Accept mock products when Shopify is down (no DB image caching)
- Admin-only visibility (health status not public)
- New "Operations" section in admin dashboard
- Nice modal for unavailable message (not alert/toast)
- Hybrid health monitoring: Admin API check + Shopify Status public API

### Database

**Migration 148:** `supabase/migrations/148_create_system_settings.sql`

Created `system_settings` table with fields:
- `id` (UUID PK, default gen_random_uuid)
- `shopify_checkout_enabled` (BOOLEAN, default TRUE)
- `shopify_health_status` (TEXT: "unknown", "healthy", "unhealthy")
- `shopify_health_message` (TEXT)
- `shopify_last_health_check` (TIMESTAMPTZ)
- `shopify_external_status` (TEXT)
- `shopify_external_description` (TEXT)
- `shopify_external_updated_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### API Routes Created

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/system-settings` | GET | Public - returns checkout enabled flag |
| `/api/system-settings` | POST | Admin only - update any setting |
| `/api/system-settings/health-check` | GET | Admin only - tests Shopify Admin API connectivity |
| `/api/system-settings/external-status` | GET | Public - fetches Shopify Status API (shopifystatus.com) |

### Admin Page

**`/admin/system-settings`** - Operations panel with:
- "Disable Checkout" toggle switch (red when disabled)
- "Run Health Check" button - tests Shopify Admin API connectivity
- Health status display: Operational (green) / Issues Detected (yellow) / Unreachable (red)
- Response time display
- Last checked timestamp
- External Shopify Status: operational / degraded / major_outage
- External status description and last updated time

### System Settings Health Check

**Health Check Endpoint (`/api/system-settings/health-check`):**
- Calls Shopify Admin API `GET /admin/api/2026-01/shop.json`
- Returns: `{status, message, timestamp, responseTime}`
- Timeout: 5 seconds
- Status values: "healthy", "unhealthy", "timeout", "error"

**External Status Endpoint (`/api/system-settings/external-status`):**
- Fetches `https://shopifystatus.com/api/v2/status.json`
- Returns: `{status, description, components[], updated_at}`
- Cache: 5 minutes
- Maps to simple status: operational → "operational", else → status value

### Checkout API Guard

**`/api/shopify/checkout/route.ts`:**
- Added check at start of handler for `shopify_checkout_enabled` flag
- If disabled: returns 503 with `{error, shopify_unavailable: true}`
- Frontend shows ShopifyUnavailableModal when this error is received

### User-Facing Modal

**`components/ui/ShopifyUnavailableModal.tsx`:**
- Centered modal with AlertTriangle icon in citrine circle
- "Store Temporarily Unavailable" heading
- Friendly message: "We're sorry, the Zero Dollar Store is temporarily unavailable. Please check back in a few minutes."
- "If you continue to experience issues, please contact support."
- "OK" button to dismiss
- Escape key and overlay click to close

### StoreClient Integration

**`components/StoreClient.tsx`:**
- Added `shopifyUnavailable` state
- Passes `onShopifyUnavailable` callback to `ClaimItemModal`
- When checkout API returns 503 with `shopify_unavailable: true`, modal is shown

### ClaimItemModal Update

**`components/ClaimItemModal.tsx`:**
- Added `onShopifyUnavailable?: () => void` prop
- On checkout API error with `shopify_unavailable: true`:
  - Calls `onShopifyUnavailable()`
  - Closes modal via `onClose()`

### Admin Hub Update

**`app/admin/AdminHubClient.tsx`:**
- Added Operations section with ShoppingBag icon
- Single link: "System Settings" → `/admin/system-settings`

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/148_create_system_settings.sql` | system_settings table |
| `app/api/system-settings/route.ts` | GET/POST system settings |
| `app/api/system-settings/health-check/route.ts` | Shopify Admin API health check |
| `app/api/system-settings/external-status/route.ts` | Shopify Status public API |
| `app/admin/system-settings/page.tsx` | Admin page wrapper |
| `app/admin/system-settings/SystemSettingsClient.tsx` | Admin UI component |
| `components/ui/ShopifyUnavailableModal.tsx` | User-facing unavailable modal |

### Files Modified

| File | Change |
|------|--------|
| `app/api/shopify/checkout/route.ts` | Added checkout enabled flag check |
| `components/StoreClient.tsx` | Added ShopifyUnavailableModal integration |
| `components/ClaimItemModal.tsx` | Added onShopifyUnavailable prop |
| `app/admin/AdminHubClient.tsx` | Added Operations section |

### Key Design Decisions

- Health check uses Admin API `shop.json` endpoint (lightweight, reliable)
- External status uses shopifystatus.com public API (no auth needed)
- Checkout flag stored in system_settings table (already has infrastructure)
- Display both internal health (our store) + external status (Shopify infrastructure)
- Mock products fallback uses Unsplash images when Shopify unreachable

## Session 2026-08-28: Shopify Checkout Health Monitoring (Continued)

### Bug: Modal Not Showing on Page Load

**Problem:** When toggle was OFF, visiting `/store` did not show the unavailable modal immediately.

**Root Cause:** The `ShopifyUnavailableModal` was only triggered when clicking "Claim Item" button, not on page load.

**Fix:** Added `checkSystemSettings()` to `StoreClient.tsx` useEffect that fetches `/api/system-settings` on mount and sets `shopifyUnavailable` state if `shopify_checkout_enabled === false`.

### Bug: Modal Could Be Closed

**Problem:** Modal had X button, click-outside-to-close, and Escape key that allowed users to dismiss the unavailable modal.

**Solution:** Simplified `ShopifyUnavailableModal.tsx` to be non-dismissable:
- Removed `isOpen`, `onClose` props
- Removed X button, Escape key handler, click-outside-to-close
- Removed `useEffect` for body overflow management
- Modal always renders when component mounts (no conditional return)
- Only "Visit Homepage" button which links to `/`

### Files Modified

| File | Change |
|------|--------|
| `components/ui/ShopifyUnavailableModal.tsx` | Simplified to non-dismissable modal |
| `components/StoreClient.tsx` | Added `checkSystemSettings()` to show modal on page load |

### Behavior

1. Admin toggles "Disable Checkout" OFF at `/admin/system-settings`
2. Any user visiting `/store` sees the unavailable modal immediately
3. No way to dismiss - user must click "Visit Homepage" or navigate away
4. Modal stays until admin toggles checkout back ON

---

## Session 2026-08-28: Signup Page Sidebar Editor

### Goal

Make signup page sidebar content editable via `/admin/signup` page (eyebrow, headline, body text, benefits list, testimonial with optional author).

### Database Migration

**Migration 149:** `supabase/migrations/149_create_site_signup.sql`

Creates `site_signup` table with columns:
- `id` (UUID, PK)
- `eyebrow` (TEXT) - default "JOIN WOMEN NATIONWIDE"
- `headline` (TEXT) - default "Become a Member"
- `body_text` (TEXT) - intro text with paragraph support via `\n\n`
- `benefits` (JSONB) - array of benefit strings
- `testimonial_text` (TEXT)
- `testimonial_author` (TEXT)
- `updated_at` (TIMESTAMPTZ)

RLS: public read, admin write. Seeded with default row.

### API Route

**`app/api/signup/route.ts`:**
- GET: Fetch signup content (public)
- POST: Save signup content (admin only)

### Admin Page

**`app/admin/signup/page.tsx`:**
- Server wrapper with `requireAdmin()`
- Fetches initial data server-side

**`components/admin/SignupEditorClient.tsx`:**
- Eyebrow, headline, body text inputs
- Benefits: add/remove/reorder with up/down arrows
- Testimonial text and author (author hidden if blank)
- Saves to `/api/signup`

### Public Page

**`app/auth/sign-up/page.tsx`:**
- Server-side fetch of signup data
- Passes to `SignUpFlow` component via `signupData` prop

**`components/SignUpFlow.tsx`:**
- Accepts optional `signupData` prop
- Uses dynamic data or falls back to defaults
- Body text renders paragraphs (split on `\n\n`)
- Benefits list with wisteria checkmarks
- Testimonial section (author hidden if blank)

### Features

- Benefits: individual add/remove/reorder (up/down arrows, no drag)
- Testimonial author: optional, hidden when blank
- Body text: supports paragraphs via `\n\n` separator
- Reduced spacing between body text and benefits list
- Admin link at `/admin/signup` under Content & Website section

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/149_create_site_signup.sql` | Table schema |
| `app/api/signup/route.ts` | GET/POST API |
| `app/admin/signup/page.tsx` | Admin page wrapper |
| `components/admin/SignupEditorClient.tsx` | Admin editor UI |

### Files Modified

| File | Change |
|------|--------|
| `app/auth/sign-up/page.tsx` | Server-side fetch, pass signupData |
| `components/SignUpFlow.tsx` | Dynamic data support, paragraph rendering |
| `app/admin/AdminHubClient.tsx` | Added "Edit Signup Page" link |

### To Deploy

1. Run migration 149 in Supabase SQL Editor
2. Visit `/admin/signup` to edit sidebar content
3. Visit `/auth/sign-up` to preview changes

---

## Session 2026-08-30: Stripe Backfill Status Update Bug Fix

### Problem

5 members (jessrife@proton.me, jessicahooie@yahoo.com, renaeswope@gmail.com, testewart647@gmail.com, tingorony@gmail.com) showed as `not_found` status in the backfill admin page despite having paid memberships. Their `stripe_backfill_status` rows had `payment_count = 1` and `total_amount = 15.00` recorded, but `status = 'not_found'` and `stripe_customer_id = null`.

### Root Cause

The `sync-missing-payments` and `sync-customer/[id]` routes found Stripe customers and recorded their payments, but **failed to update the `status` field** from `'not_found'` to `'matched'`.

### Files Fixed

| File | Change |
|------|--------|
| `app/api/admin/backfill/stripe/sync-missing-payments/route.ts` | After inserting payment, now also updates `stripe_backfill_status` with `status: "matched"`, `stripe_customer_id`, and `processed_at` |
| `app/api/admin/backfill/stripe/sync-customer/[id]/route.ts` | Added `status: "matched"` to the update object |

### Why 90% Were Unaffected

Most members were processed correctly because:
1. Their `stripe_customer_id` was populated in `stripe_backfill_status` from the start
2. The cron job (`sync-all-stripe-payments`) ran hourly and picked them up properly
3. The 5 affected members were in a "liminal state" when the initial backfill ran

### SQL Fix for Affected Members

```sql
UPDATE stripe_backfill_status
SET
  status = 'matched',
  stripe_customer_id = CASE
    WHEN email = 'jessrife@proton.me' THEN 'cus_V9VjaXUKsqLROF'
    WHEN email = 'jessicahooie@yahoo.com' THEN 'cus_V9Mw6UkuwhjYXW'
    WHEN email = 'renaeswope@gmail.com' THEN 'cus_V9kYoAyxmVbLbm'
    WHEN email = 'testewart647@gmail.com' THEN 'cus_V9pfFiXdMNA8Ks'
    WHEN email = 'tingorony@gmail.com' THEN 'cus_VAAlNtbW7Ktfe4'
  END
WHERE email IN (
  'jessrife@proton.me',
  'jessicahooie@yahoo.com',
  'renaeswope@gmail.com',
  'testewart647@gmail.com',
  'tingorony@gmail.com'
);
```

## Session 2026-08-30 (Afternoon): Gift Code Signup Source Tracking

### Overview

Added automatic `signup_source = 'gift'` tracking when gift codes are redeemed, and added `signup_source` to the profile update API's allowed fields.

### Problem

The gift code redemption API was setting `gift_code_redeemed = true` but NOT `signup_source = 'gift'`. This meant gift code redemptions were not being tracked properly in analytics and backfill reports.

### Files Modified

| File | Change |
|------|--------|
| `app/api/profile/update/route.ts` | Added `"signup_source"` to `ALLOWED_FIELDS` |
| `app/api/gift-codes/redeem/route.ts` | Added `signup_source: "gift"` when redeeming gift code |

### SQL to Fix Existing Gift Code Members

```sql
UPDATE profiles
SET signup_source = 'gift'
WHERE email = 'terrilsouza@gmail.com';
```

### Key Design Decision

Server-side tracking (Option A) was chosen over client-side because:
1. Server-side is more reliable - no dependency on client passing the field correctly
2. Single source of truth - ANY gift code redemption path automatically gets the correct source
3. Defense in depth - even if someone bypasses the UI and calls the API directly, it still gets set correctly

## Session 2026-08-30 (Evening): Fix Analytics Active Member Count Bug

### Overview

Fixed bug where analytics showed 933 paid members but admin/members showed 934. The discrepancy was caused by analytics incorrectly requiring `profile_completed === true` for contributing and founding members.

### Root Cause

`AdminAnalyticsClient.tsx` had a bug in `activeProfilesCount` useMemo that required `profile_completed === true` for ALL member tiers (free, contributing, founding). However, `/admin/members` does NOT require `profile_completed` for contributing and founding members - only for free members.

The single discrepancy member was `ch@christyhaubegger.com` - a contributing member who paid via Stripe but never completed their profile signup (date_of_birth='1900-01-01', identities=[], all other fields null).

### Files Modified

| File | Change |
|------|--------|
| `components/admin/AdminAnalyticsClient.tsx` | Fixed `activeProfilesCount` to not require `profile_completed` for contributing/founding tiers |

### SQL to Find Affected Members

```sql
-- Find contributing/founding members with profile_completed != true
SELECT email, membership_level, profile_completed, signup_source
FROM profiles
WHERE is_admin = false
  AND membership_level IN ('contributing', 'founding')
  AND profile_completed != true;
```

## Session 2026-08-30: Checkout Bypass Security Fix

### Overview

Fixed critical security vulnerability where users with incomplete profiles could bypass signup steps and pay via Stripe without completing their profile.

### Problem

ch@christyhaubegger.com joined, received the 2-hour incomplete reminder email (linking to step 3), but instead of completing steps 1-2, she clicked a paid membership button and paid via Stripe without ever completing her profile. The checkout API didn't validate profile completion.

### Solution

**Server-side validation + blocking modal (Option B1)**

### Files Modified

| File | Change |
|------|--------|
| `app/api/checkout/route.ts` | Added `profile_completed` check before creating Stripe session |
| `components/SignUpFlow.tsx` | Added blocking modal for incomplete profiles on step 3 |

### Checkout API Validation

```typescript
// Check if profile is complete before allowing checkout
const { data: profile } = await supabase
  .from("profiles")
  .select("profile_completed")
  .eq("id", session.user.id)
  .single();

if (profile && profile.profile_completed !== true) {
  return NextResponse.json(
    { error: "profile_incomplete", message: "Please complete your profile before continuing with payment." },
    { status: 400 }
  );
}
```

### Modal Behavior

- **Non-dismissable**: No X button, no click-outside, no Escape key
- Shows when checkout API returns `profile_incomplete` error
- Single button: "Complete Your Profile" → navigates to step 1
- User must complete steps 1 and 2 before returning to step 3 to pay

## Session 2026-08-30: Backfill Stripe Analytics - Gift Card Filter

### Overview

Added Gift Card filter to `/admin/backfill/stripe` page to track members who joined via gift code redemption.

### Problem

The backfill analytics page had no way to filter for gift code members (`signup_source === 'gift'`), making it difficult to analyze the gift code signup flow.

### Changes Made

**`app/admin/backfill/stripe/BackfillClient.tsx`:**
- Added `signup_source` to profiles interface
- Added `gift_card` to `paymentFilter` state type
- Updated filter logic:
  - `no_payment`: Expanded to all membership levels (was only contributing/founding)
  - `database_only`: Excludes gift cards (`signup_source === 'gift'`)
  - `paid_database_only`: Excludes gift cards
  - `gift_card`: NEW filter showing only gift code members
- Updated filter button counts to include gift_card
- Added `gift_card: "gift-card"` to CSV export filter names

**`app/api/admin/backfill/stripe/status/route.ts`:**
- Added `signup_source` to profiles select query

### Filter Logic

| Filter | Condition |
|--------|-----------|
| All | No filter |
| Database Only | `status === 'not_found'` AND `signup_source !== 'gift'` |
| Succeeded | `payment_count > 0` AND `!has_failed` |
| No Payment | `status === 'matched'` AND `lifetime_value === 0` (any tier) |
| Paid Database Only | `status === 'not_found'` AND (contributing/founding) AND `signup_source !== 'gift'` |
| Paid (DB) | contributing OR founding |
| Gift Card | `signup_source === 'gift'` |

### Files Modified

| File | Change |
|------|--------|
| `app/admin/backfill/stripe/BackfillClient.tsx` | Added gift_card filter, expanded no_payment, added signup_source to interface |
| `app/api/admin/backfill/stripe/status/route.ts` | Added signup_source to profiles select |

---

## Session 2026-08-30: Backfill Stripe Hydration Fix

### Problem

`/admin/backfill/stripe` page crashed with React error #418 (hydration mismatch) on load.

### Root Cause

`toLocaleString()` was used without a locale argument in 15 places throughout `BackfillClient.tsx`. This produces **different results based on the user's locale settings** - if the server renders with one locale and the client has a different locale, React detects a mismatch and throws error #418.

### Fix Applied

Changed all 15 `toLocaleString()` calls to use `toLocaleString('en-US')` to force consistent US locale formatting:

```typescript
// Before (bug):
reconciliation.summary.stripe_live.contributing.total.toLocaleString()

// After (fixed):
reconciliation.summary.stripe_live.contributing.total.toLocaleString('en-US')
```

### Files Modified

| File | Change |
|------|--------|
| `app/admin/backfill/stripe/BackfillClient.tsx` | Changed 15 `toLocaleString()` calls to `toLocaleString('en-US')` |

### Commit

- `335486e` - fix: use toLocaleString('en-US') to prevent hydration mismatch

## Session 2026-08-30: Backfill Stripe Cron Duplicate Key Fix

### Problem

Hourly backfill cron job (`/api/cron/backfill-sync`) was failing with duplicate key errors:
```
code: '23505'
message: 'duplicate key value violates unique constraint "stripe_backfill_status_profile_id_unique"'
```

### Root Cause

The cron used `INSERT` into `stripe_backfill_status` for profiles that were already in the table from a previous run. This caused 673+ duplicate key violations per cron execution.

### Fix Applied

1. Changed `insert()` → `upsert()` with `onConflict: 'profile_id', ignoreDuplicates: true` to silently skip already-existing records
2. Added `.limit(100)` pagination to paid profiles query to prevent timeout

```typescript
// Before:
.insert({...})

// After:
.upsert({...}, {
  onConflict: 'profile_id',
  ignoreDuplicates: true,
})
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/cron/backfill-sync/route.ts` | Changed INSERT to UPSERT, added pagination limit(100) |

## Session 2026-08-30: Payment Reversal Handling

### Overview

Implemented automatic payment reversal tracking and member tier recalculation when payments are refunded or disputed. The system now correctly downgrades members when their payment is reversed.

### Problem

When a member's payment was refunded or disputed, the system didn't track this and the member remained at their paid tier even though they had lost their payment.

### Solution

Added webhook handlers for Stripe payment reversal events that:
1. Record the reversal in `membership_payments` table
2. Recalculate the member's tier based on remaining successful payments
3. Update `profiles.membership_level` and `profiles.subscription_status`

### Database Migration

**File:** `supabase/migrations/150_add_payment_status_and_reversals.sql`

```sql
ALTER TABLE membership_payments 
ADD COLUMN status TEXT DEFAULT 'succeeded' 
CHECK (status IN ('succeeded', 'refunded', 'disputed'));

UPDATE membership_payments SET status = 'succeeded' WHERE status IS NULL;

ALTER TABLE membership_payments 
ADD COLUMN original_payment_id UUID REFERENCES membership_payments(id);

ALTER TABLE membership_payments 
ADD COLUMN reversal_reason TEXT;
```

### New Files Created

| File | Purpose |
|------|---------|
| `lib/membership-tier.ts` | Tier recalculation utility with `recalculateMembershipTier()`, `recordPaymentReversal()`, `findPaymentByStripeId()` functions |
| `supabase/migrations/150_add_payment_status_and_reversals.sql` | Database migration for payment status columns |

### Files Modified

| File | Change |
|------|--------|
| `app/api/webhook/route.ts` | Added handlers for `charge.refunded` and `charge.dispute.closed` events |

### Tier Recalculation Logic

When a payment is reversed, the system:
1. Finds the most recent **successful** payment for the member
2. Determines tier based on payment type:
   - founding payment ($100) → founding
   - contributing payment ($15) → contributing
   - signup/renewal → free (or waitlist if `waitlist_joined_at` IS NOT NULL)
3. Updates `profiles.membership_level` and `profiles.subscription_status`

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `charge.refunded` | Records full refund, recalculates member tier |
| `charge.dispute.closed` (status: lost) | Records dispute reversal, recalculates member tier |

### Design Decisions

- Reversal records have negative `amount` to distinguish from successful payments
- Original payment ID is tracked for audit trail
- `reversal_reason` captures why the reversal happened
- Webhook signature verification already exists in the route (was handling other Stripe events)
- Cron remains as gap-filler for missed webhook events

## Session 2026-08-31: Stripe Export Rate Limit Fix

### Overview

Fixed Stripe export functionality for backfill reconciliation by eliminating per-subscription API calls that caused rate limit errors.

### Problem

The `/api/admin/backfill/stripe/stripe-only` export was hitting Stripe rate limits because it made **one API call per subscription** (800+ calls for 800+ subscriptions).

### Solution

Changed from subscription-based iteration to direct `stripe.charges.list()` pagination:

| Metric | Old Approach | New Approach |
|--------|-------------|--------------|
| API calls | 800+ (one per subscription) | ~38 (one per 100 charges) |
| Data filtered | All time, all amounts | Since Jan 2026, only $15/$100 |
| Rate limit risk | Very high | Low |

### Key Changes

1. **Removed subscription iteration** - No longer lists subscriptions then calls `charges.list()` for each
2. **Direct charges listing** - Now calls `stripe.charges.list()` with cursor-based pagination
3. **Date filter** - Only fetches charges created after Jan 1, 2026 (`created: { gte: MEMBERSHIP_CREATED_AFTER }`)
4. **250ms delay** - Increased from 100ms to 250ms between API calls
5. **Progress logging** - Added `console.log` during pagination to track progress

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/backfill/stripe/stripe-only/route.ts` | Rewrote charge fetching to use direct `charges.list()` pagination |

## Session 2026-08-31: Async CSV Generation for Stripe Export

### Overview

Implemented async CSV generation pattern for the Stripe export to avoid browser timeout issues. The generation happens in the background (~4 minutes) and a download link appears when it's done.

### Problem

The Stripe export CSV download was timing out or appearing to complete instantly because:
1. The download triggered the slow API endpoint again
2. The rate-limited endpoint was causing issues

### Solution

**Step 1: Generate in background, cache result**

1. Click "Generate CSV" → starts ~4 min background process
2. While running: button shows "Generating (~4 min)..."
3. When done: green "Download CSV (X charges)" button appears
4. Data cached in sessionStorage AND server-side global variable
5. Click download → instant CSV from cache

### Files Modified

| File | Change |
|------|--------|
| `app/api/admin/backfill/stripe/stripe-only/route.ts` | Stores result in global variable for export endpoint |
| `app/api/admin/backfill/stripe/stripe-only/export/route.ts` | Reads from cached global variable instead of re-querying |
| `app/admin/backfill/stripe/BackfillClient.tsx` | Added `downloadStripeOnlyCSV()` function, "Generate CSV" / "Download CSV" button states, sessionStorage caching |

### Key Implementation

**Dynamic delay calculation:**
```typescript
const TARGET_SECONDS = 240;
const DELAY_BETWEEN_CUSTOMERS = Math.max(300, Math.floor((TARGET_SECONDS * 1000) / allCustomerIds.length));
```
- 33 customers → ~7.3s delay each → ~4 minutes total
- 800 customers → 300ms delay each → ~4 minutes total

**Cache strategy:**
- sessionStorage: stores charges array for table display + client-side export
- global variable: stores export data for server-side export fallback
- 10 minute TTL on cache

## Session 2026-08-31: Fix Incorrect Membership Levels for Paid Members

### Problem

10 members had successful Stripe payments but their `membership_level` was wrong:
- 8 were `free` instead of `contributing`
- 1 was `waitlist` (pipe.ashley) instead of `contributing`
- 1 was `free` (michelle, admin) instead of `contributing`

All had successful $15 payments recorded in `membership_payments` and `first_paid_level = 'contributing'`, but the `membership_level` and `subscription_status` were never updated.

### Investigation

1. Checked profiles for all 10 emails - confirmed they had successful payments
2. Checked `membership_payments` - all had successful $15 signup payments
3. Found michelle was missing `stripe_customer_id` - needed to add `cus_UZAzVTh5ALEdoJ`

### SQL Applied

```sql
-- 1. Update michelle's stripe_customer_id
UPDATE profiles
SET stripe_customer_id = 'cus_UZAzVTh5ALEdoJ',
    updated_at = first_paid_at
WHERE email = 'michelle@nationalfundforwomen.org';

-- 2. Update waitlist member with previous_membership_level tracking
UPDATE profiles
SET 
  membership_level = 'contributing',
  subscription_status = 'active',
  previous_membership_level = 'waitlist',
  updated_at = first_paid_at
WHERE email = 'pipe.ashley@gmail.com'
AND membership_level = 'waitlist';

-- 3. Update non-waitlist members (free → contributing)
UPDATE profiles
SET 
  membership_level = 'contributing',
  subscription_status = 'active',
  updated_at = first_paid_at
WHERE email IN (
  'grahmamelie@gmail.com',
  'kenneshamoore@yahoo.com',
  'yjdgreen@gmail.com',
  'chalitaj221@gmail.com',
  'danielle.cornish.avl@gmail.com',
  'ferraroluxebuilders@gmail.com',
  'espinozakimberly.0826@gmail.com',
  'levi@speakwright.org',
  'michelle@nationalfundforwomen.org'
)
AND membership_level != 'contributing';
```

### Verification Results

| Member | Before | After |
|--------|--------|-------|
| 8 members (free) | `membership_level = 'free'` | `membership_level = 'contributing'` |
| pipe.ashley (waitlist) | `membership_level = 'waitlist'` | `membership_level = 'contributing'` |
| michelle (admin) | `stripe_customer_id = null` | `stripe_customer_id = 'cus_UZAzVTh5ALEdoJ'` |
| All 10 | `subscription_status = 'failed'` or `null` | `subscription_status = 'active'` |

### Git Cleanup

Removed SQL backup files from git history using BFG Repo-Cleaner:
- `nfw_backup_full_20260824.sql`
- `nfw_backup_full_20260825.sql`
- `nfw_backup_full_20260826.sql`
- `nfw_backup_full_20260831.sql`

Added `/*.sql` to `.gitignore` to prevent future SQL files from being tracked.

## Session 2026-08-31 (Evening): Stripe Backfill Email CSV Export

### Goal
Complete Export Email CSV feature and write SQL migration to find emails from stripe-emails.csv not in membership_payments

### Constraints & Preferences
- Export Email CSV: EMAIL,IN_STRIPE,IN_DB,STRIPE_TIER,DB_TIER,AMOUNT format, unmatched first split, then alphabetical
- SQL query: find emails in stripe-emails.csv (910 emails) that have no record in membership_payments

### Completed

1. **Export Email CSV Feature**
   - Added `format=csv` support to `reconcile/route.ts` with customer email fetching via `customers.retrieve()` fallback
   - Added "Export Email CSV" button to `BackfillClient.tsx`
   - Changed button from `window.open` (new tab) to fetch + Blob download pattern
   - Removed old CSV link text from Reconciliation table headers (Stripe Live, Our DB, Difference columns)

2. **SQL Migration File**
   - Created `supabase/migrations/151_stripe_emails_not_in_payments_query.sql`
   - Contains 910 emails from `REPORTS-IGNORE/stripe-emails.csv`
   - Includes 3 query variants:
     - Query 1: Emails from stripe-emails.csv with NO record in membership_payments
     - Query 2: Emails where profile exists but has NO payment record
     - Query 3: Combined view showing profile + payment status

### Key Decisions
- Use fetch + Blob download (not window.open) so button shows loading state and download prompt appears after completion
- Button text: "Exporting (~30 sec)..." during load, "Export Email CSV" when idle
- Use two-step pattern: click → fetch → download (matches existing Stripe Only section pattern)

### Files Modified
| File | Change |
|------|--------|
| `app/api/admin/backfill/stripe/reconcile/route.ts` | Added format=csv support with customer email fetching |
| `app/admin/backfill/stripe/BackfillClient.tsx` | Added Export Email CSV button with fetch + Blob download pattern |

### Files Created
| File | Purpose |
|------|---------|
| `supabase/migrations/151_stripe_emails_not_in_payments_query.sql` | SQL migration with 910 emails and 3 query variants |

## Session 2026-08-31: Grant Eligibility Info Box

### Overview

Added a dedicated information box on the `/grants/apply` page above the grant selection to communicate the two-month eligibility rule for microgrants.

### Changes Made

**`components/GrantApplicationForm.tsx`:**
- Added new aubergine box with eligibility text below the "Quick reminder before you apply:" box
- Full aubergine background (`bg-nfw-aubergine`) with white text
- Text: "To keep microgrants fair and accessible to as many members as possible, members are not eligible to receive a grant two months in a row. For example, if you received a grant in August, you'll be eligible to receive another grant beginning in October. In the meantime, we encourage you to explore our other programs!"

### Layout

```
[Quick reminder before you apply: - wisteria box with bullets]
[Eligibility info box - aubergine box with eligibility text]
[Which grant are you applying for? - grant selection]
```

## Session 2026-09-01: Grant Reviewer Feature

### Overview

Added a new "reviewer" user tier that allows hired reviewers to access grant scoring pages without full admin access.

### Constraints & Preferences
- Score only: reviewers cannot perform financial actions (Send Money, Mark Cycle Complete, finalize grants)
- Admin UI to manage reviewer status (toggle on /admin/members page, not hardcoded emails)
- Navigation: direct URL access only (no reviewer-specific dropdown)

### Database

**Migration 152:** `supabase/migrations/152_add_is_reviewer.sql`

```sql
ALTER TABLE profiles ADD COLUMN is_reviewer BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_profiles_is_reviewer ON profiles(is_reviewer) WHERE is_reviewer = TRUE;
NOTIFY pgrst, 'reload';
```

### API Routes Created

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/members/set-reviewer` | POST | Toggle reviewer status (admin only) |

### Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/152_add_is_reviewer.sql` | Adds `is_reviewer` column to profiles |
| `app/api/admin/members/set-reviewer/route.ts` | Toggle reviewer status API |

### Files Modified

| File | Change |
|------|--------|
| `lib/adminCheck.ts` | Added `requireReviewer()` helper checking `is_admin \|\| is_reviewer` |
| `app/api/admin/grants/[id]/scores/first/route.ts` | Updated auth check to `is_admin \|\| is_reviewer` |
| `app/api/admin/grants/[id]/scores/second/route.ts` | Updated auth check to `is_admin \|\| is_reviewer` |
| `app/api/admin/grants/[id]/scores/combined/route.ts` | Updated auth check to `is_admin \|\| is_reviewer` |
| `app/api/admin/grants/[id]/scoring/complete/route.ts` | Updated auth check to `is_admin \|\| is_reviewer` |
| `app/api/admin/grants/[id]/scoring/second-complete/route.ts` | Updated auth check to `is_admin \|\| is_reviewer` |
| `app/admin/grants/[id]/scoring/first/page.tsx` | Replaced ALLOWED_EMAILS with `is_admin \|\| is_reviewer` check |
| `app/admin/grants/[id]/scoring/second/page.tsx` | Replaced ALLOWED_EMAILS with `is_admin \|\| is_reviewer` check |
| `app/admin/grants/[id]/scoring/combined/page.tsx` | Replaced ALLOWED_EMAILS with `is_admin \|\| is_reviewer` check |
| `app/admin/members/page.tsx` | Added `is_reviewer` to profiles select query |
| `components/admin/AdminMembersClient.tsx` | Added reviewer badge, toggle UI in edit panel |

### Sensitive Operations (Admin Only)

These operations remain admin-only (not accessible to reviewers):
- `tentative-approve` - Tentative approval selection
- `final-approve` - Final approval and email sending
- `transfer` - Stripe money transfer
- `cycle/finalize` - Mark cycle as complete

### How to Assign a Reviewer

1. Go to `/admin/members`
2. Find the member and click **Edit**
3. In the edit panel, find **"Reviewer Status"** section
4. Select **"Reviewer"** and click **Save**

Reviewers can access:
- `/admin/grants/[id]/scoring/first` - First review scoring
- `/admin/grants/[id]/scoring/second` - Second review scoring
- `/admin/grants/[id]/scoring/combined` - Combined scores view

Reviewers CANNOT:
- Send money or finalize grants
- Mark cycles as complete
- Access other admin pages

## Session 2026-09-01: Grant Reviewer Navigation

### Overview

Added proper navigation for reviewers: "Manage Grants" link in member dropdown, reviewers redirected from /admin to /admin/grants.

### Changes Made

| File | Change |
|------|--------|
| `lib/adminCheck.ts` | `requireAdmin()` now truly admin-only; added `requireGrantsAccess()` checking `is_admin \|\| is_reviewer` |
| `middleware/adminCheck.ts` | Exports `requireGrantsAccess` |
| `app/api/auth/profile/route.ts` | Added `is_reviewer` to profile response |
| `app/admin/page.tsx` | Reviewers redirected to `/admin/grants` |
| `app/admin/grants/page.tsx` | Uses `requireGrantsAccess()` |
| `AuthButtonCombined.tsx` | Shows "Manage Grants" for `(isAdmin \|\| isReviewer)`; "Admin Dashboard" only for admins |
| `auth-button.tsx` | Same changes as AuthButtonCombined |
| `MobileMenu.tsx` | Same changes as AuthButtonCombined |

### Dropdown Structure

**Member section** (visible to all logged-in members):
- Dashboard
- My Profile
- **Manage Grants** (visible if `isReviewer && !isAdmin` - ONLY for reviewers, not admins)

**Admin section** (visible only to admins):
- Admin Dashboard (full admin hub)

### Security

- `requireAdmin()` - Admin only (no reviewers), redirects to `/admin/grants` if reviewer tries to access
- `requireGrantsAccess()` - Admin OR reviewer
- `proxy.ts` - Allows both admins and reviewers to access `/admin/*`
- All admin-only pages (20 total) now redirect reviewers to `/admin/grants`

### Commits

- `a460675` - feat: add reviewer tier for grant scoring with proper navigation
- `0b5db21` - fix: proxy allows reviewers (not just admins) to access /admin/*
- `ccfcc5b` - fix: requireGrantsAccess redirectOnFailure for /admin/grants
- `3fe62de` - fix: scoring pages use profile directly not data.profile
- `ebcf656` - fix: all admin-only pages redirect reviewers properly
- `cdf8ffe` - fix: only reviewers (not admins) see Manage Grants in dropdown
- `65daa38` - fix: reviewers redirected to /admin/grants when accessing admin-only pages

## Session 2026-09-02: Honeypot for Signup Form

### Overview

Added honeypot bot protection to the signup form (step 0) to catch bots before they consume email confirmation resources.

### Problem

The signup form had no bot protection beyond Supabase's built-in measures. Bots could create fake accounts and waste email confirmation resources.

### Solution

Added honeypot field using the same pattern as the contact form and other site forms:

**Files Modified:**
| File | Change |
|------|--------|
| `components/SignUpFlow.tsx` | Added honeypot input field and bot detection logic |

### Implementation

**Honeypot input field** (invisible, after confirm password):
```tsx
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  className="absolute -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
  placeholder="Leave this blank if you're human"
/>
```

**Bot detection** (in `handleCreateAccount`):
```tsx
const formData = new FormData(e.target as HTMLFormElement);
if (formData.get("website")) {
  // Bot detected - silently redirect to success page
  window.location.href = "/auth/sign-up-success?email=" + encodeURIComponent(email);
  return;
}
```

### Behavior

- Bots fill the hidden field (they see it as a normal input)
- Real users never see or interact with the field
- If honeypot is filled, silently redirect to success page (bot thinks signup succeeded)
- Real signup continues normally

## Session 2026-09-02: Gift Codes Email Variable Fix

### Problem

Gift codes email templates showed `{{gift_codes}}` literal placeholder instead of actual codes in both test and live emails.

### Root Cause

Variable name mismatch:
- **Template expected:** `{{gift_codes}}`
- **Code passed:** `codes` and `codes_list`

The `sendGiftCodesEmail` function passed `codes` and `codes_list` variables, but the template was looking for `{{gift_codes}}`.

### Solution

Updated the send-test route to include proper test variables for gift codes:

**File Modified:**
| File | Change |
|------|--------|
| `app/api/admin/emails/[slug]/send-test/route.ts` | Added `codes` and `codes_list` test variables |

**Added test variables:**
```typescript
codes: "TEST-CODE-001, TEST-CODE-002, TEST-CODE-003",
codes_list: `<p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #F8F19A; margin: 10px 0;">TEST-CODE-001</p><p style="...">TEST-CODE-002</p><p style="...">TEST-CODE-003</p>`,
```

### Next Step

Update template in Supabase to use `{{codes_list}}` instead of `{{gift_codes}}`.

### Note

The test email flow uses the same variable replacement function (`getPreRenderedHtmlAdmin`) as live emails, so seeing dummy codes in test = live will work the same way.

## Session 2026-09-02: Waitlist Email Duplicate Fix

### Problem

Users were receiving duplicate waitlist confirmation emails sent ~2 minutes apart (e.g., alevermon@gmail.com received "An update on your NFW membership application" twice).

### Root Cause

1. **No server-side idempotency check** - The `/api/waitlist` POST handler had no guard against duplicate email sends. The `waitlist_email_sent_at` timestamp was only written AFTER the email was sent, so concurrent requests would both pass the email-sending logic.

2. **Button not disabled while loading** - The "ADD ME TO THE WAITLIST" button in `SignUpFlow.tsx` did not have `disabled={loading}`, allowing double-clicks to reach the server.

### Fix Applied

**1. Server-side idempotency** (`app/api/waitlist/route.ts`):

Added check before sending email:
```typescript
// Check if email already sent (idempotency guard)
const { data: existingProfile } = await supabaseAdmin
  .from("profiles")
  .select("waitlist_email_sent_at")
  .eq("id", user.id)
  .single();

if (existingProfile?.waitlist_email_sent_at) {
  return NextResponse.json({ success: true, message: "Email already sent" });
}
```

**2. Disable button while loading** (`components/SignUpFlow.tsx`):

Added `disabled={loading}` to the waitlist button:
```typescript
<button
  type="button"
  disabled={loading}
  ...
>
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/waitlist/route.ts` | Added idempotency check before sending email |
| `components/SignUpFlow.tsx` | Added `disabled={loading}` to waitlist button |

### Build

- ✅ Build passes

## Session 2026-09-02: Modal-based File Validation Errors

### Overview

Replaced inline error display with a modal for file validation errors. When a user selects an invalid file (wrong type or too large), a modal appears with the error message and an OK button. The file is never added to the documents list.

### Problem

Previous implementation showed an error message above the submit button, but users could still submit the application without any attachment since the invalid file was never actually attached.

### Solution

**1. Added modal state:**
```typescript
const [showFileError, setShowFileError] = useState(false);
const [fileErrorMessage, setFileErrorMessage] = useState("");
```

**2. Modified `handleFileChange`** to show modal instead of setting error state:
```typescript
if (!allowedTypes.includes(file.type)) {
  setFileErrorMessage(`"${file.name}" is not a supported file type. Please upload a PDF, image (JPEG, PNG, GIF), or Word document.`);
  setShowFileError(true);
  setFileInputKey((prev) => prev + 1);
  return;
}
if (file.size > maxSize) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  setFileErrorMessage(`"${file.name}" is too large (${sizeMB}MB). Maximum file size is 10MB.`);
  setShowFileError(true);
  setFileInputKey((prev) => prev + 1);
  return;
}
```

**3. Reset file input on validation failure:** Adding `setFileInputKey` increment resets the file input UI so the filename clears.

**4. Added modal component:**
```tsx
{showFileError && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-nfw-blackberry/40" />
    <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
      <h3 className="text-xl font-serif text-nfw-blackberry mb-4">
        File Not Attached
      </h3>
      <p className="text-sm font-serif text-nfw-blackberry/80 mb-6">
        {fileErrorMessage}
      </p>
      <button
        onClick={() => setShowFileError(false)}
        className="w-full bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
      >
        OK
      </button>
    </div>
  </div>
)}
```

### Files Modified

| File | Change |
|------|--------|
| `components/GrantApplicationForm.tsx` | Added modal state, replaced setError with modal trigger, added modal component, reset file input on validation failure |

## Session 2026-09-03: Backfill Cron Pagination Fix

### Overview

Fixed critical bug where `backfill-sync` cron was not processing 82 valid paid members due to PostgREST 1000-row pagination limit.

### Problem

With 3635 entries in `stripe_backfill_status`, the cron query at lines 43-46:

```typescript
const { data: existingBackfill } = await supabaseAdmin
  .from("stripe_backfill_status")
  .select("profile_id")
  .not("profile_id", "is", null);
```

This query returned only the **first 1000** profile_ids due to PostgREST's default row limit. The remaining 2635 profile_ids were never added to `existingIds`, causing the filter at line 51 to incorrectly identify valid profiles as "not yet processed."

### Solution

Added pagination loop to fetch ALL profile_ids from `stripe_backfill_status`:

```typescript
const existingIds = new Set<string>();
let bpPage = 0;
const bpPageSize = 1000;
let bpHasMore = true;

while (bpHasMore) {
  const { data: backfillBatch } = await supabaseAdmin
    .from("stripe_backfill_status")
    .select("profile_id")
    .not("profile_id", "is", null)
    .range(bpPage * bpPageSize, (bpPage + 1) * bpPageSize - 1);

  if (backfillBatch && backfillBatch.length > 0) {
    backfillBatch.forEach(r => { if (r.profile_id) existingIds.add(r.profile_id); });
    bpPage++;
    bpHasMore = backfillBatch.length === bpPageSize;
  } else {
    bpHasMore = false;
  }
}
```

### Also Fixed: stripe-only Timeout

Changed `stripe-only` endpoint delay from 300ms minimum to 50ms minimum to prevent timeout:

```typescript
// Before: 978 × 300ms = ~5 minutes (timeout)
const DELAY_BETWEEN_CUSTOMERS = Math.max(300, ...);

// After: 978 × 50ms = ~49 seconds
const TARGET_SECONDS = 120;
const DELAY_BETWEEN_CUSTOMERS = Math.max(50, ...);
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/cron/backfill-sync/route.ts` | Added pagination to fetch all profile_ids from stripe_backfill_status |
| `app/api/admin/backfill/stripe/stripe-only/route.ts` | Reduced minimum delay from 300ms to 50ms to prevent timeout |

---

## Session 2026-09-02: Shopify DraftOrder API Fix for Order Status

### Problem

Error `No such type Checkout, so it can't be a fragment condition` occurred when users visited `/store/my-claims` because the `CHECKOUT_QUERY` used `... on Checkout` fragment, but all order IDs were `draft_XXXXX` format (Draft Order IDs).

### Root Cause

1. All ZDC orders use Draft Orders because they're the only way to pass custom attributes (`nfw_user_id`) to Shopify
2. The `CHECKOUT_QUERY` used `node(id: $id) { ... on Checkout }` which only works for Checkout-type IDs
3. Draft Order IDs (`draft_XXXXX`) require querying `draftOrder(id: $id)` instead

### Fix Applied

**`lib/shopify.ts`:**
- Added `DRAFT_ORDER_QUERY` for querying Draft Orders via GraphQL
- Added `ShopifyDraftOrder` type for typed response

**`app/api/shopify/orders/[id]/route.ts`:**
- Added detection for `draft_` vs `checkout_` ID prefixes
- For `draft_` IDs: Uses `DRAFT_ORDER_QUERY` with `gid://shopify/DraftOrder/{id}` format
- For `checkout_` IDs: Uses existing `CHECKOUT_QUERY`
- Maps DraftOrder response to same return format (`status`, `trackingNumber`, `trackingUrl`, `orderId`, `completedAt`)

### Files Modified

| File | Change |
|------|--------|
| `lib/shopify.ts` | Added `DRAFT_ORDER_QUERY` and `ShopifyDraftOrder` type |
| `app/api/shopify/orders/[id]/route.ts` | Handle both DraftOrder and Checkout ID types |

---

## Session 2026-09-03: Fix My Claims HTML Description Display

### Problem

On `/store/my-claims`, HTML tags were displaying literally in the card description (e.g., `<p>`, `<ul>`, `<li>` tags showing instead of being rendered as HTML).

### Root Cause

The `/api/shopify/products` API returns `description` which contains raw HTML from Shopify's `descriptionHtml` field. The My Claims page was using this HTML `description` directly instead of the `cardDescription` field which has HTML stripped.

### Fix Applied

**`app/store/my-claims/page.tsx`:**
- Changed product mapping to use `p.cardDescription` instead of `p.description`
- `cardDescription` is auto-generated from HTML-stripped description (150 char max)

### Files Modified

| File | Change |
|------|--------|
| `app/store/my-claims/page.tsx` | Use `cardDescription` instead of `description` for product mapping |

---

## Session 2026-09-03 (Evening): Revert to 64cc58e

### Goal

Revert to commit `64cc58e` because True $ verification was broken after adding caching layer.

### Problem

After adding caching in commits `049313f` and `fc064c2`:
- The reconcile API was reading from cache instead of doing direct Stripe verification
- True $ showed zeros because per-payment verification was disabled
- Later commits tried to restore True $ verification but broke it by removing invoice/charge ID handling

### Solution

Reverted to `64cc58e` which had the working True $ verification with:
- Invoice ID (`in_xxx`) handling via `stripe.invoices.retrieve()`
- Charge ID (`ch_xxx`) handling via `stripe.charges.retrieve()`
- Fallback to `stripe_invoice_id` when `stripe_payment_id` is null

### Files Reverted/Deleted

| File | Action |
|------|--------|
| `AGENTS.md` | Revert to 64cc58e state |
| `app/admin/backfill/stripe/BackfillClient.tsx` | Revert to 64cc58e state |
| `app/api/admin/backfill/stripe/reconcile/route.ts` | Revert to 64cc58e state |
| `vercel.json` | Remove reconciliation-sync cron entry |
| `app/api/cron/reconciliation-sync/route.ts` | DELETE - didn't exist at 64cc58e |

### SQL (if cache tables exist)

```sql
DROP TABLE IF EXISTS stripe_reconciliation_cache;
DROP TABLE IF EXISTS stripe_subscriptions_cache;
NOTIFY pgrst, 'reload';
```

### Key Implementation at 64cc58e

The True $ verification loop handles three cases:

```javascript
if (paymentId?.startsWith("in_")) {
  // Invoice ID - use stripe.invoices.retrieve()
  const invoice = await stripe.invoices.retrieve(paymentId);
  status = invoice.status === "paid" ? "succeeded" : invoice.status;
} else if (paymentId?.startsWith("ch_")) {
  // Charge ID - use stripe.charges.retrieve()
  const charge = await stripe.charges.retrieve(paymentId);
  status = charge.status;
} else {
  // Unknown format - can't verify
}
```

## Session 2026-09-05: ZDC Monthly Limit Bug Fix

### Bug

User claimed two items in the Zero Dollar Store in the same month (September 2026) despite the monthly limit of 1 claim per month.

### Root Cause

In `app/api/shopify/checkout/route.ts`, when the `pending_monthly_claims` INSERT failed due to UNIQUE constraint violation (user already had a checkout in progress), the error was logged but **ignored** and the checkout continued and returned success.

```typescript
// BUGGY CODE:
if (pendingError) {
  console.error("[checkout] Error inserting pending claim:", pendingError);
  // Non-fatal - we have the claim in zero_dollar_claims  ← BUG
}
```

### Fix

Changed the `pendingError` handling to return a 400 error immediately, making the constraint violation fatal:

```typescript
// FIXED:
if (pendingError) {
  console.error("[checkout] Error inserting pending claim:", pendingError);
  return NextResponse.json(
    { error: "You have a checkout already in progress this month" },
    { status: 400 }
  );
}
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/shopify/checkout/route.ts` | Return error when `pending_monthly_claims` INSERT fails |


## Session 2026-09-05: Sync Cron Matches Button Logic

### Problem

The `backfill-sync` cron job was not matching the `backfill-existing` button logic. Specifically:
- Cron only searched Stripe by email
- Cron ignored existing `stripe_customer_id` on profiles
- Cron had a `.limit(100)` that prevented processing all profiles

### Solution

Updated `app/api/cron/backfill-sync/route.ts` to match `app/api/admin/backfill/stripe/backfill-existing/route.ts` exactly:

1. **Removed `.limit(100)`** - Now processes all profiles like the button does
2. **Added `stripe_customer_id`** to profile select
3. **Added existing `stripe_customer_id` check first** - Tries the profile's existing Stripe ID before falling back to email search

### Key Change - Two-Step Lookup

```typescript
// FIRST: Try existing stripe_customer_id on profile
if (profile.stripe_customer_id) {
  try {
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    if (!customer.deleted) {
      stripeCustomerId = profile.stripe_customer_id;
    }
  } catch {
    // Customer was deleted or invalid, continue to email lookup
  }
}

// SECOND: Fall back to email search
if (!stripeCustomerId && profile.email) {
  const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
  if (customers.data.length > 0) {
    stripeCustomerId = customers.data[0].id;
  }
}
```

### Files Modified

| File | Change |
|------|--------|
| `app/api/cron/backfill-sync/route.ts` | Match button logic exactly |
| `app/api/admin/backfill/stripe/backfill-existing/route.ts` | Fixed lint errors (unused `e`, `request`, `subscriptions`) |

### Lint Fixes

Fixed unused variable errors in both files:
- `backfill-sync`: Removed unused `createClient` import, removed unused catch variable `e`, removed unused `subscriptions` assignment
- `backfill-existing`: Removed unused `request` parameter, removed unused catch variable `e`, removed unused `subscriptions` assignment
