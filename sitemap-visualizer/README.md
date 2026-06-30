# Sitemap Inspector

A browser-based toolkit for exploring a large website's information architecture from a Slickplan sitemap export, without scrolling through a flat tree. Upload a CSV, get eight different views of the same hierarchy, and switch between them with a click. Nothing is uploaded anywhere — the CSV is parsed entirely in your browser.

**Live use:** open `index.html` via a local server (see *Running it* below) or host the folder on GitHub Pages. It loads a bundled sample sitemap (`data/sample-sitemap.csv`) on first load; use **upload CSV** in the top bar to load your own export.

---

## Why this exists

A flat indented tree (what Slickplan and most sitemap tools show by default) works fine for a hundred pages. It stops working once a site has thousands — you spend more time scrolling and collapsing than thinking. This tool exists to answer three specific questions that a flat tree answers badly at scale:

- **What does the current IA actually look like, overall, without scrolling?** → Treemap, Sunburst, Circle pack.
- **Does the current IA match how the content is actually about?** → Themes view, compared against Outline/Tree.
- **Where is the structure obviously broken — duplicates, test pages, orphaned campaign pages?** → the flag check toggle, visible in every view.

## What it expects as input

A Slickplan CSV sitemap export (semicolon-delimited, the Slickplan default). At minimum it needs: `id`, `parent_id`, `name`, `level`, `order`. It also reads `numbering`, `url_slug`, `page_type`, and `content_status` if present. If your CSV uses commas instead of semicolons the parser auto-detects the delimiter, so other tools' exports will likely work too as long as the column names match.

---

## The eight views

### 01 — Outline
The plain indented list, but collapsible and searchable. This is the view every other visualisation is checked against — if a different view shows something surprising, come back here to confirm what's actually in the data. Click a row's name to inspect it in the readout bar; click the ▾/▸ to fold a branch.

### 02 — Tree
A node-link diagram (the shape people usually mean by "site tree"). To stay usable at scale, every top-level section starts **collapsed** — you see all ~100+ sections as a single screen, and drill into one by clicking it. Search expands the path to any match automatically. There's no virtual scrolling limit here, so very deep branches (this sample goes 7 levels deep) just keep extending rightward; the view scrolls.

### 03 — Sunburst
The same hierarchy as a set of concentric rings — depth = distance from the centre. This is the fastest way to see *where the structure is unusually deep* (a thin ring reaching far out from a small section) versus *where it's unusually broad* (a section with many same-depth children, shown as many slices in one ring). Click a slice to zoom into that branch; click the centre circle to zoom back out.

### 04 — Treemap
Tile area = number of pages in that branch. This is the single best "whole site on one screen" view — bloated sections are obvious immediately because they're visibly bigger tiles, with no scrolling required even at 1,000+ pages. Shows two levels at a time (a section and its immediate children); click a tile to drill into it, use the breadcrumb at the top to climb back out.

### 05 — Circle pack
The same nesting as the Treemap, but as packed circles instead of rectangles. Some people read circular nesting more intuitively than rectangular tiling, especially for spotting "one branch is much bigger than its siblings." Click a circle to zoom in, click empty space to zoom out.

### 06 — Themes
This is the odd one out, and the one built specifically for IA-redesign conversations. It throws away the current navigation structure and **regroups every page by a keyword detected in its name/URL slug** (see *How theme detection works* below). The point isn't that this clustering is "more correct" than the real IA — it's a second opinion you can compare against the first five views. Hover a page here, then check the readout bar: it always shows that page's *real, current* breadcrumb. If a topic's pages are scattered across several theme bubbles while sitting together in one IA branch (or the reverse — one theme bubble pulling together pages that are currently scattered across five different sections) that's worth a conversation.

### 07 — 3D graph
A force-directed network in navigable 3D space (drag to orbit, scroll to zoom, click a node to fly to it). Functionally similar information to the Tree view, but nodes are free to spread out in 3D rather than being constrained to a fixed layout, which can make it easier to get an intuitive sense of a large, messy graph at a glance. This is the most exploratory of the eight — it's genuinely fun to fly around, but for precise structural reading the 2D views are more reliable.

### 08 — 3D city
Each top-level section is a ground plot; each of its child pages is a tower, height = how many pages sit beneath that child. Plot colour reflects the section's own dominant theme; tower colour reflects the individual page's theme, or the flag colour if it's been flagged. This is the most stakeholder-friendly view in the set — "this district is clearly overbuilt" reads instantly to someone who doesn't normally look at sitemaps. **It's illustrative, not exhaustive**: very large sections show their 24 biggest children with a "+N more" marker rather than every descendant, since rendering thousands of individual towers per district would be unreadable and slow. Use the Treemap or Outline for the exact count.

---

## How theme detection works

Deliberately simple and auditable, since this view exists to support a discussion, not to replace it:

1. Every page's name and URL slug is tokenised into words, common stopwords removed (the, of, your, page, home, 2025…).
2. The 20 most frequent remaining words across the whole site become "theme seeds" (a word has to appear at least 3 times to qualify).
3. Each page is assigned the highest-ranked seed word found in its own name/slug. If none matches, it inherits the seed found in its nearest ancestor's name/slug. If still nothing matches, it's labelled **other**.

This means themes are literally just "common words in your page names," which is intentional — it's transparent and a domain expert can immediately sanity-check it, unlike a black-box clustering model. It also means the **other** bucket can be large on sites with very generic or inconsistent naming; if that bucket feels too big, it's a sign the page names themselves carry too little topical information, which is itself a useful finding.

## How flagging works

Every view can highlight pages worth a second look (toggle with **flag check** in the top bar). A page is flagged if any of these are true:

- **isError** — name contains "error", "403", "404", "500".
- **isClone** — name starts with "clone of" or contains "clone" (duplicated-but-unedited pages).
- **isTest** — name contains "test", "dev", "trigger", "sandbox", "temp", "demo".
- **isDuplicateSlug** — its URL slug is identical (case-insensitively) to another page's slug elsewhere in the site. This is how the tool catches things like `Clearing` and `clearing` existing as two separate sitemap entries with the same effective URL, or the same "thank-you" confirmation slug being reused across unrelated campaign flows.

Flags are additive signals, not a verdict — a flagged page might be entirely intentional (e.g. a deliberately reused thank-you template). The point is surfacing it for a human to decide, not auto-removing it.

---

## Running it

Open `index.html` directly from disk and the sample data **won't load** — browsers block `fetch()` of local files over `file://` for security reasons. Two easy options:

```bash
# from inside this folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

or push the folder to a GitHub repository and enable **Settings → Pages** on it — GitHub Pages serves everything over `https://`, so fetch works with no further setup. Uploading your own CSV via the **upload CSV** button works either way, since that reads the file directly rather than fetching it.

## What's deliberately not included (yet)

A few visualisation styles came up in scoping and were left out of this first pass because they're close variants of something already here, with limited extra analytical value for the effort:

- **Voronoi treemap** — an organic-looking variant of the rectangular Treemap. Prettier, harder to read precisely; the Treemap already covers the "whole site, sized by branch" job.
- **Edge-bundled network** — useful once you have real *cross-links* between pages (not just parent/child), which a Slickplan export doesn't capture. Worth adding if you start exporting actual in-page links.
- **First-person walkable 3D** — the orbit-camera City view already gives the spatial/stakeholder-friendly read; a walkable version is a bigger build for a smaller analytical gain.

Happy to add any of these if they turn out to matter once you're actually using the other eight.

## Known limitations of this first pass

- The 3D City view caps each district at 24 visible towers for performance/legibility; very large sections are summarised with a "+N more" label rather than fully rendered.
- Theme detection is name/slug-based only — it has no access to actual page content, so it's a proxy for topic, not a reading of it.
- Search highlights matches but doesn't fly the camera to them in the 3D views; use Outline or Tree to locate something precisely, then cross-check it visually elsewhere.
- Tested against the bundled ~1,300-page sample; very large sites (tens of thousands of pages) will likely need the 3D City and Themes views' rendering caps raised or lowered depending on your hardware.
