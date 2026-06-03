import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: 'src/client',
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/client/index.html'),
    },
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src/client') },
  },
  server: {
    port: 3334,
    proxy: {
      '/api': 'http://localhost:3333',
      '/socket.io': { target: 'http://localhost:3333', ws: true },
    },
  },
})
