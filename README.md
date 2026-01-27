# CoverCheck

CoverCheck is an album cover **readability + presentation** tool built for how covers are actually seen on streaming platforms:
as **small, square thumbnails**—often **cropped**, **corner-rounded**, and partially covered by **UI overlays**.

The core idea is simple: select the part of the cover that must survive at tiny sizes (usually **title + artist**) and let CoverCheck
measure common failure modes—**low contrast**, **busy texture**, and **unsafe edge placement**—then turn the results into clear,
explainable fixes.

✅ **Privacy-first:** everything runs locally in your browser.  
✅ **No server uploads:** images are not sent to a backend.

---

## What you can do

### 1) Homepage (Play)
- Browse sample covers or upload your own.
- Quickly jump into analysis by selecting an image.

### 2) Analyze
- Draw a region on the cover (typically the title/artist area).
- Evaluate how well that region performs at tiny thumbnail sizes.
- Toggle **Crop View** (square thumbnails) and **Full View** (contain).
- Get readable, academic-friendly explanations of what’s failing and what to try next.

### 3) Report
- Generate a clean, shareable summary of the analysis.
- Useful for screenshots, evaluation logs, portfolio notes, or dissertation evidence.

### Supporting pages
- **Test**: produces a design profile by aggregating preferences and readability tradeoffs (contrast/clutter/safe-area risk).
- **Match**: checks whether the visual “feel” of a cover aligns with music direction (genre/mood cues → visual guidance).

---

## Explainable metrics (what they mean)

- **Contrast**  
  Estimates how clearly text separates from its background in your selected region.  
  **Target:** ≥ 4.5 (small text) • ≥ 3.0 (large/bold)

- **Clutter**  
  Estimates background “busyness” (edge/detail density). Even with good contrast, heavy texture competes with letterforms.  
  **Target:** ≥ 60/100 for reliable tiny-thumbnail readability

- **Safe Area**  
  Warns when important content sits too close to edges where crop/rounded-corner/UI overlays can clip it.  
  **Target:** ≥ 95/100 (keep critical text inside the guide)

- **Color Palette + Compatibility**  
  Extracts key colors from the image and provides compatible suggestions that help when choosing
  text colors, overlays, accents, and UI treatments.

---

## How it works (typical workflow)

1. Upload a cover (local file) or pick a sample from the Homepage
2. Start in **Crop View** to mimic streaming thumbnails
3. Draw a region over the title/artist area
4. Review the metrics + suggestions (change one thing at a time)
5. Generate a **Report** when ready

> **Privacy note:** CoverCheck does not upload your artwork to a server. Processing occurs in-browser.

---

## More cover-linked tools (ideas)

These extensions keep album cover design as the main focus while adding more music/design value:

- **Platform Mockups:** preview covers inside Spotify/Apple-style grids with UI overlays + rounded corners  
- **Typography Stress Test:** simulate title/artist text at 64/128/256px with adjustable weight/spacing  
- **Color Accessibility Simulator:** preview palettes under common color-vision deficiencies  
- **Audio → Art Brief:** translate tempo/energy/brightness into palette + type direction (mood-led guidance)  
- **Print-to-Digital Check:** compare “vinyl/poster” layouts vs streaming thumbnails and flag risky elements  
- **Genre Reference Map:** visual conventions per genre (palette/layout/type) used as guidance, not rules

---

## Tech stack

- React + TypeScript
- Vite
- HTML Canvas (pixel analysis + overlays)
- GitHub Pages deployment (hash routing friendly)
