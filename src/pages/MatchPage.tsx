import React from "react";
import { useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";
import { computePalette, type NormalizedRect } from "../analysis/metrics";
import {
  decodeAudioFile,
  analyzeAudioBuffer,
  type AudioFeatures,
} from "../analysis/audioFeatures";
import {
  imageDataFromDataUrl,
  computeCoverMood,
  type CoverMood,
} from "../analysis/covermood";
import { computeMatch, type MatchResult } from "../lib/matchscoring";
import GenreReferenceMap from "../components/genrereferencemap";

const PX_OPTIONS = [300, 512, 768, 1024, 1500, 2000, 2400, 3000] as const;

function moodBucket01(v: number): "low" | "medium" | "high" {
  if (v < 0.34) return "low";
  if (v < 0.67) return "medium";
  return "high";
}

function brightnessBucket(v: number): "dark" | "mid" | "light" {
  if (v < 0.34) return "dark";
  if (v < 0.67) return "mid";
  return "light";
}

function saturationBucket(v: number): "muted" | "balanced" | "vivid" {
  if (v < 0.34) return "muted";
  if (v < 0.67) return "balanced";
  return "vivid";
}

function temperatureBucket(v: number): "cool" | "neutral" | "warm" {
  if (v < 0.34) return "cool";
  if (v < 0.67) return "neutral";
  return "warm";
}

function deriveSuggestedGenre(audio: AudioFeatures): string {
  const e = audio.energy;
  const b = audio.brightness;
  const bass = audio.bass;

  if (e > 0.75 && b > 0.6) return "EDM";
  if (e > 0.7 && bass > 0.65) return "Hip-Hop";
  if (e > 0.6 && bass > 0.55 && b < 0.55) return "Rock";
  if (e < 0.4 && b < 0.55) return "Ambient";
  if (e < 0.5 && bass < 0.5 && b > 0.5) return "Indie";
  return "Indie";
}

function percent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function bandLabel(v: number) {
  if (v < 0.34) return "Low";
  if (v < 0.67) return "Medium";
  return "High";
}

function sizeReadout(px: number) {
  if (px >= 3000) return "Recommended release/export size";
  if (px >= 2000) return "Strong working size";
  if (px >= 1000) return "Usable for drafts";
  return "Small preview / rough test size";
}

async function readImageDimensions(src: string) {
  return await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to read image dimensions"));
    img.src = src;
  });
}

export default function MatchPage() {
  const navigate = useNavigate();

  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [coverMood, setCoverMood] = React.useState<CoverMood | null>(null);
  const [coverSize, setCoverSize] = React.useState<{ width: number; height: number } | null>(null);
  const [referencePx, setReferencePx] = React.useState<number>(3000);

  const [audioName, setAudioName] = React.useState<string | null>(null);
  const [audioFeatures, setAudioFeatures] = React.useState<AudioFeatures | null>(null);

  const [palette, setPalette] =
    React.useState<ReturnType<typeof computePalette> | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const result: MatchResult | null = React.useMemo(() => {
    if (!audioFeatures || !coverMood) return null;
    return computeMatch(audioFeatures, coverMood);
  }, [audioFeatures, coverMood]);

  const suggestedGenre = React.useMemo(() => {
    if (!audioFeatures) return "Indie";
    return deriveSuggestedGenre(audioFeatures);
  }, [audioFeatures]);

  const coverMoodForGenreMap = React.useMemo(() => {
    if (!coverMood) return null;

    return {
      brightness: brightnessBucket(coverMood.brightness),
      saturation: saturationBucket(coverMood.saturation),
      temperature: temperatureBucket(coverMood.warmth),
      texture: moodBucket01(coverMood.complexity),
      symmetry: "medium" as const,
    };
  }, [coverMood]);

  const currentPxAssessment = React.useMemo(() => {
    if (!coverSize) return null;
    const shortestEdge = Math.min(coverSize.width, coverSize.height);
    if (shortestEdge >= 3000) {
      return "This cover already meets the 3000px square recommendation for a high-resolution working/export file.";
    }
    if (shortestEdge >= 2000) {
      return "This cover is usable, but increasing it toward 3000px would give more headroom for export and detailed revisions.";
    }
    if (shortestEdge >= 1000) {
      return "This size is fine for previewing, but it is likely better as a draft than a final high-resolution export.";
    }
    return "This file is best treated as a quick preview only. It is much smaller than the recommended 3000px square target.";
  }, [coverSize]);

  async function handleCover(file: File) {
    setErr(null);
    setBusy(true);

    try {
      const url = await fileToObjectUrl(file);
      setCoverUrl(url);
      setCoverSize(await readImageDimensions(url));

      const imgData = await imageDataFromDataUrl(url, 512);
      const mood = computeCoverMood(imgData);
      setCoverMood(mood);

      const full: NormalizedRect = { x: 0, y: 0, w: 1, h: 1 };
      setPalette(computePalette(imgData, full));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load cover");
    } finally {
      setBusy(false);
    }
  }

  async function handleAudio(file: File) {
    setErr(null);
    setBusy(true);

    try {
      setAudioName(file.name);
      const buf = await decodeAudioFile(file);
      const feats = analyzeAudioBuffer(buf);
      setAudioFeatures(feats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to decode audio (try mp3/wav)");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="analyzeWrap matchPageWrap">
      <div className="mockHero analyzeHero">
        <div className="mockHeroTop">
          <button className="ghostBtn" onClick={() => navigate("/play")}>
            ← BACK
          </button>

          <div className="mockHeroActions">
            <button className="ghostBtn" onClick={() => navigate("/analyze")}>
              GO TO ANALYZE
            </button>
            <button
              className="primaryBtn"
              onClick={() => navigate("/compare", { state: { leftDataUrl: coverUrl } })}
              disabled={!coverUrl}
            >
              OPEN IN COMPARE
            </button>
          </div>
        </div>

        <div className="testKicker">Visual/sonic Guidance</div>
        <div className="testTitle">Cover ↔ Track Match</div>
        <div className="testLead">
          Upload a cover and an audio file to compare the visual mood of the artwork
          with the sonic character of the track. This page is designed as art-direction
          guidance, not objective genre classification, so the goal is to explain where
          the visual direction feels aligned, where it drifts, and what to change first.
        </div>

        <div className="compareHeroBullets">
          <div className="mockBullet">
            <div className="mockBulletHead">What it does</div>
            <div className="mockBulletText">
              Compares brightness, saturation, warmth, and visual complexity against
              energy, brightness, bass, and dynamics in the audio, then turns the biggest gaps into practical art-direction notes.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">How to read it</div>
            <div className="mockBulletText">
              A high score means the cover is sending a similar mood to the track. A lower score does not mean the cover is bad; it means the visual direction may be telling a different story.
            </div>
          </div>
          <div className="mockBullet">
            <div className="mockBulletHead">Best next step</div>
            <div className="mockBulletText">
              Use this page to adjust mood and tone first, then move into Analyze to confirm readability, text placement, and thumbnail performance for the title / artist region.
            </div>
          </div>
        </div>

        {result && (
          <div className="metaRow" style={{ marginTop: 16 }}>
            <span className={`statusTag ${result.score >= 75 ? "pass" : result.score >= 55 ? "" : "fail"}`}>
              {result.label.toUpperCase()} • {result.score}/100
            </span>
            {audioFeatures && <span className="tag">suggested genre lens: {suggestedGenre}</span>}
            {audioName && <span className="tag">{audioName}</span>}
            <span className="tag">recommended square size: 3000px</span>
          </div>
        )}

        <hr className="mockRule" />
      </div>

      {err && (
        <div className="panelDark" style={{ marginBottom: 16 }}>
          <div className="panelBody">
            <div className="errorLine">{err}</div>
          </div>
        </div>
      )}

      <div className="matchGrid">
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Inputs + preview</div>
            <div className="panelNote">
              Nothing is uploaded to a server. All processing happens locally in your browser.
            </div>
          </div>

          <div className="panelBody">
            <div className="matchUploadRow">
              <label className="matchUploadCard">
                <div className="matchUploadHead">Cover image</div>
                <div className="matchUploadText">
                  Upload artwork to extract brightness, saturation, warmth, complexity, palette, and current pixel size.
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCover(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={busy}
                />
              </label>

              <label className="matchUploadCard">
                <div className="matchUploadHead">Audio file</div>
                <div className="matchUploadText">
                  Upload a track to estimate tempo, energy, brightness, bass, and dynamics.
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleAudio(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={busy}
                />
              </label>
            </div>

            <div className="matchPreviewPanel">
              {coverUrl ? (
                <img src={coverUrl} alt="cover preview" className="matchPreviewImg" />
              ) : (
                <div className="matchEmpty">Upload a cover to preview it here</div>
              )}
            </div>

            <div className="panelDark" style={{ marginTop: 14, background: "rgba(255,255,255,0.03)" }}>
              <div className="panelBody" style={{ padding: 14 }}>
                <div className="sectionHead" style={{ marginBottom: 8 }}>Recommended pixel size</div>
                <div className="miniSub" style={{ marginBottom: 10 }}>
                  3000px is the recommended square working/export size here. Smaller options are still useful for previews and draft testing.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {PX_OPTIONS.map((px) => (
                    <button
                      key={px}
                      type="button"
                      className={referencePx === px ? "primaryBtn" : "ghostBtn"}
                      onClick={() => setReferencePx(px)}
                    >
                      {px}px
                    </button>
                  ))}
                </div>
                <div className="miniHint">
                  Selected reference: <strong>{referencePx}px</strong> — {sizeReadout(referencePx)}.
                </div>
                {coverSize && (
                  <div className="miniHint" style={{ marginTop: 8 }}>
                    Current cover: <strong>{coverSize.width} × {coverSize.height}px</strong>. {currentPxAssessment}
                  </div>
                )}
              </div>
            </div>

            {palette && (
              <div className="matchPaletteBlock">
                <div className="miniLabel">Cover palette</div>
                <div className="paletteStrip" style={{ justifyContent: "flex-start" }}>
                  {palette.image.slice(0, 8).map((c) => (
                    <span key={c} className="chip small" style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sideStack">
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Audio features</div>
              <div className="panelNote">
                {audioName ? audioName : "Upload audio to see estimated track features."}
              </div>
            </div>

            <div className="panelBody">
              {!audioFeatures ? (
                <div className="miniHint">
                  Tip: mp3 or wav tends to work best. For speed, the tool focuses on a short analysis window rather than the full track.
                </div>
              ) : (
                <>
                  <div className="metricsGrid">
                    <div className="metricCard">
                      <div className="metricLabel">BPM</div>
                      <div className="metricValue">{audioFeatures.bpm ?? "—"}</div>
                      <div className="metricSub">Estimated tempo from the energy envelope</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Energy</div>
                      <div className="metricValue">{Math.round(audioFeatures.energy * 100)}</div>
                      <div className="metricSub">Overall intensity from RMS level</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Brightness</div>
                      <div className="metricValue">{Math.round(audioFeatures.brightness * 100)}</div>
                      <div className="metricSub">High-frequency presence relative to the whole signal</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Bass</div>
                      <div className="metricValue">{Math.round(audioFeatures.bass * 100)}</div>
                      <div className="metricSub">Low-frequency weight relative to the whole signal</div>
                    </div>
                  </div>

                  <div className="suggestList" style={{ marginTop: 14 }}>
                    <div className="suggestItem">
                      <div className="suggestTitle">How these values are calculated</div>
                      <div className="suggestDetail">
                        Energy comes from RMS intensity, brightness compares high-frequency content against the total signal, bass compares low-frequency content against the total signal, and BPM is estimated from repeating peaks in the short-term energy envelope.
                      </div>
                    </div>
                    <div className="suggestItem">
                      <div className="suggestTitle">What this means for art direction</div>
                      <div className="suggestDetail">
                        Brighter, more energetic tracks usually support lighter or more vivid covers; bass-heavier tracks often pair more naturally with warmer or more grounded visual treatment; higher dynamics often support stronger movement or visual layering.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Cover features</div>
              <div className="panelNote">
                Computed from overall colour, luminance, and visual complexity in the image.
              </div>
            </div>

            <div className="panelBody">
              {!coverMood ? (
                <div className="miniHint">
                  Upload a cover image to compute brightness, saturation, warmth, and complexity.
                </div>
              ) : (
                <>
                  <div className="metricsGrid">
                    <div className="metricCard">
                      <div className="metricLabel">Brightness</div>
                      <div className="metricValue">{Math.round(coverMood.brightness * 100)}</div>
                      <div className="metricSub">Average luminance • {bandLabel(coverMood.brightness)}</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Saturation</div>
                      <div className="metricValue">{Math.round(coverMood.saturation * 100)}</div>
                      <div className="metricSub">Average colour intensity • {bandLabel(coverMood.saturation)}</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Warmth</div>
                      <div className="metricValue">{Math.round(coverMood.warmth * 100)}</div>
                      <div className="metricSub">Bias toward red / orange hues • {bandLabel(coverMood.warmth)}</div>
                    </div>

                    <div className="metricCard">
                      <div className="metricLabel">Complexity</div>
                      <div className="metricValue">{Math.round(coverMood.complexity * 100)}</div>
                      <div className="metricSub">Edge-density proxy for visual busyness • {bandLabel(coverMood.complexity)}</div>
                    </div>
                  </div>

                  <div className="suggestList" style={{ marginTop: 14 }}>
                    <div className="suggestItem">
                      <div className="suggestTitle">How these values are calculated</div>
                      <div className="suggestDetail">
                        Brightness is based on average image luminance, saturation is averaged from HSV saturation, warmth estimates how strongly the image leans toward warm hues, and complexity uses luminance-edge density as a proxy for how busy the image feels.
                      </div>
                    </div>
                    <div className="suggestItem">
                      <div className="suggestTitle">What this means visually</div>
                      <div className="suggestDetail">
                        A high complexity score does not automatically mean the cover is bad. It means the image may feel dense, textured, or active, so you may need stronger hierarchy and clearer title support when moving into Analyze.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          <div className="panelDark matchResultFull">
            <div className="panelTop">
              <div className="panelTitle">Match result</div>
              <div className="panelNote">
                How well the cover’s visual mood aligns with the track’s sonic character.
              </div>
            </div>

            <div className="panelBody">
              {!result ? (
                <div className="miniHint">
                  Upload both a cover and an audio file to generate a match score, factor breakdown, and direction notes.
                </div>
              ) : (
                <>
                  <div className="matchScoreHero">
                    <div className="matchScoreBig">{result.score}/100</div>
                    <div className="matchScoreMeta">
                      <div className="sectionHead" style={{ marginBottom: 6 }}>
                        {result.label}
                      </div>
                      <div className="miniSub">{result.summary}</div>
                    </div>
                  </div>

                  <div className="suggestList" style={{ marginTop: 14 }}>
                    {result.strongestMatch && (
                      <div className="suggestItem">
                        <div className="suggestTitle">Strongest match</div>
                        <div className="suggestDetail">{result.strongestMatch}</div>
                      </div>
                    )}
                    {result.biggestGap && (
                      <div className="suggestItem">
                        <div className="suggestTitle">Biggest mismatch</div>
                        <div className="suggestDetail">{result.biggestGap}</div>
                      </div>
                    )}
                  </div>

                  <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>
                    Main score factors
                  </div>
                  <div className="suggestList">
                    {result.dimensions.map((item) => (
                      <div key={item.key} className="suggestItem">
                        <div className="suggestTitle">
                          {item.title} • {Math.round(item.weight * 100)}% weight
                        </div>
                        <div className="suggestDetail" style={{ marginBottom: 8 }}>
                          {item.whyItMatters}
                        </div>
                        <div className="miniHint" style={{ marginBottom: 6 }}>
                          Cover value: <strong>{percent(item.coverValue)}</strong> • Audio target: <strong>{percent(item.targetValue)}</strong> • Gap: <strong>{percent(item.difference)}</strong>
                        </div>
                        <div className="miniHint" style={{ marginBottom: 6 }}>
                          Basis: {item.basis}
                        </div>
                        <div className="miniSub">{item.suggestion}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>
                    Most important changes
                  </div>
                  <div className="suggestList">
                    {result.notes.map((n, i) => (
                      <div key={i} className="suggestItem">
                        <div className="suggestTitle">Priority {i + 1}</div>
                        <div className="suggestDetail">{n}</div>
                      </div>
                    ))}
                  </div>

                  <div className="sectionHead" style={{ marginTop: 18, marginBottom: 10 }}>
                    How the score is built
                  </div>
                  <div className="suggestList">
                    {result.scoreBasis.map((item) => (
                      <div key={item} className="suggestItem">
                        <div className="suggestDetail">{item}</div>
                      </div>
                    ))}
                  </div>

                  <div className="readyActions" style={{ marginTop: 16 }}>
                    <button
                      className="primaryBtn"
                      onClick={() =>
                        navigate("/analyze", { state: { dataUrl: coverUrl } })
                      }
                      disabled={!coverUrl}
                    >
                      ANALYZE THIS COVER
                    </button>
                    <button className="ghostBtn" onClick={() => navigate("/test")}>
                      TAKE DESIGN TEST
                    </button>
                  </div>
                </>
              )}
            </div>
            
        </div>
      </div>

      <GenreReferenceMap
        initialGenre={suggestedGenre as any}
        coverMood={coverMoodForGenreMap}
      />
    </div>
  );
}
