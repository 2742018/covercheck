# CoverCheck

CoverCheck is an album cover **readability + presentation** tool designed around how music artwork is actually seen today:
as **small, square thumbnails** in streaming grids, playlists, and “now playing” views—often **cropped**, **corner-rounded**,
and partially covered by **UI overlays**.

The core idea is simple: select the part of the cover that must survive at tiny sizes (usually **title + artist**) and let
CoverCheck measure common failure modes—**low contrast**, **busy texture behind letters**, and **unsafe edge placement**—then
translate the results into clear, explainable fixes.

✅ **Privacy-first:** everything runs locally in your browser  
✅ **No server uploads:** images are not sent to a backend or stored

---

## Pages & workflow

### 1) COVERCHECK (Homepage)
- Browse sample covers or upload your own.
- Click a tile to jump into analysis quickly.

### 2) Analyze
- Draw a region on the cover (typically the title/artist area).
- Evaluate how well that region performs at tiny thumbnail sizes.
- Toggle **Crop View** (square thumbnail simulation) and **Full View** (contain).
- Receive clear, academic-friendly explanations of what’s failing and what to try next.

### 3) Report
- Generate a clean, shareable summary of the current analysis.
- Useful for screenshots, evaluation logs, portfolio notes, or dissertation evidence.

### Supporting pages (music-linked, cover-first)
- **Mockups**: places your cover into realistic streaming contexts (grid / playlist row / now playing) and includes a
  **Genre Mood Lens** that compares your cover’s color mood (brightness / saturation / temperature) against common genre
  visual conventions (**guidance, not genre detection**).
- **Match**: checks whether a cover’s visual direction supports a chosen music identity (genre/mood direction → visual guidance).
  This focuses on **alignment**, not claiming to objectively classify a song.
- **Test**: produces a design profile based on preferences and tradeoffs, helping you discuss “style” alongside readability results.

---

## Explainable metrics (what they mean)

- **Contrast**  
  Estimates how clearly text separates from its background in your selected region.  
  **Target:** ≥ 4.5 (small text) • ≥ 3.0 (large/bold)

- **Clutter**  
  Estimates background “busyness” (edge/detail density). Heavy texture competes with letterforms.  
  **Target:** ≥ 60/100 for reliable tiny-thumbnail readability

- **Safe Area**  
  Warns when important content sits too close to edges where crop/rounded-corner/UI overlays can clip it.  
  **Target:** ≥ 95/100 (keep critical text inside the guide)

- **Color Palette + Compatibility**  
  Extracts key colors from the image and provides compatible suggestions for overlays, text, accents, and UI-safe highlights.

---

## Typical use (quick workflow)

1. Upload a cover (local file) or pick a sample from **Play**
2. Start in **Crop View** to mimic streaming thumbnails
3. Draw a region over the title/artist area
4. Review metrics + suggestions (change one thing at a time)
5. Generate a **Report** when ready

> **Privacy note:** CoverCheck does not upload your artwork to a server. Processing occurs in-browser.

---

## Tech stack

- React + TypeScript
- Vite
- HTML Canvas (pixel analysis + overlays)
- GitHub Pages deployment (hash routing friendly)
