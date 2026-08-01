import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy/hkn': {
        target: 'https://hoakimnguyen.com',
        changeOrigin: true,
        rewrite: () => '/tra-cuu-gia-vang/',
      },
      '/proxy/kkvh': {
        target: 'https://kimkhanhviethung.vn',
        changeOrigin: true,
        rewrite: () => '/tra-cuu-gia-vang.html',
      },
      '/proxy/sjc-csv': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: () => '/vkhuy/SJC-price/main/docs/data/sjc_final.csv',
      },
    },
  },
  preview: {
    proxy: {
      '/proxy/hkn': {
        target: 'https://hoakimnguyen.com',
        changeOrigin: true,
        rewrite: () => '/tra-cuu-gia-vang/',
      },
      '/proxy/kkvh': {
        target: 'https://kimkhanhviethung.vn',
        changeOrigin: true,
        rewrite: () => '/tra-cuu-gia-vang.html',
      },
      '/proxy/sjc-csv': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: () => '/vkhuy/SJC-price/main/docs/data/sjc_final.csv',
      },
    },
  },
})
