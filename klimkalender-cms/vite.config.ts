import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from "vite-plugin-svgr";



import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    svgr(),
  ],
  // base: '/klimkalender-cms/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
