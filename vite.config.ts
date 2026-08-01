import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Repo name on GitHub: PhamMinhTien05102001/old-but-got
const BASE = '/old-but-got/'
const BASE_NO_SLASH = BASE.replace(/\/$/, '')

/** `/old-but-got` (no slash) does not match Vite base `/old-but-got/` — redirect before 404. */
function redirectBareBase(): Plugin {
  const mount = (server: ViteDevServer | PreviewServer) => {
    const handler: Connect.NextHandleFunction = (req, res, next) => {
      const raw = req.url
      if (!raw) return next()
      const q = raw.indexOf('?')
      const pathname = q === -1 ? raw : raw.slice(0, q)
      if (pathname !== BASE_NO_SLASH) return next()
      const search = q === -1 ? '' : raw.slice(q)
      res.statusCode = 301
      res.setHeader('Location', `${BASE}${search}`)
      res.end()
    }
    server.middlewares.use(handler)
  }

  return {
    name: 'redirect-bare-base',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), redirectBareBase()],
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
    },
  },
})
