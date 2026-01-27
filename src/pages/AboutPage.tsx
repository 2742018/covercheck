import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/2742018/covercheck",
  university: "https://www.gla.ac.uk/",
};

export default function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("lightMode");
    return () => document.body.classList.remove("lightMode");
  }, []);

  return (
    <div className="aboutPage">
      <header className="aboutHero">
        <div>
          <div className="aboutKicker">COVERCHECK</div>
          <h1 className="aboutTitle">About</h1>
        </div>

        <div className="aboutHeroRight">
          <button className="ghostBtn" onClick={() => navigate("/analyze")}>
            BACK TO ANALYZE
          </button>
        </div>
      </header>

      <p className="aboutLead">
        CoverCheck is an album cover <b>readability + presentation</b> tool designed around how music artwork is actually
        encountered today: as <b>small, square thumbnails</b> in streaming grids, playlists, and “now playing” views—often
        <b> cropped</b>, <b>corner-rounded</b>, and partially covered by <b>UI overlays</b>.
        <br />
        <br />
        Instead of judging the entire image in a generic way, CoverCheck focuses on the part that most often fails in real
        listening contexts: the <b>title / artist region</b>. You select that region, then the tool estimates the most
        common failure modes—<b>low contrast</b>, <b>busy texture behind letters</b>, and <b>unsafe edge placement</b>—and
        turns them into practical, explainable changes.
      </p>

      <div className="aboutRule" />

      <div className="aboutGrid">
        {/* LEFT */}
        <aside className="aboutAside">
          <div className="aboutSectionLabel">LINKS</div>
          <a className="aboutLink" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub repository
          </a>
          <a className="aboutLink" href={LINKS.university} target="_blank" rel="noreferrer">
            University
          </a>

          <div className="aboutSectionLabel aboutSpacer">NOTES</div>
          <p className="aboutSmall">
            Everything runs locally in your browser—no account, no backend, no server storage.
            <br />
            <br />
            This makes the tool suitable for documentation and academic reporting: your evaluation can reference{" "}
            <b>what was measured</b>, <b>what failed</b>, and <b>what changed</b> (e.g., “contrast was below target, so we
            changed text color and added an overlay”).
          </p>
        </aside>

        {/* MIDDLE */}
        <main className="aboutMain">
          <div className="aboutSectionLabel">WHAT IT DOES</div>
          <p className="aboutPara">
            CoverCheck helps you make album-cover decisions that survive the real world: fast scrolling, tiny thumbnails,
            and competing artwork around yours.
          </p>

          <div className="aboutSectionLabel aboutSpacer">PAGES & WORKFLOW</div>
          <p className="aboutPara">
            <b>1) COVERCHECK (Homepage)</b> — browse sample covers or upload your own to start quickly.
            <br />
            <b>2) Analyze</b> — draw a region (usually title/artist) and get metrics + suggestions that explain what’s
            failing and how to fix it.
            <br />
            <b>3) Report</b> — generate a clean summary you can screenshot/print for evaluation logs, portfolios, or
            dissertation evidence.
          </p>

          <p className="aboutPara">
            <b>Supporting pages (music-linked, cover-first):</b>
            <br />
            <b>• Mockups</b> — places your cover into realistic streaming contexts (grid / playlist row / now playing) to
            test whether it still “reads” at a glance. It also includes a <b>Genre Mood Lens</b> which compares your
            cover’s color mood (brightness / saturation / temperature) to common genre visual conventions{" "}
            <i>(guidance, not genre detection)</i>.
            <br />
            <b>• Match</b> — helps you check whether the visual direction of the cover supports a chosen music identity
            (genre/mood direction → visual guidance). This is about <b>alignment</b> (e.g., “moody + minimal” vs “neon +
            energetic”), not claiming to objectively classify a song.
            <br />
            <b>• Test</b> — gives a design profile based on your choices and tradeoffs, so your “style” can be discussed
            alongside readability results (useful for reflective evaluation writing).
          </p>

          <div className="aboutSectionLabel aboutSpacer">HOW THE METRICS WORK</div>
          <div className="aboutMetrics">
            <section className="aboutMetric">
              <div className="aboutMetricHead">CONTRAST</div>
              <div className="aboutMetricText">
                Estimates how clearly text can separate from the background in your selected region. Low contrast makes
                titles “disappear” at small sizes—especially on mobile.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 4.5 (small text) • ≥ 3.0 (large/bold)</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">CLUTTER</div>
              <div className="aboutMetricText">
                Estimates how visually busy the background is behind text (edge/detail density). Even with good contrast,
                heavy texture competes with letterforms and reduces legibility.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 60/100 for reliable tiny-thumbnail readability</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">SAFE AREA</div>
              <div className="aboutMetricText">
                Provides a placement boundary so important elements don’t get clipped by platform cropping, rounded
                corners, or UI overlays.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 95/100 • keep critical text inside the guide</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">COLOR PALETTE</div>
              <div className="aboutMetricText">
                Extracts key colors from the image and suggests compatible options—useful for choosing overlays, text
                colors, accents, and UI-safe highlight tones that still fit the artwork.
              </div>
              <div className="aboutMetricTarget">Goal: keep aesthetics + maintain readability targets</div>
            </section>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="aboutAside">
          <div className="aboutSectionLabel">QUICK FACTS</div>

          <div className="aboutFact">
            <div className="aboutFactHead">PRIVACY-FIRST</div>
            <div className="aboutSmall">Your image stays local; processing happens in-browser.</div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">EXPLAINABLE</div>
            <div className="aboutSmall">
              Metrics point to specific problems (contrast, clutter, edge risk) and suggestions are phrased as actions.
            </div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">REPORT-READY</div>
            <div className="aboutSmall">Outputs are suitable for screenshots, evaluation logs, and dissertation evidence.</div>
          </div>

          <div className="aboutSectionLabel aboutSpacer">MORE COVER-LINKED TOOLS (IDEAS)</div>
          <ul className="aboutSmall aboutIdeaList">
            <li>
              <b>Typography Stress Test:</b> simulate title/artist text at 64/128/256px with adjustable weight + tracking.
            </li>
            <li>
              <b>Color Accessibility Simulator:</b> preview palette + text under common color-vision deficiencies.
            </li>
            <li>
              <b>Print-to-Digital Check:</b> compare “vinyl/poster” layouts vs streaming thumbnails and flag risky elements.
            </li>
            <li>
              <b>Genre Reference Map:</b> curated visual conventions per genre (guidance, not rules).
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
