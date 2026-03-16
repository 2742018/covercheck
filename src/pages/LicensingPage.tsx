// src/pages/LicensingPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LINKS = {
  github: "https://github.com/2742018/covercheck",
  fma: "https://freemusicarchive.org/",
  cc: "https://creativecommons.org/licenses/",
};

export default function LicensingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hadLightMode = document.body.classList.contains("lightMode");
    document.body.classList.add("lightMode");
    document.title = "Copyright & Licensing — CoverCheck";

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
            <h1 className="aboutEditorialTitle">Copyright &amp; Licensing</h1>
            <p className="aboutEditorialSubtitle">
              CoverCheck is built to be privacy-first and rights-aware. It does
              not include a hosted album-cover library and it does not ask users
              to upload copyrighted artwork they do not have permission to use.
            </p>

            <aside className="aboutEditorialIntroNote" aria-label="Quick summary">
            <div className="aboutEditorialNoteLabel">Quick summary</div>
            <p>
              Uploads stay in the browser. Users remain responsible for the
              rights and licensing status of any artwork they choose to test.
            </p>
          </aside>

          </div>
        </div>

        <div className="aboutEditorialLeadRow">
          <p className="aboutEditorialLead">
            The tool is intended for responsible evaluation, portfolio review,
            and coursework-style use. You should only analyse artwork you own,
            created yourself, or have permission or licensing to use.
          </p>
        </div>

        <div className="aboutEditorialRule" />
      </section>

      <div className="aboutEditorialGrid">
        <aside className="aboutEditorialRail" aria-label="Licensing page navigation">
          <div className="aboutEditorialRailBlock">
            <div className="aboutEditorialLabel">Quick principles</div>
            <ul className="aboutEditorialList">
              <li>Local processing. No server storage. Rights-aware use.</li>
              <li>Use your own artwork whenever possible.</li>
              <li>Do not upload copyrighted covers without permission.</li>
              <li>Prefer public-domain or clearly licensed demo material.</li>
              <li>Keep attribution when a licence requires it.</li>
            </ul>
          </div>
        </aside>

        <div className="aboutEditorialMain">
          <section id="uploads" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Uploads</div>
            <h2 className="aboutEditorialSectionTitle">What users should upload</h2>

            <div className="aboutEditorialSplit">
              <div className="aboutEditorialSplitMain">
                <div className="aboutEditorialTextBlock">
                  <p>
                    You should upload only content you have the right to use.
                    That includes your own cover artwork, work you created, CC0
                    assets, or material you have explicit permission or a valid
                    licence to analyse.
                  </p>
                  <p>
                    CoverCheck does not host or redistribute your images. It
                    processes them locally in your browser as part of the
                    evaluation flow.
                  </p>
                </div>
              </div>

              <div className="aboutEditorialSplitSide2">
                <div className="aboutEditorialNoteCard">
                  <div className="aboutEditorialNoteLabel">Recommended</div>
                  <ul className="aboutEditorialList">
                    <li>Use your own artwork whenever possible.</li>
                    <li>Prefer clearly licensed or public-domain materials.</li>
                    <li>Keep source and attribution notes for your records.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section id="licensed-artwork" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Licensing guidance</div>
            <h2 className="aboutEditorialSectionTitle">If you use licensed artwork</h2>

            <div className="aboutEditorialSteps">
              <div className="aboutEditorialStep">
                <div className="aboutEditorialStepNo">01</div>
                <div>
                  <div className="aboutEditorialStepTitle">Check the licence first</div>
                  <p>
                    Before using any album artwork or music-related visual,
                    confirm the licence shown on the source page.
                  </p>
                </div>
              </div>

              <div className="aboutEditorialStep">
                <div className="aboutEditorialStepNo">02</div>
                <div>
                  <div className="aboutEditorialStepTitle">
                    Give attribution when required
                  </div>
                  <p>
                    Some licences require credit to the performer,
                    photographer, illustrator, or cover artist. Keep a short
                    attribution note in your report, README, or project
                    documentation.
                  </p>
                </div>
              </div>

              <div className="aboutEditorialStep">
                <div className="aboutEditorialStepNo">03</div>
                <div>
                  <div className="aboutEditorialStepTitle">Respect restrictions</div>
                  <p>
                    NC may restrict commercial use, ND may restrict modification,
                    and SA may require you to share derivatives under the same
                    terms.
                  </p>
                </div>
              </div>

              <div className="aboutEditorialStep">
                <div className="aboutEditorialStepNo">04</div>
                <div>
                  <div className="aboutEditorialStepTitle">
                    Use safer demo material
                  </div>
                  <p>
                    For coursework, presentations, and public demos, your own
                    assets or clearly licensed material are usually the safest
                    choice.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="responsible-use" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Why this matters</div>
            <h2 className="aboutEditorialSectionTitle">Responsible use of the tool</h2>

            <div className="aboutEditorialQualities">
              <div className="aboutEditorialQuality">
                <h3>Course / Project safe</h3>
                <p>
                  You can demonstrate the tool without bundling copyrighted
                  album covers or relying on a hosted image library.
                </p>
              </div>

              <div className="aboutEditorialQuality">
                <h3>Privacy-first</h3>
                <p>
                  Files are analysed locally in the browser. That reduces the
                  need to upload sensitive or copyrighted material to a server.
                </p>
              </div>

              <div className="aboutEditorialQuality">
                <h3>User responsibility</h3>
                <p>
                  The tool supports evaluation and learning, but users remain
                  responsible for what they upload and how they use it.
                </p>
              </div>
            </div>
          </section>

          <section id="disclaimer" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Disclaimer</div>
            <h2 className="aboutEditorialSectionTitle">Important note</h2>

            <div className="aboutEditorialTextBlock">
              <p>
                This page is informational only and is not legal advice. If you
                are unsure about rights, permissions, or licence obligations,
                use your own assets or clearly public-domain material and verify
                the licence terms on the source page directly.
              </p>
            </div>
          </section>

          <section id="references" className="aboutEditorialSection">
            <div className="aboutEditorialSectionLabel">Links</div>
            <h2 className="aboutEditorialSectionTitle">Reference links</h2>

            <div className="aboutEditorialSplit">
              <div className="aboutEditorialSplitMain">
                <div className="aboutEditorialNoteCard">
                  <div className="aboutEditorialNoteLabel">Repository</div>
                  <p>
                    <a href={LINKS.github} target="https://github.com/2742018/covercheck" rel="noopener noreferrer">
                      GitHub
                    </a>{" "}
                    — project source and implementation context.
                  </p>
                </div>

                <div className="aboutEditorialNoteCard">
                  <div className="aboutEditorialNoteLabel">Licensing</div>
                  <p>
                    <a href={LINKS.cc} target="https://creativecommons.org/" rel="noopener noreferrer">
                      Creative Commons
                    </a>{" "}
                    — read the licence families and their conditions directly.
                  </p>
                </div>

                <div className="aboutEditorialNoteCard">
                  <div className="aboutEditorialNoteLabel">Example source</div>
                  <p>
                    <a href={LINKS.fma} target="https://unsplash.com/" rel="noopener noreferrer">
                      Unsplash
                    </a>{" "}
                    — a source where images are offered under a CC0 licence, meaning they can be used without permission or attribution.
                  </p>
                </div>
              </div>

              <div className="aboutEditorialSplitSide">
                <div className="aboutEditorialNoteCard">
                  <div className="aboutEditorialNoteLabel">Reminder</div>
                  <p>
                    Always verify the exact terms attached to the artwork you
                    use, especially for public sharing, portfolio work, or
                    commercial contexts.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}