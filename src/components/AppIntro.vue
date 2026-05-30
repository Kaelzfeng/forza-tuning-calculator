<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const STORAGE_KEY = 'forza_tune_intro_seen'

const visible = ref(false)
const exiting = ref(false)

let exitTimer = null

function skip() {
  if (exiting.value) return
  exiting.value = true
  exitTimer = setTimeout(() => {
    visible.value = false
  }, 400)
}

function onKeydown(e) {
  if (e.key === 'Escape') skip()
}

function onVideoEnded() {
  skip()
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  if (sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.setItem(STORAGE_KEY, 'true')

  visible.value = true
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(exitTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="intro-overlay"
      :class="{ exiting }"
      @click="skip"
    >
      <video
        ref="videoEl"
        class="intro-video"
        src="/logo_cartoon.mp4"
        autoplay
        muted
        playsinline
        @ended="onVideoEnded"
      />

      <button class="skip-btn liquid-glass" @click.stop="skip">
        Skip &rarr;
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 400ms ease;
}

.intro-overlay.exiting {
  opacity: 0;
  pointer-events: none;
}

.intro-video {
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  display: block;
}

.skip-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 100000;
  padding: 8px 20px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  font-family: inherit;
  transition: background 200ms ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.skip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
