<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const STORAGE_KEY = 'forza_tune_intro_seen'
const HOLD_AFTER_ENDED_MS = 4000
const PLAY_START_TIMEOUT_MS = 5000

const visible = ref(false)
const exiting = ref(false)
const videoStarted = ref(false)

let exitTimer = null
let holdTimer = null
let startTimeout = null

function close() {
  if (exiting.value) return
  exiting.value = true
  clearTimeout(holdTimer)
  clearTimeout(startTimeout)
  exitTimer = setTimeout(() => {
    visible.value = false
  }, 400)
}

function skip() {
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') skip()
}

function onVideoPlaying() {
  videoStarted.value = true
  clearTimeout(startTimeout)
}

function onVideoEnded() {
  // Video reached the end — hold last frame for 4s, then close
  holdTimer = setTimeout(close, HOLD_AFTER_ENDED_MS)
}

function onVideoError() {
  // Video failed — close immediately
  close()
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return
  if (sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.setItem(STORAGE_KEY, 'true')

  visible.value = true
  window.addEventListener('keydown', onKeydown)

  // Safety: if video never starts playing within 5s, close
  startTimeout = setTimeout(() => {
    if (!videoStarted.value) close()
  }, PLAY_START_TIMEOUT_MS)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(exitTimer)
  clearTimeout(holdTimer)
  clearTimeout(startTimeout)
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
        @playing="onVideoPlaying"
        @ended="onVideoEnded"
        @error="onVideoError"
      />

      <button class="skip-btn" @click.stop="skip">
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
