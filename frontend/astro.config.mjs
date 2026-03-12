import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://blockstories.com',
  srcDir: './src',
  outDir: '../dist',
  publicDir: '../public',
});
