import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Layers3,
  Printer,
  Search,
  X,
} from "lucide-react";

type EvidenceKind =
  | "standard"
  | "official"
  | "peer-reviewed"
  | "industry"
  | "essay"
  | "thesis";

type EvidenceItem = {
  id: string;
  title: string;
  source: string;
  year: string;
  kind: EvidenceKind;
  href: string;
  summary: string;
  whyItMatters: string;
  supports: string[];
  reportText?: string;
  tooltipText?: string;
  tags: string[];
  openAccess?: boolean;
  featured?: boolean;
};

type EvidenceSection = {
  id: string;
  title: string;
  intro: string;
  reportUse: string;
  tooltipUse: string;
  refs: EvidenceItem[];
};

const SECTIONS: EvidenceSection[] = [
  {
    id: "readability",
    title: "Readability, contrast, and text over art",
    intro:
      "Foundational support for checking contrast, image-background interference, and the risk of elegant-looking but unreadable type treatments.",
    reportUse:
      "Use these sources when justifying contrast thresholds, text-over-image warnings, and why readability should be treated as a core product requirement.",
    tooltipUse:
      "Use these for thumbnail legibility notes, contrast tooltips, and low-contrast warnings.",
    refs: [
      {
        id: "wcag-22",
        title: "Web Content Accessibility Guidelines (WCAG) 2.2",
        source: "W3C",
        year: "2024",
        kind: "standard",
        href: "https://www.w3.org/TR/WCAG22/",
        summary:
          "The main accessibility standard used to justify minimum contrast thresholds for digital text.",
        whyItMatters:
          "It gives you the cleanest baseline for defending why small text needs stronger contrast than decorative artwork alone.",
        supports: [
          "4.5:1 contrast for normal text",
          "3:1 contrast for large text",
          "Accessibility-first evaluation language",
        ],
        reportText:
          "Contrast scoring follows WCAG-aligned legibility guidance for digital text.",
        tooltipText:
          "WCAG baseline: 4.5:1 for normal text, 3:1 for large text.",
        tags: ["contrast", "accessibility", "text", "baseline"],
        openAccess: true,
        featured: true,
      },
      {
        id: "wai-contrast-understanding",
        title: "Understanding Success Criterion 1.4.3: Contrast (Minimum)",
        source: "W3C WAI",
        year: "Guidance",
        kind: "standard",
        href: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
        summary:
          "Explains the purpose behind contrast rules, especially for users with reduced visual acuity and contrast sensitivity.",
        whyItMatters:
          "Useful when you need the rationale behind the numbers, not just the threshold itself.",
        supports: [
          "Why contrast thresholds exist",
          "Why low-contrast text is a real accessibility risk",
        ],
        reportText:
          "Chosen contrast targets reflect guidance designed for users with reduced visual acuity and impaired contrast perception.",
        tags: ["contrast", "accessibility", "rationale"],
        openAccess: true,
      },
      {
        id: "webaim-contrast",
        title: "Contrast and Color Accessibility: Understanding WCAG 2 Contrast and Color Requirements",
        source: "WebAIM",
        year: "2021",
        kind: "industry",
        href: "https://webaim.org/articles/contrast/",
        summary:
          "A practical explainer that helps translate WCAG contrast rules into day-to-day interface decisions.",
        whyItMatters:
          "Helpful for product writing because it bridges standards language and implementation language.",
        supports: [
          "Explaining contrast ratios clearly",
          "Foreground/background perception",
          "Alpha and transparency concerns",
        ],
        tooltipText:
          "Transparency and mixed backgrounds can reduce effective contrast faster than a palette preview suggests.",
        tags: ["contrast", "implementation", "ui"],
        openAccess: true,
      },
      {
        id: "nng-low-contrast",
        title: "Low-Contrast Text Is Not the Answer",
        source: "Nielsen Norman Group",
        year: "2015",
        kind: "industry",
        href: "https://www.nngroup.com/articles/low-contrast/",
        summary:
          "Shows how low-contrast type harms legibility, discoverability, confidence, and mobile usability.",
        whyItMatters:
          "Great support when a cover looks stylish but starts collapsing the moment it is seen small or in glare-heavy contexts.",
        supports: [
          "Why low-contrast type fails in practice",
          "Why discoverability matters alongside aesthetics",
          "Why mobile viewing is harsher than desktop inspection",
        ],
        reportText:
          "Low-contrast type is treated as a UX risk because readability, discoverability, and user confidence all weaken as contrast falls.",
        tooltipText:
          "Low contrast can look premium at full size and still fail instantly in a thumbnail.",
        tags: ["contrast", "mobile", "usability", "thumbnail"],
        openAccess: true,
        featured: true,
      },
      {
        id: "nng-text-over-images",
        title: "Ensure High Contrast for Text Over Images",
        source: "Nielsen Norman Group",
        year: "2015",
        kind: "industry",
        href: "https://www.nngroup.com/articles/text-over-images/",
        summary:
          "Directly addresses the text-over-image problem that is common in artist name and title overlays.",
        whyItMatters:
          "Especially relevant to album art because photography and textured artwork create unstable local contrast.",
        supports: [
          "Overlay recommendations",
          "Placement strategy",
          "Background calmness",
          "Text-over-image risk",
        ],
        reportText:
          "Text placed over imagery was reviewed carefully because local image detail often undermines effective readability even when the overall palette seems acceptable.",
        tooltipText:
          "Text over art often needs an overlay, shadow, or calmer placement to stay readable.",
        tags: ["text-over-image", "overlay", "contrast", "readability"],
        openAccess: true,
        featured: true,
      },
      {
        id: "webaim-evaluating-contrast",
        title: "Evaluating Contrast and Color Use",
        source: "WebAIM",
        year: "2021",
        kind: "industry",
        href: "https://webaim.org/articles/contrast/evaluating",
        summary:
          "A practical guide to testing contrast in real interfaces, including cases with transparency, gradients, and image backgrounds.",
        whyItMatters:
          "Useful when a cover looks acceptable by palette alone but becomes less readable once overlays, transparency, or mixed-image backgrounds are involved.",
        supports: [
          "How to evaluate contrast in practice",
          "Image-background and transparency cases",
          "Checking effective contrast rather than ideal contrast",
        ],
        reportText:
          "Contrast checks were treated as contextual rather than purely palette-based because transparency, gradients, and image backgrounds can reduce effective readability.",
        tooltipText:
          "Real contrast can be weaker than the palette suggests once gradients, overlays, or photos are involved.",
        tags: ["contrast", "evaluation", "images", "implementation"],
        openAccess: true,
      },
      {
        id: "nng-visual-treatments-accessibility",
        title: "5 Visual Treatments that Improve Accessibility",
        source: "Nielsen Norman Group",
        year: "2022",
        kind: "industry",
        href: "https://www.nngroup.com/articles/visual-treatments-accessibility/",
        summary:
          "A practical design article on colour contrast, outlines, spacing, and other visual adjustments that improve accessibility.",
        whyItMatters:
          "Helpful for turning warnings into concrete fixes, especially when a cover needs stronger separation without losing its overall mood.",
        supports: [
          "Practical accessibility fixes",
          "Contrast and boundary reinforcement",
          "Design changes beyond colour alone",
        ],
        tooltipText:
          "If colour distinction weakens, reinforce edges, spacing, or boundaries so the design still reads clearly.",
        tags: ["accessibility", "contrast", "hierarchy", "fixes"],
        openAccess: true,
      },
      {
        id: "w3c-use-of-color",
        title: "Understanding Success Criterion 1.4.1: Use of Color",
        source: "W3C WAI",
        year: "Guidance",
        kind: "standard",
        href: "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html",
        summary:
          "Explains why colour alone should not be the only signal used to distinguish information, actions, or important visual states.",
        whyItMatters:
          "Directly relevant to the Accessibility page, because album covers that rely only on hue difference can lose hierarchy when colour distinction weakens.",
        supports: [
          "Do not rely on colour alone",
          "Accessibility-aware hierarchy",
          "Supporting non-colour cues",
        ],
        reportText:
          "Accessibility checks consider whether important distinctions rely too heavily on colour alone rather than on luminance, scale, or placement.",
        tooltipText:
          "If two areas are separated only by hue, some viewers may not perceive that distinction clearly.",
        tags: ["accessibility", "color", "contrast", "hierarchy"],
        openAccess: true,
      },
      {
        id: "w3c-non-text-contrast",
        title: "Understanding Success Criterion 1.4.11: Non-text Contrast",
        source: "W3C WAI",
        year: "Guidance",
        kind: "standard",
        href: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
        summary:
          "Explains why meaningful interface graphics and visual boundaries also need enough contrast to remain distinguishable.",
        whyItMatters:
          "Useful for supporting comments about focal anchors, boundaries, and non-text visual structure, especially when a cover becomes flatter under simulation.",
        supports: [
          "Non-text visual distinction",
          "Boundaries and focal anchors",
          "Accessibility beyond text contrast",
        ],
        reportText:
          "Accessibility review considers not only text contrast, but also whether important visual boundaries and focal elements remain distinguishable.",
        tooltipText:
          "When colour cues collapse, shapes, edges, and non-text anchors still need enough contrast to hold the layout together.",
        tags: ["accessibility", "non-text", "contrast", "boundaries"],
        openAccess: true,
      },
    ],
  },
  {
    id: "thumbnail-legibility",
    title: "Typography, size, and thumbnail survival",
    intro:
      "Support for why CoverCheck should stress-test titles, artist names, and other typography at small streaming and browse sizes.",
    reportUse:
      "Use these sources to justify small-size checks, glance reading, and title-region size warnings.",
    tooltipUse:
      "Use these for 64px/96px notes, type-size warnings, and glance-legibility help text.",
    refs: [
      {
        id: "legge-print-size",
        title: "Does Print Size Matter for Reading? A Review of Findings from Vision Science and Typography",
        source: "Vision Research / PMC",
        year: "2011",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264/",
        summary:
          "A review showing that print size strongly affects reading speed and fluent reading performance.",
        whyItMatters:
          "This is one of the clearest sources for defending why tiny title zones are not a cosmetic issue.",
        supports: [
          "Why title size matters",
          "Why thumbnails break weak type quickly",
          "Why small text regions need stronger treatment",
        ],
        reportText:
          "Title-region size is treated as meaningful because reading performance depends strongly on print size.",
        tooltipText:
          "Very small title areas are risky because reading speed drops as text size shrinks.",
        tags: ["typography", "size", "thumbnail", "reading"],
        openAccess: true,
        featured: true,
      },
      {
        id: "dobres-glance",
        title: "Effects of Age, Typeface Design, Size and Display Polarity on Glance Legibility",
        source: "Applied Ergonomics / PMC",
        year: "2016",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401/",
        summary:
          "Shows that glance legibility depends on size, typeface design, and display conditions.",
        whyItMatters:
          "Useful for defending why covers should be tested in fast-scanning, low-attention contexts rather than only in full-size review.",
        supports: [
          "Glance-based browsing logic",
          "Small-size type checks",
          "Display-condition sensitivity",
        ],
        reportText:
          "Thumbnail checks are included because covers are often encountered in fast, glance-based browsing rather than full-size inspection.",
        tags: ["glance", "typography", "thumbnail", "browsing"],
        openAccess: true,
      },
      {
        id: "venkatesan-typeface-music",
        title: "Does the Typeface on Album Cover Influence Expectations and Perception of Music?",
        source: "Psychology of Aesthetics, Creativity, and the Arts / Oxford Research Archive",
        year: "2020",
        kind: "peer-reviewed",
        href: "https://ora.ox.ac.uk/objects/uuid%3A7beb83c1-86ab-4fe4-b1d4-78297324d8a5",
        summary:
          "Shows that rounded versus angular typefaces on album covers influence expectations about how music will sound and feel.",
        whyItMatters:
          "This is one of the most directly relevant sources for CoverCheck because it links album-cover typography to music expectation, not just general page reading.",
        supports: [
          "Album-cover typography shapes expectation",
          "Typeface communicates musical character",
          "Visual style and perception are linked",
        ],
        reportText:
          "Typography is treated as communicative rather than decorative because album-cover typeface choices can influence expectations about the music itself.",
        tooltipText:
          "Typeface choice can change what the music is expected to feel like before anyone presses play.",
        tags: ["typography", "album-art", "music", "aesthetics"],
        openAccess: true,
        featured: true,
      },
      {
        id: "read-most-eye-tracking",
        title: "You Read Best What You Read Most: An Eye Tracking Study",
        source: "Journal of Eye Movement Research",
        year: "2020",
        kind: "peer-reviewed",
        href: "https://www.mdpi.com/1995-8692/13/2/15",
        summary:
          "Shows that reading performance improves for more familiar letterforms, linking typographic familiarity to practical legibility.",
        whyItMatters:
          "Helpful when explaining why ornate or unusual display treatments may cost legibility at small sizes, especially under glance-based viewing.",
        supports: [
          "Typeface familiarity matters",
          "Eye-tracking evidence for legibility",
          "Risk of unusual letterforms at small size",
        ],
        reportText:
          "Typography is evaluated functionally because legibility is shaped not only by size, but also by how familiar and quickly readable the letterforms are.",
        tags: ["typography", "legibility", "eye-tracking", "reading"],
        openAccess: true,
      },
      {
        id: "frontiers-letter-shape",
        title: "Influence of Letter Shape on Readers' Emotional Experience, Reading Fluency, and Text Comprehension and Memorisation",
        source: "Frontiers in Psychology",
        year: "2023",
        kind: "peer-reviewed",
        href: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1107839/full",
        summary:
          "Examines how letter shape influences readers' feelings, reading fluency, and comprehension outcomes.",
        whyItMatters:
          "Useful for supporting the idea that type style changes both affective tone and functional reading performance at the same time.",
        supports: [
          "Letter shape affects fluency",
          "Typography changes emotional tone",
          "Style and readability interact",
        ],
        reportText:
          "Type styling is treated as both expressive and functional because letter shape can influence reading fluency as well as emotional response.",
        tags: ["typography", "reading", "fluency", "aesthetics"],
        openAccess: true,
      },
      {
        id: "plos-font-readability-aesthetics",
        title: "Is Less Readable Liked Better? The Case of Font Readability in Poetry Appreciation",
        source: "PLOS ONE",
        year: "2019",
        kind: "peer-reviewed",
        href: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0225757",
        summary:
          "Explores how harder-versus-easier reading fonts affect aesthetic appreciation, showing that readability and style can pull in different directions.",
        whyItMatters:
          "Useful for dissertation-style writing because it supports the idea that elegant typography can feel appealing while still creating functional reading costs.",
        supports: [
          "Aesthetics versus readability trade-off",
          "Why stylish type can still fail functionally",
          "Typography affects appreciation as well as fluency",
        ],
        tags: ["typography", "aesthetics", "legibility", "reading"],
        openAccess: true,
      },
      {
        id: "scaltritti-typographic-variables",
        title: "Investigating Effects of Typographic Variables on Webpage Reading Through Eye Movements",
        source: "Vision / PMC",
        year: "2019",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6722069/",
        summary:
          "Examines how font type, size, spacing, and spatial distribution affect readability during digital reading.",
        whyItMatters:
          "Strong support for treating type size, spacing, and visual distribution as part of readability rather than decoration.",
        supports: [
          "Type size and spacing matter",
          "Spatial distribution affects reading",
          "Digital reading is shaped by visual typography choices",
        ],
        reportText:
          "Typography settings were treated as functional variables because font size, spacing, and spatial distribution all affect digital readability.",
        tags: ["typography", "spacing", "size", "digital-reading"],
        openAccess: true,
      },
      {
        id: "atilgan-print-display-constraints",
        title: "Reconciling Print-Size and Display-Size Constraints on Reading",
        source: "PNAS / PMC",
        year: "2020",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7720185/",
        summary:
          "Explains the trade-off between readable print size and the limited space available on small digital displays.",
        whyItMatters:
          "Especially helpful for explaining why very small title areas and narrow viewing surfaces place real limits on fluent reading.",
        supports: [
          "Small display constraints",
          "Print size versus screen real estate",
          "Character-count limits on reading",
        ],
        reportText:
          "Small-display constraints matter because legible print size and available display space compete directly in digital reading conditions.",
        tags: ["thumbnail", "display-size", "reading", "mobile"],
        openAccess: true,
      },
      {
        id: "arditi-serifs-legibility",
        title: "Serifs and Font Legibility",
        source: "Vision Research / PMC",
        year: "2005",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4612630/",
        summary:
          "Tests serif size and reading performance, showing that letterform decisions affect legibility in measurable ways.",
        whyItMatters:
          "Useful when explaining why type choice itself can contribute to survival or failure at small size.",
        supports: [
          "Letterform choice affects legibility",
          "Typeface structure matters",
          "Small text performance is measurable",
        ],
        tags: ["typeface", "legibility", "serif", "reading"],
        openAccess: true,
      },
    ],
  },
  {
    id: "composition",
    title: "Composition, symmetry, and processing fluency",
    intro:
      "Support for evaluating balance, symmetry, and complexity as meaningful composition dimensions instead of vague style commentary.",
    reportUse:
      "Use these when discussing balance, structure, clarity, visual tension, or perceptual fluency.",
    tooltipUse:
      "Use these for symmetry notes, complexity warnings, and structure summaries.",
    refs: [
      {
        id: "huang-symmetry",
        title: "The Aesthetic Preference for Symmetry Dissociates from Early Attention to Symmetry",
        source: "PNAS / PMC",
        year: "2018",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5908848/",
        summary:
          "Shows symmetry is a robust aesthetic variable with broad effects on preference.",
        whyItMatters:
          "Useful when you want to talk about symmetry as a real composition variable, not just a design trend.",
        supports: [
          "Symmetry as a meaningful variable",
          "Aesthetic response",
          "Structured compositions",
        ],
        reportText:
          "Symmetry is included as a composition dimension because research shows it systematically affects aesthetic response.",
        tooltipText:
          "Symmetry is a legitimate aesthetic variable, not just a style preference.",
        tags: ["symmetry", "composition", "aesthetics"],
        openAccess: true,
      },
      {
        id: "bertamini-symmetry",
        title: "Symmetry Preference in Shapes, Faces, Flowers and Landscapes",
        source: "Symmetry / PMC",
        year: "2019",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6585942/",
        summary:
          "Finds broad preference for symmetry across visual categories while still leaving room for context and intent.",
        whyItMatters:
          "Helps frame symmetry as one useful axis rather than a universal rule.",
        supports: [
          "Why symmetry often feels organized",
          "Why asymmetry can still work intentionally",
        ],
        reportText:
          "Symmetry is treated as one composition axis rather than a universal good: it often supports preference, but context still matters.",
        tags: ["symmetry", "preference", "composition"],
        openAccess: true,
      },
      {
        id: "mather-complexity",
        title: "Social Groups and Polarization of Aesthetic Values from Symmetry and Complexity",
        source: "Peer-reviewed study / PMC",
        year: "2023",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10700581/",
        summary:
          "Shows that symmetry and complexity interact in aesthetic evaluation rather than acting independently.",
        whyItMatters:
          "Good support for multi-axis composition scoring instead of single-metric judgement.",
        supports: [
          "Complexity as a valid variable",
          "Interaction between variables",
          "Multi-axis composition logic",
        ],
        reportText:
          "Composition is evaluated across multiple axes because symmetry and complexity can interact rather than operate independently.",
        tags: ["complexity", "symmetry", "composition"],
        openAccess: true,
      },
      {
        id: "reber-fluency",
        title: "Processing Fluency and Aesthetic Pleasure: Is Beauty in the Perceiver's Processing Experience?",
        source: "Personality and Social Psychology Review",
        year: "2004",
        kind: "peer-reviewed",
        href: "https://journals.sagepub.com/doi/10.1207/s15327957pspr0804_3",
        summary:
          "A foundational account of how ease of perceptual processing can shape aesthetic judgement.",
        whyItMatters:
          "This gives strong language for why clarity and organization influence how good a design feels.",
        supports: [
          "Perceptual fluency",
          "Clarity and preference",
          "Ease-of-processing arguments",
        ],
        reportText:
          "Structure and clarity are treated as meaningful because aesthetic response is shaped partly by how fluently visual information is processed.",
        tags: ["fluency", "clarity", "aesthetics", "composition"],
      },
      {
        id: "hubner-balance-proximity",
        title: "Preference for Symmetry, Balance, or Proximity in Picture Aesthetics Depends on the Method of Evaluation",
        source: "i-Perception / PMC",
        year: "2025",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12638637/",
        summary:
          "Shows that symmetry, balance, and proximity all matter in picture evaluation, but their relative importance depends on how people judge an image.",
        whyItMatters:
          "Useful for discussing composition as a set of interacting principles rather than a single universal rule.",
        supports: [
          "Balance as a meaningful variable",
          "Proximity and layout organisation",
          "Context-sensitive composition judgement",
        ],
        reportText:
          "Composition is discussed in terms of multiple interacting principles because symmetry, balance, and proximity can shift in importance depending on the viewing task.",
        tags: ["symmetry", "balance", "composition", "layout"],
        openAccess: true,
      },
      {
        id: "yoo-processing-fluency-update",
        title: "Fluency, Prediction and Motivation: How Processing Dynamics, Expectations and Epistemic Goals Shape Aesthetic Judgements",
        source: "Review / PMC",
        year: "2023",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10725759/",
        summary:
          "Updates classic processing-fluency theory by linking aesthetic judgement to expectations, prediction, and motivation.",
        whyItMatters:
          "Helps you write about visual ease and clarity in a more current, academically grounded way.",
        supports: [
          "Updated fluency theory",
          "Expectation and judgement",
          "Why ease-of-processing still matters",
        ],
        tags: ["fluency", "aesthetics", "judgement", "processing"],
        openAccess: true,
      },
    ],
  },
  {
    id: "music-signals",
    title: "Album covers as genre, mood, and music signals",
    intro:
      "Support for treating album artwork as an informative modality that can signal genre, mood, and artist context rather than decoration alone.",
    reportUse:
      "Use these sources when explaining why cover art can communicate genre, tone, identity, and release context.",
    tooltipUse:
      "Use these for mood/genre notes, image-signal explanations, and context-aware evaluation.",
    refs: [
      {
        id: "oramas-2018",
        title: "Multimodal Deep Learning for Music Genre Classification",
        source: "Transactions of the ISMIR",
        year: "2018",
        kind: "peer-reviewed",
        href: "https://transactions.ismir.net/articles/10.5334/tismir.10",
        summary:
          "Treats cover art images as one of the core modalities used for album genre classification.",
        whyItMatters:
          "One of the strongest direct supports for the claim that album art contains measurable genre information.",
        supports: [
          "Album art as a modality",
          "Genre-relevant image features",
          "Multimodal music understanding",
        ],
        reportText:
          "Cover analysis is justified because MIR research treats album artwork as a meaningful modality for genre-related prediction.",
        tooltipText:
          "Album art can act as a meaningful genre signal, not just packaging.",
        tags: ["genre", "multimodal", "album-art", "music-information-retrieval"],
        openAccess: true,
        featured: true,
      },
      {
        id: "oramas-2017",
        title: "Multi-Label Music Genre Classification from Audio, Text, and Images Using Deep Features",
        source: "ISMIR 2017",
        year: "2017",
        kind: "peer-reviewed",
        href: "https://archives.ismir.net/ismir2017/paper/000126.pdf",
        summary:
          "Conference paper explicitly combining audio, text, and album-cover images in a genre-classification pipeline.",
        whyItMatters:
          "A very direct citation for image-aware evaluation logic in music contexts.",
        supports: [
          "Image features in music analysis",
          "Cover art in genre pipelines",
          "Multimodal album datasets",
        ],
        reportText:
          "This project's image-aware framing aligns with multimodal genre work that includes album covers as one informative source.",
        tags: ["genre", "images", "multimodal", "research"],
        openAccess: true,
      },
      {
        id: "libeks-2011",
        title: "You Can Judge an Artist by an Album Cover: Using Images for Music Annotation",
        source: "IEEE multimedia research",
        year: "2011",
        kind: "peer-reviewed",
        href: "https://www.dgp.toronto.edu/~libeks/Libeks_ArtistImage_IEEEMM11.pdf",
        summary:
          "Shows that image analysis of album covers and promotional images can support artist similarity and genre-tag prediction.",
        whyItMatters:
          "Helpful for arguing that visual cues in music are useful because people can scan images faster than they can audition many tracks.",
        supports: [
          "Artist similarity through images",
          "Genre-tag prediction",
          "Fast visual browsing",
        ],
        reportText:
          "Album art is treated as context-bearing because prior image-based music annotation work shows covers encode meaningful genre-related cues.",
        tags: ["genre", "artist-identity", "annotation", "browsing"],
        openAccess: true,
      },
      {
        id: "genre-design-relationship",
        title: "Relationship between Album Cover Design and Music Genres",
        source: "Design research summary",
        year: "2022",
        kind: "peer-reviewed",
        href: "https://www.researchgate.net/publication/338074523_Relationship_between_album_cover_design_and_music_genres",
        summary:
          "Reports links between cover typography, composition, color, and music genres across a large sample.",
        whyItMatters:
          "Very useful when your product comments on genre mood via color, layout, and typography.",
        supports: [
          "Genre-linked color conventions",
          "Genre-linked typographic conventions",
          "Composition patterns across genres",
        ],
        reportText:
          "Genre-facing art direction is supported by research linking cover typography, composition, and color to genre patterns.",
        tooltipText:
          "Color, composition, and typography often vary by genre convention.",
        tags: ["genre", "color", "typography", "composition"],
      },
      {
        id: "everything-corpus",
        title: "Towards an 'Everything Corpus': A Framework and Guidelines for Multimodal Music Datasets",
        source: "Transactions of the ISMIR",
        year: "2025",
        kind: "peer-reviewed",
        href: "https://transactions.ismir.net/articles/10.5334/tismir.228",
        summary:
          "Frames album covers as one of the relevant modalities in multimodal music datasets and notes that official artwork can be highly indicative of genre.",
        whyItMatters:
          "This gives a more recent, field-level justification for treating visual music artifacts as meaningful data.",
        supports: [
          "Album covers as modalities",
          "Field-level support for multimodal evaluation",
          "Genre indication through official artwork",
        ],
        reportText:
          "Album covers are treated as relevant evidence because contemporary MIR research still recognises official artwork as a meaningful modality.",
        tags: ["multimodal", "dataset", "genre", "music-research"],
        openAccess: true,
      },
      {
        id: "wilkes-multimodal-genre-recognition",
        title: "Statistical and Visual Analysis of Audio, Text, and Image Features for Multi-Modal Music Genre Recognition",
        source: "Algorithms / PMC",
        year: "2021",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8621318/",
        summary:
          "A multimodal genre-recognition study that explicitly includes album-cover images alongside audio and lyrics.",
        whyItMatters:
          "Useful when explaining that image features in music are not just culturally meaningful but analytically useful in prediction tasks.",
        supports: [
          "Album-cover images in genre recognition",
          "Interpretable multimodal features",
          "Image information complements audio and text",
        ],
        reportText:
          "Image-based cues are relevant because multimodal genre models improve when album-cover imagery is included alongside audio and text features.",
        tags: ["genre", "multimodal", "album-art", "prediction"],
        openAccess: true,
      },
      {
        id: "spence-sensory-translation",
        title: "Sensory Translation Between Audition and Vision",
        source: "Review / PMC",
        year: "2023",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11061078/",
        summary:
          "A broad review of how auditory and visual qualities can be mapped across senses.",
        whyItMatters:
          "Helpful for discussing why album-cover mood, tone, and colour may be used to support perceived musical character.",
        supports: [
          "Crossmodal audio-visual mapping",
          "Mood and sensory translation",
          "Theoretical support for audio-visual alignment",
        ],
        tags: ["crossmodal", "mood", "music", "visual-translation"],
        openAccess: true,
      },
      {
        id: "reymore-color-tone-color",
        title: "Color and Tone Color: Audiovisual Crossmodal Correspondences and Timbre Semantics in Musicians and Non-Musicians",
        source: "Frontiers in Psychology",
        year: "2025",
        kind: "peer-reviewed",
        href: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1520131/full",
        summary:
          "Shows that listeners map instrument timbres and pitch registers onto colour choices in systematic ways.",
        whyItMatters:
          "Strong support for Match and genre-mood logic because it links musical timbre and colour choice directly through crossmodal semantics.",
        supports: [
          "Music-to-colour correspondences",
          "Timbre semantics and colour",
          "Crossmodal support for mood alignment",
        ],
        reportText:
          "Audio-visual matching is treated as meaningful because listeners often map timbral qualities onto colour in systematic ways.",
        tags: ["crossmodal", "music", "color", "mood"],
        openAccess: true,
      },
      {
        id: "mesz-marble-melancholy",
        title: "Marble Melancholy: Using Crossmodal Correspondences of Music-Induced Emotions to Generate Visual Material Recommendations",
        source: "Frontiers in Psychology",
        year: "2023",
        kind: "peer-reviewed",
        href: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1168258/full",
        summary:
          "Investigates how music-induced emotions map onto visual materials and shapes through crossmodal correspondences.",
        whyItMatters:
          "Useful for supporting art-direction comments about whether visual texture, tone, and material feel align with the intended emotional character of the music.",
        supports: [
          "Emotion-to-visual mapping",
          "Crossmodal mood correspondence",
          "Support for audio-visual art direction",
        ],
        tags: ["crossmodal", "emotion", "music", "visual-translation"],
        openAccess: true,
      },
    ],
  },
  {
    id: "identity-branding",
    title: "Visual identity, campaign worlds, and artist branding",
    intro:
      "Support for the idea that cover art helps build an artist's world, brand, and release narrative across streaming, social, live, and merchandising surfaces.",
    reportUse:
      "Use these sources when explaining why a cover should be judged as part of a wider artist identity system, not as an isolated square.",
    tooltipUse:
      "Use these for identity notes, campaign cohesion comments, and release-world framing.",
    refs: [
      {
        id: "apple-brand-likeness",
        title: "Album Cover Art on Apple Music",
        source: "Apple Music for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://artists.apple.com/support/1120-cover-art",
        summary:
          "Apple explicitly describes cover art as a reflection of an artist's artistry, brand, and likeness, while also laying out quality requirements.",
        whyItMatters:
          "A strong official source for talking about artwork as both expressive identity and product-surface communication.",
        supports: [
          "Art as brand expression",
          "Mood-board and art-direction logic",
          "Quality expectations on major platforms",
        ],
        reportText:
          "Cover art is evaluated as an identity-bearing surface because major platforms explicitly frame it as a reflection of an artist's artistry, brand, and likeness.",
        tooltipText:
          "Major platforms treat cover art as part of the artist's brand, not just packaging.",
        tags: ["branding", "artist-identity", "official", "platform"],
        openAccess: true,
        featured: true,
      },
      {
        id: "spotify-cover-requirements",
        title: "Cover Art Requirements",
        source: "Spotify for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://support.spotify.com/us/artists/article/cover-art-requirements/",
        summary:
          "Spotify's technical requirements reinforce that cover art has to survive as a square digital asset in real product surfaces.",
        whyItMatters:
          "Good support for why technical display constraints and clarity matter, especially in streaming-first environments.",
        supports: [
          "Square-first design",
          "High-resolution delivery",
          "Streaming-display constraints",
        ],
        reportText:
          "Streaming-first evaluation is appropriate because major platforms treat cover art as a tightly constrained square product asset.",
        tags: ["spotify", "platform", "square-format", "delivery"],
        openAccess: true,
      },
      {
        id: "spotify-design-guidelines",
        title: "Design & Branding Guidelines",
        source: "Spotify for Developers",
        year: "Current guidance",
        kind: "official",
        href: "https://developer.spotify.com/documentation/design",
        summary:
          "Spotify's design guidance says artwork should not be cropped or covered with overlaid interface elements.",
        whyItMatters:
          "Useful when arguing that artwork integrity matters because platforms expect the image to remain readable in its original form.",
        supports: [
          "Artwork integrity",
          "No-covering/no-overlay guidance",
          "Respecting artwork boundaries",
        ],
        reportText:
          "Artwork integrity matters because platform design guidance explicitly discourages cropping and interface overlays that obscure the cover.",
        tags: ["spotify", "integrity", "display", "ui"],
        openAccess: true,
      },
      {
        id: "its-nice-that-campaign",
        title: "The Art of the Album Campaign: Why Music Now Comes with Its Own Visual Universe",
        source: "It's Nice That",
        year: "2025",
        kind: "essay",
        href: "https://www.itsnicethat.com/features/the-art-of-the-album-campaign-music-art-direction-graphic-design-140825",
        summary:
          "A design-industry essay on how contemporary artists build cohesive album worlds across covers, stage design, materials, and social media.",
        whyItMatters:
          "Excellent support for the idea that cover art is one node in a broader identity system.",
        supports: [
          "Campaign cohesion",
          "Visual-world thinking",
          "Brand language across touchpoints",
        ],
        reportText:
          "The cover is assessed as part of a wider campaign world because contemporary art direction increasingly extends across social, live, and packaging touchpoints.",
        tooltipText:
          "Strong cover systems usually belong to a wider visual world, not a one-off image.",
        tags: ["campaign", "branding", "identity", "art-direction"],
        openAccess: true,
      },
      {
        id: "covering-music-history-brand",
        title: "Covering Music: A Brief History and Analysis of Album Cover Design",
        source: "Design-history writing / accessible excerpt",
        year: "2009",
        kind: "essay",
        href: "https://www.researchgate.net/publication/230399481_Covering_music_A_brief_history_and_analysis_of_album_cover_design",
        summary:
          "Argues that album covers continue to matter in digital environments and contribute to an artist's broader visual aesthetic and brand.",
        whyItMatters:
          "Useful bridge source between cultural history and present-day identity design.",
        supports: [
          "Album cover as brand seed",
          "Digital-era relevance",
          "Tour, merch, and stage spillover",
        ],
        reportText:
          "Album covers are treated as brand-forming assets because they often establish a visual language that extends into posters, staging, merchandise, and other artist surfaces.",
        tags: ["history", "branding", "visual-language"],
      },
      {
        id: "looking-at-sound",
        title: "Looking at Sound: Contextualising Album Cover Multimodality",
        source: "Design / multimodality thesis",
        year: "2021",
        kind: "thesis",
        href: "https://www.researchgate.net/publication/348416993_Looking_at_Sound_Contextualising_Album_Cover_Multimodality",
        summary:
          "Frames album covers as both art objects and market-facing communication in the multisensory appreciation of music.",
        whyItMatters:
          "A strong conceptual source for the core premise of your website.",
        supports: [
          "Album covers are not just decoration",
          "Art + market communication together",
          "Multisensory framing",
        ],
        reportText:
          "Album covers are treated as both aesthetic objects and market-facing communication, not merely decorative wrappers.",
        tags: ["multimodality", "branding", "culture", "thesis"],
      },
      {
        id: "spotify-artist-image-guidelines",
        title: "Artist Image Guidelines",
        source: "Spotify for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://support.spotify.com/us/artists/article/artist-image-guidelines/",
        summary:
          "Spotify's guidance for artist imagery sets expectations around text, busy backgrounds, quality, and visual clarity.",
        whyItMatters:
          "Useful for supporting the idea that artist-facing visual assets are judged as communication surfaces with clarity expectations, not only expressive art.",
        supports: [
          "Clarity and quality expectations",
          "Avoiding busy backgrounds and text clutter",
          "Artist identity across platform surfaces",
        ],
        reportText:
          "Identity visuals are assessed as communication surfaces because major platforms impose quality and clarity expectations on artist-facing imagery.",
        tags: ["branding", "artist-identity", "spotify", "clarity"],
        openAccess: true,
      },
      {
        id: "spotify-canvas-guidelines-branding",
        title: "Canvas Guidelines",
        source: "Spotify for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://support.spotify.com/us/artists/article/canvas-guidelines/",
        summary:
          "Shows how release visuals extend beyond the static square into motion and additional listening surfaces.",
        whyItMatters:
          "Supports the claim that the cover belongs to a broader visual system rather than acting as a standalone image.",
        supports: [
          "Extended campaign surfaces",
          "Beyond-static-cover thinking",
          "Motion and release-world continuity",
        ],
        tags: ["branding", "campaign", "spotify", "motion"],
        openAccess: true,
      },
    ],
  },
  {
    id: "history-culture",
    title: "History, packaging, and cultural significance",
    intro:
      "Support for the cultural weight of album covers as designed objects, packaging, and identity-bearing artifacts in music history.",
    reportUse:
      "Use these when discussing album art as more than ornament: as packaging, ritual, memory, and cultural signal.",
    tooltipUse:
      "Use these for historical notes, heritage framing, and cultural-significance commentary.",
    refs: [
      {
        id: "moma-let-it-bleed",
        title: "Let Them Eat Delia's Cake, or Robert Brownjohn's Let It Bleed",
        source: "MoMA",
        year: "2013",
        kind: "essay",
        href: "https://www.moma.org/explore/inside_out/2013/09/12/let-them-eat-delias-cake-or-robert-brownjohns-let-it-bleed/",
        summary:
          "MoMA treats the record jacket as a design object and foregrounds album packaging as part of the listening ritual.",
        whyItMatters:
          "A good museum-grade source for why cover art has long mattered as a designed cultural object.",
        supports: [
          "Album cover as packaging",
          "Listening ritual",
          "Record jackets as design artifacts",
        ],
        reportText:
          "Album artwork is treated as part of the listening experience because cover, sleeve, inserts, and notes historically formed an integrated ritual of music consumption.",
        tags: ["history", "museum", "packaging", "culture"],
        openAccess: true,
      },
      {
        id: "loc-time-out",
        title: "Time Out — National Recording Registry Essay",
        source: "Library of Congress",
        year: "2019",
        kind: "essay",
        href: "https://www.loc.gov/static/programs/national-recording-preservation-board/documents/TimeOut.pdf",
        summary:
          "Highlights Time Out's abstract cover art as part of the album's bold creative positioning and reception.",
        whyItMatters:
          "Shows that unusual cover choices can be part of a larger artistic statement rather than an afterthought.",
        supports: [
          "Cover art as artistic positioning",
          "Abstract design in music packaging",
          "Packaging and reception",
        ],
        reportText:
          "Artwork can meaningfully frame a release because album presentation has historically contributed to how bold or experimental a record feels.",
        tags: ["history", "abstract-art", "positioning", "library"],
        openAccess: true,
      },
      {
        id: "smithsonian-dylan",
        title: "How Milton Glaser Came to Design the Iconic Poster of Bob Dylan",
        source: "Smithsonian Magazine",
        year: "2010 / updated 2020",
        kind: "essay",
        href: "https://www.smithsonianmag.com/arts-culture/sign-of-the-times-bob-dylan-95420/",
        summary:
          "A cultural-history piece around one of popular music's most iconic visual artifacts and its enduring recognizability.",
        whyItMatters:
          "Helpful when you want a broader public-facing source for music visuals entering cultural memory.",
        supports: [
          "Iconic recognizability",
          "Music visuals as cultural memory",
          "Design legacy",
        ],
        reportText:
          "Album and music visuals can become lasting cultural identifiers, not just release-era promotion.",
        tags: ["history", "iconic", "memory", "design-culture"],
        openAccess: true,
      },
      {
        id: "smithsonian-vinyl",
        title: "Bring Back Vinyl",
        source: "Smithsonian Magazine",
        year: "2008",
        kind: "essay",
        href: "https://www.smithsonianmag.com/arts-culture/bring-back-vinyl-180941044/",
        summary:
          "Reflects on the role of album cover art in music culture and collector memory, especially in the LP era.",
        whyItMatters:
          "Useful as a cultural-history source when discussing why cover art still carries symbolic weight.",
        supports: [
          "Album art as collector value",
          "Cultural prestige of cover design",
          "Packaging memory",
        ],
        reportText:
          "Cover artwork retains cultural significance because it has long shaped how releases are remembered, discussed, and collected.",
        tags: ["culture", "vinyl", "history", "memory"],
        openAccess: true,
      },
      {
        id: "moma-record-jacket-design",
        title: "The Record Jacket as a Designed Object",
        source: "MoMA-related design writing",
        year: "Museum context",
        kind: "essay",
        href: "https://www.moma.org/explore/inside_out/2013/09/12/let-them-eat-delias-cake-or-robert-brownjohns-let-it-bleed/",
        summary:
          "Museum writing that frames album packaging as part of the designed music object rather than an afterthought.",
        whyItMatters:
          "Useful for reinforcing the historical claim that record sleeves and covers have long been treated as meaningful design artefacts.",
        supports: [
          "Album packaging as design object",
          "Museum-level design framing",
          "Historical significance of sleeves and covers",
        ],
        tags: ["history", "museum", "album-cover", "design-object"],
        openAccess: true,
      },
    ],
  },
  {
    id: "platform-context",
    title: "Platform context and streaming-display constraints",
    intro:
      "Support for evaluating covers in the conditions where users actually encounter them: square, compressed, thumbnail-first, and product-surface constrained.",
    reportUse:
      "Use these when explaining why testing in thumbnail and streaming contexts is not optional.",
    tooltipUse:
      "Use these for streaming-context notes, thumbnail warnings, and display-surface guidance.",
    refs: [
      {
        id: "apple-motion",
        title: "Apple Music Album Motion Guidelines",
        source: "Apple",
        year: "Current guidance",
        kind: "official",
        href: "https://help.apple.com/itc/albummotionguide/en.lproj/static.html",
        summary:
          "Apple's motion-art guidance makes clear that album artwork has to work consistently across multiple device contexts and product surfaces.",
        whyItMatters:
          "Supports your emphasis on context views and product-surface realism.",
        supports: [
          "Cross-device consistency",
          "Context-sensitive artwork evaluation",
          "Recognition across surfaces",
        ],
        reportText:
          "Context views are important because platform artwork systems expect recognisability across multiple device sizes and product surfaces.",
        tags: ["apple", "motion-art", "context", "devices"],
        openAccess: true,
      },
      {
        id: "spotify-canvas",
        title: "Canvas Guidelines",
        source: "Spotify for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://support.spotify.com/us/artists/article/canvas-guidelines/",
        summary:
          "Shows how streaming platforms extend artwork into additional visual surfaces beyond the static square cover.",
        whyItMatters:
          "Good support for thinking about cover art as part of a larger visual ecosystem rather than a single asset.",
        supports: [
          "Extended visual identity",
          "Streaming product surfaces",
          "Beyond-static-cover thinking",
        ],
        reportText:
          "Artwork systems are broader than the cover alone, so identity evaluations benefit from thinking beyond a single static square.",
        tags: ["spotify", "canvas", "streaming", "identity-system"],
        openAccess: true,
      },
      {
        id: "apple-cover-specs",
        title: "Album Cover Art on Apple Music — Cover Art Specifications",
        source: "Apple Music for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://artists.apple.com/support/1120-cover-art",
        summary:
          "Apple requires a perfect square image at high resolution and prohibits misleading or poor-quality treatments.",
        whyItMatters:
          "Useful for backing any quality score related to resolution, cropping, and platform readiness.",
        supports: [
          "Square-first constraints",
          "Quality control",
          "Streaming-platform readiness",
        ],
        tags: ["apple", "quality", "delivery", "platform"],
        openAccess: true,
      },
      {
        id: "spotify-quality-specs",
        title: "Spotify Cover Art Requirements — Resolution and Format",
        source: "Spotify for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://support.spotify.com/us/artists/article/cover-art-requirements/",
        summary:
          "Spotify requires square art, high resolution, and correct color encoding, reinforcing the practical constraints of streaming display.",
        whyItMatters:
          "Good support for technical checks that are still visibly relevant to design quality.",
        supports: [
          "Resolution quality",
          "Square asset integrity",
          "Display consistency",
        ],
        tags: ["spotify", "quality", "square", "display"],
        openAccess: true,
      },
      {
        id: "koh-thumbnail-visual-attributes",
        title: "An Exploration of the Relation Between the Visual Attributes of Thumbnails and YouTube Click-Through Rates",
        source: "Decision Support Systems",
        year: "2022",
        kind: "peer-reviewed",
        href: "https://www.byungwan.com/papers/Thumbnails.pdf",
        summary:
          "Examines how measurable thumbnail visual attributes relate to click-through performance and viewer attention on YouTube.",
        whyItMatters:
          "Useful for defending Mockups and thumbnail-survival checks, because it shows that small preview images materially affect selection behaviour in competitive feeds.",
        supports: [
          "Thumbnail design affects attention",
          "Small-image competition matters",
          "Practical support for mockup testing",
        ],
        reportText:
          "Mockup and thumbnail checks are justified because small preview images influence selection behaviour in competitive scrolling environments.",
        tags: ["thumbnail", "platform", "attention", "streaming"],
        openAccess: true,
      },
      {
        id: "mendenhall-made-you-look",
        title: "Made You Look: Do Video Thumbnails with Portraits Attract and Hold Users' Attention?",
        source: "UNC Chapel Hill master's thesis",
        year: "2021",
        kind: "thesis",
        href: "https://cdr.lib.unc.edu/concern/masters_papers/g158bt278",
        summary:
          "A thesis exploring whether portrait-based thumbnails attract attention faster and hold attention longer during information-seeking tasks.",
        whyItMatters:
          "Helpful for explaining why identity, focal anchors, and face-like or object-like central cues matter in thumbnail browsing even before any text is read.",
        supports: [
          "Thumbnail attention capture",
          "Focal-anchor importance",
          "Information-seeking under glance conditions",
        ],
        tags: ["thumbnail", "attention", "identity", "browsing"],
        openAccess: true,
      },
      {
        id: "jama-attention-grabbing-thumbnails",
        title: "Algorithmic Content Recommendations on a Video-Sharing Platform: Attention-Grabbing Thumbnails and Problematic Recommendations",
        source: "JAMA Pediatrics / PMC",
        year: "2024",
        kind: "peer-reviewed",
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11137630/",
        summary:
          "Examines how video-sharing platforms use attention-grabbing thumbnail design in recommendation contexts.",
        whyItMatters:
          "Useful as broader support for the idea that thumbnail presentation is not neutral: small preview images are engineered to compete aggressively for attention.",
        supports: [
          "Attention-grabbing thumbnail design",
          "Recommendation-surface competition",
          "Why preview-context testing matters",
        ],
        tags: ["thumbnail", "attention", "recommendations", "platform"],
        openAccess: true,
      },
      {
        id: "spotify-design-artwork-integrity",
        title: "Design & Branding Guidelines",
        source: "Spotify for Developers",
        year: "Current guidance",
        kind: "official",
        href: "https://developer.spotify.com/documentation/design",
        summary:
          "Spotify's design guidance says artwork should remain in its original form and should not be cropped, covered, or overlaid.",
        whyItMatters:
          "Strong platform support for discussing artwork integrity, crop risk, and UI interference.",
        supports: [
          "Do not crop artwork",
          "Do not overlay text or controls over art",
          "Artwork integrity on platform surfaces",
        ],
        reportText:
          "Artwork integrity matters because platform design guidance explicitly warns against cropping, covering, or overlaying the image.",
        tags: ["spotify", "ui", "integrity", "cropping"],
        openAccess: true,
      },
      {
        id: "apple-motion-artwork-create",
        title: "Create Motion Artwork for Apple Music",
        source: "Apple Music for Artists",
        year: "Current guidance",
        kind: "official",
        href: "https://artists.apple.com/support/5544-create-motion-artwork",
        summary:
          "Shows how Apple extends release artwork into motion-based product surfaces beyond the static square.",
        whyItMatters:
          "Supports context-aware evaluation by showing that album visuals increasingly need to remain recognisable across multiple presentation formats.",
        supports: [
          "Artwork across multiple surfaces",
          "Motion extensions of release identity",
          "Cross-surface recognisability",
        ],
        tags: ["apple", "motion", "context", "surfaces"],
        openAccess: true,
      },
    ],
  },
];

const KIND_OPTIONS: { value: "all" | EvidenceKind; label: string }[] = [
  { value: "all", label: "All evidence" },
  { value: "peer-reviewed", label: "Peer-reviewed" },
  { value: "standard", label: "Standards" },
  { value: "official", label: "Official platform" },
  { value: "industry", label: "Industry" },
  { value: "essay", label: "Essays / museum" },
  { value: "thesis", label: "Theses" },
];

const TAG_OPTIONS = [
  "contrast",
  "thumbnail",
  "genre",
  "branding",
  "campaign",
  "composition",
  "history",
  "platform",
  "typography",
  "album-art",
] as const;

function kindLabel(kind: EvidenceKind) {
  switch (kind) {
    case "standard":
      return "Standard";
    case "official":
      return "Official";
    case "peer-reviewed":
      return "Peer-reviewed";
    case "industry":
      return "Industry";
    case "essay":
      return "Essay / museum";
    default:
      return "Thesis";
  }
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function SourceCard({
  item,
  expanded,
  onToggle,
}: {
  item: EvidenceItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="methodRefCard methodRefCard--clean">
      <button
        type="button"
        onClick={onToggle}
        className="methodRefHead"
        aria-expanded={expanded}
      >
        <div className="methodRefHeadContent">
          <div className="methodRefMeta">
            <span className={`methodBadge ${item.kind}`}>{kindLabel(item.kind)}</span>
            {item.openAccess ? <span className="methodBadge open">Open access</span> : null}
            {item.featured ? <span className="methodBadge featured">Foundation</span> : null}
          </div>

          <div className="methodRefTitle">{item.title}</div>
          <div className="methodRefSub">
            {item.source} • {item.year}
          </div>
          <div className="methodRefSummary methodRefSummary--closed">{item.summary}</div>
        </div>

        <div className="methodRefChevronIcon">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {expanded ? (
        <div className="methodRefBody">
          <div className="methodRefGrid">
            <div className="methodRefMainCol">
              <div className="methodRefBlock">
                <div className="methodRefBlockHead">Why it matters</div>
                <div className="methodRefSummary">{item.whyItMatters}</div>
              </div>

              <div className="methodRefBlock">
                <div className="methodRefBlockHead">What this supports</div>
                <ul className="methodSupportGrid">
                  {item.supports.map((point) => (
                    <li key={point} className="methodSupportPill">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="methodRefSideCol">
              {item.reportText ? (
                <div className="methodRefBox">
                  <div className="methodRefBlockHead">Report-ready wording</div>
                  <div className="methodRefQuote">
                    <div className="methodRefQuoteLine">{item.reportText}</div>
                  </div>
                  <div className="methodRefActions">
                    <button
                      type="button"
                      className="ghostBtn small"
                      onClick={() => copyText(item.reportText!)}
                    >
                      <Copy size={14} /> COPY REPORT TEXT
                    </button>
                  </div>
                </div>
              ) : null}

              {item.tooltipText ? (
                <div className="methodRefBox">
                  <div className="methodRefBlockHead">Tooltip-ready wording</div>
                  <div className="methodRefQuote">
                    <div className="methodRefQuoteLine">{item.tooltipText}</div>
                  </div>
                  <div className="methodRefActions">
                    <button
                      type="button"
                      className="ghostBtn small"
                      onClick={() => copyText(item.tooltipText!)}
                    >
                      <Copy size={14} /> COPY TOOLTIP TEXT
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="methodRefBox">
                <div className="methodRefBlockHead">Tags</div>
                <div className="methodTagRow">
                  {item.tags.map((tag) => (
                    <span key={tag} className="methodTag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="methodRefActions">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="ghostBtn"
                  >
                    <ExternalLink size={15} /> OPEN SOURCE
                  </a>

                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() =>
                      copyText(`${item.title} — ${item.source} (${item.year})\n${item.href}`)
                    }
                  >
                    <Copy size={15} /> COPY CITATION
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function AlbumCoverEvidenceLibraryPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EvidenceKind>("all");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<"featured" | "title" | "year-new" | "year-old">(
    "featured"
  );
  const [openOnly, setOpenOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const allRefs = useMemo(() => SECTIONS.flatMap((section) => section.refs), []);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();

    const score = (item: EvidenceItem) => {
      if (!q) return 0;
      let value = 0;
      if (item.title.toLowerCase().includes(q)) value += 4;
      if (item.source.toLowerCase().includes(q)) value += 2;
      if (item.summary.toLowerCase().includes(q)) value += 2;
      if (item.whyItMatters.toLowerCase().includes(q)) value += 2;
      if (item.tags.some((t) => t.toLowerCase().includes(q))) value += 2;
      if (item.supports.some((s) => s.toLowerCase().includes(q))) value += 1;
      return value;
    };

    const parseYear = (value: string) => {
      const match = value.match(/\d{4}/);
      return match ? Number(match[0]) : 0;
    };

    const sortRefs = (refs: EvidenceItem[]) => {
      const copy = [...refs];
      copy.sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "year-new") return parseYear(b.year) - parseYear(a.year);
        if (sort === "year-old") return parseYear(a.year) - parseYear(b.year);

        const featuredDelta = Number(b.featured) - Number(a.featured);
        if (featuredDelta !== 0) return featuredDelta;

        const qDelta = score(b) - score(a);
        if (qDelta !== 0) return qDelta;

        const openDelta = Number(b.openAccess) - Number(a.openAccess);
        if (openDelta !== 0) return openDelta;

        return a.title.localeCompare(b.title);
      });
      return copy;
    };

    return SECTIONS.map((section) => {
      const refs = section.refs.filter((item) => {
        const matchesQuery =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.whyItMatters.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)) ||
          item.supports.some((s) => s.toLowerCase().includes(q));

        const matchesKind = kind === "all" || item.kind === kind;
        const matchesTag = tag === "all" || item.tags.includes(tag);
        const matchesOpen = !openOnly || item.openAccess;

        return matchesQuery && matchesKind && matchesTag && matchesOpen;
      });

      return { ...section, refs: sortRefs(refs) };
    }).filter((section) => section.refs.length > 0);
  }, [kind, openOnly, query, sort, tag]);

  const visibleRefs = filteredSections.flatMap((section) => section.refs);
  const featuredRefs = useMemo(
    () => visibleRefs.filter((item) => item.featured).slice(0, 6),
    [visibleRefs]
  );

  const counts = useMemo(() => {
    return {
      totalSections: SECTIONS.length,
      totalRefs: allRefs.length,
      visibleRefs: visibleRefs.length,
      openAccess: allRefs.filter((item) => item.openAccess).length,
    };
  }, [allRefs, visibleRefs.length]);

  const toggleAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    visibleRefs.forEach((item) => {
      next[item.id] = value;
    });
    setExpandedIds(next);
  };

  const resetFilters = () => {
    setQuery("");
    setKind("all");
    setTag("all");
    setSort("featured");
    setOpenOnly(false);
  };

  const copyVisibleReportNotes = () => {
    const text = visibleRefs
      .filter((item) => item.reportText)
      .map((item) => `${item.title}\n${item.reportText}`)
      .join("\n\n");

    if (text) copyText(text);
  };

  return (
  <div className="methodsWrap">
    <div className="methodsHero">
      <div className="mockHeroTop methodsHeroTop">
        <div className="methodsHeroBackRow">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="ghostBtn"
          >
            <ArrowLeft size={13} /> BACK
          </button>

        </div>

        <div className="mockHeroActions methodsHeroActions">
          <button
            type="button"
            onClick={() => copyVisibleReportNotes()}
            className="ghostBtn"
          >
            <Copy size={16} /> Copy visible report notes
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="ghostBtn"
          >
            <Printer size={16} /> Print / save PDF
          </button>
        </div>
      </div>

      <div className="testKicker methodsKicker">
        Evidence library
      </div>

      <h1 className="testTitle methodsTitle">
        Methods, references, and source support for album-cover evaluation
      </h1>

      <p className="testLead methodsLead">
        A cleaner source bank for CoverCheck: readability, thumbnail survival,
        composition, multimodal music research, platform constraints, and the role
        of cover art in artist identity and campaign building.
      </p>

          <div className="panelDark methodsAsideCard">
          <div className="panelTop">
            <div className="panelTitle">How to use this page</div>
          </div>

          <div className="panelBody">
            <div className="methodsEvidenceNote">
              <div className="methodsEvidenceLine">
                <b>Peer-reviewed</b> sources give you the strongest support for methodology claims.
              </div>
              <div className="methodsEvidenceLine">
                <b>Standards and official platform docs</b> support contrast thresholds, square-format
                constraints, and display rules.
              </div>
              <div className="methodsEvidenceLine">
                <b>Essays, museum, and history pieces</b> help explain why album covers matter
                culturally, commercially, and as identity systems.
              </div>
            </div>
          </div>
        </div>

      <div className="methodsHeroStats">
        <div className="miniCard">
          <div className="miniLabel">Sections</div>
          <div className="miniValue">{counts.totalSections}</div>
          <div className="miniSub">Evidence areas</div>
        </div>

        <div className="miniCard">
          <div className="miniLabel">Sources</div>
          <div className="miniValue">{counts.totalRefs}</div>
          <div className="miniSub">Total references</div>
        </div>

        <div className="miniCard">
          <div className="miniLabel">Visible</div>
          <div className="miniValue">{counts.visibleRefs}</div>
          <div className="miniSub">After filtering</div>
        </div>

        <div className="miniCard">
          <div className="miniLabel">Open access</div>
          <div className="miniValue">{counts.openAccess}</div>
          <div className="miniSub">Easy-to-open sources</div>
        </div>
      </div>

      <div className="methodsControls">
        <div className="methodsFilterGrid">
          <label className="methodsSearchWrap">
            <Search size={18} className="methodsInputIcon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="   Search titles, summaries, or tags"
              className="methodsSearch"
            />
          </label>

          <label className="methodsSelectWrap">
            <Filter size={17} className="methodsSelectIcon" />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "all" | EvidenceKind)}
              className="methodsSelect"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="methodsSelectWrap">
            <Layers3 size={17} className="methodsSelectIcon" />
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="methodsSelect"
            >
              <option value="all">All tags</option>
              {TAG_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="methodsSelectWrap">
            <BookOpen size={17} className="methodsSelectIcon" />
            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "featured" | "title" | "year-new" | "year-old")
              }
              className="methodsSelect"
            >
              <option value="featured">Sort: recommended first</option>
              <option value="title">Sort: title</option>
              <option value="year-new">Sort: newest</option>
              <option value="year-old">Sort: oldest</option>
            </select>
          </label>
        </div>

        <div className="pillRow">
          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            className={`pillBtn ${openOnly ? "on" : ""}`}
          >
            Open access only
          </button>

          <button type="button" onClick={() => toggleAll(true)} className="pillBtn">
            Expand all visible
          </button>

          <button type="button" onClick={() => toggleAll(false)} className="pillBtn">
            Collapse all
          </button>

          <button type="button" onClick={resetFilters} className="pillBtn">
            <X size={14} /> Reset
          </button>
        </div>
      </div>

      <hr className="mockRule" />
    </div>

    {featuredRefs.length ? (
      <section className="methodsFeatured">
        <div className="methodsFeaturedHead">
          <div>
            <div className="methodsFeaturedKicker">Best starting points</div>
            <h2 className="methodsFeaturedTitle">Foundational sources</h2>
          </div>
          <div className="methodsFeaturedNote">
            Start here when writing your core methodology page.
          </div>
        </div>

        <div className="methodsFeaturedGrid">
          {featuredRefs.map((item) => (
            <article key={item.id} className="methodsFeaturedCard">
              <div className="methodsFeaturedBadges">
                <span className="methodBadge featured">Recommended</span>
                <span className={`methodBadge ${item.kind}`}>{kindLabel(item.kind)}</span>
              </div>

              <h3 className="methodsFeaturedCardTitle">{item.title}</h3>
              <div className="methodsFeaturedCardMeta">
                {item.source} • {item.year}
              </div>

              <p className="methodsFeaturedCardText">{item.whyItMatters}</p>

              <div className="methodTagRow">
                {item.tags.slice(0, 3).map((entry) => (
                  <span key={entry} className="methodTag">
                    {entry}
                  </span>
                ))}
              </div>

              <div className="methodsFeaturedActions">
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="ghostBtn"
                >
                  <ExternalLink size={15} /> OPEN SOURCE
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    ) : null}

    <div className="methodsLayout methodsLayoutWide">
      <main className="methodsMain">
        {filteredSections.length ? (
          filteredSections.map((section) => (
            <section key={section.id} id={section.id} className="methodSection">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="methodsSectionHeader">
                    <div>
                      <div className="methodsSectionKicker">Evidence area</div>
                      <div className="panelTitle">{section.title}</div>
                      <div className="panelNote">{section.intro}</div>
                    </div>

                    <div className="methodsCountCard">
                      <div className="methodsCountLabel">Visible sources</div>
                      <div className="methodsCountValue">{section.refs.length}</div>
                    </div>
                  </div>
                </div>

                <div className="panelBody">
                  <div className="methodUseGrid">
                    <div className="methodUseCard">
                      <div className="methodUseLabel">Best used in reports</div>
                      <div className="methodUseText">{section.reportUse}</div>
                    </div>

                    <div className="methodUseCard">
                      <div className="methodUseLabel">Best used in tooltips</div>
                      <div className="methodUseText">{section.tooltipUse}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="methodRefsStack">
                {section.refs.map((item) => (
                  <SourceCard
                    key={item.id}
                    item={item}
                    expanded={Boolean(expandedIds[item.id])}
                    onToggle={() =>
                      setExpandedIds((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="panelDark">
            <div className="panelBody methodsEmptyState">
              <h2 className="methodsEmptyTitle">No sources match these filters</h2>
              <p className="miniHint">
                Try clearing the tag filter, turning off open-access-only, or using a broader
                search phrase such as genre, contrast, branding, or thumbnail.
              </p>
              <div className="methodsEmptyActions">
                <button type="button" onClick={resetFilters} className="ghostBtn">
                  Reset filters
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <aside className="methodsAside">
        <div className="panelDark methodsAsideCard">
          <div className="panelTop">
            <div className="panelTitle">Quick navigation</div>
            <div className="panelNote">Jump by evidence area</div>
          </div>

          <div className="panelBody">
            <div className="methodsNavList">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className="methodsNavBtn"
                  onClick={() =>
                    document.getElementById(section.id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <div className="methodsNavBtnTitle">{section.title}</div>
                  <div className="methodsNavBtnText">{section.refs.length} visible sources</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
);
}