import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: 'https://blockstories.com',
  srcDir: './src',
  outDir: '../dist',
  publicDir: '../public',
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});
