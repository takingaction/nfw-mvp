-- Migration: 036_performance_indexes.sql
-- Description: Add missing indexes for frequently queried columns
-- Created: 2026-04-12

-- =============================================================================
-- ARTICLES INDEXES
-- =============================================================================

-- Featured content on homepage (is_published=true, is_featured=true)
CREATE INDEX IF NOT EXISTS idx_articles_published_featured 
    ON articles(is_published, is_featured) 
    WHERE is_published = true;

-- Archive/news feeds ordered by publish date
CREATE INDEX IF NOT EXISTS idx_articles_published_at 
    ON articles(published_at DESC NULLS LAST) 
    WHERE is_published = true;

-- Author lookups (when displaying article author info)
CREATE INDEX IF NOT EXISTS idx_articles_author_id 
    ON articles(author_id) 
    WHERE author_id IS NOT NULL;

-- Category filtering (when browsing by category)
CREATE INDEX IF NOT EXISTS idx_articles_category_id 
    ON articles(category_id) 
    WHERE category_id IS NOT NULL AND is_published = true;

-- =============================================================================
-- GRANT CYCLES INDEXES
-- =============================================================================

-- Find open cycles with date range overlap (admin and public queries)
CREATE INDEX IF NOT EXISTS idx_grant_cycles_status_dates 
    ON grant_cycles(status, start_date, end_date);

-- =============================================================================
-- OFFER REDEMPTIONS INDEXES  
-- =============================================================================

-- Quick offer lookup by offer key (Access Perks integration)
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer_key 
    ON offer_redemptions(offer_key) 
    WHERE offer_key IS NOT NULL;

-- =============================================================================
-- PROFILES INDEXES
-- =============================================================================

-- Access Perks sync lookups (when syncing members)
CREATE INDEX IF NOT EXISTS idx_profiles_access_perks_id 
    ON profiles(access_perks_member_id) 
    WHERE access_perks_member_id IS NOT NULL;

-- =============================================================================
-- ZERO DOLLAR CLAIMS INDEXES
-- =============================================================================

-- Check if user already claimed a specific product (prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_claims_user_product 
    ON zero_dollar_claims(user_id, shopify_product_id);

-- Order status lookups by Shopify order ID
CREATE INDEX IF NOT EXISTS idx_claims_shopify_order_id 
    ON zero_dollar_claims(shopify_order_id) 
    WHERE shopify_order_id IS NOT NULL;

-- =============================================================================
-- ARTICLE LIKES INDEXES
-- =============================================================================

-- Check if user already liked an article (prevent duplicate likes)
CREATE INDEX IF NOT EXISTS idx_article_likes_user_article 
    ON article_likes(user_id, article_id);

-- Count likes per article (for like_count display)
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id 
    ON article_likes(article_id);

-- =============================================================================
-- CONTACT SUBMISSIONS INDEXES
-- =============================================================================

-- Recent submissions for admin dashboard
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at 
    ON contact_submissions(created_at DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON INDEX idx_articles_published_featured IS ' Homepage featured content queries';
COMMENT ON INDEX idx_grant_cycles_status_dates IS ' Find open cycles overlapping with current date';
COMMENT ON INDEX idx_claims_user_product IS ' Check if user already claimed a product variant';
COMMENT ON INDEX idx_article_likes_user_article IS ' Prevent duplicate likes per user/article';
