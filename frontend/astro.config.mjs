import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: false,
    imagesConfig: false
  }),
  site: 'https://blockstories.com',
  srcDir: './src',
  publicDir: './public',
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});
