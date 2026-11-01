-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "groupType" TEXT NOT NULL DEFAULT 'duration',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "variantLabel" TEXT;

-- CreateIndex
CREATE INDEX "Service_groupKey_idx" ON "Service"("groupKey");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- Backfill Part 1: Group 25 treatment variants (18 duration + 7 hair-length)
DO $$
DECLARE
  v_total_updated integer := 0;
BEGIN
  UPDATE "Service" AS s
  SET 
    "groupKey"     = v.group_key,
    "groupName"    = v.group_name,
    "variantLabel" = v.variant_label,
    "groupType"    = v.group_type
  FROM (
    VALUES
      -- 18 Duration variants (9 groups x 2 variants)
      ('swedish-massage-60', 'swedish-massage', 'Swedish Massage', '60 min', 'duration'),
      ('swedish-massage-90', 'swedish-massage', 'Swedish Massage', '90 min', 'duration'),
      ('deep-tissue-massage-60', 'deep-tissue-massage', 'Deep Tissue Massage', '60 min', 'duration'),
      ('deep-tissue-massage-90', 'deep-tissue-massage', 'Deep Tissue Massage', '90 min', 'duration'),
      ('body-polishing-60', 'body-polishing', 'Body Polishing', '60 min', 'duration'),
      ('body-polishing-90', 'body-polishing', 'Body Polishing', '90 min', 'duration'),
      ('aromatherapy-60', 'aromatherapy', 'Aromatherapy', '60 min', 'duration'),
      ('aromatherapy-90', 'aromatherapy', 'Aromatherapy', '90 min', 'duration'),
      ('full-body-scrubbing-60', 'full-body-scrubbing', 'Full Body Scrubbing', '60 min', 'duration'),
      ('full-body-scrubbing-90', 'full-body-scrubbing', 'Full Body Scrubbing', '90 min', 'duration'),
      ('thai-massage-60', 'thai-massage', 'Thai Massage', '60 min', 'duration'),
      ('thai-massage-90', 'thai-massage', 'Thai Massage', '90 min', 'duration'),
      ('foot-massage-30', 'foot-massage', 'Foot Massage', '30 min', 'duration'),
      ('foot-massage-60', 'foot-massage', 'Foot Massage', '60 min', 'duration'),
      ('foot-reflexology-30', 'foot-reflexology', 'Foot Reflexology', '30 min', 'duration'),
      ('foot-reflexology-60', 'foot-reflexology', 'Foot Reflexology', '60 min', 'duration'),
      ('head-neck-and-shoulder-massage-30', 'head-neck-shoulder-massage', 'Head, Neck & Shoulder Massage', '30 min', 'duration'),
      ('head-neck-and-shoulder-massage-60', 'head-neck-shoulder-massage', 'Head, Neck & Shoulder Massage', '60 min', 'duration'),

      -- 7 Hair-length variants (Styling Her: Shampoo x 3, Hair Spa x 4)
      ('shampoo-short-hair', 'shampoo-women', 'Shampoo (Women)', 'Short hair', 'hair_length'),
      ('shampoo-medium-hair', 'shampoo-women', 'Shampoo (Women)', 'Medium hair', 'hair_length'),
      ('shampoo-long-hair', 'shampoo-women', 'Shampoo (Women)', 'Long hair', 'hair_length'),
      ('hair-spa-short-hair', 'hair-spa-women', 'Hair Spa (Women)', 'Short hair', 'hair_length'),
      ('hair-spa-medium-hair', 'hair-spa-women', 'Hair Spa (Women)', 'Medium hair', 'hair_length'),
      ('hair-spa-long-hair', 'hair-spa-women', 'Hair Spa (Women)', 'Long hair', 'hair_length'),
      ('hair-spa-special', 'hair-spa-women', 'Hair Spa (Women)', 'Special', 'hair_length')
  ) AS v(id, group_key, group_name, variant_label, group_type)
  WHERE s.id = v.id;

  GET DIAGNOSTICS v_total_updated = ROW_COUNT;

  IF v_total_updated <> 25 THEN
    RAISE EXCEPTION 'Backfill assertion failed: expected exactly 25 updated variant rows, but got %', v_total_updated;
  END IF;

  RAISE NOTICE 'Backfill complete: successfully grouped % treatment variants.', v_total_updated;
END $$;

-- Backfill Part 2: Hide exactly 14 legacy/duplicate services (keeping head-massage active)
DO $$
DECLARE
  v_total_hidden integer := 0;
BEGIN
  UPDATE "Service"
  SET "isActive" = false
  WHERE id IN (
    'aromatherapy',
    'body-polishing',
    'deep-tissue-massage',
    'full-body-scrubbing',
    'swedish-massage',
    'thai-massage',
    'foot-massage',
    'foot-massage-30-min',
    'foot-reflexology',
    'foot-reflexology-30-min',
    'head-massage-30-min',
    'head-neck-shoulder-massage',
    'head-neck-shoulder-massage-30-min',
    'svc_1791635143599_c3c4fq'
  );

  GET DIAGNOSTICS v_total_hidden = ROW_COUNT;

  IF v_total_hidden <> 14 THEN
    RAISE EXCEPTION 'Backfill assertion failed: expected exactly 14 hidden legacy rows, but got %', v_total_hidden;
  END IF;

  RAISE NOTICE 'Backfill complete: successfully set isActive=false for exactly % legacy rows.', v_total_hidden;
END $$;
