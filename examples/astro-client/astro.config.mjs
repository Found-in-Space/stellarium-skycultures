import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  vite: {
    optimizeDeps: {
      exclude: [
        '@found-in-space/stellarium-skycultures-western',
        '@found-in-space/stellarium-skycultures-western/bundled',
      ],
    },
  },
});
