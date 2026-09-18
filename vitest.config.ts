import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // tsconfig.json heeft `jsx: "preserve"` (Next transformeert zelf met SWC), maar
  // vite/esbuild laat JSX dan staan en struikelt erover zodra een test een .tsx
  // importeert. Hier expliciet de automatische runtime — raakt alleen vitest,
  // niet de Next-build. Nodig sinds components/WaardebepalingPdfTemplate.test.ts.
  oxc: { jsx: { runtime: 'automatic' } },
})
