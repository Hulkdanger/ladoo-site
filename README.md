# Ladoo marketing website

Static site, no build step, no dependencies, no external requests (fonts are self-hosted).

## Structure

- `index.html`, landing page
- `privacy/index.html`, `terms/index.html`, legal pages (content pulled from the published GitHub Pages policies on Jul 16 2026)
- `assets/`, CSS, JS, images, self-hosted woff2 fonts
- `404.html`, `robots.txt`, `sitemap.xml`

## Preview locally

```
cd website && python3 -m http.server 8123
```

Then open http://127.0.0.1:8123/

## Deploy

Any static host works (GitHub Pages, Cloudflare Pages, Netlify). For GitHub Pages: push this folder as a repo (or subtree) and enable Pages on the root.

## Live domain

https://ladoo.net (GitHub Pages, CNAME file in repo root). Canonicals, og:url, sitemap, and robots all point there.

## Remaining notes

1. The published privacy policy and terms name "Yuvraj Dhamija, an individual developer" as the operator while the site footer says Ladoo Punjabi LLC. Align these when the LLC paperwork settles, then re-pull the legal pages.
2. Consider serving real CSP headers at the host level (the meta tag version is already in every page).
3. After DNS resolves, submit https://ladoo.net/sitemap.xml in Google Search Console and Bing Webmaster Tools.
