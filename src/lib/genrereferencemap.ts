export type GenreReferenceKey =
  | "Pop"
  | "Hip-Hop"
  | "EDM"
  | "Rock"
  | "Metal"
  | "Ambient"
  | "Lo-fi"
  | "Jazz"
  | "Classical"
  | "Indie"
  | "Folk";

export type GenreReferenceProfile = {
  key: GenreReferenceKey;
  title: string;
  shortDescription: string;
  moodTags: string[];
  commonTraits: string[];
  colorLogic: string[];
  typographyLogic: string[];
  compositionLogic: string[];
  cautionNotes: string[];
  practicalUse: string[];
  referencePalette: string[];
};

export const GENRE_REFERENCE_MAP: Record<GenreReferenceKey, GenreReferenceProfile> = {
  Pop: {
    key: "Pop",
    title: "Pop",
    shortDescription:
      "High clarity, immediate recognition, and strong emphasis are common. Covers often work best when they remain legible and distinctive at a glance.",
    moodTags: ["bright", "confident", "clean", "immediate"],
    commonTraits: [
      "One clear focal point",
      "Bold or highly controlled typography",
      "Strong thumbnail identity",
      "Readable hierarchy at small size",
    ],
    colorLogic: [
      "Often uses one vivid accent plus a simpler supporting base",
      "Warm and energetic palettes are common",
      "High separation between focal colours helps recognition",
    ],
    typographyLogic: [
      "Large, direct, high-impact title treatment often works well",
      "Weight and spacing usually matter more than ornate styling",
      "Small or delicate text tends to underperform in crowded contexts",
    ],
    compositionLogic: [
      "Simple centre-weighted or clearly structured layouts are common",
      "Visual clutter usually weakens the immediate impact",
      "Strong hierarchy helps the cover survive in streaming grids",
    ],
    cautionNotes: [
      "Overcomplicated layouts can lose recognizability quickly",
      "Low-contrast or decorative type can weaken first-read clarity",
    ],
    practicalUse: [
      "Use this reference when aiming for energetic, release-ready clarity",
      "Works well when you want fast visual communication and broad readability",
    ],
    referencePalette: ["#ff4d6d", "#ffd166", "#06d6a0", "#118ab2"],
  },

  "Hip-Hop": {
    key: "Hip-Hop",
    title: "Hip-Hop",
    shortDescription:
      "Often relies on bold contrast, strong presence, and a clear visual attitude. Texture can be high, but hierarchy still needs to hold.",
    moodTags: ["assertive", "bold", "high-contrast", "graphic"],
    commonTraits: [
      "Strong visual confidence",
      "Bold typography or iconic logo-like text",
      "Controlled aggression in contrast or framing",
      "Dense imagery can work if the structure stays clear",
    ],
    colorLogic: [
      "Often uses dark bases with bright contrast accents",
      "Neutrals plus one forceful accent can be very effective",
      "High tonal separation matters more than subtle colour nuance",
    ],
    typographyLogic: [
      "Heavy, direct type often performs well",
      "Small corner text is risky",
      "Letterforms usually need strong separation from the image",
    ],
    compositionLogic: [
      "Can support asymmetry and edge energy",
      "Dense visuals can work if one main anchor remains obvious",
      "Clarity still matters at thumbnail scale",
    ],
    cautionNotes: [
      "Overly edge-bound text may fail in cropped or rounded contexts",
      "Excessive texture behind title areas can reduce legibility",
    ],
    practicalUse: [
      "Use this reference when evaluating covers with bold attitude and heavier visual weight",
      "Helpful when deciding whether a design feels powerful or simply crowded",
    ],
    referencePalette: ["#111111", "#f2f2f2", "#ffdd00", "#d00000"],
  },

  EDM: {
    key: "EDM",
    title: "EDM",
    shortDescription:
      "Often driven by contrast, saturation, glow, and graphic intensity. Covers usually benefit from a strong visual centre and clear distinction.",
    moodTags: ["neon", "energetic", "graphic", "synthetic"],
    commonTraits: [
      "Saturated accents",
      "Graphic or digitally polished treatment",
      "High-energy identity",
      "Clear visual hook",
    ],
    colorLogic: [
      "Cool neon colours on darker bases are common",
      "Glow-like relationships often help the mood",
      "Accent contrast tends to matter more than subtle harmony",
    ],
    typographyLogic: [
      "Type often needs to be robust enough to survive glow-heavy imagery",
      "Thin or overly compressed text can disappear quickly",
      "Short, punchy title treatments often work best",
    ],
    compositionLogic: [
      "Graphic central forms are common",
      "Strong shape language often helps the cover feel intentional",
      "Overly diffuse layouts may feel weaker in streaming contexts",
    ],
    cautionNotes: [
      "Heavy effects can make the cover feel blurred or visually muddy at small size",
      "Colour energy should not replace hierarchy",
    ],
    practicalUse: [
      "Use this reference when evaluating high-energy, synthetic, or club-oriented visual directions",
      "Helpful when testing whether a cover feels vivid without losing structure",
    ],
    referencePalette: ["#00f5ff", "#7b2cff", "#ff3df2", "#0b0c0e"],
  },

  Rock: {
    key: "Rock",
    title: "Rock",
    shortDescription:
      "Often balances grit, texture, and attitude with enough structure to remain readable and memorable.",
    moodTags: ["textured", "raw", "grounded", "forceful"],
    commonTraits: [
      "Texture and wear can contribute positively",
      "Midtone-heavy palettes are common",
      "A strong symbol, photograph, or composition anchor often helps",
      "Type can be condensed or assertive",
    ],
    colorLogic: [
      "Often uses darker or more muted bases",
      "Warm neutrals, greys, and rougher colour relationships are common",
      "Mood often comes from texture + tone rather than brightness",
    ],
    typographyLogic: [
      "Type often needs enough contrast to survive rough textures",
      "Logo-like titling can work well",
      "Very small or delicate secondary text is often risky",
    ],
    compositionLogic: [
      "Can support asymmetry and edge roughness",
      "Texture helps mood, but one calmer zone usually improves readability",
      "Clear focal structure still matters",
    ],
    cautionNotes: [
      "Texture can quickly become clutter",
      "Too little separation between text and rough imagery weakens performance",
    ],
    practicalUse: [
      "Use this reference when testing covers that depend on grit, attitude, or rougher visual tone",
      "Helpful when deciding whether the image feels powerful or simply overloaded",
    ],
    referencePalette: ["#111111", "#d9d9d9", "#b08d57", "#5a5a5a"],
  },

  Metal: {
    key: "Metal",
    title: "Metal",
    shortDescription:
      "Often very dark, dense, and intense, but still benefits from strong isolation of logos or key text.",
    moodTags: ["dark", "dense", "extreme", "heavy"],
    commonTraits: [
      "Very dark tonal bases",
      "Dense imagery or highly stylized marks",
      "High contrast hierarchy is often essential",
      "Strong mood takes priority, but readability still matters",
    ],
    colorLogic: [
      "Dark greys, black, silver, and colder tones are common",
      "Palette range may be narrow, so tonal contrast becomes critical",
    ],
    typographyLogic: [
      "Band logos or title marks often need isolation from background noise",
      "Thin detail can fail quickly in thumbnails",
      "Supporting type needs stronger separation than expected",
    ],
    compositionLogic: [
      "Can support density and complexity",
      "A strong structural anchor still helps the image hold together",
      "Without hierarchy, covers can collapse into visual noise",
    ],
    cautionNotes: [
      "Dense imagery can destroy legibility at small sizes",
      "Logo placement near corners is especially risky",
    ],
    practicalUse: [
      "Use this reference when evaluating extreme or very dark cover directions",
      "Helpful for deciding whether mood is being preserved without losing all clarity",
    ],
    referencePalette: ["#0b0c0e", "#2b2b2b", "#e6e6e6", "#8a8a8a"],
  },

  Ambient: {
    key: "Ambient",
    title: "Ambient",
    shortDescription:
      "Usually calmer, mood-driven, and less aggressive. Covers often rely on space, restraint, and lower clutter.",
    moodTags: ["calm", "spacious", "soft", "atmospheric"],
    commonTraits: [
      "Reduced clutter",
      "Soft gradients or low-detail image zones",
      "Minimal type",
      "Mood-first but still controlled",
    ],
    colorLogic: [
      "Cooler and quieter palettes are common",
      "Muted contrasts can work if hierarchy remains intentional",
      "Subtle separation often matters more than saturation",
    ],
    typographyLogic: [
      "Typography is often sparse and understated",
      "Thin treatments may need support to survive at small scale",
      "Overly decorative text can disrupt calmness",
    ],
    compositionLogic: [
      "Negative space is often useful",
      "Simple, quiet structures often feel strongest",
      "Low clutter supports readability and atmosphere at once",
    ],
    cautionNotes: [
      "Too little contrast can turn subtle into unreadable",
      "Very soft imagery can flatten if there is no tonal anchor",
    ],
    practicalUse: [
      "Use this reference when evaluating mood-first covers with restrained visual language",
      "Helpful when checking whether calmness is still readable rather than vague",
    ],
    referencePalette: ["#0b1320", "#1c2541", "#5bc0be", "#f1f5f9"],
  },

  "Lo-fi": {
    key: "Lo-fi",
    title: "Lo-fi",
    shortDescription:
      "Typically warm, soft, and nostalgic, with gentler contrast and more intimate visual tone.",
    moodTags: ["nostalgic", "soft", "warm", "intimate"],
    commonTraits: [
      "Muted warmth",
      "Gentle contrast",
      "Illustrative or textured treatment",
      "Relaxed, personal tone",
    ],
    colorLogic: [
      "Warm muted palettes are common",
      "Low-intensity colour relationships often help the mood",
      "Too little tonal separation can make covers feel washed out",
    ],
    typographyLogic: [
      "Soft styles can work, but text still needs enough weight",
      "Small text often needs more support than expected",
      "Simple type treatments tend to age better than ornate ones",
    ],
    compositionLogic: [
      "Can support asymmetry and softness",
      "A strong central cue still helps identity at thumbnail size",
      "Illustrative complexity should not overwhelm title areas",
    ],
    cautionNotes: [
      "Muted palettes can flatten very easily",
      "A soft mood should not eliminate hierarchy",
    ],
    practicalUse: [
      "Use this reference when checking whether a warm, low-intensity direction still feels intentional and clear",
      "Helpful when deciding if a cover feels atmospheric or simply too weak",
    ],
    referencePalette: ["#f2e9e4", "#c9ada7", "#22223b", "#4a4e69"],
  },

  Jazz: {
    key: "Jazz",
    title: "Jazz",
    shortDescription:
      "Often balances elegance, warmth, and typographic structure. Hierarchy and restraint can be especially important.",
    moodTags: ["elegant", "warm", "structured", "expressive"],
    commonTraits: [
      "Poster-like structure can work well",
      "Typographic hierarchy matters",
      "Warm accents often support mood",
      "Space and balance often help credibility",
    ],
    colorLogic: [
      "Warm neutrals and darker bases are common",
      "Gold, bronze, cream, and muted deep tones often work well",
      "Colour tends to support sophistication rather than aggression",
    ],
    typographyLogic: [
      "Structured type systems often help",
      "Hierarchy is usually more important than visual loudness",
      "Smaller type may need stronger tonal support",
    ],
    compositionLogic: [
      "Balanced layouts often feel natural here",
      "Poster logic and visual order can strengthen the identity",
      "Overbusy imagery can reduce elegance quickly",
    ],
    cautionNotes: [
      "Overloading the image weakens the sense of refinement",
      "Under-contrasted type can make structured layouts feel fragile",
    ],
    practicalUse: [
      "Use this reference when evaluating covers that aim for sophistication, rhythm, and strong typographic order",
      "Helpful for checking whether the cover feels composed rather than generic",
    ],
    referencePalette: ["#1b1b1b", "#f5f1e8", "#b08968", "#3d405b"],
  },

  Classical: {
    key: "Classical",
    title: "Classical",
    shortDescription:
      "Usually benefits from order, clarity, and enough tonal contrast to support smaller or more formal text.",
    moodTags: ["formal", "clear", "ordered", "measured"],
    commonTraits: [
      "Structured hierarchy",
      "Generous spacing",
      "Clear information presentation",
      "Neutral or restrained visual tone",
    ],
    colorLogic: [
      "Neutral bases are common",
      "Muted elegance often matters more than saturation",
      "Contrast needs to remain strong enough for smaller formal text",
    ],
    typographyLogic: [
      "Hierarchy is often central",
      "Formal information stacks need clarity",
      "Small text becomes risky quickly if contrast weakens",
    ],
    compositionLogic: [
      "Balanced, ordered layouts usually perform well",
      "Less clutter generally supports the genre expectations",
      "A formal structure often helps communicate seriousness",
    ],
    cautionNotes: [
      "Overly decorative or busy layouts can feel off-genre",
      "Weak text contrast can break the sense of professionalism",
    ],
    practicalUse: [
      "Use this reference when checking whether a cover feels ordered, credible, and readable",
      "Helpful for deciding whether restraint is functioning as clarity rather than emptiness",
    ],
    referencePalette: ["#f7f7f2", "#1b1b1b", "#6c757d", "#c9b37e"],
  },

  Indie: {
    key: "Indie",
    title: "Indie",
    shortDescription:
      "Often allows more concept-led flexibility, but still benefits from one clear visual idea and enough distinction to remain memorable.",
    moodTags: ["conceptual", "textured", "distinctive", "asymmetric"],
    commonTraits: [
      "Distinctive concept or treatment",
      "Muted bases with one deliberate accent",
      "Controlled asymmetry can work well",
      "Texture is often allowed",
    ],
    colorLogic: [
      "Muted palettes are common",
      "One accent colour often helps identity",
      "Colour often supports character rather than brightness",
    ],
    typographyLogic: [
      "Type can be quieter than in pop, but still needs intention",
      "Small or low-contrast text can feel accidental rather than subtle",
      "A stronger title zone can help unusual concepts survive in thumbnails",
    ],
    compositionLogic: [
      "Asymmetry often works well here",
      "Distinctive arrangement matters more than standard symmetry",
      "The image still benefits from one clear anchor",
    ],
    cautionNotes: [
      "Conceptual does not automatically mean clear",
      "Muted + textured can become muddy quickly",
    ],
    practicalUse: [
      "Use this reference when evaluating whether a cover feels distinctive, intentional, and coherent",
      "Helpful when checking whether a more unusual design still holds together in context",
    ],
    referencePalette: ["#e6e1d6", "#2b2d42", "#ef233c", "#8d99ae"],
  },

  Folk: {
    key: "Folk",
    title: "Folk",
    shortDescription:
      "Often leans toward natural tones, warmth, and softer composition while still needing enough contrast and clarity to hold up digitally.",
    moodTags: ["earthy", "natural", "warm", "grounded"],
    commonTraits: [
      "Earthy colours",
      "Organic textures",
      "Subtle but readable structure",
      "Gentler overall tone",
    ],
    colorLogic: [
      "Greens, browns, creams, and natural neutrals are common",
      "Low-saturation warmth often supports the mood",
      "Too little tonal contrast can weaken readability",
    ],
    typographyLogic: [
      "Typography can be understated but still needs support",
      "Warm, human-feeling type choices often work well",
      "Small delicate text can vanish quickly if tones are too close",
    ],
    compositionLogic: [
      "Centred or softly balanced compositions often feel natural",
      "Organic imagery can work well if one clear area remains stable",
      "Too much visual softness can reduce identity",
    ],
    cautionNotes: [
      "Earthy tones can collapse together if they are too similar",
      "A calm tone still needs some hierarchy to survive at small sizes",
    ],
    practicalUse: [
      "Use this reference when evaluating natural, intimate, or earth-toned visual directions",
      "Helpful for deciding whether the cover feels grounded and intentional rather than too muted",
    ],
    referencePalette: ["#3a5a40", "#a3b18a", "#dad7cd", "#6b705c"],
  },
};


export type GenreAlignmentDimension = {
  key: keyof CoverMoodInput;
  title: string;
  inputValue: string;
  acceptedValues: string[];
  matches: boolean;
  whyItMatters: string;
  advice: string;
};

export type GenreAlignmentResult = {
  score: number;
  label: "Strong" | "Moderate" | "Loose";
  strengths: string[];
  cautions: string[];
  summary: string;
  dimensions: GenreAlignmentDimension[];
};

type CoverMoodInput = {
  brightness: "dark" | "mid" | "light";
  saturation: "muted" | "balanced" | "vivid";
  temperature: "cool" | "neutral" | "warm";
  texture: "low" | "medium" | "high";
  symmetry: "low" | "medium" | "high";
};

const genreTargets: Record<
  GenreReferenceKey,
  {
    brightness: CoverMoodInput["brightness"][];
    saturation: CoverMoodInput["saturation"][];
    temperature: CoverMoodInput["temperature"][];
    texture: CoverMoodInput["texture"][];
    symmetry: CoverMoodInput["symmetry"][];
  }
> = {
  Pop: {
    brightness: ["mid", "light"],
    saturation: ["balanced", "vivid"],
    temperature: ["warm", "neutral"],
    texture: ["low", "medium"],
    symmetry: ["medium", "high"],
  },
  "Hip-Hop": {
    brightness: ["dark", "mid"],
    saturation: ["balanced", "vivid"],
    temperature: ["neutral", "warm"],
    texture: ["medium", "high"],
    symmetry: ["low", "medium"],
  },
  EDM: {
    brightness: ["dark", "mid"],
    saturation: ["vivid"],
    temperature: ["cool", "neutral"],
    texture: ["medium", "high"],
    symmetry: ["medium", "high"],
  },
  Rock: {
    brightness: ["dark", "mid"],
    saturation: ["muted", "balanced"],
    temperature: ["neutral", "warm"],
    texture: ["medium", "high"],
    symmetry: ["low", "medium"],
  },
  Metal: {
    brightness: ["dark"],
    saturation: ["muted", "balanced"],
    temperature: ["neutral", "cool"],
    texture: ["high"],
    symmetry: ["low", "medium"],
  },
  Ambient: {
    brightness: ["dark", "mid"],
    saturation: ["muted", "balanced"],
    temperature: ["cool", "neutral"],
    texture: ["low", "medium"],
    symmetry: ["medium", "high"],
  },
  "Lo-fi": {
    brightness: ["mid", "light"],
    saturation: ["muted", "balanced"],
    temperature: ["warm", "neutral"],
    texture: ["medium"],
    symmetry: ["low", "medium"],
  },
  Jazz: {
    brightness: ["dark", "mid"],
    saturation: ["muted", "balanced"],
    temperature: ["warm", "neutral"],
    texture: ["low", "medium"],
    symmetry: ["medium", "high"],
  },
  Classical: {
    brightness: ["light", "mid"],
    saturation: ["muted", "balanced"],
    temperature: ["neutral", "warm"],
    texture: ["low"],
    symmetry: ["high"],
  },
  Indie: {
    brightness: ["mid", "light"],
    saturation: ["muted", "balanced"],
    temperature: ["neutral", "warm"],
    texture: ["medium", "high"],
    symmetry: ["low", "medium"],
  },
  Folk: {
    brightness: ["mid", "light"],
    saturation: ["muted", "balanced"],
    temperature: ["warm", "neutral"],
    texture: ["medium"],
    symmetry: ["medium", "high"],
  },
};

const dimensionMeta: Record<
  keyof CoverMoodInput,
  { title: string; whyItMatters: string; advice: string }
> = {
  brightness: {
    title: "Brightness range",
    whyItMatters:
      "Brightness strongly affects first impression and whether the cover feels open, heavy, intimate, or aggressive for that genre.",
    advice:
      "Adjust exposure, tonal grading, or the light/dark balance of the main image if this feels off."
  },
  saturation: {
    title: "Saturation level",
    whyItMatters:
      "Saturation shapes how energetic, restrained, polished, or raw the cover feels.",
    advice:
      "Increase or reduce colour intensity rather than changing every design element at once."
  },
  temperature: {
    title: "Warm / cool temperature",
    whyItMatters:
      "Warmth and coolness affect emotional direction and can quickly pull the image toward or away from genre expectations.",
    advice:
      "Shift grading, accents, or dominant image hues to better support the intended mood."
  },
  texture: {
    title: "Texture level",
    whyItMatters:
      "Texture changes whether the cover feels smooth, rough, atmospheric, or dense.",
    advice:
      "Add or remove grain, layering, edge detail, or background texture depending on the direction you want."
  },
  symmetry: {
    title: "Balance / symmetry",
    whyItMatters:
      "Structural balance affects whether the design feels formal, stable, raw, or off-centre in a useful way.",
    advice:
      "Reposition the focal point or rebalance the layout if the structure feels too rigid or too unstable for the genre."
  },
};

export function evaluateGenreAlignment(
  genre: GenreReferenceKey,
  input: CoverMoodInput
): GenreAlignmentResult {
  const target = genreTargets[genre];

  const dimensions: GenreAlignmentDimension[] = [
    {
      key: "brightness",
      title: dimensionMeta.brightness.title,
      inputValue: input.brightness,
      acceptedValues: target.brightness,
      matches: target.brightness.includes(input.brightness),
      whyItMatters: dimensionMeta.brightness.whyItMatters,
      advice: dimensionMeta.brightness.advice,
    },
    {
      key: "saturation",
      title: dimensionMeta.saturation.title,
      inputValue: input.saturation,
      acceptedValues: target.saturation,
      matches: target.saturation.includes(input.saturation),
      whyItMatters: dimensionMeta.saturation.whyItMatters,
      advice: dimensionMeta.saturation.advice,
    },
    {
      key: "temperature",
      title: dimensionMeta.temperature.title,
      inputValue: input.temperature,
      acceptedValues: target.temperature,
      matches: target.temperature.includes(input.temperature),
      whyItMatters: dimensionMeta.temperature.whyItMatters,
      advice: dimensionMeta.temperature.advice,
    },
    {
      key: "texture",
      title: dimensionMeta.texture.title,
      inputValue: input.texture,
      acceptedValues: target.texture,
      matches: target.texture.includes(input.texture),
      whyItMatters: dimensionMeta.texture.whyItMatters,
      advice: dimensionMeta.texture.advice,
    },
    {
      key: "symmetry",
      title: dimensionMeta.symmetry.title,
      inputValue: input.symmetry,
      acceptedValues: target.symmetry,
      matches: target.symmetry.includes(input.symmetry),
      whyItMatters: dimensionMeta.symmetry.whyItMatters,
      advice: dimensionMeta.symmetry.advice,
    },
  ];

  const matches = dimensions.filter((item) => item.matches).length;
  const score = Math.round((matches / dimensions.length) * 100);

  let label: GenreAlignmentResult["label"] = "Loose";
  if (score >= 80) label = "Strong";
  else if (score >= 55) label = "Moderate";

  const strengths = dimensions
    .filter((item) => item.matches)
    .map(
      (item) =>
        `${item.title} supports this genre direction (${item.inputValue} sits within ${item.acceptedValues.join(" / ")}).`
    );

  const cautions = dimensions
    .filter((item) => !item.matches)
    .map(
      (item) =>
        `${item.title} is less typical here (${item.inputValue} vs ${item.acceptedValues.join(" / ")}). ${item.advice}`
    );

  const summary =
    label === "Strong"
      ? "Your current cover mood broadly fits the chosen reference direction. That does not make it correct, but it means the main genre signals are lining up."
      : label === "Moderate"
      ? "Some cues support this genre direction, while others pull away from it. This can still work if the mismatch is intentional."
      : "The current mood sits some distance from the chosen genre reference. That may be deliberate, but it is likely to read as a looser fit to genre expectations.";

  return {
    score,
    label,
    strengths,
    cautions,
    summary,
    dimensions,
  };
}
