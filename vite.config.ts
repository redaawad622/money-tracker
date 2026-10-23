import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Relative asset paths so the build loads inside the Capacitor WebView
  base: './',
})
