# CoverCheck

CoverCheck is a **privacy-first album cover readability tool** that helps you verify whether your **title/artist area** stays legible when platforms display artwork as **small, square thumbnails** (often with crop/rounded corners/overlay UI).

Everything runs **entirely in the browser** — no server uploads.

---

## Features

- **Crop Preview (Square Thumbnails)**  
  Simulates the most common “streaming-style” square crop.

- **Full View (Contain)**  
  Inspect the full cover without cropping.

- **Region Analysis**  
  Draw a region around your title/artist area to evaluate readability where it matters most.

- **Explainable Metrics**
  - **Contrast**: estimates separation between text and background in your selected region  
  - **Clutter**: estimates background “busyness” (edge density) that can reduce readability  
  - **Safe Area**: warns when important content sits too close to edges (crop/rounded-corner/overlay risk)

- **Color Palette + Compatible Suggestions**  
  Extracts key colors from the image and suggests compatible options (useful for overlays, type, labels, UI accents).

- **Report Generation**  
  Generates a clean summary based on the current analysis for documentation / write-ups.

---

## How it works

1. Upload an album cover (local file)
2. Use **Crop View** (default) to see how it will appear as a square thumbnail
3. Draw a region around the title/artist area
4. Review metrics + suggestions
5. Generate a report when ready

> **Privacy note:** Images stay local in your browser. CoverCheck does not upload your artwork to a server.

---

## Tech used in building the website

- React + TypeScript
- Vite
- HTML Canvas (for pixel analysis + overlays)
- GitHub Pages-friendly build

---