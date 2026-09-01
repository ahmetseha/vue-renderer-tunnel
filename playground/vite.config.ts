import templateCompilerOptions from '@tresjs/core/template-compiler-options'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
})
