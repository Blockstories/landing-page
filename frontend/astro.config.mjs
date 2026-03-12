import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  site: 'https://blockstories.com',
  srcDir: './src',
  outDir: '../dist',
  publicDir: '../public',
});
