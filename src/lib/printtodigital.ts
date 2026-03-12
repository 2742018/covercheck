export type PrintDigitalInput = {
  textDensity: "low" | "medium" | "high";
  edgeRisk: "low" | "medium" | "high";
  focalClarity: "low" | "medium" | "high";
  detailDensity: "low" | "medium" | "high";
  posterStyle: "minimal" | "balanced" | "dense";
};

export type PrintDigitalResult = {
  score: number;
  label: "Strong" | "Moderate" | "Fragile";
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
};

export function evaluatePrintToDigital(input: PrintDigitalInput): PrintDigitalResult {
  let score = 100;

  if (input.textDensity === "high") score -= 20;
  else if (input.textDensity === "medium") score -= 8;

  if (input.edgeRisk === "high") score -= 22;
  else if (input.edgeRisk === "medium") score -= 10;

  if (input.focalClarity === "low") score -= 24;
  else if (input.focalClarity === "medium") score -= 10;

  if (input.detailDensity === "high") score -= 18;
  else if (input.detailDensity === "medium") score -= 8;

  if (input.posterStyle === "dense") score -= 12;
  else if (input.posterStyle === "balanced") score -= 4;

  score = Math.max(0, Math.min(100, score));

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

  if (input.detailDensity === "high") {
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

  return {
    score,
    label,
    summary,
    strengths,
    risks,
    recommendations,
  };
}