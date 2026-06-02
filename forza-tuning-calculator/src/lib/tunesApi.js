import { supabase } from './supabase.js'
import { slugify } from '../utils/slug.js'

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ])
}

async function checkSlugUnique(slug, excludeId) {
  if (!supabase) return true
  let q = supabase.from('tunes').select('id').eq('slug', slug)
  if (excludeId) q = q.neq('id', excludeId)
  console.log('SLUG CHECK START', { slug, excludeId })
  const { data } = await withTimeout(q.maybeSingle(), 10000, 'checkSlugUnique')
  console.log('SLUG CHECK RESULT', { slug, exists: !!data })
  return !data
}

export async function generateUniqueSlug(baseSlug, excludeId) {
  console.log('SLUG START', { baseSlug, excludeId })
  let slug = baseSlug || 'tune'
  let attempt = 2
  while (!(await checkSlugUnique(slug, excludeId))) {
    console.log('SLUG CONFLICT', { slug, attempt })
    slug = `${baseSlug}-${attempt}`
    attempt++
    if (attempt > 20) throw new Error('Could not generate unique slug')
  }
  console.log('SLUG RESULT', { slug, attempts: attempt - 2 })
  return slug
}

export function buildSlug({ vehicleName, classTier, buildType, drivingStyle }) {
  const parts = []
  if (vehicleName) parts.push(slugify(vehicleName))
  if (classTier) parts.push(classTier.toLowerCase())
  if (buildType) parts.push(buildType.toLowerCase())
  if (drivingStyle) parts.push(drivingStyle.toLowerCase().replace(/\s+/g, '-'))
  return parts.join('-') || 'tune'
}

export async function saveTune(data) {
  console.log('SAVE TUNE START')

  if (!supabase) throw new Error('Supabase not configured')
  if (!data.user_id || typeof data.user_id !== 'string' || data.user_id.length === 0) {
    throw new Error('saveTune: user_id is required and must be a non-empty string')
  }

  const baseSlug = data.slug || buildSlug(data) || 'tune'
  if (!baseSlug || baseSlug.trim().length === 0) {
    throw new Error('saveTune: could not build a slug — provide vehicleName, classTier, buildType, or drivingStyle')
  }

  const slug = await generateUniqueSlug(baseSlug, data.id)
  if (!slug || slug.trim().length === 0) {
    throw new Error('saveTune: slug generation failed — slug is empty')
  }

  const insertData = {
    user_id: data.user_id,
    slug,
    title: data.title || 'Untitled Tune',
    description: data.description || null,
    vehicle_id: data.vehicle_id || null,
    vehicle_name: data.vehicle_name || null,
    share_code: data.share_code || null,
    pi_class: data.pi_class || null,
    build_type: data.build_type || null,
    driving_style: data.driving_style || null,
    game_mode: data.game_mode || null,
    drivetrain: data.drivetrain || null,
    power_hp: data.power_hp || null,
    weight_kg: data.weight_kg || null,
    class_tier: data.class_tier || null,
    front_weight_pct: data.front_weight_pct || null,
    personality_title: data.personality_title || null,
    tags: data.tags || null,
    tire_pressure_front: data.tire_pressure_front ?? null,
    tire_pressure_rear: data.tire_pressure_rear ?? null,
    gear_final_drive: data.gear_final_drive ?? null,
    camber_front: data.camber_front ?? null,
    camber_rear: data.camber_rear ?? null,
    toe_front: data.toe_front ?? null,
    toe_rear: data.toe_rear ?? null,
    antiroll_front: data.antiroll_front ?? null,
    antiroll_rear: data.antiroll_rear ?? null,
    spring_front: data.spring_front ?? null,
    spring_rear: data.spring_rear ?? null,
    ride_height_front: data.ride_height_front ?? null,
    ride_height_rear: data.ride_height_rear ?? null,
    brake_balance: data.brake_balance ?? null,
    brake_pressure: data.brake_pressure ?? null,
    diff_accel: data.diff_accel ?? null,
    diff_decel: data.diff_decel ?? null,
    notes: data.notes || null,
    is_public: data.is_public ?? true,
    tune_data: data.tune_data || null,
    share_query: data.share_query || null,
  }

  console.log('SAVE TUNE INSERT DATA', insertData)

  if (data.id) {
    console.log('SUPABASE UPDATE START', { id: data.id, user_id: data.user_id })

    const { data: updated, error } = await withTimeout(
      supabase
        .from('tunes')
        .update(insertData)
        .eq('id', data.id)
        .eq('user_id', data.user_id)
        .select('id, slug')
        .single(),
      15000,
      'supabase update tune'
    )

    if (error) {
      console.error('SUPABASE UPDATE ERROR', error)
      throw new Error(error.message)
    }

    console.log('SUPABASE UPDATE RESULT', updated)
    console.log('SAVE TUNE RETURN', updated)
    return updated
  }

  console.log('SUPABASE INSERT START')

  const { data: inserted, error } = await withTimeout(
    supabase
      .from('tunes')
      .insert(insertData)
      .select('id, slug')
      .single(),
    15000,
    'supabase insert tune'
  )

  if (error) {
    console.error('SUPABASE INSERT ERROR', error)
    throw new Error(error.message)
  }

  console.log('SUPABASE INSERT RESULT', inserted)
  console.log('SAVE TUNE RETURN', inserted)
  return inserted
}

export async function updateTune(id, userId, data) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!id) throw new Error('updateTune: id is required')
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    throw new Error('updateTune: userId is required and must be a non-empty string')
  }

  const { data: updated, error } = await withTimeout(
    supabase
      .from('tunes')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, slug')
      .single(),
    15000,
    'updateTune'
  )

  if (error) throw new Error(error.message)
  return updated
}

export async function deleteTune(id, userId) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!id) throw new Error('deleteTune: id is required')
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    throw new Error('deleteTune: userId is required and must be a non-empty string')
  }

  const { error } = await withTimeout(
    supabase
      .from('tunes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId),
    15000,
    'deleteTune'
  )

  if (error) throw new Error(error.message)
}

export async function duplicateTune(id, userId) {
  if (!supabase) throw new Error('Supabase not configured')
  if (!id) throw new Error('duplicateTune: id is required')
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    throw new Error('duplicateTune: userId is required and must be a non-empty string')
  }

  const { data: original, error: fetchError } = await withTimeout(
    supabase
      .from('tunes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single(),
    15000,
    'duplicateTune fetch'
  )

  if (fetchError) throw new Error(fetchError.message)
  if (!original) throw new Error('Tune not found')

  const dupeData = { ...original }
  delete dupeData.id
  delete dupeData.created_at
  delete dupeData.updated_at

  dupeData.title = `Copy of ${original.title || 'Untitled'}`
  dupeData.user_id = userId
  dupeData.view_count = 0
  dupeData.favorite_count = 0

  const baseSlug = buildSlug({
    vehicleName: dupeData.vehicle_name,
    classTier: dupeData.class_tier,
    buildType: dupeData.build_type,
    drivingStyle: dupeData.driving_style,
  })
  dupeData.slug = await generateUniqueSlug(baseSlug)

  const { data: inserted, error } = await withTimeout(
    supabase
      .from('tunes')
      .insert(dupeData)
      .select('id, slug')
      .single(),
    15000,
    'duplicateTune insert'
  )

  if (error) throw new Error(error.message)
  return inserted
}

export async function getMyTunes(userId) {
  if (!supabase) return []
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    throw new Error('getMyTunes: userId is required and must be a non-empty string')
  }

  const { data, error } = await withTimeout(
    supabase
      .from('tunes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    15000,
    'getMyTunes'
  )

  if (error) throw new Error(error.message)
  return data || []
}

export async function getTuneById(id) {
  if (!supabase) return null

  const { data, error } = await withTimeout(
    supabase
      .from('tunes')
      .select('*')
      .eq('id', id)
      .single(),
    10000,
    'getTuneById'
  )

  if (error) return null
  return data
}

export async function getPublicTuneBySlug(slug) {
  if (!supabase) return null

  const { data, error } = await withTimeout(
    supabase
      .from('tunes')
      .select('*')
      .eq('slug', slug)
      .single(),
    10000,
    'getPublicTuneBySlug'
  )

  if (error) return null
  return data
}

export async function getPublicTunes({ limit = 24, search = '' } = {}) {
  if (!supabase) return []

  let query = supabase
    .from('tunes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(`title.ilike.${term},vehicle_name.ilike.${term}`)
  }

  const { data, error } = await withTimeout(query, 15000, 'getPublicTunes')

  if (error) throw new Error(error.message)
  return data || []
}
