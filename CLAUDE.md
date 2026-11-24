# No Nê Kitchen & Bar website

## Project

- Website for No Nê Kitchen & Bar, a Hanoi-style Vietnamese restaurant at 867 Denman Street, Vancouver.
- Concept: bao cấp-era nostalgia, archival and editorial style, warm aged paper.
- Static site: HTML, CSS and JavaScript, with GSAP + ScrollTrigger and Lenis loaded from a CDN. No frameworks, no build tools. Previewed with VS Code Live Server.
- Menu data: `assets/data/menu.json` is the single source of truth for all items, prices and statuses (`available`, `weekend-evening`, `paused`, `coming-soon`). Never invent or change items or prices.

## Rules

- **Comments:** short and plain only, for example `/* Header navigation */` or `<!-- Footer -->`. Never use decorative separator lines made of =, -, *, # or similar, and no banner or boxed comments.
- **Name:** always write the restaurant name as "No Nê", with a capital N in both words.
- **English first:** headings, descriptions, labels and buttons are in English. Vietnamese is used for dish names and decorative taglines, always with an English equivalent and `lang="vi"`.
- **Colours:** use the CSS variables in `css/base.css`:
  - primary `#005557`
  - primary-light `#00686A`
  - accent red `#C12026`, for small details only
  - mustard, cream and ink
  - Red covers about 5% of a page at most.
- **Fonts:** Playfair Display for italic headings, Be Vietnam Pro for body text.
- **Finished pages:** the desktop design of Home and Menu is final. Put mobile changes inside mobile media queries only, and never change desktop or tablet styles.
- **Shared components:** reuse them on every page:
  - header, transparent over a full-screen hero on the home page only
  - mobile overlay menu
  - reservation popup, phone booking only: (604) 632-0022
  - mobile-only sticky "Call to Reserve" bar, which hides on scroll down and shows on scroll up
  - footer with the mascot peek and the three-language speech bubble
- **Accessibility:**
  - semantic HTML and alt text
  - keyboard focus and aria attributes
  - content visible without JavaScript
  - respect `prefers-reduced-motion`
- **Indexing:** do not add `noindex` or `nofollow`. The only exception is `404.html`.

## SEO

- **Domain:** the base URL is `https://example.com`, a temporary placeholder kept as this one exact string. It appears in the canonical, Open Graph and Twitter tags, the JSON-LD, `robots.txt` and `sitemap.xml`. Before publishing, find and replace `https://example.com` with the real domain in every file.
- **Sitemap:** every new page must be added to `sitemap.xml` with its full URL and a `lastmod` date.
- **Head tags:** every page has a unique title ending in "No Nê Kitchen & Bar", a 140 to 160 character description, a canonical URL, theme-color, Open Graph and Twitter tags using `assets/images/og-image.jpg`, and a BreadcrumbList in its JSON-LD.
- **Menu structured data:** the JSON-LD in `menu.html` is a copy of `assets/data/menu.json` (available and weekend-evening items only). Update it whenever menu items or prices change.
- **Opening hours:** they live in `HOURS` in `js/main.js`, in the plain HTML fallback text on each page and in the Restaurant JSON-LD in `index.html`. Change all three together.
