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
        CoverCheck is an album cover <b>readability + presentation</b> tool built for how covers are actually seen today:
        as <b>small, square thumbnails</b> on streaming platforms—often cropped, corner-rounded, and partially covered by
        interface elements.
        <br />
        <br />
        The core idea is simple: you select the part of the cover that must survive at tiny sizes (usually{" "}
        <b>title + artist</b>), and CoverCheck measures the most common failure modes—text blending into the background,
        busy texture behind letters, and unsafe placement near edges—then turns that into clear, explainable fixes.
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
            Everything runs locally in your browser—no server, no account, no uploads stored.
            <br />
            <br />
            The tool is designed to support explainable decisions you can reference in evaluation notes or academic
            writing (e.g., “contrast was below target, so we changed text color and added an overlay”).
          </p>
        </aside>

        {/* MIDDLE */}
        <main className="aboutMain">
          <div className="aboutSectionLabel">WHAT IT DOES</div>
          <p className="aboutPara">
            CoverCheck focuses on the part of album art that most often fails in the real world: the{" "}
            <b>readability of key information</b> when a cover is reduced to a tiny square.
            <br />
            <br />
            <b>Typical workflow:</b>
            <br />
            <b>1) Homepage</b> — browse sample covers or upload your own.
            <br />
            <b>2) Analyze</b> — draw a region (title/artist area) and get metrics + suggestions.
            <br />
            <b>3) Report</b> — generate a clean summary you can screenshot/print for documentation.
            <br />
        
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
                heavy texture competes with letterforms.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 60/100 for reliable tiny-thumbnail readability</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">SAFE AREA</div>
              <div className="aboutMetricText">
                Provides a placement boundary so important elements don’t get clipped by platform cropping, rounded corners,
                or UI overlays.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 95/100 • keep critical text inside the guide</div>
            </section>
          </div>

            <br />
            There are also supporting pages for deeper design work (below):
            <br />
            <b>• Test </b> — creates a design profile by running multiple analyzes and aggregating the results.
            <br />
            <b>• Match</b> — checks whether the visual “feel” of a cover aligns with the music direction (explained below).
            <br />
          </p>

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

          <div className="aboutSectionLabel aboutSpacer">MORE COVER-LINKED TOOLS (IDEAS, TO BE ADDED)</div>
          <ul className="aboutSmall aboutIdeaList">
            <li>
              <b>Platform Mockups:</b> show your cover inside Spotify/Apple-style grids with UI overlays + rounded corners.
            </li>
            <li>
              <b>Typography Stress Test:</b> simulate title/artist text at 64/128/256px with adjustable weight + tracking.
            </li>
            <li>
              <b>Color Accessibility Simulator:</b> preview palette + text under common color-vision deficiencies.
            </li>
            <li>
              <b>Audio → Art Brief:</b> turn tempo/energy/brightness into palette + type direction (mood-led art guidance).
            </li>
            <li>
              <b>Print-to-Digital Check:</b> compare “vinyl/poster” layouts vs streaming thumbnails and flag risky elements.
            </li>
            <li>
              <b>Genre Reference Map:</b> curated visual conventions (layout/palette/typography) for genres—used as guidance,
              not rules.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}