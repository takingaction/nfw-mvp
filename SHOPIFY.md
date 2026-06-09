# Shopify Integration

## Overview

The Zero Dollar Store integrates with Shopify to display and manage products that members can redeem using Perks points.

## Architecture

### Components

1. **Shopify Admin** - Manages product catalog, sync, visibility, and featured status
2. **Supabase Database** - Stores product mappings between Shopify and internal data
3. **Next.js API Routes** - Handle sync, fetch, and update operations
4. **Public Store Pages** - Display products to members

### Database Schema

**Table: `shopify_product_mappings`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `shopify_product_id` | TEXT | Shopify product GID (unique) |
| `shopify_variant_id` | TEXT | Default variant GID |
| `mvp_visibility` | BOOLEAN | Show on Zero Dollar Store |
| `eligibility_tiers` | TEXT[] | Which membership tiers can redeem |
| `display_order` | INTEGER | Sort order (lower = first) |
| `featured_order` | INTEGER | Featured sort (999 = not featured) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shopify/products` | GET | Fetch all products with mappings |
| `/api/shopify/products?featured=true` | GET | Fetch featured products |
| `/api/shopify/products?check_connection=true` | GET | Check Shopify connection |
| `/api/admin/shopify/sync` | POST | Sync products from Shopify |
| `/api/admin/shopify/update-product` | POST | Update product visibility/featured |

## Schema Design Decision (2026-03-31)

### Initial Approach: Internal Schema with RPC Functions

We initially moved `shopify_product_mappings` to a protected `internal` schema to isolate it from PostgREST public exposure. This required:

- Creating RPC functions (`upsert_shopify_product`, `get_all_shopify_mappings`, `update_shopify_product`)
- Modifying all API routes to use RPC calls instead of direct table access

### Problems Encountered

1. **PostgREST Schema Cache** - After moving the table, PostgREST couldn't find the table or functions despite:
   - Running `NOTIFY pgrst, 'reload schema'`
   - Multiple cache clear attempts

2. **RPC Function Visibility** - PostgREST only exposes functions in the `public` schema by default. Functions in `internal` schema were invisible to the Supabase client even with service role key.

3. **Double Schema Prefix** - When calling `supabaseAdmin.rpc('public.function_name')`, PostgREST would prepend `public.` again, resulting in `public.public.function_name`.

4. **Type Mismatches** - Parameter types (TEXT vs TEXT[], JSONB vs TEXT[]) caused runtime errors.

### Final Solution: Public Schema

We reverted the table to the `public` schema. This is acceptable because:

- **Data sensitivity**: The table only contains product IDs and visibility flags - not sensitive user data
- **Security boundary**: The service role key is server-side only and never exposed to clients
- **Simplicity**: Direct table access works reliably without PostgREST cache issues
- **Standard pattern**: This is how Supabase intends for internal tables to be accessed

### Migration History

| Migration | Purpose | Status |
|-----------|---------|--------|
| `002_zero_dollar_shopify.sql` | Original table creation | ✅ Kept |
| `021_move_shopify_table_to_internal_schema.sql` | Move to internal (reverted) | ❌ Superseded |
| `022_create_upsert_shopify_product_function.sql` | RPC functions (reverted) | ❌ Superseded |
| `023_revert_shopify_table_to_public.sql` | Final state: table in public | ✅ Current |

## Key Learnings

### 1. PostgREST Schema Cache Issues

PostgREST caches the database schema. When tables or functions are created/modified:
- The cache must be reloaded via `NOTIFY pgrst, 'reload schema'`
- This doesn't always work reliably for schema changes
- Sometimes requires Supabase infrastructure restart

### 2. RPC Function Schema Visibility

PostgREST only exposes functions in schemas listed in `db_extra_search_path` or `public` schema by default.

Options to call functions in other schemas:
1. **Set `db_extra_search_path`** to include the schema (requires Supabase config change)
2. **Use public schema functions** that access other schemas internally (SECURITY DEFINER)
3. **Direct PostgreSQL connection** instead of PostgREST (for admin operations)

### 3. Security vs. Complexity Trade-off

For internal/admin tables:
- **High security**: Private schema + RPC + extra search path = complex, may not work
- **Pragmatic security**: Public schema + service role key + server-side only = simpler, stable, secure enough

### 4. Testing Recommendations

When debugging PostgREST issues:
1. Check if table exists: `SELECT * FROM internal.shopify_product_mappings LIMIT 1;`
2. Check function exists: `SELECT proname, pronamespace::regnamespace FROM pg_proc WHERE proname = 'function_name';`
3. Check PostgREST sees it: `NOTIFY pgrst, 'reload schema';`
4. Check RPC call directly: `SELECT function_name(...)` in SQL Editor

## Troubleshooting

### Sync Returns 0 Products
1. Check Shopify is connected: `GET /api/shopify/products?check_connection=true`
2. Check table has data: `SELECT COUNT(*) FROM shopify_product_mappings;`
3. Check terminal for errors during sync

### Toggle/Update Not Working
1. Check browser console for API errors
2. Verify table is in `public` schema
3. Check `update-product` API returns success

### Products Not Appearing in Store
1. Check `mvp_visibility` is `true`
2. Check `display_order` is set (not 999)
3. Check products route is fetching correctly

## Future Considerations

### If You Need Higher Security Isolation

1. Configure `db_extra_search_path` in Supabase to include `internal`
2. Create RPC functions with `SECURITY DEFINER` in `internal` schema
3. Ensure service role has execute permission on the schema

### Data Privacy

If `shopify_product_mappings` ever contains sensitive data (e.g., pricing, inventory linked to users):
1. Keep in `internal` schema
2. Add RLS policies
3. Use service role for all operations
4. Consider adding audit logging

## Files Reference

### API Routes
- `app/api/shopify/products/route.ts` - Public product fetching
- `app/api/admin/shopify/sync/route.ts` - Shopify product sync
- `app/api/admin/shopify/update-product/route.ts` - Product visibility updates

### Admin Pages
- `app/admin/shopify/page.tsx` - Shopify admin dashboard

### Database
- `supabase/migrations/002_zero_dollar_shopify.sql` - Table schema
- `supabase/migrations/023_revert_shopify_table_to_public.sql` - Current state

## Theme Redirect Configuration

### Purpose

The Shopify store (`nfw-checkout.myshopify.com`) is configured to redirect visitors to the NFW website (`nationalfundforwomen.org/store`) to prevent direct access to the Shopify store while allowing the Zero Dollar Store functionality through the NFW app.

### Implementation Location

**Shopify Admin → Online Store → Themes → Edit Code → theme.liquid**

The redirect is implemented as an inline JavaScript snippet in the `<head>` section:

```javascript
(function() {
  var path = window.location.pathname;

  var allowedPaths = [
    '/cart',
    '/checkout',
    '/checkouts',   // important for checkout steps
    '/orders',      // order status page
    '/account',     // optional (remove if not using accounts)
    '/apps'         // needed for some payment/app flows
  ];

  var isAllowed = allowedPaths.some(function(p) {
    return path.startsWith(p);
  });

  if (!isAllowed) {
    window.location.replace("https://www.nationalfundforwomen.org/store");
  }
})();
```

### Allowed Paths

The following paths are excluded from redirect (Shopify keeps them native):

| Path | Purpose |
|------|---------|
| `/cart` | Shopping cart |
| `/checkout` | Checkout flow |
| `/checkouts` | Multi-step checkout |
| `/orders` | Order status page |
| `/account` | Customer accounts |
| `/apps` | Payment apps and flows |

### Adding Download Paths for Digital Delivery Apps

Digital download apps (like "Digital Downloads" by StarApps) generate links like:
```
https://nfw-checkout.myshopify.com/a/downloads/-/c9328417738d40d0/6c518d1232ae21d0
```

To allow these links to work without redirecting to NFW, add `/a/downloads` to the `allowedPaths` array:

```javascript
var allowedPaths = [
  '/cart',
  '/checkout',
  '/checkouts',
  '/orders',
  '/account',
  '/apps',
  '/a/downloads'    // allow digital download links
];
```

### Modifying the Redirect

1. Go to **Shopify Admin** → **Online Store** → **Themes**
2. Click **Actions** → **Edit code**
3. Find `theme.liquid` in the Layout folder
4. Locate the redirect script in the `<head>` section
5. Add or remove paths from the `allowedPaths` array as needed
6. Save the changes

### Notes

- The redirect uses `window.location.replace()` which replaces the current history entry
- Changes to theme code apply immediately (no deploy needed)
- If the theme is updated/replaced, the redirect code must be re-added
