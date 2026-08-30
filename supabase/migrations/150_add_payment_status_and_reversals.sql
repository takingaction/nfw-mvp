-- Add status column to membership_payments for tracking reversals
ALTER TABLE membership_payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'succeeded' 
CHECK (status IN ('succeeded', 'refunded', 'disputed'));

-- Update existing records (they're all succeeded)
UPDATE membership_payments SET status = 'succeeded' WHERE status IS NULL;

-- Add original_payment_id for tracking which payment was reversed
ALTER TABLE membership_payments 
ADD COLUMN IF NOT EXISTS original_payment_id UUID REFERENCES membership_payments(id);

-- Add reversal_reason for debugging
ALTER TABLE membership_payments 
ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload';
