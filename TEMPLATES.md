# Page Builder Templates

Comprehensive reference for all section templates available in the page builder.

## Overview

Templates are defined in three places:
1. **`lib/sections/types.ts`** - TypeScript interfaces
2. **`lib/sections/registry.ts`** - Template definitions with defaultContent and editorFields
3. **`components/sections/`** - React components that render the content
4. **`supabase/migrations/`** - SQL to seed templates into database

---

## Color System

### Background Colors
All templates support 4 background colors:
- `dove` - Light background
- `aubergine` - Dark purple
- `wisteria` - Medium purple
- `blackberry` - Very dark

### Helper Functions (`lib/colors.ts`)

| Function | Purpose |
|----------|---------|
| `getBackgroundClass(bg)` | Returns Tailwind bg class |
| `getTextColorForBackground(bg)` | Returns text color (dark on dove, white on dark) |
| `getEyebrowColorForBackground(bg)` | Returns eyebrow text color |
| `getMutedTextColorForBackground(bg)` | Returns muted/secondary text color |
| `getCardTextColorForBackground(bg)` | Returns card text color |
| `getCardBorderColorForBackground(bg)` | Returns card border color |
| `getPrimaryButtonClass(bg)` | Returns CTA button class |
| `getCardSwatchColor(color)` | Maps color name to hex value |

### Color Types

**IconColor** (green, yellow, blue)
**CardSwatchColor** (yellow, green, blue, lavender, citrine, lilac, powder)
**BgTint** (powder, citrine, lilac)
**CheckboxColor** (green, aubergine, wisteria, citrine)
**UncheckedColor** (blackberry10, blackberry20, wisteria20)

### Color Values
- `green`: #d4f1ad
- `yellow`: #fdf493
- `blue`: #b2d1ee
- `lavender`: #bcafcf
- `citrine`: #e8d5a3
- `lilac`: #c9b8d9
- `powder`: #b8c5d6

---

## Templates

### Pricing Templates

#### 1. pricing_hero
Hero section for pricing page.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| trust_badges | string-array | |
| background | select | dove, aubergine, wisteria, blackberry |

#### 2. pricing_cards
3-tier pricing comparison cards.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| background | select | dove, aubergine, wisteria, blackberry |
| checkbox_checked | select | green, aubergine, wisteria, citrine |
| cards | array | |
| cards[].id | text | |
| cards[].name | text | |
| cards[].price | text | |
| cards[].period | text | |
| cards[].description | textarea | |
| cards[].highlighted | boolean | |
| cards[].badge | text | optional |
| cards[].features | string-array | |

#### 3. pricing_cta_box
Single CTA box with inner card.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| headline | text | |
| body | textarea | |
| cta_label | text | |
| cta_url | url | |
| secondary_text | text | |
| secondary_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |

#### 4. pricing_comparison
Full benefits comparison table.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| column1_label | text | |
| column2_label | text | |
| column3_label | text | |
| checkbox_checked | select | green, aubergine, wisteria, citrine |
| checkbox_unchecked | select | blackberry10, blackberry20, wisteria20 |
| background | select | dove, aubergine, wisteria, blackberry |
| benefits | array | |
| benefits[].label | text | |
| benefits[].free | boolean | |
| benefits[].contributing | boolean | |
| benefits[].founding | boolean | |

#### 5. pricing_benefits
"Why membership matters" with icon-colored rows.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| body | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| items | array | |
| items[].title | text | |
| items[].description | textarea | |
| items[].icon_color | select | green, yellow, blue |

#### 6. pricing_final_cta
Dark final CTA section.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| footnote | text | |
| background | select | dove, aubergine, wisteria, blackberry |
| items | array | |
| items[].title | text | |
| items[].sub | text | |
| items[].icon_color | select | green, yellow, blue |

---

### Shared Templates

#### 7. how_it_works
3-step process section.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| background | select | dove, aubergine, wisteria, blackberry |
| steps | array (3) | |
| steps[].icon | select | FileText, Eye, Clock, Banknote, DollarSign, Coins, CheckCircle, CircleCheck, Gift, Package, ShieldCheck, ClipboardList, Send, Search, CreditCard, UserCheck, Rocket, Calendar, MapPin, HandHeart, Sparkles, Star, Zap, Tag, Bookmark, CalendarCheck, Lock, Shield |
| steps[].icon_color | select | green, yellow, blue |
| steps[].title | text | |
| steps[].description | textarea | |

#### 8. benefits_checkmarks
Benefits rows with check icons.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| body | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| benefits | array | |
| benefits[].check_color | select | green, yellow, blue |
| benefits[].title | text | |
| benefits[].description | textarea | |

---

### Grants Templates

#### 9. grants_hero
Split hero with image and stats.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| secondary_cta_label | text | |
| secondary_cta_url | url | |
| trust_badges | string-array | |
| image_url | image | |
| stat_value | text | |
| stat_label | text | |
| secondary_stat_value | text | |
| secondary_stat_label | text | |
| background | select | dove, aubergine, wisteria, blackberry |

#### 10. grants_grid
Cards grid for grants (no category buttons).

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| cards | array | |
| cards[].title | text | |
| cards[].description | textarea | |
| cards[].closing | text | |
| cards[].image_url | image | |

#### 11. grant_amount_cards
3-tier amount display.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| items | array | |
| items[].range | text | |
| items[].label | text | |
| items[].description | textarea | |
| items[].bg_tint | select | powder, citrine, lilac |

#### 12. success_stories
Stories grid (separate from testimonials).

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| cards | array | |
| cards[].category | text | |
| cards[].bg_tint | select | citrine, powder, lilac |
| cards[].title | text | |
| cards[].image_url | image | |

---

### Perks/Store Templates

#### 13. perks_store_grid
Merged perks/store grid (no category buttons).

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| cta_label | text | |
| cta_url | url | |
| background | select | dove, aubergine, wisteria, blackberry |
| cards | array | |
| cards[].category | text | |
| cards[].name | text | |
| cards[].description | textarea | |
| cards[].color | select | yellow, green, blue, lavender, citrine, lilac, powder |

---

### Testimonials/Member Celebration Templates

#### 14. testimonials_grid
Static 6-card testimonials grid with colored avatar circles. Source: perks/info page lines 405-441.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| subheadline | textarea | |
| background | select | dove, aubergine, wisteria, blackberry |
| cards | array | |
| cards[].quote | textarea | |
| cards[].name | text | |
| cards[].role | text | |
| cards[].avatar_color | select | yellow, green, blue, lavender, citrine, lilac, powder |

#### 15. member_celebration_grid
Split layout with headline/body/CTA on left and staggered 2x2 member photo grid on right. Source: perks/info page lines 443-514.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| eyebrow | text | |
| headline | text | |
| body | textarea | |
| cta_label | text | |
| cta_url | url | |
| image1_url | image | |
| image2_url | image | |
| image3_url | image | |
| image4_url | image | |
| background | select | dove, aubergine, wisteria, blackberry |

---

### Stacked Features Templates

#### 16. stacked_features
Image top with colored text area below. Full width, 3 columns on desktop/tablet, 1 column on mobile.

**Fields:**
| Field | Type | Options |
|-------|------|---------|
| columns | array (3) | |
| columns[].image_url | image | |
| columns[].image_overlay | boolean | |
| columns[].bg_color | select | yellow, green, blue, lavender, citrine, lilac, powder |
| columns[].eyebrow | text | |
| columns[].heading | text | |
| columns[].body | textarea | |
| columns[].bullets | string-array | |
| columns[].cta_label | text | |
| columns[].cta_url | url | |

---

## SQL Migrations

Templates are seeded via Supabase migrations:

| Migration | Templates |
|-----------|-----------|
| `014_add_pricing_and_shared_section_templates.sql` | pricing_hero, pricing_cards, pricing_cta_box, pricing_comparison, pricing_benefits, pricing_final_cta, how_it_works, benefits_checkmarks |
| `015_add_grants_and_perks_templates.sql` | grants_hero, grants_grid, grant_amount_cards, success_stories, perks_store_grid |
| `016_add_testimonials_and_member_celebration_templates.sql` | testimonials_grid, member_celebration_grid |
| `018_add_stacked_features_template.sql` | stacked_features |

Apply with: `npx supabase db push`

---

## Adding a New Template

1. Add TypeScript interface to `lib/sections/types.ts`
2. Add type to `SectionType` and `SectionContent` unions
3. Add template definition to `lib/sections/registry.ts`
4. Create React component in `components/sections/`
5. Add import and switch case to `components/sections/SectionRenderer.tsx`
6. Add SQL INSERT to migrations folder
