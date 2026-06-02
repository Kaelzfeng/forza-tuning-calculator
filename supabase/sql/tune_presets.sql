-- Tune Presets table: system and user preset tunes
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS tune_presets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  is_system boolean DEFAULT false,
  is_public boolean DEFAULT true,
  tire_pressure_front real,
  tire_pressure_rear real,
  gear_final_drive real,
  camber_front real,
  camber_rear real,
  toe_front real,
  toe_rear real,
  antiroll_front real,
  antiroll_rear real,
  spring_front real,
  spring_rear real,
  ride_height_front real,
  ride_height_rear real,
  brake_balance real,
  brake_pressure real,
  diff_accel real,
  diff_decel real,
  created_at timestamptz DEFAULT now()
);

-- Seed system presets
INSERT INTO tune_presets (slug, title, description, category, is_system, is_public, tire_pressure_front, tire_pressure_rear, gear_final_drive, camber_front, camber_rear, toe_front, toe_rear, antiroll_front, antiroll_rear, spring_front, spring_rear, ride_height_front, ride_height_rear, brake_balance, brake_pressure, diff_accel, diff_decel)
VALUES
  ('balanced-road', 'Balanced Road', 'Neutral all-rounder for asphalt. Predictable handling with balanced front/rear grip.', 'balanced', true, true, 32, 32, 3.95, -1.6, -1.2, 0.05, -0.10, 22.0, 17.6, 140.0, 126.0, 9.0, 9.0, 55, 105, 45, 15),
  ('road-grip', 'Road Grip', 'Maximum cornering grip for circuit racing. Stable rear end with strong front bite.', 'road', true, true, 33, 33, 3.85, -1.3, -1.0, 0.09, -0.15, 23.1, 15.0, 142.8, 120.9, 9.0, 9.0, 56, 105, 37, 12),
  ('road-speed', 'Road Speed', 'Aggressive setup for top speed and fast corner exits. Reduced rear stability for rotation.', 'speed', true, true, 34, 34, 3.70, -2.1, -1.5, 0.02, -0.05, 20.9, 21.1, 137.2, 136.1, 8.5, 8.5, 53, 105, 55, 19),
  ('drift', 'Drift', 'Drift-optimized setup with high rear stiffness and aggressive diff lock. Easy angle control.', 'drift', true, true, 30, 36, 3.65, -3.5, -1.6, 0.25, 0.20, 26.4, 33.0, 126.0, 161.0, 8.0, 8.0, 48, 100, 90, 40),
  ('rally', 'Rally', 'Soft suspension for loose surfaces. High ride height with forgiving breakaway.', 'rally', true, true, 27, 27, 4.35, -0.7, -0.6, 0.10, 0.00, 9.9, 7.7, 67.2, 58.8, 14.0, 14.0, 58, 85, 70, 22),
  ('offroad', 'Offroad', 'Extra compliant for rough terrain. Maximum ride height with soft springs for bump absorption.', 'offroad', true, true, 26, 26, 4.50, -0.4, -0.4, 0.14, -0.05, 10.4, 6.5, 68.5, 55.4, 14.5, 14.5, 59, 85, 62, 19)
ON CONFLICT (slug) DO NOTHING;
