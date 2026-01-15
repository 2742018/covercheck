import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AboutPage() {
  const navigate = useNavigate();

  // About-only light theme
  useEffect(() => {
    document.body.classList.add("lightMode");
    return () => document.body.classList.remove("lightMode");
  }, []);

  return (
    <div className="simplePage aboutBlend">
      <div className="aboutTopRow">
        <div>
          <div className="aboutKicker">COVERCHECK</div>
          <div className="simpleTitle aboutTitleBig">About</div>
        </div>

        <button className="ghostBtn aboutBackBtn" onClick={() => navigate("/analyze")}>
          QUICK BUTTON TO ANALYZE
        </button>
      </div>

      <div className="simpleBody aboutBody">
        <p className="aboutLead">
          CoverCheck is a privacy-first album cover readability tool. It helps you test whether your title/artist area
          stays legible when platforms display your cover as small, square thumbnails (and sometimes crop, round corners,
          or add overlay UI).
        </p>

        <div className="aboutRule" />

        <div className="aboutGrid">
          <div className="aboutCol">
            <div className="aboutSectionLabel">SOCIAL</div>
            <a className="aboutLink" href="#" onClick={(e) => e.preventDefault()}>GitHub</a>
            <a className="aboutLink" href="#" onClick={(e) => e.preventDefault()}>LinkedIn</a>
            <a className="aboutLink" href="#" onClick={(e) => e.preventDefault()}>Email</a>

            <div className="aboutSectionLabel" style={{ marginTop: 18 }}>NOTES</div>
            <p className="aboutSmall">
              Runs fully in-browser. No server uploads. Designed for explainable, dissertation-friendly reporting.
            </p>
          </div>

          <div className="aboutMain">
            <div className="aboutSectionLabel">WHAT IT DOES</div>
            <p className="aboutPara">
              You upload a cover, then draw a region (usually the title/artist zone). CoverCheck estimates how readable
              that region will be at small sizes, and flags common failure modes like poor contrast, background busyness,
              and unsafe placement near edges.
            </p>

            <div className="aboutSectionLabel" style={{ marginTop: 16 }}>HOW THE METRICS WORK</div>
            <div className="aboutMetrics">
              <div className="aboutMetric">
                <div className="aboutMetricHead">CONTRAST</div>
                <div className="aboutMetricText">
                  Estimates how strongly text separates from its background within your selected region.
                  <div className="aboutMetricTarget">Target: ≥ 4.5 (small text), ≥ 3.0 (large/bold)</div>
                </div>
              </div>

              <div className="aboutMetric">
                <div className="aboutMetricHead">CLUTTER</div>
                <div className="aboutMetricText">
                  Approximates background “busyness” (edge density). Busy textures behind letters reduce readability.
                  <div className="aboutMetricTarget">Target: ≥ 60/100 for reliable small-thumbnail readability</div>
                </div>
              </div>

              <div className="aboutMetric">
                <div className="aboutMetricHead">SAFE AREA</div>
                <div className="aboutMetricText">
                  Shows a recommended boundary so important text/logos don’t get clipped by cropping, rounded corners,
                  or UI overlays.
                  <div className="aboutMetricTarget">Target: ≥ 95/100 (keep critical text inside)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="aboutCol">
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
          </div>
        </div>
      </div>
    </div>
  );
}
