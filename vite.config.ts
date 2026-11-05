import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import {
  layerwise,
  layerwiseEmailWorker,
  layerwiseStorageWorker
} from '@layerwise/vite';

export default defineConfig({
  server: {
    host: process.env.HOSTNAME || '127.0.0.1',
    watch: {
      ignored: [
        '**/.layerwise/**',
        '**/.local/**',
        '**/.tanstack/**',
        '**/.wrangler/**',
        '**/dist/**'
      ]
    }
  },
  environments: {
    // The database is first imported by the form's server function. Bundling
    // drizzle up front keeps Vite from re-optimizing (and reloading React)
    // in the middle of the first submission during development.
    ssr: {
      optimizeDeps: {
        include: ['drizzle-orm', 'drizzle-orm/d1', 'drizzle-orm/sqlite-core']
      }
    }
  },
  resolve: {
    alias: {
      '@tanstack/start': '@tanstack/react-start'
    },
    tsconfigPaths: true
  },
  plugins: [
    layerwise(),
    tailwindcss(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      auxiliaryWorkers: [layerwiseStorageWorker(), layerwiseEmailWorker()]
    }),
    tanstackStart(),
    viteReact()
  ]
});
