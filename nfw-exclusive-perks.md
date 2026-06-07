# NFW Exclusive Perks

## Overview

Add a custom perks system that displays NFW-exclusive discounts/coupons alongside Access Perks offers in the /perks ecosystem. Members can filter to see only NFW exclusives or have them mixed with regular offers.

## Goals

- Display bespoke NFW member perks alongside Access Perks offers on /perks page
- Allow filtering to show only NFW exclusives
- Include NFW perks in search/filter results
- Generate unique redemption codes (admin-provided) for members

## Design Decisions

| Decision | Choice |
|----------|--------|
| Display | Mixed in with Access Perks offers |
| Filtering | "NFW Exclusive" checkbox filter in FilterSidebar |
| Search | NFW perks included in search/filter results |
| Code source | Admin pre-provides codes (not auto-generated) |
| Usage tracking | None needed |
| Badge style | TBD - likely NFW logo/branding |

## Database Schema

```sql
-- Main perks table
CREATE TABLE nfw_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  partner_name TEXT,
  partner_logo_url TEXT,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed', 'free_item')),
  discount_value TEXT,
  codes JSONB NOT NULL DEFAULT '[]',  -- Array of available codes provided by admin
  per_user_limit INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  categories TEXT[] DEFAULT '{}',
  featured_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions tracking
CREATE TABLE nfw_perk_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perk_id UUID REFERENCES nfw_perks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(perk_id, user_id)
);

-- Indexes
CREATE INDEX idx_nfw_perks_active ON nfw_perks(is_active) WHERE is_active = true;
CREATE INDEX idx_nfw_perks_categories ON nfw_perks USING GIN(categories);
CREATE INDEX idx_nfw_perks_redemptions_perk ON nfw_perk_redemptions(perk_id);
CREATE INDEX idx_nfw_perks_redemptions_user ON nfw_perk_redemptions(user_id);
```

## API Design

### Public Endpoints

**GET /api/nfw-perks**
```
Query params: categories[], search, limit, offset, userId
Response: { perks: NfwPerk[], total: number }
```

**GET /api/nfw-perks/[id]**
```
Response: Single perk with user's redemption status
Includes: { ...perk, userHasRedeemed: boolean, userCode?: string }
```

**POST /api/nfw-perks/[id]/redeem**
```
Request: { userId }
Response: { code: string } or error if limit exceeded/no codes left
```

### Admin Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/admin/nfw-perks | List all perks |
| POST | /api/admin/nfw-perks | Create perk |
| PUT | /api/admin/nfw-perks/[id] | Update perk |
| DELETE | /api/admin/nfw-perks/[id] | Delete perk |

## /perks Page Integration

### State Additions
```typescript
const [nfwPerks, setNfwPerks] = useState<NfwPerk[]>([]);
const [showNfwOnly, setShowNfwOnly] = useState(false);
```

### Fetch Flow
```typescript
// On mount, if user logged in:
fetch(`/api/nfw-perks?userId=${user.id}`)
  .then(r => r.json())
  .then(data => setNfwPerks(data.perks));
```

### Filtering Logic
- When "NFW Exclusive" checkbox is checked, hide Access Perks content, show only NFW perks
- Search and category filters apply to both NFW and Access Perks when not in NFW-only mode

### NFW Perk Card Display
- Partner logo
- Title
- Discount value badge (NFW branding)
- "NFW Exclusive" label (aubergine pill badge)
- "Get Code" button

## Admin UI (/admin/nfw-perks)

### Table View
| Column | Description |
|--------|-------------|
| Title | Perk title |
| Partner | Partner name |
| Discount | Type + value |
| Codes | Available / Total redeemed |
| Status | Active/Inactive |
| Expires | Expiration date |

### Create/Edit Form

| Field | Type | Notes |
|-------|------|-------|
| Title | text | Required |
| Description | textarea | Optional |
| Partner name | text | Optional |
| Partner logo | MediaLibrary | Optional |
| Discount type | dropdown | percent / fixed / free_item |
| Discount value | text | e.g., "20%" or "$10 off" |
| Codes | textarea | One code per line (admin provides) |
| Per-user limit | number | Default 1 |
| Categories | tag input | For filtering |
| Expires at | datetime | Optional |
| Active | toggle | Default true |

### NFW Exclusive Badge
- Small aubergine pill badge with "NFW" text in white
- Or use nfw-symbol-brandmark-aubergine.png scaled down
- Positioned top-right of card

## Redemption Flow

1. User clicks "Get Code" on NfwPerkCard
2. POST `/api/nfw-perks/[id]/redeem` with userId
3. API validates:
   - User hasn't exceeded per_user_limit
   - Available codes remain
   - Perk not expired
4. Pop first code from `codes` array, insert into `nfw_perk_redemptions`
5. Return code to user
6. Frontend displays code with "Copy" button

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/076_create_nfw_perks.sql` | Database schema |
| `app/api/nfw-perks/route.ts` | GET list |
| `app/api/nfw-perks/[id]/route.ts` | GET single |
| `app/api/nfw-perks/[id]/redeem/route.ts` | POST redeem |
| `app/api/admin/nfw-perks/route.ts` | Admin CRUD |
| `app/api/admin/nfw-perks/[id]/route.ts` | Admin single |
| `app/admin/nfw-perks/page.tsx` | Admin page |
| `app/admin/nfw-perks/AdminNfwPerks.tsx` | Admin client component |
| `components/perks/NfwPerkCard.tsx` | Perk display card |

## Files to Modify

| File | Change |
|-------|--------|
| `app/perks/page.tsx` | Fetch NFW perks, showNfwOnly state, combine views |
| `components/perks/FilterSidebar.tsx` | Add NFW Exclusive checkbox |
| `components/perks/OfferDetailPanel.tsx` | Add NFW perk detail view |
| `components/admin/AuthButtonCombined.tsx` | Add NFW Perks admin link |
| `components/admin/MobileMenu.tsx` | Add NFW Perks admin link |
| `components/auth-button.tsx` | Add NFW Perks admin link |

## Effort Estimate

| Component | Time |
|-----------|------|
| Database + migrations | 15 min |
| API routes (list, redeem) | 30 min |
| Admin UI (full CRUD) | 1.5 hrs |
| Frontend integration (card, page, filter) | 1 hr |
| Testing | 30 min |
| **Total** | **~4 hours** |

## Implementation Status

- [ ] Not started
- [ ] In progress
- [ ] Complete