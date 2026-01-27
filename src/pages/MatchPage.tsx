import React from "react";
import { useNavigate } from "react-router-dom";
import { fileToDataUrl } from "../lib/storage";
import { computePalette, type NormalizedRect } from "../analysis/metrics";
import { decodeAudioFile, analyzeAudioBuffer, type AudioFeatures } from "../analysis/audioFeatures";
import { imageDataFromDataUrl, computeCoverMood, type CoverMood } from "../analysis/covermood";

type MatchResult = {
  score: number; // 0..100
  label: "Aligned" | "Mixed" | "Mismatch";
  notes: string[];
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scoreLabel(score: number): MatchResult["label"] {
  if (score >= 75) return "Aligned";
  if (score >= 55) return "Mixed";
  return "Mismatch";
}

function computeMatch(audio: AudioFeatures, cover: CoverMood): MatchResult {
  // Intuition mapping:
  // - energy wants saturation + some complexity + mid/high brightness
  // - brightness wants brighter cover and/or cooler colors
  // - bass wants warmer cover (reds/oranges) and darker mood can fit bass-heavy
  // - dynamics wants more contrast/complexity (cover shouldn’t be too flat)

  const aEnergy = audio.energy;         // 0..1
  const aBright = audio.brightness;     // 0..1
  const aBass = audio.bass;             // 0..1
  const aDyn = audio.dynamics;          // 0..1

  const cBright = cover.brightness;     // 0..1
  const cSat = cover.saturation;        // 0..1
  const cWarm = cover.warmth;           // 0..1
  const cComp = cover.complexity;       // 0..1

  // Targets derived from audio
  const tBright = clamp01(0.25 + 0.6 * aBright + 0.2 * aEnergy);
  const tSat = clamp01(0.15 + 0.7 * aEnergy);
  const tWarm = clamp01(0.25 + 0.6 * aBass - 0.25 * aBright);
  const tComp = clamp01(0.15 + 0.55 * aEnergy + 0.35 * aDyn);

  const dBright = Math.abs(cBright - tBright);
  const dSat = Math.abs(cSat - tSat);
  const dWarm = Math.abs(cWarm - tWarm);
  const dComp = Math.abs(cComp - tComp);

  const weighted = 0.32 * dBright + 0.26 * dSat + 0.22 * dWarm + 0.20 * dComp;
  const score = Math.round(100 - weighted * 100);

  const notes: string[] = [];

  if (dBright > 0.22) {
    notes.push(
      cBright < tBright
        ? "Your track reads brighter than the cover. Consider lifting exposure, adding a lighter background, or using a high-contrast title color."
        : "Your cover is brighter than the track’s tone. Consider deeper shadows, a darker vignette, or a more muted title treatment."
    );
  }

  if (dSat > 0.22) {
    notes.push(
      cSat < tSat
        ? "The track feels more energetic than the cover palette. Try a stronger accent color, higher saturation, or bolder typography."
        : "The cover is very saturated compared to the track’s energy. Try fewer accents, softer saturation, or calmer type weight."
    );
  }

  if (dWarm > 0.22) {
    notes.push(
      cWarm < tWarm
        ? "The audio feels bass/warm, but the cover reads cool. Try warmer accents (orange/red), warmer grading, or cream/amber type."
        : "The cover reads very warm compared to the track. Try cooler accents (cyan/blue) or a more neutral/gray base."
    );
  }

  if (dComp > 0.22) {
    notes.push(
      cComp < tComp
        ? "The track has more movement than the cover. Consider adding texture, motion cues (diagonal layout), or more layered elements."
        : "The cover is visually busy relative to the track. Consider simplifying the background behind title text, reducing texture, or adding clean panels."
    );
  }

  if (notes.length === 0) {
    notes.push("Overall alignment looks strong. Next: use Analyze to confirm contrast/clutter/safe-area for your title region.");
  }

  return { score: clamp01(score / 100) ? score : 0, label: scoreLabel(score), notes };
}

export default function MatchPage() {
  const navigate = useNavigate();

  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [coverMood, setCoverMood] = React.useState<CoverMood | null>(null);

  const [audioName, setAudioName] = React.useState<string | null>(null);
  const [audioFeatures, setAudioFeatures] = React.useState<AudioFeatures | null>(null);

  const [palette, setPalette] = React.useState<ReturnType<typeof computePalette> | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const result = React.useMemo(() => {
    if (!audioFeatures || !coverMood) return null;
    return computeMatch(audioFeatures, coverMood);
  }, [audioFeatures, coverMood]);

  async function handleCover(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const url = await fileToDataUrl(file);
      setCoverUrl(url);

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
    <div className="analyzeWrap">
      <div className="analyzeHeader2">
        <button className="ghostBtn" onClick={() => navigate("/play")}>← BACK</button>

        <div className="analyzeTitle">
          <div className="h1">COVER ↔ TRACK MATCH</div>
          <div className="h2">Upload a cover and an audio file. We’ll score how well the visual “mood” fits the sound.</div>
        </div>

        <div className="analyzeActions2">
          {result && (
            <span className={`statusTag ${result.score >= 75 ? "pass" : "fail"}`}>
              {result.label.toUpperCase()} • {result.score}/100
            </span>
          )}
          <button className="ghostBtn" onClick={() => navigate("/analyze")}>GO TO ANALYZE</button>
        </div>
      </div>

      {err && (
        <div className="panelDark" style={{ marginBottom: 16 }}>
          <div className="panelBody">
            <div className="errorLine">{err}</div>
          </div>
        </div>
      )}

      <div className="matchGrid">
        {/* LEFT: inputs + preview */}
        <div className="panelDark">
          <div className="panelTop">
            <div className="panelTitle">Upload</div>
            <div className="panelNote">Nothing is uploaded to a server — everything runs locally.</div>
          </div>

          <div className="panelBody">
            <div className="matchUploadRow">
              <label className="matchUpload">
                <div className="matchUploadLabel">Cover image</div>
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

              <label className="matchUpload">
                <div className="matchUploadLabel">Audio file</div>
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

            <div className="matchPreview">
              {coverUrl ? <img src={coverUrl} alt="cover preview" /> : <div className="matchEmpty">Upload a cover to preview</div>}
            </div>

            {palette && (
              <div className="matchPalette">
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

        {/* RIGHT: metrics + match */}
        <div className="sideStack">
          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Audio features</div>
              <div className="panelNote">{audioName ? audioName : "Upload audio to see tempo + energy + tone."}</div>
            </div>

            <div className="panelBody">
              {!audioFeatures ? (
                <div className="miniHint">Tip: mp3 or wav works best. We analyze the first ~60 seconds for speed.</div>
              ) : (
                <div className="metricsGrid">
                  <div className="metricCard">
                    <div className="metricLabel">BPM</div>
                    <div className="metricValue">{audioFeatures.bpm ?? "—"}</div>
                    <div className="metricSub">Estimated tempo</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Energy</div>
                    <div className="metricValue">{Math.round(audioFeatures.energy * 100)}</div>
                    <div className="metricSub">0–100</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Brightness</div>
                    <div className="metricValue">{Math.round(audioFeatures.brightness * 100)}</div>
                    <div className="metricSub">High-frequency presence</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Bass</div>
                    <div className="metricValue">{Math.round(audioFeatures.bass * 100)}</div>
                    <div className="metricSub">Low-frequency presence</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Cover features</div>
              <div className="panelNote">Computed from overall color + edge density (visual “busyness”).</div>
            </div>

            <div className="panelBody">
              {!coverMood ? (
                <div className="miniHint">Upload a cover image to compute brightness/saturation/warmth/complexity.</div>
              ) : (
                <div className="metricsGrid">
                  <div className="metricCard">
                    <div className="metricLabel">Brightness</div>
                    <div className="metricValue">{Math.round(coverMood.brightness * 100)}</div>
                    <div className="metricSub">0–100</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Saturation</div>
                    <div className="metricValue">{Math.round(coverMood.saturation * 100)}</div>
                    <div className="metricSub">0–100</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Warmth</div>
                    <div className="metricValue">{Math.round(coverMood.warmth * 100)}</div>
                    <div className="metricSub">reds/oranges</div>
                  </div>
                  <div className="metricCard">
                    <div className="metricLabel">Complexity</div>
                    <div className="metricValue">{Math.round(coverMood.complexity * 100)}</div>
                    <div className="metricSub">edge density</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panelDark">
            <div className="panelTop">
              <div className="panelTitle">Match</div>
              <div className="panelNote">How well the cover’s visual mood aligns with the track’s sonic mood.</div>
            </div>

            <div className="panelBody">
              {!result ? (
                <div className="miniHint">Upload both a cover and audio to get a match score + suggestions.</div>
              ) : (
                <>
                  <div className="matchScoreRow">
                    <div className="matchScoreBig">{result.score}/100</div>
                    <div className="matchScoreMeta">
                      <div className="sectionHead" style={{ marginBottom: 6 }}>{result.label}</div>
                      <div className="miniSub">Use this as art direction guidance, then confirm readability on Analyze.</div>
                    </div>
                  </div>

                  <div className="suggestList" style={{ marginTop: 12 }}>
                    {result.notes.map((n, i) => (
                      <div key={i} className="suggestItem">
                        <div className="suggestTitle">Suggestion</div>
                        <div className="suggestDetail">{n}</div>
                      </div>
                    ))}
                  </div>

                  <div className="testIntroActions" style={{ marginTop: 14 }}>
                    <button className="primaryBtn" onClick={() => navigate("/analyze", { state: { dataUrl: coverUrl } })} disabled={!coverUrl}>
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
      </div>
    </div>
  );
}
