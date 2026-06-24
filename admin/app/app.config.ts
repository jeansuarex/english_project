import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  ssr: false,
  router: {
    routeFileRegex: '\\.(tsx|ts)$',
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});