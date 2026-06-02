import { supabase } from './supabase.js'

// ── System Presets Seed Data ──

export const SYSTEM_PRESETS = [
  {
    slug: 'balanced-road',
    title: 'Balanced Road',
    description: 'Neutral all-rounder for asphalt. Predictable handling with balanced front/rear grip.',
    category: 'balanced',
    is_system: true,
    is_public: true,
    tire_pressure_front: 32,
    tire_pressure_rear: 32,
    gear_final_drive: 3.95,
    camber_front: -1.6,
    camber_rear: -1.2,
    toe_front: 0.05,
    toe_rear: -0.10,
    antiroll_front: 22.0,
    antiroll_rear: 17.6,
    spring_front: 140.0,
    spring_rear: 126.0,
    ride_height_front: 9.0,
    ride_height_rear: 9.0,
    brake_balance: 55,
    brake_pressure: 105,
    diff_accel: 45,
    diff_decel: 15,
  },
  {
    slug: 'road-grip',
    title: 'Road Grip',
    description: 'Maximum cornering grip for circuit racing. Stable rear end with strong front bite.',
    category: 'road',
    is_system: true,
    is_public: true,
    tire_pressure_front: 33,
    tire_pressure_rear: 33,
    gear_final_drive: 3.85,
    camber_front: -1.3,
    camber_rear: -1.0,
    toe_front: 0.09,
    toe_rear: -0.15,
    antiroll_front: 23.1,
    antiroll_rear: 15.0,
    spring_front: 142.8,
    spring_rear: 120.9,
    ride_height_front: 9.0,
    ride_height_rear: 9.0,
    brake_balance: 56,
    brake_pressure: 105,
    diff_accel: 37,
    diff_decel: 12,
  },
  {
    slug: 'road-speed',
    title: 'Road Speed',
    description: 'Aggressive setup for top speed and fast corner exits. Reduced rear stability for rotation.',
    category: 'speed',
    is_system: true,
    is_public: true,
    tire_pressure_front: 34,
    tire_pressure_rear: 34,
    gear_final_drive: 3.70,
    camber_front: -2.1,
    camber_rear: -1.5,
    toe_front: 0.02,
    toe_rear: -0.05,
    antiroll_front: 20.9,
    antiroll_rear: 21.1,
    spring_front: 137.2,
    spring_rear: 136.1,
    ride_height_front: 8.5,
    ride_height_rear: 8.5,
    brake_balance: 53,
    brake_pressure: 105,
    diff_accel: 55,
    diff_decel: 19,
  },
  {
    slug: 'drift',
    title: 'Drift',
    description: 'Drift-optimized setup with high rear stiffness and aggressive diff lock. Easy angle control.',
    category: 'drift',
    is_system: true,
    is_public: true,
    tire_pressure_front: 30,
    tire_pressure_rear: 36,
    gear_final_drive: 3.65,
    camber_front: -3.5,
    camber_rear: -1.6,
    toe_front: 0.25,
    toe_rear: 0.20,
    antiroll_front: 26.4,
    antiroll_rear: 33.0,
    spring_front: 126.0,
    spring_rear: 161.0,
    ride_height_front: 8.0,
    ride_height_rear: 8.0,
    brake_balance: 48,
    brake_pressure: 100,
    diff_accel: 90,
    diff_decel: 40,
  },
  {
    slug: 'rally',
    title: 'Rally',
    description: 'Soft suspension for loose surfaces. High ride height with forgiving breakaway.',
    category: 'rally',
    is_system: true,
    is_public: true,
    tire_pressure_front: 27,
    tire_pressure_rear: 27,
    gear_final_drive: 4.35,
    camber_front: -0.7,
    camber_rear: -0.6,
    toe_front: 0.10,
    toe_rear: 0.00,
    antiroll_front: 9.9,
    antiroll_rear: 7.7,
    spring_front: 67.2,
    spring_rear: 58.8,
    ride_height_front: 14.0,
    ride_height_rear: 14.0,
    brake_balance: 58,
    brake_pressure: 85,
    diff_accel: 70,
    diff_decel: 22,
  },
  {
    slug: 'offroad',
    title: 'Offroad',
    description: 'Extra compliant for rough terrain. Maximum ride height with soft springs for bump absorption.',
    category: 'offroad',
    is_system: true,
    is_public: true,
    tire_pressure_front: 26,
    tire_pressure_rear: 26,
    gear_final_drive: 4.50,
    camber_front: -0.4,
    camber_rear: -0.4,
    toe_front: 0.14,
    toe_rear: -0.05,
    antiroll_front: 10.4,
    antiroll_rear: 6.5,
    spring_front: 68.5,
    spring_rear: 55.4,
    ride_height_front: 14.5,
    ride_height_rear: 14.5,
    brake_balance: 59,
    brake_pressure: 85,
    diff_accel: 62,
    diff_decel: 19,
  },
]

// ── API ──

export async function getPresets() {
  if (!supabase) return SYSTEM_PRESETS

  try {
    const { data, error } = await supabase
      .from('tune_presets')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) return SYSTEM_PRESETS
    return data
  } catch {
    return SYSTEM_PRESETS
  }
}

export async function getPresetBySlug(slug) {
  if (!supabase) return SYSTEM_PRESETS.find(p => p.slug === slug) || null

  try {
    const { data, error } = await supabase
      .from('tune_presets')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) return SYSTEM_PRESETS.find(p => p.slug === slug) || null
    return data
  } catch {
    return SYSTEM_PRESETS.find(p => p.slug === slug) || null
  }
}
