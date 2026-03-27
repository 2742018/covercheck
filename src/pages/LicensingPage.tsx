import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/2742018/covercheck",
};

export default function LicensingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hadLightMode = document.body.classList.contains("lightMode");
    document.body.classList.add("lightMode");
    document.title = "Use & Privacy — CoverCheck";

    return () => {
      if (!hadLightMode) document.body.classList.remove("lightMode");
    };
  }, []);

  return (
    <main className="aboutEditorial">
      <section className="aboutEditorialHero">
        <div className="aboutEditorialTop">
          <div className="aboutEditorialKicker">Policy of CoverCheck</div>

          <button
            className="aboutEditorialBack"
            type="button"
            onClick={() => navigate("/play")}
            aria-label="Back to Analyze"
          >
            Back to Analyze
          </button>
        </div>

        <div className="aboutEditorialHeading">
          <div>
            <h1 className="aboutEditorialTitle">Use &amp; Privacy</h1>
            <p className="aboutEditorialSubtitle">
              CoverCheck analyses album artwork locally in the browser. It does
              not store, host, or redistribute uploaded images.
            </p>

            <aside
              className="aboutEditorialIntroNote"
              aria-label="Quick summary"
            >
              <div className="aboutEditorialNoteLabel">Quick summary</div>
              <p>
                Images are used only for analysis during the session. CoverCheck
                is designed as a privacy-first evaluation tool rather than an
                image hosting or publishing platform.
              </p>
            </aside>
          </div>
        </div>

        <div className="aboutEditorialLeadRow">
          <p className="aboutEditorialLead">
            This project is intended for design evaluation, coursework, and
            reflection. Its purpose is to help users assess readability,
            contrast, and composition without collecting or storing their image
            files.
          </p>
        </div>

        <div className="aboutEditorialRule" />
      </section>

      <div className="aboutEditorialGrid">
        <aside
          className="aboutEditorialRail"
          aria-label="Use and privacy page navigation"
        >
          <div className="aboutEditorialRailBlock">
            <div className="aboutEditorialLabel">Key points</div>
            <ul className="aboutEditorialList">
              <li>Images are analysed locally in the browser.</li>
              <li>CoverCheck does not store uploaded files.</li>
              <li>CoverCheck does not host or redistribute artwork.</li>
              <li>The tool is for evaluation, not publishing.</li>
              <li>Users remain responsible for the images they choose to test.</li>
            </ul>
          </div>
        </aside>

        <div className="aboutEditorialMain">
          <section id="local-analysis" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Local analysis</div>
            <h2 className="aboutEditorialSectionTitle">
              How image handling works
            </h2>

            <div className="aboutEditorialTextBlock">
              <p>
                CoverCheck processes images in the browser so they can be
                analysed for readability, contrast, and layout issues. The
                project does not aim to build a hosted collection of album
                covers and does not treat uploads as stored content.
              </p>
              <p>
                This makes the page more appropriate as a privacy and use note
                than a formal copyright policy. The main role of the tool is to
                evaluate artwork temporarily during use.
              </p>
            </div>
          </section>

          <section id="why-this-matters" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Why this matters</div>
            <h2 className="aboutEditorialSectionTitle">
              Why this suits the project
            </h2>

            <div className="aboutEditorialQualities">
              <div className="aboutEditorialQuality">
                <h3>Privacy-first</h3>
                <p>
                  Users can test artwork without uploading it to a server or
                  relying on cloud storage as part of the analysis flow.
                </p>
              </div>

              <div className="aboutEditorialQuality">
                <h3>Evaluation-focused</h3>
                <p>
                  The tool exists to assess communication and readability, not
                  to publish, distribute, or archive album art.
                </p>
              </div>

              <div className="aboutEditorialQuality">
                <h3>Simple and relevant</h3>
                <p>
                  This keeps the page aligned with what CoverCheck actually
                  does, instead of overstating legal or licensing concerns that
                  are not central to the project.
                </p>
              </div>
            </div>
          </section>

          <section id="responsible-use" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Responsible use</div>
            <h2 className="aboutEditorialSectionTitle">
              What users should understand
            </h2>

            <div className="aboutEditorialTextBlock">
              <p>
                Although CoverCheck does not store or redistribute images, users
                should still act responsibly when choosing artwork to analyse.
                The tool does not transfer ownership or permissions, and users
                remain responsible for how they obtain and use their files.
              </p>
              <p>
                In practice, this means CoverCheck supports temporary analysis
                only. It does not claim rights over uploaded work and does not
                present uploaded images as part of a public library.
              </p>
            </div>
          </section>

          <section id="disclaimer" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Disclaimer</div>
            <h2 className="aboutEditorialSectionTitle">Important note</h2>

            <div className="aboutEditorialTextBlock">
              <p>
                This page explains how CoverCheck handles images within the
                project. It is not legal advice. If you are unsure about your
                right to use a particular image outside this tool, you should
                check the relevant permissions or source terms yourself.
              </p>
            </div>
          </section>

          <section id="references" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Project</div>
              <h2 className="aboutEditorialSectionTitle">Project reference</h2>

            <div className="aboutEditorialTextBlock">
              <p>
                 The repository contains the source code and implementation context for
                  CoverCheck.
              </p>
      </div>

      <div className="aboutEditorialNoteCard aboutEditorialReferenceCard">
        <div className="aboutEditorialNoteLabel">Source code</div>
          <h3 className="aboutEditorialReferenceTitle">CoverCheck on GitHub</h3>
            <p>
              View the project repository for the codebase, structure, and development
              context.
            </p>

            <a
              className="aboutEditorialReferenceButton"
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open GitHub repository
            </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}