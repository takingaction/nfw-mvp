-- Gift Membership Tables
-- Stores purchase records and individual gift codes

-- Purchase records (one per Stripe payment)
CREATE TABLE gift_membership_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  total_amount INTEGER NOT NULL, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual gift codes (one per code, linked to purchase)
CREATE TABLE gift_membership_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES gift_membership_purchases(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  redeemed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_gift_codes_code ON gift_membership_codes(code);
CREATE INDEX idx_gift_codes_purchase_id ON gift_membership_codes(purchase_id);
CREATE INDEX idx_gift_codes_redeemed_by ON gift_membership_codes(redeemed_by_user_id) WHERE redeemed_by_user_id IS NOT NULL;
CREATE INDEX idx_purchases_buyer_email ON gift_membership_purchases(buyer_email);

-- Function to generate a unique 8-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_gift_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars: 0, O, 1, I
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate code on insert if not provided
CREATE OR REPLACE FUNCTION set_gift_code_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_gift_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_gift_code
  BEFORE INSERT ON gift_membership_codes
  FOR EACH ROW
  EXECUTE FUNCTION set_gift_code_if_empty();