import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/<YOUR_USERNAME>/<YOUR_REPO>", 
  university: "https://<YOUR_UNI_PAGE>", 
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
        CoverCheck is a privacy-first album cover readability tool. It helps you test whether the title/artist area stays
        legible when platforms display your cover as small, square thumbnails (and sometimes crop, round corners, or add
        overlay UI).
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
            Runs fully in-browser. No server uploads. Designed for explainable, dissertation-friendly reporting.
          </p>
        </aside>

        {/* MIDDLE */}
        <main className="aboutMain">
          <div className="aboutSectionLabel">WHAT IT DOES</div>
          <p className="aboutPara">
            You upload a cover, then draw a region (usually the title/artist zone). CoverCheck estimates how readable
            that region will be at small sizes, and flags common failure modes like poor contrast, background busyness,
            and unsafe placement near edges.
          </p>

          <div className="aboutSectionLabel aboutSpacer">HOW THE METRICS WORK</div>

          <div className="aboutMetrics">
            <section className="aboutMetric">
              <div className="aboutMetricHead">CONTRAST</div>
              <div className="aboutMetricText">
                Estimates how strongly text separates from its background within your selected region.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 4.5 (small text), ≥ 3.0 (large/bold)</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">CLUTTER</div>
              <div className="aboutMetricText">
                Approximates background “busyness” (edge density). Busy textures behind letters reduce readability.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 60/100 for reliable small-thumbnail readability</div>
            </section>

            <section className="aboutMetric">
              <div className="aboutMetricHead">SAFE AREA</div>
              <div className="aboutMetricText">
                Shows a recommended boundary so important text/logos don’t get clipped by cropping, rounded corners, or
                UI overlays.
              </div>
              <div className="aboutMetricTarget">Target: ≥ 95/100 (keep critical text inside)</div>
            </section>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="aboutAside">
          <div className="aboutSectionLabel">QUICK FACTS</div>

          <div className="aboutFact">
            <div className="aboutFactHead">PRIVACY-FIRST</div>
            <div className="aboutSmall">Images stay local in your browser.</div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">EXPLAINABLE</div>
            <div className="aboutSmall">Readable targets + clear suggestions.</div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">REPORT-READY</div>
            <div className="aboutSmall">Generate a clean printable summary.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}