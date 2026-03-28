
export type PrintDigitalInput = {
  textDensity: "low" | "medium" | "high";
  edgeRisk: "low" | "medium" | "high";
  focalClarity: "low" | "medium" | "high";
  detailDensity: "low" | "medium" | "high";
  posterStyle: "minimal" | "balanced" | "dense";
};

export type PrintDigitalFactor = {
  key: string;
  title: string;
  level: string;
  impact: number;
  reason: string;
};

export type PrintDigitalResult = {
  score: number;
  label: "Strong" | "Moderate" | "Fragile";
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  factors: PrintDigitalFactor[];
  strongestAsset: string;
  primaryConcern: string;
  basis: string[];
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function evaluatePrintToDigital(input: PrintDigitalInput): PrintDigitalResult {
  let score = 100;
  const factors: PrintDigitalFactor[] = [];

  const applyFactor = (
    key: string,
    title: string,
    level: string,
    impact: number,
    reason: string
  ) => {
    score -= impact;
    factors.push({ key, title, level, impact, reason });
  };

  if (input.textDensity === "high") {
    applyFactor(
      "textDensity",
      "Text density",
      "High",
      20,
      "High text density usually collapses first when a print-style cover is reduced to streaming thumbnail scale."
    );
  } else if (input.textDensity === "medium") {
    applyFactor(
      "textDensity",
      "Text density",
      "Medium",
      8,
      "A moderate amount of text can still work, but it asks more from hierarchy and scale."
    );
  } else {
    applyFactor(
      "textDensity",
      "Text density",
      "Low",
      0,
      "A lighter text load is easier to preserve across small digital contexts."
    );
  }

  if (input.edgeRisk === "high") {
    applyFactor(
      "edgeRisk",
      "Edge risk",
      "High",
      22,
      "Important content near edges is more likely to fail under square crops, rounded corners, and UI overlays."
    );
  } else if (input.edgeRisk === "medium") {
    applyFactor(
      "edgeRisk",
      "Edge risk",
      "Medium",
      10,
      "Some content may be too dependent on generous margins that digital platforms do not always preserve."
    );
  } else {
    applyFactor(
      "edgeRisk",
      "Edge risk",
      "Low",
      0,
      "Important content appears less dependent on edge placement."
    );
  }

  if (input.focalClarity === "low") {
    applyFactor(
      "focalClarity",
      "Focal clarity",
      "Low",
      24,
      "Without one obvious focal anchor, the cover is harder to recognise quickly in streaming grids."
    );
  } else if (input.focalClarity === "medium") {
    applyFactor(
      "focalClarity",
      "Focal clarity",
      "Medium",
      10,
      "There is some focal structure, but the design may still need a clearer primary anchor."
    );
  } else {
    applyFactor(
      "focalClarity",
      "Focal clarity",
      "High",
      0,
      "A strong focal anchor helps the design remain recognisable in faster digital viewing conditions."
    );
  }

  if (input.detailDensity === "high") {
    applyFactor(
      "detailDensity",
      "Fine detail",
      "High",
      18,
      "High fine detail can look rich in print but often compresses into visual noise in small digital surfaces."
    );
  } else if (input.detailDensity === "medium") {
    applyFactor(
      "detailDensity",
      "Fine detail",
      "Medium",
      8,
      "Some detail is being carried, but it may not all survive reduction."
    );
  } else {
    applyFactor(
      "detailDensity",
      "Fine detail",
      "Low",
      0,
      "A lower detail load tends to translate more cleanly into thumbnail contexts."
    );
  }

  if (input.posterStyle === "dense") {
    applyFactor(
      "posterStyle",
      "Poster-style dependence",
      "Dense",
      12,
      "A dense poster-like layout often assumes slower, full-size viewing and may need simplification for digital release."
    );
  } else if (input.posterStyle === "balanced") {
    applyFactor(
      "posterStyle",
      "Poster-style dependence",
      "Balanced",
      4,
      "The layout carries some poster-style structure, but it is not fully dependent on it."
    );
  } else {
    applyFactor(
      "posterStyle",
      "Poster-style dependence",
      "Minimal",
      0,
      "A simpler poster relationship usually travels more easily across print and digital contexts."
    );
  }

  score = clamp(score, 0, 100);

  let label: PrintDigitalResult["label"] = "Fragile";
  if (score >= 78) label = "Strong";
  else if (score >= 55) label = "Moderate";

  const strengths: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  if (input.focalClarity === "high") {
    strengths.push("The design has a strong focal anchor, which helps recognition in digital contexts.");
  } else {
    risks.push("The focal point may be too weak for fast, small-scale digital viewing.");
  }

  if (input.edgeRisk === "low") {
    strengths.push("Important content appears less dependent on edge placement.");
  } else {
    risks.push("Content placed too close to edges may fail under square crops and rounded corners.");
  }

  if (input.textDensity === "low") {
    strengths.push("The amount of text is more likely to survive at thumbnail scale.");
  } else {
    risks.push("Higher text density is more likely to fail when the image is reduced.");
  }

  if (input.detailDensity === "low") {
    strengths.push("Fine detail is less likely to collapse into noise when reduced.");
  } else if (input.detailDensity === "high") {
    risks.push("High fine detail may look rich in print but collapse in streaming contexts.");
  }

  if (input.posterStyle === "dense") {
    risks.push("A dense poster-like layout may need simplification for digital use.");
  }

  if (input.textDensity !== "low") {
    recommendations.push("Reduce supporting text or consolidate the title treatment into a clearer unit.");
  }

  if (input.edgeRisk !== "low") {
    recommendations.push("Move critical content inward so it survives crop, rounding, and overlays.");
  }

  if (input.focalClarity !== "high") {
    recommendations.push("Strengthen one obvious focal anchor so the cover remains identifiable at small size.");
  }

  if (input.detailDensity !== "low") {
    recommendations.push("Simplify fine detail or rely more on tone and structure than micro-detail.");
  }

  if (input.posterStyle === "dense") {
    recommendations.push("Trim poster-like density so the composition does not depend on slow, full-size reading.");
  }

  if (!recommendations.length) {
    recommendations.push("This direction appears relatively well suited to digital contexts, but it should still be checked in Mockups and Analyze.");
  }

  let summary = "";
  if (label === "Strong") {
    summary =
      "This direction appears relatively well prepared for digital release contexts. It keeps enough clarity and structure to translate beyond print-style viewing.";
  } else if (label === "Moderate") {
    summary =
      "This direction may work across both print and digital contexts, but some layout or clarity risks are likely to appear when the artwork is reduced.";
  } else {
    summary =
      "This direction appears more dependent on print-style viewing conditions and may struggle when reduced to streaming-scale presentation.";
  }

  const sortedPenaltyFactors = factors
    .filter((item) => item.impact > 0)
    .sort((a, b) => b.impact - a.impact);

  const strongestAsset =
    strengths[0] ??
    "No single structural strength clearly dominates; the direction may rely on a combination of smaller advantages.";

  const primaryConcern =
    sortedPenaltyFactors[0]?.reason ??
    "No major structural risk stands out strongly in this estimate.";

  const basis = [
    "Text density estimates whether too much verbal information is competing for space once the cover is reduced.",
    "Edge risk checks how dependent the design is on generous margins that streaming layouts may not preserve.",
    "Focal clarity estimates whether one clear anchor remains recognisable at small size.",
    "Fine detail estimates whether the image depends on micro-detail that may compress away in digital contexts.",
    "Poster-style dependence estimates whether the layout is relying on slower, larger, print-like viewing conditions.",
  ];

  return {
    score,
    label,
    summary,
    strengths,
    risks,
    recommendations,
    factors,
    strongestAsset,
    primaryConcern,
    basis,
  };
}
