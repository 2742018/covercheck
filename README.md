# CoverCheck

CoverCheck helps musicians and design students verify that an album cover’s key information, especially **title and artist text**, stays legible and visually effective under real streaming conditions such as **tiny thumbnails**, **square crops**, and **UI overlays**.

Rather than treating album art as a static full-size image, CoverCheck focuses on the part most likely to fail in actual listening contexts: the **title / artist region**. It then highlights common risks such as **low contrast**, **busy texture behind text**, and **unsafe edge placement**, and turns them into practical, explainable suggestions.

✅ **Privacy-first:** everything runs locally in your browser  
✅ **No server uploads:** images are not sent to a backend or stored

---

## Why CoverCheck exists

Album covers are often designed and reviewed at a size much larger than the one listeners actually see. On streaming platforms, artwork is frequently reduced, cropped into squares, surrounded by interface elements, and shown alongside many competing covers at once.

This creates a gap between how artwork looks during the design process and how it performs in public release contexts. CoverCheck is designed to help bridge that gap with clearer, more explainable visual evaluation.

---

## What the tool supports

- Checking whether **title and artist text** still works at small sizes
- Identifying visual risks such as **low contrast**, **background clutter**, and **edge placement**
- Comparing alternate cover directions before release
- Supporting design decisions with clearer visual evidence
- Documenting iteration and evaluation in academic work

---

## Core workflow

### 1) CoverCheck (Homepage)
- Browse sample covers or upload your own
- Start quickly from an example or jump straight into analysis

### 2) Analyze
- Draw a region on the cover, usually the **title / artist area**
- Evaluate how that region performs under thumbnail-style viewing conditions
- Switch between **Crop View** and **Full View**
- Receive readable, explainable suggestions for improvement

### 3) Report
- Generate a clean summary of the current analysis
- Useful for screenshots, evaluation logs, portfolio notes, or supporting evidence

---

## Supporting pages

- **Test**  
  Explores design preferences and trade-offs so visual direction can be discussed alongside readability.

- **Match**  
  Checks whether a cover’s visual direction supports a chosen music identity or mood direction.

- **Mockups**  
  Places a cover into more realistic streaming contexts to test whether it still reads at a glance.

- **Compare**  
  Compares two covers or revisions side-by-side for iteration, reflection, and final selection.

- **Methods & References**  
  Collects the academic and research support behind the project without overloading the main interface.

---

## Project principles

### Readable under pressure
CoverCheck is designed around the conditions where album covers often struggle most: reduced size, cropping, corner rounding, and visual competition.

### Explainable, not mysterious
The goal is not just to score an image, but to show what is failing and why a suggested change might help.

### Built for real music contexts
The project focuses on how cover art performs inside streaming environments, not only how it looks as a full-size standalone image.

---

## Metrics and checks

### Contrast
Estimates how clearly text can separate from its background in the selected region.

**Typical reference target:**  
- ≥ 4.5 for smaller text  
- ≥ 3.0 for larger or bolder text

### Clutter
Estimates how visually busy the background is behind text. Even acceptable contrast can fail when detail competes with letterforms.

**Typical working target:**  
- ≥ 60/100 for more reliable small-thumbnail readability

### Safe area
Flags when important content sits too close to the edges, where crops, rounded corners, or overlays may interfere.

**Typical working target:**  
- ≥ 95/100 for safer text placement

### Colour palette
Extracts key colours from the image and suggests compatible directions for overlays, text, accents, and highlight tones.

---

## Typical use

1. Upload a cover or choose a sample
2. Start in **Crop View** to mimic streaming thumbnail conditions
3. Draw a region over the title / artist area
4. Review the checks and suggestions
5. Refine the design and generate a **Report**
6. Use other tools such as **Mockups** or **Compare** if needed for extra evaluation

> **Privacy note:** CoverCheck processes artwork in the browser and does not upload images to a server.

---

## Academic relevance

CoverCheck is intended not only as a design tool, but also as a reflective and evaluative artifact. It supports academic documentation by making visual judgments easier to describe, compare, and justify.

This makes it suitable for:
- portfolios and supporting evidence
- interface and interaction design reflection
- visual communication evaluation
- documenting before/after design changes

---

## Tech stack

- React
- TypeScript
- Vite
- HTML Canvas for image analysis and overlays
- GitHub Pages deployment

---

## Development notes

- Runs fully client-side
- No account system
- No backend storage
- Suitable for GitHub Pages / hash-routing deployment