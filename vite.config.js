import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gscVerification = env.VITE_GSC_VERIFICATION || ''

  return {
    plugins: [vue()],
    transformIndexHtml(html) {
      if (!gscVerification) return html
      return html.replace(
        '</head>',
        `  <meta name="google-site-verification" content="${gscVerification}" />\n  </head>`
      )
    },
    build: {
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@supabase')) return 'supabase'
          },
        },
      },
    },
  }
})
