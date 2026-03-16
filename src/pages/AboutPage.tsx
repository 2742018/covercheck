// src/pages/AboutPage.jsx
import { useEffect, useMemo } from "react";
import {useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/2742018/covercheck",
  university: "https://www.gla.ac.uk/",
};

export default function AboutPage() {
  const navigate = useNavigate();

  const principles = useMemo(
    () => [
      "Privacy-first browser-based analysis",
      "Explainable rather than opaque scoring",
      "Built for reflection, iteration, and evidence",
    ],
    []
  );

  const linkItems = useMemo(
    () => [
      { href: LINKS.github, label: "GitHub repository" },
      { href: LINKS.university, label: "University" },
    ],
    []
  );

  const steps = useMemo(
    () => [
      {
        no: "01",
        title: "CoverCheck / Home",
        body: "Start quickly with example covers or upload your own artwork.",
      },
      {
        no: "02",
        title: "Analyze",
        body: "Select a key region, usually title and artist text, and review the main metrics and design risks.",
      },
      {
        no: "03",
        title: "Report",
        body: "Generate a clean summary suitable for documentation, screenshots, and project evidence.",
      },
      {
        no: "04",
        title: "Supporting pages",
        body: "Mockups, Compare, Match, Test, Accessibility, and Methods & References extend the core analysis into context, reflection, and research support.",
      },
    ],
    []
  );

  const qualities = useMemo(
    () => [
      {
        title: "Privacy-first",
        body: "Images stay local in the browser. There is no account requirement and no backend storage flow.",
      },
      {
        title: "Explainable",
        body: "The tool points to visible problems such as low contrast, texture interference, and edge risk instead of giving an opaque verdict.",
      },
      {
        title: "Useful for coursework",
        body: "Outputs are suitable for evaluation logs, screenshots, reflective writing, and design discussion.",
      },
    ],
    []
  );

  useEffect(() => {
    const hadLightMode = document.body.classList.contains("lightMode");
    document.body.classList.add("lightMode");
    document.title = "About — CoverCheck";

    return () => {
      if (!hadLightMode) document.body.classList.remove("lightMode");
    };
  }, []);

  return (
    <div className="aboutEditorial">
      <header className="aboutEditorialHero">
        <div className="aboutEditorialTop">
          <div className="aboutEditorialKicker">About this website</div>
          <button
            className="aboutEditorialBack"
            type="button"
            onClick={() => navigate("/analyze")}
            aria-label="Start Analyzing"
          >
          START ANALYZING 
          </button>
        </div>

        <div className="aboutEditorialHeading">
          <div className="aboutEditorialTitleWrap">
            <h1 className="aboutEditorialTitle">About</h1>
            <div className="aboutEditorialSubtitle">
              Album-cover evaluation for streaming-era readability, composition,
              and context.
            </div>

            <aside className="aboutEditorialIntroNote" aria-label="Overview">
            <div className="aboutEditorialNoteLabel">Overview</div>
            <p>
              CoverCheck helps musicians and design students test whether a cover
              still communicates once it leaves the full-size canvas and enters
              real listening surfaces.
            </p>
          </aside>
        </div>
      
          </div>


        <div className="aboutEditorialLeadRow">
          <p className="aboutEditorialLead">
            Album covers are often designed large, reviewed carefully, and then
            experienced small. What looks balanced in a design file can lose its
            hierarchy in a streaming grid, collapse in a thumbnail, or struggle
            once typography meets noisy imagery.
          </p>
        </div>

        <div className="aboutEditorialLeadRow">
          <p className="aboutEditorialLead aboutEditorialLeadMuted">
            CoverCheck is built to make those failures visible earlier. It
            focuses on the title and artist region, identifies common visual
            risks such as weak contrast, clutter, and unsafe placement, and
            turns them into practical, explainable feedback.
          </p>
        </div>
      </header>

      <div className="aboutEditorialRule" />

      <section className="aboutEditorialGrid" aria-label="About content">
        <aside className="aboutEditorialRail">
          <div className="aboutEditorialRailBlock">
            <div className="aboutEditorialLabel">Principles</div>
            <ul className="aboutEditorialList">
              {principles.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="aboutEditorialRailBlock">
            <div className="aboutEditorialLabel">Links</div>
            {linkItems.map((item) => (
              <a
                key={item.href}
                className="aboutEditorialLink"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        <main className="aboutEditorialMain" aria-label="Main about sections">
          <section
            className="aboutEditorialSection"
            aria-labelledby="about-purpose-title"
          >
            <div className="aboutEditorialSectionLabel">Purpose</div>
            <h2
              id="about-purpose-title"
              className="aboutEditorialSectionTitle"
            >
              What the tool is for
            </h2>
            <div className="aboutEditorialTextBlock">
              <p>
                CoverCheck is not trying to replace design judgement. It gives
                that judgement a clearer frame. Instead of asking only whether a
                cover “looks good,” it asks whether the key information survives
                under the conditions where most listeners actually encounter it.
              </p>
              <p>
                This makes the project useful both as a practical design aid and
                as a reflective tool for discussing why certain visual choices
                succeed, weaken, or change meaning in context.
              </p>
            </div>
          </section>

          <section
            className="aboutEditorialSplit"
            aria-labelledby="about-workflow-title"
          >
            <div className="aboutEditorialSplitMain">
              <div className="aboutEditorialSectionLabel">Workflow</div>
              <h2
                id="about-workflow-title"
                className="aboutEditorialSectionTitle"
              >
                How the pages fit together
              </h2>

              <div className="aboutEditorialSteps" role="list">
                {steps.map((step) => (
                  <div className="aboutEditorialStep" role="listitem" key={step.no}>
                    <div className="aboutEditorialStepNo" aria-hidden="true">
                      {step.no}
                    </div>
                    <div>
                      <div className="aboutEditorialStepTitle">{step.title}</div>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="aboutEditorialSplitSide" aria-label="Notes">
              <div className="aboutEditorialNoteCard">
                <div className="aboutEditorialNoteLabel">Focus</div>
                <p>
                  The tool is especially concerned with the title / artist
                  region, because that is usually where a cover fails first when
                  reduced.
                </p>
              </div>

              <div className="aboutEditorialNoteCard">
                <div className="aboutEditorialNoteLabel">Output</div>
                <p>
                  Results are structured to support portfolios, method writing,
                  process documentation, and revision notes.
                </p>
              </div>
            </aside>
          </section>

          <section
            className="aboutEditorialSection"
            aria-labelledby="about-qualities-title"
          >
            <div className="aboutEditorialSectionLabel">Qualities</div>
            <h2
              id="about-qualities-title"
              className="aboutEditorialSectionTitle"
            >
              What shapes the project
            </h2>

            <div className="aboutEditorialQualities">
              {qualities.map((q) => (
                <div className="aboutEditorialQuality" key={q.title}>
                  <h3>{q.title}</h3>
                  <p>{q.body}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}