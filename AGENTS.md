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
