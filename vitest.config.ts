import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Tests run on a deliberately minimal plugin stack. The app's vite.config.ts
// loads tanstackStart()/nitro(), which apply the React Server Components
// "react-server" export condition — under that condition client hooks resolve
// a build whose dispatcher is null, so any useRef/useState component throws
// "Cannot read properties of null". Keeping only React + path resolution here
// gives the component-under-test and the test renderer one client React.
export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    viteReact(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
})
