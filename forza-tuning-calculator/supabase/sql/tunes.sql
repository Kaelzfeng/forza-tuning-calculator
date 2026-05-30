-- Tunes table: cloud tune storage
-- Run this in Supabase SQL Editor to add missing columns and the slug trigger

-- Add missing columns (safe to run even if some already exist)
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS share_code text;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS pi_class text;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS tire_pressure_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS tire_pressure_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS gear_final_drive real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS camber_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS camber_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS toe_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS toe_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS antiroll_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS antiroll_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS spring_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS spring_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS ride_height_front real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS ride_height_rear real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS brake_balance real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS brake_pressure real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS diff_accel real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS diff_decel real;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS favorite_count integer DEFAULT 0;
ALTER TABLE tunes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION tunes_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tunes_updated_at ON tunes;
CREATE TRIGGER trg_tunes_updated_at
  BEFORE UPDATE ON tunes
  FOR EACH ROW
  EXECUTE FUNCTION tunes_set_updated_at();

-- Auto-generate slug from title when slug is empty
CREATE OR REPLACE FUNCTION tunes_set_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tunes_slug ON tunes;
CREATE TRIGGER trg_tunes_slug
  BEFORE INSERT ON tunes
  FOR EACH ROW
  EXECUTE FUNCTION tunes_set_slug();
