# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm run dev      # Start dev server with HMR
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

## Architecture

- **Vue 3 + Vite** project using `<script setup>` SFCs and ES modules (`"type": "module"`).
- Entry point: `src/main.js` mounts `src/App.vue` to `#app` in `index.html`.
- Components live in `src/components/`. Global styles in `src/style.css`.
- Static assets served from `public/`; imported assets (via `import` in components) live in `src/assets/`.
- No router, state management, or testing framework is configured yet.
