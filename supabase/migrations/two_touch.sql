ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_reply text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS touch integer DEFAULT 1;
COMMENT ON COLUMN leads.status IS 'Valid: pending, replied, follow_up_ready, converted, dismissed';
