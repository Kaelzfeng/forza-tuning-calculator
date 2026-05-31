<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { useFavorites } from '../composables/useFavorites.js'

defineProps({
  vehicle: { type: Object, required: true },
  tuneCount: { type: Number, default: 0 },
})

const { user } = useAuth()
const { isFavorite, toggleFavorite } = useFavorites()

const favToggling = ref(new Set())

async function handleToggleFav(e, vehicleId) {
  e.preventDefault()
  e.stopPropagation()
  if (!vehicleId) return
  favToggling.value.add(vehicleId)
  try {
    await toggleFavorite(vehicleId)
  } catch {
    // not logged in — ignore
  } finally {
    favToggling.value.delete(vehicleId)
  }
}

const classColors = {
  D: '#7b9eb3', C: '#6ba368', B: '#5b8cb8', A: '#c2784a',
  S1: '#b85b5b', S2: '#8b5bb8', X: '#c2a84a',
}
</script>

<template>
  <router-link :to="`/vehicles/${vehicle.slug}`" class="vehicle-card liquid-card">
    <div v-if="vehicle.thumbnail_url || vehicle.image_url" class="vc-thumb">
      <img
        :src="vehicle.thumbnail_url || vehicle.image_url"
        :alt="vehicle.name"
        class="vc-img"
        loading="lazy"
      />
    </div>

    <button
      v-if="user"
      :class="['vc-fav-btn', { 'vc-fav-active': isFavorite(vehicle.id) }]"
      :disabled="favToggling.has(vehicle.id)"
      :title="isFavorite(vehicle.id) ? 'Remove from favorites' : 'Add to favorites'"
      @click="(e) => handleToggleFav(e, vehicle.id)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" :fill="isFavorite(vehicle.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>

    <div class="vc-body">
      <span class="vc-manufacturer">{{ vehicle.manufacturer }}</span>
      <h3 class="vc-name">{{ vehicle.name }}</h3>

      <div class="vc-tags">
        <span v-if="vehicle.drivetrain" class="vc-tag">{{ vehicle.drivetrain }}</span>
        <span v-if="vehicle.class" class="vc-tag" :style="{ color: classColors[vehicle.class] || '#222222' }">{{ vehicle.class }}</span>
        <span v-if="vehicle.year" class="vc-tag">{{ vehicle.year }}</span>
      </div>

      <div class="vc-stats">
        <span v-if="vehicle.horsepower">{{ vehicle.horsepower }} HP</span>
        <span v-if="vehicle.weight" class="vc-dot">&middot;</span>
        <span v-if="vehicle.weight">{{ vehicle.weight }} kg</span>
      </div>

      <div class="vc-tune-count">
        <span v-if="tuneCount > 0">{{ tuneCount }} tune{{ tuneCount !== 1 ? 's' : '' }}</span>
        <span v-else class="vc-no-tunes">No tunes yet</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.vehicle-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 18px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  /* Solid background for readability on bright BG image */
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid rgba(180, 190, 200, 0.40);
  box-shadow: 0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.55);
}

.vc-fav-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.36);
  backdrop-filter: blur(10px) saturate(160%);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.50),
    0 2px 8px rgba(0, 0, 0, 0.06);
  color: #333333;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  z-index: 2;
}

.vc-fav-btn:hover:not(:disabled) {
  color: #b85b5b;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.vc-fav-active {
  color: #b85b5b;
}

.vc-fav-btn:disabled {
  opacity: 0.5;
  cursor: default;
  transform: none;
}

/* ── Thumbnail ── */
.vc-thumb {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.40),
    0 2px 8px rgba(0, 0, 0, 0.04);
}

.vc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Body ── */
.vc-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.vc-manufacturer {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vc-name {
  font-size: 0.88rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
  line-height: 1.2;
}

.vc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.vc-tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.40);
}

.vc-stats {
  font-size: 0.68rem;
  font-weight: 520;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 4px;
}

.vc-dot { color: #9ca3af; }

.vc-tune-count {
  font-size: 0.65rem;
  font-weight: 550;
  color: #4a6b85;
}

.vc-no-tunes {
  color: #4b5563;
}

@media (max-width: 640px) {
  .vehicle-card {
    padding: 14px;
    gap: 12px;
    border-radius: 16px;
  }

  .vc-thumb {
    width: 64px;
    height: 64px;
    border-radius: 12px;
  }

  .vc-name {
    font-size: 0.82rem;
  }
}
</style>
