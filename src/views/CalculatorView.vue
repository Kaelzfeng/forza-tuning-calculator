<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { calculateTune, formatTuneText, generatePersonalitySummary, generateApplySteps, formatApplyStepsText, generateDrivingInsights } from '../utils/tuningCalculator.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'
import { saveTune, getTuneById } from '../lib/tunesApi.js'
import { getPresets } from '../lib/presetsApi.js'
import PublishDialog from '../components/PublishDialog.vue'
import SubscriptionModal from '../components/SubscriptionModal.vue'
import { useI18n } from '../i18n/index.js'
import { useToast } from '../composables/useToast.js'
import { useSeoMeta, makeSoftwareAppSchema, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'

useSeoMeta({
  title: 'Forza Tuning Calculator — Free Tune Setup Generator',
  description: 'Generate Forza tuning setups in seconds. Free calculator with suspension, tire pressure, gearing, and differential recommendations for Road, Drift, Dirt, and Drag builds.',
  ogType: 'website',
  jsonLd: [
    makeSoftwareAppSchema(),
    makeBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
      { name: 'Calculator', url: `${window.location.origin}/calculator` },
    ]),
  ],
})

const route = useRoute()
const router = useRouter()
const { t, currentLang } = useI18n()
const { isPro } = useProAccess()
const { success, error: toastError } = useToast()

const form = reactive({
  drivetrain: 'RWD',
  buildType: 'Road',
  classTier: 'A',
  weightKg: 1400,
  powerHp: 400,
  frontWeightPercent: 54,
  tireCompound: 'Sport',
  drivingStyle: 'Balanced',
})

const queryMode = computed(() => {
  const m = route.query.mode
  if (['road', 'dirt', 'drift', 'drag'].includes(m)) {
    const map = { road: 'Road', dirt: 'Dirt', drift: 'Drift', drag: 'Drag' }
    return map[m]
  }
  return 'Road'
})

if (queryMode.value !== form.buildType) {
  form.buildType = queryMode.value
}
watch(queryMode, (m) => { form.buildType = m })

/* ── Mode toggle ── */
const tuneMode = ref('quick')
const quickStep = ref(1)

const step1Intent = ref('Grip')
const step2Intent = ref('Balanced')
const step3Drivetrain = ref('RWD')
const step3Power = ref(400)
const step3Weight = ref(1400)

const step1Icons = {
  Grip: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  Drift: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 4-4v8zm2-6l4 4-4 4V11z',
  Rally: 'M3 13.5C3 9.36 6.36 6 10.5 6h3C17.64 6 21 9.36 21 13.5S17.64 21 13.5 21h-3C6.36 21 3 17.64 3 13.5z',
  Drag: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
}

const step1Options = computed(() => [
  { id: 'Grip',  label: t('calculator.grip_label'),  desc: t('calculator.grip_desc'),  icon: step1Icons.Grip },
  { id: 'Drift', label: t('calculator.drift_label'), desc: t('calculator.drift_desc'), icon: step1Icons.Drift },
  { id: 'Rally', label: t('calculator.rally_label'), desc: t('calculator.rally_desc'), icon: step1Icons.Rally },
  { id: 'Drag',  label: t('calculator.drag_label'),  desc: t('calculator.drag_desc'),  icon: step1Icons.Drag },
])

const step2Options = computed(() => {
  if (step1Intent.value === 'Drift') {
    return [
      { id: 'Smooth', label: t('calculator.smooth_label'), desc: t('calculator.smooth_desc'), mapsTo: 'Stable' },
      { id: 'Angle',  label: t('calculator.angle_label'),  desc: t('calculator.angle_desc'),  mapsTo: 'Aggressive' },
    ]
  }
  return [
    { id: 'Safe',       label: t('calculator.safe_label'),       desc: t('calculator.safe_desc'),       mapsTo: 'Stable' },
    { id: 'Balanced',   label: t('calculator.balanced_label'),   desc: t('calculator.balanced_desc'),   mapsTo: 'Balanced' },
    { id: 'Aggressive', label: t('calculator.aggressive_label'), desc: t('calculator.aggressive_desc'), mapsTo: 'Aggressive' },
  ]
})

const step1BuildMap = { Grip: 'Road', Drift: 'Drift', Rally: 'Dirt', Drag: 'Drag' }

function applyQuickToForm() {
  form.buildType = step1BuildMap[step1Intent.value] || 'Road'
  const opt = step2Options.value.find(o => o.id === step2Intent.value)
  form.drivingStyle = opt ? opt.mapsTo : 'Balanced'
  form.drivetrain = step3Drivetrain.value
  form.powerHp = step3Power.value
  form.weightKg = step3Weight.value
  form.frontWeightPercent = 50
  form.classTier = 'A'
  form.tireCompound = 'Sport'
}

function selectStep1(id) {
  step1Intent.value = id
  step2Intent.value = step2Options.value[0].id
  quickStep.value = 2
  applyQuickToForm()
}

function selectStep2(id) {
  step2Intent.value = id
  quickStep.value = 3
  applyQuickToForm()
}

function finishQuick() {
  applyQuickToForm()
  quickStep.value = 3
}

watch([step3Drivetrain, step3Power, step3Weight], () => {
  if (tuneMode.value === 'quick') applyQuickToForm()
})

function switchMode(mode) {
  if (mode === 'advanced' && !isPro.value) {
    openProModal('Access advanced tuning calculator')
    return
  }
  if (mode === 'advanced' && tuneMode.value === 'quick') {
    applyQuickToForm()
  }
  if (mode === 'quick' && tuneMode.value === 'advanced') {
    syncQuickStateFromForm()
  }
  tuneMode.value = mode
}

function syncQuickStateFromForm() {
  const reverseBuildMap = { Road: 'Grip', Drift: 'Drift', Dirt: 'Rally', Drag: 'Drag' }
  step1Intent.value = reverseBuildMap[form.buildType] || 'Grip'

  const reverseStyleMap = { Stable: 'Safe', Balanced: 'Balanced', Aggressive: 'Aggressive' }
  step2Intent.value = reverseStyleMap[form.drivingStyle] || 'Balanced'

  step3Drivetrain.value = form.drivetrain
  step3Power.value = form.powerHp
  step3Weight.value = form.weightKg
  quickStep.value = 3
}

/* ── URL share & restore ── */
function restoreFromUrl() {
  const q = route.query
  if (q.style) form.drivingStyle = q.style
  if (q.drive) form.drivetrain = q.drive
  if (q.hp) form.powerHp = Number(q.hp)
  if (q.w) form.weightKg = Number(q.w)
  if (q.fwp) form.frontWeightPercent = Number(q.fwp)
  if (q.cls) form.classTier = q.cls
  if (q.tire) form.tireCompound = q.tire
  if (q.tm) tuneMode.value = q.tm
  if (q.step1) { step1Intent.value = q.step1; applyQuickToForm() }
  if (q.step2) { step2Intent.value = q.step2; applyQuickToForm() }
}

restoreFromUrl()

const editingTuneId = ref(null)
async function loadTuneForEdit(tuneId) {
  if (!tuneId || !supabase) return
  try {
    const t = await getTuneById(tuneId)
    if (!t) return

    editingTuneId.value = t.id

    form.buildType = t.build_type || 'Road'
    form.drivingStyle = t.driving_style || 'Balanced'
    form.drivetrain = t.drivetrain || 'RWD'
    form.powerHp = t.power_hp || 400
    form.weightKg = t.weight_kg || 1400
    form.frontWeightPercent = t.front_weight_pct || 54
    form.classTier = t.class_tier || 'A'
    form.tireCompound = (t.tune_data?.form?.tireCompound) || 'Sport'

    tuneMode.value = t.tune_data?.tuneMode || 'advanced'
    step1Intent.value = t.tune_data?.step1Intent || 'Grip'
    step2Intent.value = t.tune_data?.step2Intent || 'Balanced'
    quickStep.value = 3

    saveStatus.value = 'loaded'
    setTimeout(() => { saveStatus.value = '' }, 1800)
  } catch (e) {
    console.error('Load tune for edit failed:', e)
  }
}

const loadParam = route.query.load
if (loadParam) {
  loadTuneForEdit(loadParam)
}

let syncTimer = null
function syncUrl() {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const q = {}
    if (form.buildType !== 'Road') q.mode = form.buildType.toLowerCase()
    if (form.drivingStyle !== 'Balanced') q.style = form.drivingStyle
    if (form.drivetrain !== 'RWD') q.drive = form.drivetrain
    if (form.powerHp !== 400) q.hp = form.powerHp
    if (form.weightKg !== 1400) q.w = form.weightKg
    if (form.frontWeightPercent !== 54) q.fwp = form.frontWeightPercent
    if (form.classTier !== 'A') q.cls = form.classTier
    if (form.tireCompound !== 'Sport') q.tire = form.tireCompound
    if (tuneMode.value !== 'quick') q.tm = tuneMode.value
    if (tuneMode.value === 'quick' && step1Intent.value !== 'Grip') q.step1 = step1Intent.value
    if (tuneMode.value === 'quick' && step2Intent.value !== 'Balanced') q.step2 = step2Intent.value
    router.replace({ query: q })
  }, 150)
}

watch(() => [
  form.drivetrain, form.buildType, form.drivingStyle, form.classTier,
  form.weightKg, form.powerHp, form.frontWeightPercent, form.tireCompound,
  tuneMode.value, step1Intent.value, step2Intent.value,
], () => { syncUrl() })

onUnmounted(() => {
  clearTimeout(syncTimer)
})

const copiedShare = ref(false)
const shareHint = ref('')

// ── Preset modal ──
const showPresetModal = ref(false)
const presets = ref([])
const presetsLoading = ref(false)
const appliedPresetTitle = ref('')

async function openPresetModal() {
  showPresetModal.value = true
  if (presets.value.length === 0) {
    presetsLoading.value = true
    presets.value = await getPresets()
    presetsLoading.value = false
  }
}

function applyPreset(preset) {
  form.drivetrain = 'RWD'
  const cat = preset.category
  if (cat === 'rally' || cat === 'offroad') form.buildType = 'Dirt'
  else if (cat === 'drift') form.buildType = 'Drift'
  else form.buildType = 'Road'
  form.classTier = 'A'
  form.weightKg = 1400
  form.powerHp = 400
  form.frontWeightPercent = 54
  form.drivingStyle = 'Balanced'
  tuneMode.value = 'advanced'
  appliedPresetTitle.value = preset.title
  showPresetModal.value = false
}

// ── Import tune ──
const importFileInput = ref(null)
const importStatus = ref('')

function triggerImport() {
  if (!isPro.value) {
    openProModal('Import tunes from JSON files')
    return
  }
  importStatus.value = ''
  importFileInput.value?.click()
}

function handleImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result)
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON')

      // Populate form from imported data
      if (data.drivetrain) form.drivetrain = data.drivetrain
      if (data.build_type) form.buildType = data.build_type
      if (data.driving_style) form.drivingStyle = data.driving_style
      if (data.vehicle_name) form.vehicleName = data.vehicle_name

      // Restore tune_data form state if available
      if (data.tune_data?.form) {
        const tf = data.tune_data.form
        if (tf.drivetrain) form.drivetrain = tf.drivetrain
        if (tf.buildType) form.buildType = tf.buildType
        if (tf.drivingStyle) form.drivingStyle = tf.drivingStyle
        if (tf.classTier) form.classTier = tf.classTier
        if (tf.weightKg) form.weightKg = tf.weightKg
        if (tf.powerHp) form.powerHp = tf.powerHp
        if (tf.frontWeightPercent) form.frontWeightPercent = tf.frontWeightPercent
        if (tf.tireCompound) form.tireCompound = tf.tireCompound
      }
      if (data.tune_data?.tuneMode) tuneMode.value = data.tune_data.tuneMode
      if (data.tune_data?.step1Intent) step1Intent.value = data.tune_data.step1Intent
      if (data.tune_data?.step2Intent) step2Intent.value = data.tune_data.step2Intent

      importStatus.value = 'success'
      setTimeout(() => { importStatus.value = '' }, 1500)
      success('Tune imported')
    } catch (err) {
      console.error('Import failed:', err)
      importStatus.value = 'error'
      setTimeout(() => { importStatus.value = '' }, 3000)
      toastError('Import failed')
    }
  }
  reader.readAsText(file)

  // Reset input so same file can be re-imported
  e.target.value = ''
}

function shareTune() {
  shareHint.value = ''
  if (!lastSavedSlug.value) {
    shareHint.value = 'Please save this tune before sharing.'
    return
  }
  if (!lastSavedIsPublic.value) {
    shareHint.value = 'Make this tune public before sharing.'
    return
  }
  const url = `${window.location.origin}/tunes/${lastSavedSlug.value}`
  navigator.clipboard.writeText(url).then(() => {
    copiedShare.value = true
    success('Share link copied')
    setTimeout(() => { copiedShare.value = false }, 1500)
  }).catch(() => {
    copiedShare.value = true
    success('Share link copied')
    setTimeout(() => { copiedShare.value = false }, 1500)
  })
}

/* ── saved builds ── */
const { user } = useAuth()

const STORAGE_KEY = 'forza-tune-saved-builds-v1'
const FREE_MAX_SAVES = 5
const PRO_MAX_SAVES = 200
const maxSaves = computed(() => isPro.value ? PRO_MAX_SAVES : FREE_MAX_SAVES)

const cloudSavedBuildCount = computed(() =>
  savedBuilds.value.filter(b => b.source === 'cloud').length
)

const hasReachedFreeSaveLimit = computed(() =>
  !!user.value && !isPro.value && cloudSavedBuildCount.value >= FREE_MAX_SAVES
)

const savedBuilds = ref([])
const saveStatus = ref('')
const lastSavedSlug = ref(null)
const lastSavedIsPublic = ref(true)
const loadingCloud = ref(false)

const showProModal = ref(false)
const proModalReason = ref('')
function openProModal(reason) { proModalReason.value = reason; showProModal.value = true }
function closeProModal() { showProModal.value = false }

function loadSavedBuilds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      savedBuilds.value = JSON.parse(raw).map(b => ({ ...b, source: b.source || 'local' }))
    }
  } catch { savedBuilds.value = [] }
}
loadSavedBuilds()

function persistSaves() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBuilds.value)) } catch {}
}

function cloudRowToBuild(row) {
  const td = row.tune_data || {}
  return {
    id: row.id,
    cloudId: row.id,
    source: 'cloud',
    createdAt: row.created_at,
    buildType: row.build_type,
    drivingStyle: row.driving_style,
    drivetrain: row.drivetrain,
    powerHp: row.power_hp,
    weightKg: row.weight_kg,
    frontWeightPercent: td.form?.frontWeightPercent ?? 50,
    classTier: td.form?.classTier ?? 'A',
    tireCompound: td.form?.tireCompound ?? 'Sport',
    tuneMode: td.tuneMode ?? 'advanced',
    step1Intent: td.step1Intent ?? 'Grip',
    step2Intent: td.step2Intent ?? 'Balanced',
    personalityTitle: td.personalityTitle || row.title || '',
  }
}

async function loadCloudBuilds() {
  if (!supabase || !user.value) return
  loadingCloud.value = true
  try {
    const { data, error: fetchError } = await supabase
      .from('saved_builds')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(maxSaves.value)

    if (fetchError) { console.error('Cloud load error:', fetchError.message); return }

    const localCloudIds = new Set(
      savedBuilds.value.filter(b => b.cloudId).map(b => b.cloudId)
    )

    for (const row of data) {
      if (!localCloudIds.has(row.id)) {
        savedBuilds.value.push(cloudRowToBuild(row))
      }
    }

    savedBuilds.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    savedBuilds.value = savedBuilds.value.slice(0, maxSaves.value)
    persistSaves()
  } catch (e) {
    console.error('Cloud load failed:', e)
  } finally {
    loadingCloud.value = false
  }
}

watch(user, (newUser) => {
  if (newUser) loadCloudBuilds()
})

/* ── publish ── */
const publishingBuild = ref(null)
const showPublishDialog = ref(false)

function openPublishDialog(build) {
  publishingBuild.value = build
  showPublishDialog.value = true
}

function closePublishDialog() {
  showPublishDialog.value = false
  publishingBuild.value = null
}

function onPublished({ publishedTuneId, publishedSlug }) {
  if (!publishingBuild.value) return
  const idx = savedBuilds.value.findIndex(b => b.id === publishingBuild.value.id)
  if (idx !== -1) {
    savedBuilds.value[idx] = {
      ...savedBuilds.value[idx],
      publishedTuneId,
      publishedSlug,
    }
    persistSaves()
  }
}

function handleSaveBuildClick() {
  if (hasReachedFreeSaveLimit.value) {
    openProModal(t('vehicle.freeSaveLimitMsg'))
    return
  }
  saveCurrentBuild()
}

async function saveCurrentBuild() {
  console.log('SAVE BUILD BUTTON CLICKED')
  console.log('SAVE BUILD START')

  const build = {
    id: Date.now(),
    cloudId: null,
    source: 'local',
    createdAt: new Date().toISOString(),
    buildType: form.buildType,
    drivingStyle: form.drivingStyle,
    drivetrain: form.drivetrain,
    powerHp: form.powerHp,
    weightKg: form.weightKg,
    frontWeightPercent: form.frontWeightPercent,
    classTier: form.classTier,
    tireCompound: form.tireCompound,
    tuneMode: tuneMode.value,
    step1Intent: step1Intent.value,
    step2Intent: step2Intent.value,
    personalityTitle: personality.value?.title || '',
    publishedTuneId: null,
    publishedSlug: null,
  }

  if (supabase && user.value) {
    try {
      const r = result.value
      const tunePayload = {
        user_id: user.value.id,
        id: editingTuneId.value || undefined,
        title: personality.value?.title || `${form.drivingStyle} ${form.buildType} ${form.drivetrain}`,
        build_type: form.buildType,
        driving_style: form.drivingStyle,
        drivetrain: form.drivetrain,
        power_hp: form.powerHp,
        weight_kg: form.weightKg,
        class_tier: form.classTier,
        front_weight_pct: form.frontWeightPercent,
        personality_title: personality.value?.title || null,
        tire_pressure_front: r?.tirePressureFront ?? null,
        tire_pressure_rear: r?.tirePressureRear ?? null,
        gear_final_drive: r?.finalDrive ?? null,
        camber_front: r?.camberFront ?? null,
        camber_rear: r?.camberRear ?? null,
        toe_front: r?.toeFront ?? null,
        toe_rear: r?.toeRear ?? null,
        antiroll_front: r?.antirollFront ?? null,
        antiroll_rear: r?.antirollRear ?? null,
        spring_front: r?.springFront ?? null,
        spring_rear: r?.springRear ?? null,
        ride_height_front: r?.rideHeight ?? null,
        ride_height_rear: r?.rideHeight ?? null,
        brake_balance: r?.brakeBalance ?? null,
        brake_pressure: r?.brakePressure ?? null,
        diff_accel: r?.diffAccel ?? null,
        diff_decel: r?.diffDecel ?? null,
        tune_data: {
          form: {
            drivetrain: form.drivetrain,
            buildType: form.buildType,
            drivingStyle: form.drivingStyle,
            classTier: form.classTier,
            weightKg: form.weightKg,
            powerHp: form.powerHp,
            frontWeightPercent: form.frontWeightPercent,
            tireCompound: form.tireCompound,
          },
          result: r,
          tuneMode: tuneMode.value,
          step1Intent: step1Intent.value,
          step2Intent: step2Intent.value,
          personalityTitle: personality.value?.title,
        },
        share_query: route.query && Object.keys(route.query).length > 0 ? JSON.stringify(route.query) : null,
      }

      console.log('SAVE BUILD PAYLOAD', tunePayload)

      const saved = await saveTune(tunePayload)

      console.log('SAVE BUILD RESULT', saved)

      build.cloudId = saved.id
      build.publishedSlug = saved.slug
      build.source = 'cloud'
      lastSavedSlug.value = saved.slug
      lastSavedIsPublic.value = true
    } catch (e) {
      console.error('SAVE BUILD FAILED', e)
    }
  } else {
    console.log('SAVE BUILD SKIPPED CLOUD', { supabase: !!supabase, user: !!user.value })
  }

  savedBuilds.value = [build, ...savedBuilds.value].slice(0, maxSaves.value)
  persistSaves()
  saveStatus.value = editingTuneId.value ? 'updated' : 'build'
  success(editingTuneId.value ? 'Build updated' : 'Build saved')
  setTimeout(() => { saveStatus.value = '' }, 1500)
  editingTuneId.value = null
}

function loadSavedBuild(build) {
  form.buildType = build.buildType
  form.drivingStyle = build.drivingStyle
  form.drivetrain = build.drivetrain
  form.powerHp = build.powerHp
  form.weightKg = build.weightKg
  form.frontWeightPercent = build.frontWeightPercent
  form.classTier = build.classTier
  form.tireCompound = build.tireCompound
  tuneMode.value = build.tuneMode
  step1Intent.value = build.step1Intent
  step2Intent.value = build.step2Intent
  applyQuickToForm()
  syncUrl()
}

async function deleteSavedBuild(build) {
  if (build.cloudId && supabase && user.value) {
    try {
      await supabase.from('saved_builds').delete().eq('id', build.cloudId).eq('user_id', user.value.id)
    } catch (e) {
      console.error('Cloud delete failed:', e)
    }
  }

  savedBuilds.value = savedBuilds.value.filter(b => b.id !== build.id)
  persistSaves()
}

function formatSaveDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  const lang = currentLang?.value || 'en'
  if (diff < 60000) return lang === 'zh' ? '刚刚' : 'Just now'
  if (diff < 3600000) return lang === 'zh' ? `${Math.floor(diff / 60000)} 分钟前` : `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return lang === 'zh' ? `${Math.floor(diff / 3600000)} 小时前` : `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')
}

/* ── results (shared) ── */
const result = computed(() => calculateTune({ ...form }))

const personality = computed(() => generatePersonalitySummary(
  form.buildType, form.drivingStyle, form.drivetrain, result.value.behavior, currentLang.value,
))

const behaviorBars = computed(() => {
  const b = result.value.behavior
  if (!b) return []
  return [
    { label: t('calculator.stability'),    value: b.stability,    color: '#5b8cb8' },
    { label: t('calculator.rotation'),     value: b.rotation,     color: '#c2784a' },
    { label: t('calculator.grip'),         value: b.grip,         color: '#5b9a7a' },
    { label: t('calculator.forgiveness'),  value: b.forgiveness,  color: '#7b8cb0' },
    { label: t('calculator.aggression'),   value: b.aggression,   color: '#b85b5b' },
  ]
})

const drivingInsights = computed(() => generateDrivingInsights(result.value, currentLang.value))

const severityClass = (severity) => ({
  good: 'severity-good',
  neutral: 'severity-neutral',
  warning: 'severity-warning',
}[severity] || 'severity-neutral')

const comparisonTunes = computed(() => {
  const base = { ...form }
  return [
    { id: 'Stable', label: t('calculator.safe_label'), desc: t('calculator.compareSafe_desc'), recommend: t('calculator.compareSafe_recommend'), tune: calculateTune({ ...base, drivingStyle: 'Stable' }) },
    { id: 'Balanced', label: t('calculator.balanced_label'), desc: t('calculator.compareBalanced_desc'), recommend: t('calculator.compareBalanced_recommend'), tune: calculateTune({ ...base, drivingStyle: 'Balanced' }) },
    { id: 'Aggressive', label: t('calculator.aggressive_label'), desc: t('calculator.compareAggressive_desc'), recommend: t('calculator.compareAggressive_recommend'), tune: calculateTune({ ...base, drivingStyle: 'Aggressive' }) },
    { id: 'Drifty', label: t('calculator.drifty_label'), desc: t('calculator.compareDrifty_desc'), recommend: t('calculator.compareDrifty_recommend'), tune: calculateTune({ ...base, drivingStyle: 'Drifty' }) },
    { id: 'Beginner Friendly', label: t('calculator.beginner_label'), desc: t('calculator.compareBeginner_desc'), recommend: t('calculator.compareBeginner_recommend'), tune: calculateTune({ ...base, drivingStyle: 'Beginner Friendly' }) },
  ]
})

function selectComparisonStyle(styleId) {
  form.drivingStyle = styleId
  if (tuneMode.value === 'quick') {
    syncQuickStateFromForm()
  }
}

const copied = ref(false)
const copiedSteps = ref(false)

const applySteps = computed(() => generateApplySteps(result.value, currentLang.value))

function copySteps() {
  const text = formatApplyStepsText(applySteps.value)
  navigator.clipboard.writeText(text).then(() => {
    copiedSteps.value = true
    success('Apply steps copied')
    setTimeout(() => { copiedSteps.value = false }, 1500)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedSteps.value = true
    success('Apply steps copied')
    setTimeout(() => { copiedSteps.value = false }, 1500)
  })
}

function copyTune() {
  const text = formatTuneText(result.value, { ...form })
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    success('Tune copied')
    setTimeout(() => { copied.value = false }, 1500)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copied.value = true
    success('Tune copied')
    setTimeout(() => { copied.value = false }, 1500)
  })
}

const resultRows = computed(() => [
  { label: t('calculator.label_tirePressure'), key: 'tirePressureFront', key2: 'tirePressureRear', fmt: v => `${v.tirePressureFront} / ${v.tirePressureRear}`, unit: 'psi', desc: t('calculator.desc_tirePressure') },
  { label: t('calculator.label_finalDrive'), key: 'finalDrive', fmt: v => v.finalDrive.toFixed(2), unit: '', desc: t('calculator.desc_finalDrive') },
  { label: t('calculator.label_camber'), key: 'camberFront', key2: 'camberRear', fmt: v => `${v.camberFront}° / ${v.camberRear}°`, unit: '', desc: t('calculator.desc_camber') },
  { label: t('calculator.label_toe'), key: 'toeFront', key2: 'toeRear', fmt: v => `${v.toeFront}° / ${v.toeRear}°`, unit: '', desc: t('calculator.desc_toe') },
  { label: t('calculator.label_antiRollBars'), key: 'antirollFront', key2: 'antirollRear', fmt: v => `${v.antirollFront} / ${v.antirollRear}`, unit: '', desc: t('calculator.desc_antiRollBars') },
  { label: t('calculator.label_springs'), key: 'springFront', key2: 'springRear', fmt: v => `${v.springFront} / ${v.springRear}`, unit: 'N/mm', desc: t('calculator.desc_springs') },
  { label: t('calculator.label_rideHeight'), key: 'rideHeight', fmt: v => `${v.rideHeight}`, unit: 'cm', desc: t('calculator.desc_rideHeight') },
  { label: t('calculator.label_brakeBalance'), key: 'brakeBalance', fmt: v => `${v.brakeBalance}%`, unit: 'front', desc: t('calculator.desc_brakeBalance') },
  { label: t('calculator.label_brakePressure'), key: 'brakePressure', fmt: v => `${v.brakePressure}%`, unit: '', desc: t('calculator.desc_brakePressure') },
  { label: t('calculator.label_diffAccel'), key: 'diffAccel', fmt: v => `${v.diffAccel}%`, unit: '', desc: t('calculator.desc_diffAccel') },
  { label: t('calculator.label_diffDecel'), key: 'diffDecel', fmt: v => `${v.diffDecel}%`, unit: '', desc: t('calculator.desc_diffDecel') },
])

const drivetrainOpts = ['FWD', 'RWD', 'AWD']
const buildTypeOpts = ['Road', 'Dirt', 'Drift', 'Drag', 'Beginner']
const classTierOpts = ['D', 'C', 'B', 'A', 'S1', 'S2', 'X']
const tireCompoundOpts = ['Stock', 'Street', 'Sport', 'Race', 'Slick']
const drivingStyleOpts = ['Stable', 'Balanced', 'Aggressive', 'Drifty', 'Beginner Friendly']
</script>

<template>
  <div class="calculator">
    <div class="top-bar">
      <div class="mode-badge liquid-glass">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
        {{ t('calculator.mode' + form.buildType) }}
      </div>

      <div class="mode-toggle liquid-glass">
        <button
          :class="['mode-toggle-btn', { active: tuneMode === 'quick' }]"
          @click="switchMode('quick')"
        >{{ t('calculator.quickTune') }}</button>
        <button
          :class="['mode-toggle-btn', { active: tuneMode === 'advanced' }]"
          @click="switchMode('advanced')"
        >{{ t('calculator.advanced') }}</button>
      </div>

      <div class="tip-bar liquid-glass readable-layer">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {{ t('calculator.tipBar') }}
      </div>
    </div>

    <div class="calc-layout">
      <!-- ── Left: Input ── -->
      <aside class="input-panel liquid-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">{{ t('calculator.tuningInputs') }}</h2>
            <span class="panel-subtitle">{{ tuneMode === 'quick' ? t('calculator.quickSetup') : t('calculator.adjustSpecs') }}</span>
          </div>
        </div>

        <!-- ═══════ QUICK MODE ═══════ -->
        <div v-if="tuneMode === 'quick'" class="quick-flow">
          <!-- Step indicator -->
          <div class="step-indicator">
            <div v-for="s in 3" :key="s" :class="['step-dot', { done: quickStep > s, active: quickStep === s }]">
              <span v-if="quickStep > s" class="step-check">&#10003;</span>
              <span v-else>{{ s }}</span>
            </div>
            <div class="step-line" v-for="s in 2" :key="'l'+s" :class="{ filled: quickStep > s }"></div>
          </div>

          <!-- STEP 1 -->
          <div v-if="quickStep === 1" class="quick-step">
            <h3 class="quick-title">{{ t('calculator.step1') }}</h3>
            <div class="quick-cards">
              <button
                v-for="opt in step1Options" :key="opt.id"
                :class="['quick-card', { selected: step1Intent === opt.id }]"
                @click="selectStep1(opt.id)"
              >
                <div class="quick-card-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path :d="opt.icon" /></svg>
                </div>
                <div class="quick-card-body">
                  <span class="quick-card-label">{{ opt.label }}</span>
                  <span class="quick-card-desc">{{ opt.desc }}</span>
                </div>
                <svg class="quick-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>

          <!-- STEP 2 -->
          <div v-if="quickStep === 2" class="quick-step">
            <h3 class="quick-title">{{ t('calculator.step2') }}</h3>
            <div class="quick-cards">
              <button
                v-for="opt in step2Options" :key="opt.id"
                :class="['quick-card', { selected: step2Intent === opt.id }]"
                @click="selectStep2(opt.id)"
              >
                <div class="quick-card-body">
                  <span class="quick-card-label">{{ opt.label }}</span>
                  <span class="quick-card-desc">{{ opt.desc }}</span>
                </div>
                <svg class="quick-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
            <button class="quick-back" @click="quickStep = 1">&larr; {{ t('calculator.back') }}</button>
          </div>

          <!-- STEP 3 -->
          <div v-if="quickStep === 3" class="quick-step">
            <h3 class="quick-title">{{ t('calculator.step3') }}</h3>
            <div class="quick-form">
              <label class="field">
                <span class="field-label">{{ t('calculator.drivetrain') }}</span>
                <select v-model="step3Drivetrain" class="field-select input-glass">
                  <option v-for="o in drivetrainOpts" :key="o" :value="o">{{ o }}</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{ t('calculator.powerHp') }}</span>
                <input v-model.number="step3Power" type="number" min="50" max="2000" step="5" class="field-input input-glass" />
              </label>
              <label class="field">
                <span class="field-label">{{ t('calculator.weightKg') }}</span>
                <input v-model.number="step3Weight" type="number" min="600" max="3000" step="10" class="field-input input-glass" />
              </label>
            </div>
            <button class="quick-back" @click="quickStep = 2">&larr; {{ t('calculator.back') }}</button>
          </div>
        </div>

        <!-- ═══════ ADVANCED MODE ═══════ -->
        <div v-if="tuneMode === 'advanced'" class="form-grid">
          <label class="field">
            <span class="field-label">{{ t('calculator.drivetrain') }}</span>
            <select v-model="form.drivetrain" class="field-select input-glass">
              <option v-for="o in drivetrainOpts" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.buildType') }}</span>
            <select v-model="form.buildType" class="field-select input-glass">
              <option v-for="o in buildTypeOpts" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.drivingStyle') }}</span>
            <select v-model="form.drivingStyle" class="field-select input-glass">
              <option v-for="o in drivingStyleOpts" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.classTier') }}</span>
            <select v-model="form.classTier" class="field-select input-glass">
              <option v-for="o in classTierOpts" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.tireCompound') }}</span>
            <select v-model="form.tireCompound" class="field-select input-glass">
              <option v-for="o in tireCompoundOpts" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.weightKg') }}</span>
            <input v-model.number="form.weightKg" type="number" min="600" max="3000" step="10" class="field-input input-glass" />
          </label>

          <label class="field">
            <span class="field-label">{{ t('calculator.powerHp') }}</span>
            <input v-model.number="form.powerHp" type="number" min="50" max="2000" step="5" class="field-input input-glass" />
          </label>

          <label class="field field-full">
            <span class="field-label">{{ t('calculator.frontWeight') }} <span class="range-val">{{ form.frontWeightPercent }}%</span></span>
            <input v-model.number="form.frontWeightPercent" type="range" min="35" max="75" step="1" class="field-range" />
            <div class="range-ends">
              <span>35</span><span>75</span>
            </div>
          </label>
        </div>
      </aside>

      <!-- ── Right: Output ── -->
      <section class="output-panel liquid-panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <h2 class="panel-title">{{ t('calculator.tuningResults') }}</h2>
            <span class="panel-subtitle">{{ t('calculator.realtimeCalc') }}</span>
          </div>
          <div class="actions-row">
            <div class="actions-row-secondary">
              <button class="btn-secondary btn-tight" @click="openPresetModal">
                {{ appliedPresetTitle ? `Preset: ${appliedPresetTitle}` : 'Apply Preset' }}
              </button>
              <input
                ref="importFileInput"
                type="file"
                accept=".json"
                class="import-file-input"
                @change="handleImportFile"
              />
              <button class="btn-secondary btn-tight" @click="triggerImport">
                {{ importStatus === 'success' ? 'Imported' : importStatus === 'error' ? 'Import failed' : 'Import Tune' }}
              </button>
              <button class="btn-secondary btn-tight" @click="isPro ? copyTune() : openProModal('Copy tune values to clipboard')">
                {{ copied ? 'Copied' : 'Copy Tune' }}
              </button>
              <button class="btn-secondary btn-tight" @click="shareTune">
                {{ copiedShare ? 'Shared' : 'Share' }}
              </button>
            </div>
            <button class="btn-primary" @click="handleSaveBuildClick">
              {{ saveStatus === 'build' ? 'Saved' : saveStatus === 'updated' ? 'Updated' : editingTuneId ? 'Update Build' : 'Save Build' }}
            </button>
          </div>
          <span v-if="shareHint" class="share-hint">{{ shareHint }}</span>
        </div>

        <hr class="output-divider" />

        <div class="personality-card">
          <div class="personality-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div>
              <h3 class="personality-title">{{ personality.title }}</h3>
              <span class="personality-label">{{ t('calculator.tunePersonality') }}</span>
            </div>
          </div>
          <p class="personality-summary">{{ personality.summary }}</p>
          <ul class="personality-tips">
            <li v-for="(tip, i) in personality.tips" :key="i" class="personality-tip">
              <span class="tip-marker"></span>
              {{ tip }}
            </li>
          </ul>
        </div>

        <hr class="output-divider" />

        <div class="behavior-section">
          <div class="behavior-header">
            <h3 class="behavior-title">{{ t('calculator.carBehavior') }}</h3>
            <span class="behavior-subtitle">{{ form.drivingStyle }}</span>
          </div>
          <div class="behavior-bars">
            <div v-for="bar in behaviorBars" :key="bar.label" class="behavior-row">
              <span class="behavior-label">{{ bar.label }}</span>
              <div class="behavior-track">
                <div class="behavior-fill" :style="{ width: bar.value + '%', background: bar.color }"></div>
              </div>
              <span class="behavior-val">{{ bar.value }}</span>
            </div>
          </div>
        </div>

        <hr v-if="drivingInsights.length > 0" class="output-divider" />

        <div v-if="drivingInsights.length > 0" class="insights-section">
          <h3 class="insights-title">{{ t('calculator.drivingInsights') }}</h3>
          <span class="insights-subtitle">{{ t('calculator.insightsSubtitle') }}</span>
          <div class="insights-grid">
            <div v-for="insight in drivingInsights" :key="insight.title" class="insight-card liquid-glass">
              <div class="insight-header">
                <span class="insight-title">{{ insight.title }}</span>
                <span :class="['insight-severity', severityClass(insight.severity)]">{{ insight.status }}</span>
              </div>
              <p class="insight-desc">{{ insight.description }}</p>
            </div>
          </div>
        </div>

        <hr class="output-divider" />

        <div class="compare-section">
          <h3 class="compare-title">{{ t('calculator.compareTitle') }}</h3>
          <div class="compare-cards">
            <div
              v-for="c in comparisonTunes" :key="c.id"
              :class="['compare-card', { active: form.drivingStyle === c.id }]"
              @click="selectComparisonStyle(c.id)"
            >
              <div class="compare-card-header">
                <span class="compare-card-label">{{ c.label }}</span>
                <svg v-if="form.drivingStyle === c.id" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="compare-check">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <p class="compare-card-desc">{{ c.desc }}</p>
              <div class="compare-mini-bars">
                <div v-for="b in [
                  { key: 'stability', label: t('calculator.stability'), color: '#5b8cb8' },
                  { key: 'rotation', label: t('calculator.rotation'), color: '#c2784a' },
                  { key: 'grip', label: t('calculator.grip'), color: '#5b9a7a' },
                  { key: 'forgiveness', label: t('calculator.forgiveness'), color: '#7b8cb0' },
                  { key: 'aggression', label: t('calculator.aggression'), color: '#b85b5b' },
                ]" :key="b.key" class="compare-mini-row">
                  <span class="compare-mini-label">{{ b.label }}</span>
                  <div class="compare-mini-track">
                    <div class="compare-mini-fill" :style="{ width: c.tune.behavior[b.key] + '%', background: b.color }"></div>
                  </div>
                </div>
              </div>
              <div class="compare-recommend">
                <span class="compare-recommend-label">{{ t('calculator.recommendedFor') }}</span>
                <span class="compare-recommend-text">{{ c.recommend }}</span>
              </div>
            </div>
          </div>
        </div>

        <hr class="output-divider" />

        <div class="result-grid">
          <div v-for="row in resultRows" :key="row.label" class="result-card liquid-card">
            <div class="result-inner">
              <div class="result-value">
                <span class="result-number">{{ row.fmt(result) }}</span>
                <span v-if="row.unit" class="result-unit">{{ row.unit }}</span>
              </div>
              <div class="result-label">{{ row.label }}</div>
              <div class="result-desc">{{ row.desc }}</div>
            </div>
          </div>
        </div>

        <hr class="output-divider" />

        <div class="apply-section">
          <div class="apply-header">
            <div class="apply-header-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <h3 class="apply-title">{{ t('calculator.applyInGame') }}</h3>
            </div>
            <button class="btn-apply" @click="copySteps">
              <svg v-if="!copiedSteps" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ copiedSteps ? t('calculator.copied') : t('calculator.copySteps') }}
            </button>
          </div>

          <div class="step-list">
            <div v-for="(step, i) in applySteps" :key="step.title" class="step-group">
              <div class="step-number">{{ i + 1 }}</div>
              <div class="step-body">
                <h4 class="step-title">{{ step.title }}</h4>
                <div class="step-item" v-for="(item, j) in step.items" :key="j">{{ item }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="savedBuilds.length > 0 || loadingCloud" class="saved-section">
          <div class="saved-title-row">
            <h3 class="saved-title">{{ t('calculator.savedBuilds') }}</h3>
            <span v-if="loadingCloud" class="saved-cloud-status">{{ t('calculator.syncing') }}</span>
          </div>
          <div class="saved-list">
            <div v-for="b in savedBuilds" :key="b.id" class="saved-item">
              <div class="saved-body">
                <div class="saved-row">
                  <span class="saved-personality">{{ b.personalityTitle || b.buildType + ' ' + b.drivingStyle }}</span>
                  <div class="saved-badges">
                    <span v-if="b.source === 'cloud'" class="saved-badge saved-badge-cloud">{{ t('calculator.cloud') }}</span>
                    <span v-else class="saved-badge saved-badge-local">{{ t('calculator.local') }}</span>
                    <span class="saved-date">{{ formatSaveDate(b.createdAt) }}</span>
                  </div>
                </div>
                <div class="saved-meta">
                  {{ b.buildType }} &middot; {{ b.drivingStyle }} &middot; {{ b.drivetrain }} &middot; {{ b.powerHp }} HP &middot; {{ b.weightKg }} kg
                </div>
              </div>
              <div class="saved-actions">
                <button class="saved-btn-load" @click="loadSavedBuild(b)" title="Load">{{ t('calculator.load_button') }}</button>
                <router-link
                  v-if="b.publishedSlug"
                  :to="`/tunes/${b.publishedSlug}`"
                  class="saved-btn-view"
                  title="View published tune"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  {{ t('calculator.view') }}
                </router-link>
                <button
                  v-else
                  class="saved-btn-publish"
                  @click="openPublishDialog(b)"
                  title="Publish"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                  </svg>
                  {{ t('calculator.publish') }}
                </button>
                <button class="saved-btn-del" @click="deleteSavedBuild(b)" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <PublishDialog
      v-if="showPublishDialog && publishingBuild"
      :build="publishingBuild"
      :tune-result="result"
      @close="closePublishDialog"
      @published="onPublished"
    />

    <!-- Preset Modal -->
    <Teleport to="body">
      <div v-if="showPresetModal" class="preset-overlay" @click.self="showPresetModal = false">
        <div class="preset-modal liquid-panel">
          <div class="preset-modal-inner">
            <h2 class="preset-title">Choose Preset</h2>
            <div v-if="presetsLoading" class="preset-loading">Loading...</div>
            <div v-else class="preset-grid">
              <button
                v-for="p in presets"
                :key="p.slug"
                class="preset-card liquid-glass"
                :class="{ 'preset-locked': !isPro && p.slug !== 'balanced-road' }"
                :disabled="!isPro && p.slug !== 'balanced-road'"
                @click="isPro || p.slug === 'balanced-road' ? applyPreset(p) : openProModal('Unlock all presets')"
              >
                <span class="preset-card-title">{{ p.title }}</span>
                <span class="preset-card-desc">{{ p.description }}</span>
                <span v-if="!isPro && p.slug !== 'balanced-road'" class="preset-pro-badge">PRO</span>
                <div v-if="!isPro && p.slug !== 'balanced-road'" class="preset-lock-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </button>
            </div>
            <button class="preset-cancel" @click="showPresetModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </Teleport>

    <SubscriptionModal :open="showProModal" :reason="proModalReason" @close="closeProModal" />
  </div>
</template>

<style scoped>
.calculator {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 1160px;
  margin: 0 auto;
  width: 100%;
}

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2d4a63;
  white-space: nowrap;
}

.mode-toggle {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 14px;
}

.mode-toggle-btn {
  padding: 6px 16px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
}

.mode-toggle-btn.active {
  background: rgba(255, 255, 255, 0.88);
  color: #2d4a63;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.tip-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.825rem;
  color: #111111;
  flex: 1;
}

.tip-bar svg {
  flex-shrink: 0;
  color: #4a6b85;
}

/* ── Layout ── */
.calc-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  align-items: start;
}

.input-panel,
.output-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px;
  border-radius: 28px;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.panel-header-left {
  flex-shrink: 0;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
  align-items: center;
}

.actions-row-secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.btn-tight {
  padding: 0 14px;
  font-size: 0.78rem;
}

.output-divider {
  height: 1px;
  border: none;
  background: linear-gradient(90deg, transparent, rgba(180, 195, 215, 0.35) 15%, rgba(180, 195, 215, 0.35) 85%, transparent);
  margin: 0;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  letter-spacing: -0.015em;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: #111111;
  font-weight: 500;
  display: block;
  margin-top: 2px;
}

/* ── Quick Flow ── */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 20px;
  position: relative;
  z-index: 2;
}

.step-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  background: rgba(200, 210, 225, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: #7b8695;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: linear-gradient(180deg, #6e90b0 0%, #507498 35%, #3f6284 100%);
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
  box-shadow: 0 2px 10px rgba(63, 98, 132, 0.3);
}

.step-dot.done {
  background: #5b8a6a;
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

.step-check {
  font-size: 0.8rem;
}

.step-line {
  width: 36px;
  height: 2px;
  background: rgba(180, 195, 215, 0.4);
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.step-line.filled {
  background: #5b8a6a;
}

.quick-step {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-title {
  font-size: 0.88rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
  text-align: center;
}

.quick-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.48),
    0 2px 10px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
}

.quick-card:hover {
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(255, 255, 255, 0.65);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.quick-card.selected {
  background: rgba(91, 122, 154, 0.14);
  border-color: rgba(91, 122, 154, 0.52);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 3px 14px rgba(63, 98, 132, 0.14);
}

.quick-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.50),
    0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #4a6b85;
}

.quick-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.quick-card-label {
  font-size: 0.9rem;
  font-weight: 650;
  color: #000000;
}

.quick-card-desc {
  font-size: 0.75rem;
  color: #222222;
  font-weight: 500;
}

.quick-card-arrow {
  flex-shrink: 0;
  color: #a0aab4;
  transition: transform 0.2s ease;
}

.quick-card:hover .quick-card-arrow {
  transform: translateX(2px);
  color: #4a6b85;
}

.quick-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quick-back {
  align-self: flex-start;
  font-size: 0.78rem;
  font-weight: 550;
  color: #7b8695;
  padding: 4px 0;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;
}

.quick-back:hover {
  color: #4a6b85;
}

/* ── Form ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.range-val {
  font-weight: 650;
  color: #4a6b85;
  font-size: 0.8rem;
}

.field-select,
.field-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #111111;
  font-family: inherit;
  width: 100%;
}

.field-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b95a1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

.field-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(180, 195, 215, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.45);
  outline: none;
  cursor: pointer;
  margin-top: 2px;
}

.field-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(180deg, #6e90b0 0%, #507498 35%, #3f6284 100%);
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(63, 98, 132, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.field-range::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(63, 98, 132, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.field-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(180deg, #6e90b0 0%, #507498 35%, #3f6284 100%);
  border: 2px solid #fff;
  box-shadow: 0 2px 10px rgba(63, 98, 132, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  cursor: pointer;
}

.range-ends {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #111111;
  margin-top: 2px;
}

.share-hint {
  font-size: 0.72rem;
  font-weight: 550;
  color: #b85b5b;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.12);
  white-space: nowrap;
}

.import-file-input { display: none; }

/* ── Preset Modal ── */
.preset-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 32, 0.30);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  padding: 20px;
}

.preset-modal {
  width: 100%;
  max-width: 520px;
  border-radius: 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.preset-modal-inner {
  position: relative;
  z-index: 2;
  padding: 28px 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
}

.preset-loading {
  font-size: 0.85rem;
  color: #222222;
  font-weight: 500;
  text-align: center;
  padding: 20px;
}

.preset-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
  border: 1px solid rgba(255, 255, 255, 0.52);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 2px 8px rgba(0, 0, 0, 0.035);
  position: relative;
}

.preset-card:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(255, 255, 255, 0.62);
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    0 4px 16px rgba(0, 0, 0, 0.06);
}

.preset-card:active:not(:disabled) {
  transform: scale(0.97);
}

.preset-card-title {
  font-size: 0.88rem;
  font-weight: 640;
  color: #000000;
}

.preset-card-desc {
  font-size: 0.74rem;
  font-weight: 480;
  color: #222222;
  line-height: 1.4;
  padding-right: 40px;
}

.preset-locked {
  opacity: 0.5;
  cursor: not-allowed;
  filter: blur(0.6px);
}

.preset-locked:hover {
  transform: none !important;
  background: rgba(255, 255, 255, 0.78) !important;
}

.preset-lock-icon {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: #222222;
  pointer-events: none;
}

.preset-pro-badge {
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 0.56rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  color: #4a6b85;
  background: rgba(91, 122, 154, 0.1);
  border: 1px solid rgba(91, 122, 154, 0.2);
  letter-spacing: 0.04em;
}

.preset-cancel {
  display: inline-flex;
  align-self: flex-end;
  padding: 8px 20px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  color: #000000;
  background: rgba(255, 255, 255, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.50);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-cancel:hover {
  background: rgba(255, 255, 255, 0.85);
  color: #000000;
}

/* ── Tune Personality ── */
.personality-card {
  position: relative;
  z-index: 2;
  padding: 20px 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.48),
    0 3px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.personality-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #5b7a9a;
}

.personality-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  line-height: 1.2;
}

.personality-label {
  font-size: 0.65rem;
  font-weight: 550;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: block;
  margin-top: 2px;
}

.personality-summary {
  font-size: 0.82rem;
  line-height: 1.65;
  color: #111111;
  font-weight: 500;
  margin: 0;
}

.personality-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.personality-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.78rem;
  line-height: 1.55;
  color: #222222;
  font-weight: 500;
}

.tip-marker {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #7ba0ba;
  margin-top: 7px;
}

/* ── Apply In Game ── */
.apply-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.apply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.apply-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5b8a6a;
}

.apply-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5b8a6a;
  background: rgba(91, 138, 106, 0.08);
  border: 1px solid rgba(91, 138, 106, 0.18);
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-apply:hover {
  background: rgba(91, 138, 106, 0.14);
  border-color: rgba(91, 138, 106, 0.28);
  color: #3d6a4a;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-group {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.15s ease;
}

.step-group:hover {
  background: rgba(255, 255, 255, 0.55);
}

.step-number {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #4a6b85;
  margin-top: 1px;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.step-title {
  font-size: 0.82rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
}

.step-item {
  font-size: 0.75rem;
  color: #111111;
  font-weight: 520;
  line-height: 1.5;
}

/* ── Saved Builds ── */
.saved-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saved-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.saved-title {
  font-size: 0.88rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
}

.saved-cloud-status {
  font-size: 0.62rem;
  font-weight: 550;
  color: #4a6b85;
  animation: pulse-status 1.5s ease-in-out infinite;
}

@keyframes pulse-status {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.saved-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.saved-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.50);
  transition: background 0.15s ease;
}

.saved-item:hover {
  background: rgba(255, 255, 255, 0.82);
}

.saved-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.saved-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.saved-personality {
  font-size: 0.8rem;
  font-weight: 650;
  color: #000000;
}

.saved-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.saved-badge {
  font-size: 0.56rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.saved-badge-cloud {
  color: #3d6a4a;
  background: rgba(91, 138, 106, 0.10);
  border: 1px solid rgba(91, 138, 106, 0.20);
}

.saved-badge-local {
  color: #7b6a9a;
  background: rgba(123, 106, 154, 0.08);
  border: 1px solid rgba(123, 106, 154, 0.16);
}

.saved-date {
  font-size: 0.62rem;
  font-weight: 500;
  color: #333333;
  flex-shrink: 0;
}

.saved-meta {
  font-size: 0.68rem;
  color: #333333;
  font-weight: 500;
  line-height: 1.4;
}

.saved-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.saved-btn-load {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(91, 122, 154, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.16);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.saved-btn-load:hover {
  background: rgba(91, 122, 154, 0.16);
  color: #2d4a63;
}

.saved-btn-del {
  padding: 5px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  color: #a08b95;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
}

.saved-btn-del:hover {
  color: #b85b5b;
  background: rgba(184, 91, 91, 0.08);
  border-color: rgba(184, 91, 91, 0.18);
}

.saved-btn-publish {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #5b7a9a;
  background: rgba(91, 122, 154, 0.06);
  border: 1px solid rgba(91, 122, 154, 0.14);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  text-decoration: none;
}

.saved-btn-publish:hover {
  background: rgba(91, 122, 154, 0.12);
  border-color: rgba(91, 122, 154, 0.24);
  color: #3d5c73;
}

.saved-btn-view {
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #3d6a4a;
  background: rgba(91, 138, 106, 0.08);
  border: 1px solid rgba(91, 138, 106, 0.16);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  text-decoration: none;
}

.saved-btn-view:hover {
  background: rgba(91, 138, 106, 0.14);
  border-color: rgba(91, 138, 106, 0.26);
  color: #2d5a3a;
}

/* ── Behavior ── */
.behavior-section {
  position: relative;
  z-index: 2;
}

.behavior-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.behavior-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
}

.behavior-subtitle {
  font-size: 0.72rem;
  font-weight: 550;
  color: #4a6b85;
}

.behavior-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.behavior-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.behavior-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 560;
  color: #111111;
  text-align: right;
}

.behavior-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(200, 210, 225, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.4);
  overflow: hidden;
}

.behavior-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
  min-width: 0;
}

.behavior-val {
  width: 28px;
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  color: #111111;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

/* ── Driving Insights ── */
.insights-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insights-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
}

.insights-subtitle {
  font-size: 0.72rem;
  font-weight: 520;
  color: #6b859e;
  margin-bottom: 8px;
  display: block;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.insight-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px) saturate(155%);
  -webkit-backdrop-filter: blur(12px) saturate(155%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 2px 8px rgba(0, 0, 0, 0.03);
}

.insight-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.insight-title {
  font-size: 0.82rem;
  font-weight: 680;
  color: #000000;
}

.insight-severity {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.severity-good {
  color: #3d6a4a;
  background: rgba(91, 138, 106, 0.12);
  border: 1px solid rgba(91, 138, 106, 0.22);
}

.severity-neutral {
  color: #4a6b85;
  background: rgba(91, 122, 154, 0.10);
  border: 1px solid rgba(91, 122, 154, 0.20);
}

.severity-warning {
  color: #b8742a;
  background: rgba(194, 120, 74, 0.10);
  border: 1px solid rgba(194, 120, 74, 0.22);
}

.insight-desc {
  font-size: 0.75rem;
  line-height: 1.6;
  color: #111111;
  font-weight: 500;
  margin: 0;
}

@media (max-width: 640px) {
  .insights-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .insight-card {
    padding: 14px 16px;
    border-radius: 14px;
  }

  .insight-title {
    font-size: 0.8rem;
  }

  .insight-desc {
    font-size: 0.73rem;
  }
}

/* ── Compare Driving Feel ── */
.compare-section {
  position: relative;
  z-index: 2;
}

.compare-title {
  font-size: 0.88rem;
  font-weight: 650;
  color: #000000;
  margin: 0 0 14px;
}

.compare-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 10px;
}

.compare-card {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 2px 8px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compare-card:hover {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(255, 255, 255, 0.62);
  transform: translateY(-2px);
}

.compare-card.active {
  background: rgba(80, 110, 140, 0.12);
  border-color: rgba(91, 122, 154, 0.45);
  box-shadow: 0 2px 14px rgba(63, 98, 132, 0.10);
}

.compare-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.compare-card-label {
  font-size: 0.82rem;
  font-weight: 680;
  color: #000000;
}

.compare-check {
  color: #5b8a6a;
}

.compare-card-desc {
  font-size: 0.7rem;
  line-height: 1.5;
  color: #111111;
  font-weight: 500;
  margin: 0;
}

.compare-mini-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compare-mini-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.compare-mini-label {
  width: 62px;
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 560;
  color: #222222;
}

.compare-mini-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(200, 210, 225, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.compare-mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.compare-recommend {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
  border-top: 1px solid rgba(200, 210, 225, 0.25);
}

.compare-recommend-label {
  font-size: 0.58rem;
  font-weight: 550;
  color: #222222;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.compare-recommend-text {
  font-size: 0.65rem;
  font-weight: 520;
  color: #111111;
  line-height: 1.45;
}

/* ── Result grid ── */
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 12px;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.result-card {
  padding: 16px 18px;
  border-radius: 18px;
}

.result-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  z-index: 2;
}

.result-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 2px;
  position: relative;
  z-index: 2;
}

.result-number {
  font-size: 1.1rem;
  font-weight: 660;
  color: #000000;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  word-break: break-word;
  line-height: 1.3;
}

.result-unit {
  font-size: 0.73rem;
  font-weight: 580;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.result-label {
  font-size: 0.78rem;
  font-weight: 620;
  color: #000000;
  line-height: 1.3;
  position: relative;
  z-index: 2;
}

.result-desc {
  font-size: 0.72rem;
  font-weight: 550;
  color: #111111;
  position: relative;
  z-index: 2;
}

/* ══════════════════════════════════════════════
   Mobile
   ══════════════════════════════════════════════ */
@media (max-width: 860px) {
  .calc-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .compare-cards {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .compare-card {
    padding: 12px;
    gap: 8px;
  }

  .result-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .panel-header {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .actions-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .actions-row-secondary {
    flex-wrap: wrap;
    gap: 8px;
  }

  .actions-row-secondary button {
    flex: 1;
    min-width: 0;
    font-size: 0.75rem;
  }
}

@media (max-width: 640px) {
  .calculator {
    padding: 16px;
    padding-bottom: 60px;
    gap: 18px;
  }

  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .tip-bar {
    font-size: 0.78rem;
    padding: 10px 16px;
    border-radius: 16px;
  }

  .input-panel,
  .output-panel {
    padding: 22px 18px;
    border-radius: 24px;
    gap: 18px;
    scroll-margin-top: 90px;
  }

  .panel-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .btn-copy,
  .btn-share,
  .btn-save,
  .btn-preset,
  .btn-import {
    min-height: 40px;
    padding: 10px 14px;
    font-size: 0.76rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .field-full {
    grid-column: 1;
  }

  .field-select,
  .field-input {
    min-height: 44px;
    padding: 12px 14px;
  }

  .result-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }

  .result-card {
    padding: 14px 16px;
    border-radius: 16px;
  }

  .result-number {
    font-size: 1rem;
  }

  .behavior-track {
    height: 10px;
    border-radius: 5px;
  }

  .behavior-fill {
    border-radius: 5px;
  }

  .step-group {
    padding: 8px 10px;
    gap: 8px;
  }

  .step-item {
    font-size: 0.72rem;
  }

  .quick-card {
    padding: 16px;
    gap: 12px;
    min-height: 56px;
  }

  .quick-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .quick-title {
    font-size: 0.85rem;
  }

  .compare-cards {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .compare-card {
    padding: 14px 16px;
    min-height: 44px;
  }

  .compare-mini-label {
    width: 72px;
  }

  .compare-mini-track {
    height: 5px;
  }

  .saved-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .saved-actions {
    align-self: flex-end;
  }

  .saved-btn-load,
  .saved-btn-del {
    min-height: 38px;
    padding: 8px 14px;
  }

  .btn-apply {
    min-height: 38px;
    padding: 8px 14px;
  }

  .mode-badge {
    font-size: 0.8rem;
    padding: 10px 14px;
  }

  .mode-toggle-btn {
    padding: 10px 16px;
    font-size: 0.78rem;
  }
}
</style>
