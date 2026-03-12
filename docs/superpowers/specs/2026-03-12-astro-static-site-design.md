# Design: Astro Static Site for Blockstories

**Date:** 2026-03-12
**Goal:** Convert existing static HTML files to Astro while preserving design fidelity 100%.

## Summary

Transform three static HTML files (`home.html`, `news.html`, `briefings.html`) into an Astro static site. No backend connection—content remains as mock data exactly as it exists now.

## Architecture

**Framework:** Astro 5.x
**Rendering:** Static (no SSR needed for this phase)
**Hosting:** Vercel (static adapter)

## File Structure

```
/src/
  /pages/
    index.astro      # home.html with preserved markup
    news.astro       # news.html with preserved markup
    briefings.astro  # briefings.html with preserved markup
  /layouts/
    Layout.astro     # Shared: fonts, meta, CSS reset, global styles
  /styles/
    global.css       # CSS custom properties from HTML files
/astro.config.mjs
/package.json (updated)
```

## Design Preservation Requirements

### CSS (CRITICAL)
- Copy ALL CSS custom properties verbatim from HTML files
- Preserve exact values: `--sp-xl: 56px`, `--accent: #5A8A86`, etc.
- Preserve font stacks: `Playfair Display`, `Source Serif 4`, `DM Sans`, `JetBrains Mono`
- Do NOT add Tailwind or any utility classes
- Do NOT modify spacing, colors, or typography

### HTML Structure
- Copy DOM hierarchy exactly as-is
- Preserve all class names
- Preserve all inline styles where they exist
- Keep all mock article data, images, text exactly as-is

### JavaScript
- Preserve all vanilla JS: city clocks, tab filtering, scroll animations
- Move inline scripts to `<script>` tags in Astro files
- Keep IntersectionObserver logic, scroll handlers, etc.

## Components to Create

### Layout.astro
- Shared `<head>` with all Google Fonts preconnect/links
- Imports global.css
- Basic HTML structure: `<!DOCTYPE html>`, `<html lang="de">`
- `<slot />` for page content

### Page Files (index.astro, news.astro, briefings.astro)
- Use Layout.astro as wrapper
- Copy body content from corresponding HTML file
- Inline styles move to `<style>` block or global.css
- Inline scripts move to `<script>` block

## Out of Scope

- No API routes
- No database connections
- No dynamic content injection
- No webhooks
- No backend integration of any kind

## Success Criteria

1. All three pages render visually identical to current HTML files
2. CSS custom properties work exactly as before
3. All interactive features (clocks, tabs, scroll animations) function
4. Site builds and deploys to Vercel
5. No visual regression from original HTML files
