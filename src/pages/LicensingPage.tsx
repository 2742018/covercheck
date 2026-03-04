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
    document.body.classList.add("lightMode");
    return () => document.body.classList.remove("lightMode");
  }, []);

  return (
    <div className="policyPage">
      <header className="policyHero">
        <div>
          <div className="policyKicker">COVERCHECK</div>
          <h1 className="policyTitle">Copyright &amp; Licensing</h1>
        </div>

        <div className="policyHeroRight">
          <button className="ghostBtn" onClick={() => navigate("/play")}>
            BACK TO ANALYZE
          </button>
        </div>
      </header>

      <p className="policyLead">
        CoverCheck is designed to be <b>privacy-first</b> and <b>copyright-safe</b>. We do not provide a built-in album-cover
        library and we do not ask you to upload copyrighted covers that you don’t have permission to use.
      </p>

      <div className="policyRule" />

      <div className="policyGrid">
        {/* LEFT */}
        <aside className="policyAside">
          <div className="policyLabel">LINKS</div>
          <a className="policyLink" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub repository
          </a>
          <a className="policyLink" href={LINKS.cc} target="_blank" rel="noreferrer">
            Creative Commons licenses
          </a>

          <div className="policyLabel policySpacer">QUICK SUMMARY</div>
          <ul className="policyBullets">
            <li>Uploads stay in your browser (not stored on a server).</li>
            <li>Use only artwork/images you own or have rights to use.</li>
            <li>When using CC-licensed artwork/images, follow the specific license terms.</li>
          </ul>
        </aside>

        {/* MAIN */}
        <main className="policyMain">
          <div className="policyLabel">YOUR UPLOADS</div>
          <p className="policyPara">
            You should upload only content you have the right to use (for example: your own cover artwork, CC0 assets, work
            you created, or content you have explicit permission/licensing to analyze). CoverCheck does not host or
            redistribute your images; it processes them locally in your browser.
          </p>

          <div className="policyLabel policySpacer">ALBUM COVER ART ONLINE</div>
          <p className="policyPara">
            If you use images that you do not own for testing or demonstration, note that different albums can have
            different licenses (often <b>Creative Commons</b>). You must follow the license shown on each album's page.
          </p>

          <div className="policyCallouts">
            <div className="policyCallout">
              <div className="policyCalloutHead">Check the track license</div>
              <div className="policySmall">
                Before using a album cover art, open its artist's page and confirm the license (e.g., CC BY, CC BY-NC, CC BY-ND, CC BY-SA).
              </div>
            </div>

            <div className="policyCallout">
              <div className="policyCalloutHead">Attribution (when required)</div>
              <div className="policySmall">
                Many CC licenses require crediting the both the performing artist and the cover artist. Keep a short attribution note in your report/README when you
                include example visuals in a demo or submission.
              </div>
            </div>

            <div className="policyCallout">
              <div className="policyCalloutHead">Restrictions (NC / ND / SA)</div>
              <div className="policySmall">
                Some licenses restrict commercial use (NC), modifications (ND), or require sharing derivatives under the same
                license (SA). Follow the exact terms for the album cpver art you choose.
              </div>
            </div>
          </div>

          <div className="policyLabel policySpacer">DISCLAIMER</div>
          <p className="policySmall">
            This page is informational and not legal advice. If you are unsure about rights or licensing, use your own assets
            or CC0 materials, and verify the license terms on the source page.
          </p>
        </main>

        {/* RIGHT */}
        <aside className="policyAside">
          <div className="policyLabel">WHY THIS MATTERS</div>

          <div className="policyFact">
            <div className="policyFactHead">COURSE / DISSERTATION SAFE</div>
            <div className="policySmall">
              You can demonstrate the tool without bundling copyrighted album covers or storing user uploads.
            </div>
          </div>

          <div className="policyFact">
            <div className="policyFactHead">PRIVACY-FIRST</div>
            <div className="policySmall">
              The site analyzes files locally. When you refresh/leave, uploaded content can be cleared (depending on your flow).
            </div>
          </div>

          <div className="policyFact">
            <div className="policyFactHead">RESPONSIBLE USE</div>
            <div className="policySmall">
              The tool supports evaluation and learning. Users remain responsible for what they upload and how they use it.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
