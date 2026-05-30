<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const model = defineModel()
const emit = defineEmits(['select'])

const search = ref('')
const results = ref([])
const open = ref(false)
const searching = ref(false)
const selectedVehicle = ref(null)

let searchTimer = null
const el = ref(null)

async function doSearch() {
  if (!supabase) return
  const term = search.value.trim()
  if (!term) { results.value = []; return }

  searching.value = true
  try {
    const { data } = await supabase
      .from('vehicles')
      .select('id, name, manufacturer, slug')
      .or(`name.ilike.%${term}%,manufacturer.ilike.%${term}%`)
      .order('manufacturer')
      .limit(8)

    results.value = data || []
  } catch {
    results.value = []
  } finally {
    searching.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 200)
})

function select(vehicle) {
  selectedVehicle.value = vehicle
  model.value = vehicle.id
  emit('select', vehicle)
  open.value = false
  search.value = ''
  results.value = []
}

function clearSelection() {
  selectedVehicle.value = null
  model.value = null
  search.value = ''
}

function onClickOutside(e) {
  if (el.value && !el.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="el" class="vs-wrap">
    <label class="vs-label">
      <span class="vs-label-text">Vehicle <span class="vs-optional">(optional)</span></span>
    </label>

    <!-- Selected -->
    <div v-if="selectedVehicle" class="vs-selected input-glass">
      <span class="vs-selected-name">{{ selectedVehicle.manufacturer }} {{ selectedVehicle.name }}</span>
      <button class="vs-clear" @click="clearSelection">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div v-else class="vs-input-wrap">
      <input
        v-model="search"
        type="text"
        class="vs-input input-glass"
        placeholder="Search vehicles..."
        @focus="open = true"
      />
      <svg v-if="searching" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="vs-spinner">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>

    <!-- Dropdown -->
    <div v-if="open && results.length > 0" class="vs-dropdown liquid-panel">
      <button
        v-for="v in results" :key="v.id"
        class="vs-option"
        @click="select(v)"
      >
        <span class="vs-option-name">{{ v.name }}</span>
        <span class="vs-option-mfr">{{ v.manufacturer }}</span>
      </button>
    </div>

    <div v-else-if="open && search && !searching && results.length === 0" class="vs-dropdown liquid-panel">
      <span class="vs-no-results">No vehicles found</span>
    </div>
  </div>
</template>

<style scoped>
.vs-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.vs-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vs-label-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vs-optional {
  font-weight: 500;
  color: #8b95a1;
  text-transform: none;
}

/* Selected */
.vs-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.vs-selected-name {
  color: #0f1720;
  font-weight: 550;
}

.vs-clear {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b95a1;
  cursor: pointer;
  background: transparent;
  border: none;
  flex-shrink: 0;
}

.vs-clear:hover {
  color: #b85b5b;
  background: rgba(184, 91, 91, 0.06);
}

/* Input */
.vs-input-wrap {
  position: relative;
}

.vs-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #2d3748;
  font-family: inherit;
  width: 100%;
}

.vs-spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #8b95a1;
  animation: vs-spin 0.9s linear infinite;
}

@keyframes vs-spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

/* Dropdown */
.vs-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 210;
  margin-top: 4px;
  padding: 4px;
  border-radius: 14px;
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.vs-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.1s ease;
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
  width: 100%;
}

.vs-option:hover {
  background: rgba(255, 255, 255, 0.22);
}

.vs-option-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #0f1720;
}

.vs-option-mfr {
  font-size: 0.65rem;
  font-weight: 500;
  color: #7b8ea0;
}

.vs-no-results {
  padding: 12px;
  text-align: center;
  font-size: 0.78rem;
  color: #7b8ea0;
  font-weight: 500;
}
</style>
