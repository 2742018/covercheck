import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/2742018/covercheck.git", 
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
        CoverCheck helps you test whether an album cover stays readable when it is displayed the way people actually see
        it on streaming platforms: small, square thumbnails, often with cropping, rounded corners, and interface overlays.
        <br />
        <br />
        You upload a cover (or pick a sample), draw a box around the area you care about (usually title + artist), and the
        tool estimates how well that region will perform at tiny sizes. It then gives clear, actionable guidance on what
        to adjust — like text color choice, placement, or background treatment — without uploading anything to a server.
      </p>

      <div className="aboutRule" />

      <div className="aboutGrid">
        {/* LEFT */}
        <aside className="aboutAside">
          <div className="aboutSectionLabel">SOCIAL</div>
          <a className="aboutLink" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="aboutLink" href={LINKS.university} target="_blank" rel="noreferrer">
            University
          </a>

          <div className="aboutSectionLabel aboutSpacer">NOTES</div>
          <p className="aboutSmall">
            Everything runs locally in your browser — no server, no account, no image uploads.
            <br />
            <br />
            The goal is to support design decisions with explainable checks you can reference in documentation or academic
            reporting (e.g., “contrast was below target, so we adjusted text color and added an overlay”).
          </p>
        </aside>

        {/* MIDDLE */}
        <main className="aboutMain">
          <div className="aboutSectionLabel">WHAT IT DOES</div>
          <p className="aboutPara">
            CoverCheck is built around a simple workflow:
            <br />
            <br />
            <b>1) Choose a cover</b> (upload your own or use a sample).<br />
            <b>2) Select a region</b> you want to evaluate (typically title/artist).<br />
            <b>3) Review results</b> — readability metrics, safe-area warnings, and suggested fixes.<br />
            <b>4) Generate a report</b> if you need a printable summary for a portfolio or dissertation.
            <br />
            <br />
            The tool focuses on common failure modes in real thumbnail contexts: text blending into the background,
            textures behind letters, and placing important elements too close to edges where cropping/UI can cut them off.
          </p>

          <div className="aboutSectionLabel aboutSpacer">HOW THE METRICS WORK</div>

          <div className="aboutMetrics">
            <section className="aboutMetric">
              <div className="aboutMetricHead">CONTRAST</div>
              <div className="aboutMetricText">
                Estimates how clearly text can separate from the background in your selected region. Low contrast means
                the title may “disappear” at small sizes, especially on mobile.
              </div>
              <div className="aboutMetricTarget">
                Target: ≥ 4.5 for small text • ≥ 3.0 for large/bold display text
              </div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">CLUTTER</div>
              <div className="aboutMetricText">
                Estimates how visually busy the background is behind your text (based on edge/detail density). Even with
                good contrast, a highly detailed background can reduce legibility because letterforms compete with texture.
              </div>
              <div className="aboutMetricTarget">
                Target: ≥ 60/100 for reliable small-thumbnail readability
              </div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">SAFE AREA</div>
              <div className="aboutMetricText">
                Shows a recommended boundary for important text and logos. Platforms often crop square thumbnails, round
                corners, or place UI elements over edges — safe-area helps avoid accidental clipping.
              </div>
              <div className="aboutMetricTarget">
                Target: ≥ 95/100 • Keep critical text inside the guide
              </div>
            </section>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="aboutAside">
          <div className="aboutSectionLabel">QUICK FACTS</div>

          <div className="aboutFact">
            <div className="aboutFactHead">PRIVACY-FIRST</div>
            <div className="aboutSmall">
              Your image never leaves your device. Everything is processed in-browser.
            </div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">EXPLAINABLE</div>
            <div className="aboutSmall">
              Metrics are designed to be understandable — they point to specific issues (contrast, clutter, edge risk) and
              suggest what to try next.
            </div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">REPORT-READY</div>
            <div className="aboutSmall">
              Generate a clean summary you can screenshot, print, or include in design evaluation notes.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}