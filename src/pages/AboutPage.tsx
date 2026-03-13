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
        CoverCheck helps musicians and design students verify that an album cover’s
        key information, especially <b>title and artist text</b>, stays legible and
        visually effective under real streaming conditions such as
        <b> tiny thumbnails</b>, <b>square crops</b>, and <b>UI overlays</b>.
        <br />
        <br />
        Instead of judging the whole image in a generic way, CoverCheck focuses on the
        area most likely to fail in real listening contexts: the <b>title / artist region</b>.
        It then identifies common visual risks such as <b>low contrast</b>,
        <b> busy texture behind text</b>, and <b>unsafe edge placement</b>, and turns
        those into practical, explainable suggestions.
      </p>

      <div className="aboutRule" />

      <div className="aboutGrid">
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
            Everything runs locally in your browser — no account, no backend, no server storage.
            <br />
            <br />
            This makes the tool suitable for documentation and academic reporting: your
            evaluation can reference <b>what was measured</b>, <b>what failed</b>, and
            <b> what changed</b>.
          </p>
        </aside>

        <main className="aboutMain">
          <div className="aboutSectionLabel">WHAT IT DOES</div>
          <p className="aboutPara">
            CoverCheck helps you make album-cover decisions that survive the real world:
            fast scrolling, tiny thumbnails, and competing artwork around yours.
          </p>

          <div className="aboutSectionLabel aboutSpacer">PAGES & WORKFLOW</div>
          <p className="aboutPara">
            <b>1) COVERCHECK (Homepage)</b> — browse sample covers or upload your own to start quickly.
            <br />
            <b>2) Analyze</b> — draw a region, usually title/artist, and get metrics and suggestions that explain what is failing and how to improve it.
            <br />
            <b>3) Report</b> — generate a clean summary you can screenshot or print for evaluation logs, portfolios, or as evidence.
          </p>

          <p className="aboutPara">
            <b>Supporting pages:</b>
            <br />
            <b>• Test</b> — explores design preferences and trade-offs so your visual direction can be discussed alongside readability.
            <br />
            <b>• Match</b> — checks whether the visual direction of the cover supports a chosen music identity or mood direction.
            <br />
            <b>• Mockups</b> — places your cover into realistic streaming contexts to test whether it still reads at a glance.
            <br />
            <b>• Compare</b> — compares two covers or revisions side-by-side for iteration, reflection, and final selection.
            <br />
            <b>• Accessibility</b> — evaluates how well your cover performs for users with disabilities.
            <br />
            <b>• Methods & References</b> — collects the academic and research support behind the project without overloading the About page.
          </p>
        </main>

        <aside className="aboutAside">
          <div className="aboutSectionLabel">QUICK FACTS</div>

          <div className="aboutFact">
            <div className="aboutFactHead">PRIVACY-FIRST</div>
            <div className="aboutSmall">Your image stays local; processing happens in-browser.</div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">EXPLAINABLE</div>
            <div className="aboutSmall">
              Checks point to specific problems like contrast, clutter, and edge risk, and suggestions are phrased as actions.
            </div>
          </div>

          <div className="aboutFact">
            <div className="aboutFactHead">REPORT-READY</div>
            <div className="aboutSmall">
              Outputs are suitable for screenshots, evaluation logs, and as evidence.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}