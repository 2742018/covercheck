import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type RefItem = {
  id: string;
  title: string;
  source: string;
  year: string;
  kind: "standard" | "industry" | "peer-reviewed" | "thesis";
  summary: string;
  supports: string[];
  useInTooltips?: string[];
  useInReports?: string[];
  href?: string;
};

type MethodBlock = {
  id: string;
  title: string;
  intro: string;
  reportUse: string;
  tooltipUse: string;
  refs: RefItem[];
};

const METHODS: MethodBlock[] = [
  {
    id: "readability",
    title: "Readability / Contrast",
    intro:
      "Supports why CoverCheck evaluates contrast, image-background legibility, and low-contrast text risk in streaming-style viewing conditions.",
    reportUse:
      "Use this section to justify contrast thresholds, text-over-image warnings, and why readability is treated as a core design requirement rather than a cosmetic preference.",
    tooltipUse:
      "Useful for contrast ratio tooltips, low-contrast warnings, and text-over-image help text.",
    refs: [
      {
        id: "wcag-contrast",
        title: "WCAG 2.2 — Contrast (Minimum) / Contrast (Enhanced)",
        source: "W3C",
        year: "2024",
        kind: "standard",
        summary:
          "Defines the most common digital text contrast thresholds: 4.5:1 for normal text and 3:1 for large text.",
        supports: [
          "Why contrast is measured",
          "Why 4.5:1 is a sensible target for smaller text",
          "Why 3:1 can be acceptable for larger display text",
        ],
        useInTooltips: [
          "WCAG baseline: 4.5:1 for normal text and 3:1 for large text.",
        ],
        useInReports: [
          "Contrast scoring references WCAG minimum guidance for digital text legibility.",
        ],
        href: "https://www.w3.org/TR/WCAG22/",
      },
      {
        id: "wcag-rationale",
        title: "Understanding Success Criterion 1.4.3: Contrast (Minimum)",
        source: "W3C WAI",
        year: "Supporting guidance",
        kind: "standard",
        summary:
          "Explains why text contrast matters for users with reduced visual acuity and contrast sensitivity.",
        supports: [
          "Why contrast thresholds exist",
          "Why low-contrast text is an accessibility risk",
        ],
        useInReports: [
          "The chosen contrast targets follow accessibility guidance intended to account for reduced visual acuity and contrast sensitivity.",
        ],
        href: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
      },
      {
        id: "nng-low-contrast",
        title: "Low-Contrast Text Is Not the Answer",
        source: "Nielsen Norman Group",
        year: "2015",
        kind: "industry",
        summary:
          "Practical UX guidance showing how low-contrast text reduces legibility, discoverability, and usability.",
        supports: [
          "Why low-contrast type harms readability",
          "Why refined-looking typography can still fail in practice",
        ],
        useInTooltips: [
          "Low-contrast text may look refined but becomes illegible quickly at small sizes.",
        ],
        useInReports: [
          "Low-contrast typography is a known UX risk because legibility and discoverability drop as contrast weakens.",
        ],
        href: "https://www.nngroup.com/articles/low-contrast/",
      },
      {
        id: "nng-text-over-images",
        title: "Ensure High Contrast for Text Over Images",
        source: "Nielsen Norman Group",
        year: "2015",
        kind: "industry",
        summary:
          "Applies the contrast problem directly to text over imagery, which is especially relevant to title and artist overlays on album covers.",
        supports: [
          "Why text-over-image treatments often need overlays",
          "Why placement matters as much as color",
        ],
        useInTooltips: [
          "Text over images often needs an overlay or calmer placement to remain readable.",
        ],
        useInReports: [
          "Text placed over imagery was evaluated because image backgrounds often reduce effective readability even when the palette appears acceptable.",
        ],
        href: "https://www.nngroup.com/articles/text-over-images/",
      },
    ],
  },
  {
    id: "typography",
    title: "Typography / Size / Glance Legibility",
    intro:
      "Supports why CoverCheck treats title size, survival at small scales, and glance-based readability as meaningful design variables.",
    reportUse:
      "Use this section to justify small-size stress checks, title-region size concerns, and the use of 64px / thumbnail-style evaluation.",
    tooltipUse:
      "Useful for 64px checks, typography stress test notes, and warnings about very small title regions.",
    refs: [
      {
        id: "legge-print-size",
        title: "Does Print Size Matter for Reading? A Review of Findings from Vision Science and Typography",
        source: "Vision Research / PMC",
        year: "2011",
        kind: "peer-reviewed",
        summary:
          "Reviews evidence showing that print size strongly affects reading performance and fluent reading speed.",
        supports: [
          "Why title size matters in thumbnails",
          "Why small title zones fail quickly at 64–128px",
        ],
        useInTooltips: [
          "Legibility depends heavily on size, so very small title zones are risky in thumbnails.",
        ],
        useInReports: [
          "Title-region size is treated as meaningful because print size strongly affects legibility and reading performance.",
        ],
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264/",
      },
      {
        id: "dobres-glance",
        title: "Effects of Age, Typeface Design, Size and Display Polarity on Glance Legibility",
        source: "Applied Ergonomics / PMC",
        year: "2016",
        kind: "peer-reviewed",
        summary:
          "Shows that glance legibility depends on factors including size, typeface design, and display conditions.",
        supports: [
          "Why glance legibility matters in browsing contexts",
          "Why thumbnail-style checks are valid",
        ],
        useInReports: [
          "Thumbnail checks are included because covers are often encountered in fast, glance-based browsing rather than full-size inspection.",
        ],
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401/",
      },
      {
        id: "larson-picard-aesthetics-reading",
        title: "The Aesthetics of Reading",
        source: "CHI / ACM",
        year: "2005",
        kind: "peer-reviewed",
        summary:
          "Explores how typography and visual presentation shape reading experience, supporting the idea that appearance and legibility interact rather than operate separately.",
        supports: [
          "Why typography choices affect user experience",
          "Why readability cannot be separated from visual design",
        ],
        useInReports: [
          "Typography choices are treated as both experiential and functional because reading quality is shaped by visual presentation as well as raw text content.",
        ],
        href: "https://dl.acm.org/doi/10.1145/1054972.1055011",
      },
    ],
  },
  {
    id: "symmetry",
    title: "Symmetry / Balance / Complexity",
    intro:
      "Supports the use of symmetry, balance, and complexity as meaningful composition variables rather than decorative observations.",
    reportUse:
      "Use this section to justify symmetry, balance, and visual complexity language in composition summaries.",
    tooltipUse:
      "Useful for symmetry score, structure commentary, and composition notes.",
    refs: [
      {
        id: "huang-symmetry",
        title: "The Aesthetic Preference for Symmetry Dissociates from Early Attention to Symmetry",
        source: "PNAS / PMC",
        year: "2018",
        kind: "peer-reviewed",
        summary:
          "Describes symmetry as a visual property with broad effects on aesthetic experience across cultures and periods.",
        supports: [
          "Why symmetry is a legitimate aesthetic variable",
          "Why symmetry can be discussed separately from salience",
        ],
        useInTooltips: [
          "Symmetry is a robust aesthetic variable, not just a style preference.",
        ],
        useInReports: [
          "Symmetry was included as a composition dimension because research shows it systematically affects aesthetic response.",
        ],
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5908848/",
      },
      {
        id: "bertamini-symmetry",
        title: "Symmetry Preference in Shapes, Faces, Flowers and Landscapes",
        source: "Symmetry / PMC",
        year: "2019",
        kind: "peer-reviewed",
        summary:
          "Finds a general preference for symmetry across several visual categories while also showing that context still matters.",
        supports: [
          "Why symmetry often reads as organized or pleasing",
          "Why asymmetry can still work depending on intent",
        ],
        useInReports: [
          "Symmetry is treated as one composition axis rather than a universal good: evidence suggests it often supports preference, but context still matters.",
        ],
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6585942/",
      },
      {
        id: "mather-symmetry-complexity",
        title: "Social Groups and Polarization of Aesthetic Values from Symmetry and Complexity",
        source: "Peer-reviewed study / PMC",
        year: "2023",
        kind: "peer-reviewed",
        summary:
          "Shows that symmetry and complexity interact in aesthetic evaluation, supporting the use of multiple composition variables together.",
        supports: [
          "Why symmetry should not be interpreted alone",
          "Why complexity and symmetry are valid paired variables",
        ],
        useInReports: [
          "Composition is evaluated across multiple axes because symmetry and complexity can interact rather than operate independently.",
        ],
        href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10700581/",
      },
      {
        id: "reber-fluency",
        title: "Processing Fluency and Aesthetic Pleasure: Is Beauty in the Perceiver’s Processing Experience?",
        source: "Personality and Social Psychology Review",
        year: "2004",
        kind: "peer-reviewed",
        summary:
          "A foundational account of how ease of perceptual processing can influence aesthetic judgments, relevant to clarity, balance, and composition.",
        supports: [
          "Why cleaner, more structured designs may feel easier to process",
          "Why design clarity can affect preference",
        ],
        useInReports: [
          "Structure and clarity were treated as meaningful because aesthetic response is partly shaped by how fluently visual information is processed.",
        ],
        href: "https://journals.sagepub.com/doi/10.1207/s15327957pspr0804_3",
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility / Inclusive Visual Design",
    intro:
      "Supports why CoverCheck includes accessibility-aware checks rather than treating them as separate from mainstream design quality.",
    reportUse:
      "Use this section when explaining why accessibility-aware design strengthens rather than weakens communication quality.",
    tooltipUse:
      "Useful for accessibility notes, low-contrast warnings, and justification for color-accessibility simulation.",
    refs: [
      {
        id: "wcag-perceivable",
        title: "WCAG 2.2 — Perceivable Principle",
        source: "W3C",
        year: "2024",
        kind: "standard",
        summary:
          "Frames perceivability as a core accessibility principle, relevant to text, contrast, and distinguishability.",
        supports: [
          "Why visibility is a baseline requirement",
          "Why accessible perception is central, not optional",
        ],
        useInReports: [
          "Accessibility-aware checks are included because perceivability is a foundational requirement for digital communication.",
        ],
        href: "https://www.w3.org/TR/WCAG22/#perceivable",
      },
      {
        id: "w3c-color-contrast",
        title: "WAI Tutorials — Color and Contrast",
        source: "W3C WAI",
        year: "Guidance",
        kind: "standard",
        summary:
          "Explains practical color and contrast considerations for accessible visual communication.",
        supports: [
          "Why color alone should not carry meaning",
          "Why contrast and distinguishability should be checked together",
        ],
        useInTooltips: [
          "Color choice should support meaning, but contrast and separation still need to hold independently.",
        ],
        href: "https://www.w3.org/WAI/tips/designing/#provide-sufficient-contrast-between-foreground-and-background",
      },
      {
        id: "nng-accessible-design",
        title: "Accessibility and UX: Design for All Users",
        source: "Nielsen Norman Group",
        year: "Industry guidance",
        kind: "industry",
        summary:
          "Positions accessibility as part of core user experience rather than as a separate specialist requirement.",
        supports: [
          "Why accessibility belongs inside design evaluation",
          "Why inclusive clarity benefits general usability",
        ],
        useInReports: [
          "Accessibility considerations were treated as part of overall UX quality rather than as a separate specialist concern.",
        ],
        href: "https://www.nngroup.com/articles/accessibility-usability/",
      },
    ],
  },
  {
    id: "music-context",
    title: "Album Covers, Genre Signalling & Music Context",
    intro:
      "Supports the idea that album covers communicate genre, mood, and artist context rather than acting as decoration alone.",
    reportUse:
      "Use this section when explaining why cover art can signal genre, identity, mood, or release positioning.",
    tooltipUse:
      "Useful for mood/genre notes, visual-identity guidance, and justification for mockup/context views.",
    refs: [
      {
        id: "oramas-2018",
        title: "Multimodal Deep Learning for Music Genre Classification",
        source: "Transactions of the ISMIR",
        year: "2018",
        kind: "peer-reviewed",
        summary:
          "Treats album cover images as a meaningful modality for genre classification alongside audio and text.",
        supports: [
          "Why cover art contains measurable genre information",
          "Why image modality is relevant in music understanding tasks",
        ],
        useInTooltips: [
          "Album art can act as a meaningful genre signal, not just packaging.",
        ],
        useInReports: [
          "Cover analysis is justified because MIR research treats album artwork as a meaningful modality for genre-related prediction.",
        ],
        href: "https://transactions.ismir.net/articles/10.5334/tismir.10",
      },
      {
        id: "oramas-2017",
        title: "Multi-Label Music Genre Classification from Audio, Text, and Images Using Deep Features",
        source: "ISMIR 2017",
        year: "2017",
        kind: "peer-reviewed",
        summary:
          "Explicitly includes album cover images in multimodal genre-classification pipelines.",
        supports: [
          "Why image features belong in multimodal music analysis",
          "Why cover art is not an irrelevant side channel",
        ],
        useInReports: [
          "This project’s image-aware framing aligns with multimodal genre work that includes album covers as one informative source.",
        ],
        href: "https://archives.ismir.net/ismir2017/paper/000126.pdf",
      },
      {
        id: "judge-by-cover",
        title: "You Can Judge an Artist by an Album Cover",
        source: "Computer-vision music annotation research",
        year: "2010",
        kind: "peer-reviewed",
        summary:
          "Shows that image analysis can predict music genre tags from album covers, suggesting covers encode artist/music context visually.",
        supports: [
          "Why album covers help place artists in musical context",
          "Why visual signals can correlate with genre tags",
        ],
        useInReports: [
          "Album art is treated as context-bearing because prior image-based music annotation work shows covers encode meaningful genre-related cues.",
        ],
        href: "https://www.researchgate.net/publication/224213543_You_Can_Judge_an_Artist_by_an_Album_Cover_Using_Images_for_Music_Annotation",
      },
      {
        id: "cover-design-genres",
        title: "Relationship between Album Cover Design and Music Genres",
        source: "Design research summary",
        year: "2022",
        kind: "peer-reviewed",
        summary:
          "Reports relationships between typographic, compositional, and color elements of album covers and music genres.",
        supports: [
          "Why genre mood can be discussed through color and composition",
          "Why visual conventions differ across genres",
        ],
        useInTooltips: [
          "Color, composition, and typography often vary by genre convention.",
        ],
        useInReports: [
          "Genre-facing art direction is supported by research linking cover typography, composition, and color to genre patterns.",
        ],
        href: "https://www.researchgate.net/publication/338074523_Relationship_between_album_cover_design_and_music_genres",
      },
      {
        id: "cook-cover-art",
        title: "The Effect of Cover Artwork on the Music Industry",
        source: "Cal Poly thesis",
        year: "Thesis",
        kind: "thesis",
        summary:
          "Frames cover art as attention-grabbing music packaging and discusses the importance of release presentation.",
        supports: [
          "Why cover artwork matters in music-industry presentation",
          "Why packaging language still matters in digital contexts",
        ],
        useInReports: [
          "Cover art is discussed as part of release presentation because packaging and visual communication shape first impressions in music contexts.",
        ],
        href: "https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1108&context=grcsp&httpsredir=1&referer=",
      },
      {
        id: "looking-at-sound",
        title: "Looking at Sound: Contextualising Album Cover Multimodality",
        source: "Design / multimodality thesis",
        year: "2021",
        kind: "thesis",
        summary:
          "Argues that album covers occupy a unique space as both art objects and market-facing communication and play an important role in multisensory appreciation of music.",
        supports: [
          "Why covers are not purely decorative",
          "Why they can be treated as both cultural and commercial signals",
        ],
        useInReports: [
          "Album covers are treated as both aesthetic objects and market-facing communication, not merely decorative wrappers.",
        ],
        href: "https://www.researchgate.net/publication/348416993_Looking_at_Sound_Contextualising_Album_Cover_Multimodality",
      },
    ],
  },
];

function kindLabel(kind: RefItem["kind"]) {
  if (kind === "standard") return "Standard";
  if (kind === "industry") return "Industry";
  if (kind === "peer-reviewed") return "Peer-reviewed";
  return "Thesis";
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function MethodsReferenceCard({ item }: { item: RefItem }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="methodRefCard">
      <button
        className="methodRefHead"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        type="button"
      >
        <div className="methodRefHeadContent">
          <div className="methodRefTitle">{item.title}</div>
          <div className="methodRefSub">
            {item.source} • {item.year}
          </div>
          <div className="methodRefMeta">
            <span className={`methodBadge ${item.kind}`}>{kindLabel(item.kind)}</span>
          </div>
        </div>

        <span className="methodRefChevron">{open ? "HIDE" : "OPEN"}</span>
      </button>

      {open && (
        <div className="methodRefBody">
          <div className="methodRefSummary">{item.summary}</div>

          <div className="methodRefBlock">
            <div className="methodRefBlockHead">What this supports</div>
            <ul className="methodRefList">
              {item.supports.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          {item.useInTooltips?.length ? (
            <div className="methodRefBlock">
              <div className="methodRefBlockHead">Tooltip-ready phrasing</div>
              <div className="methodRefQuote">
                {item.useInTooltips.map((t) => (
                  <div key={t} className="methodRefQuoteLine">
                    {t}
                  </div>
                ))}
              </div>
              <div className="methodRefActions">
                <button
                  className="ghostBtn small"
                  type="button"
                  onClick={() => copyText(item.useInTooltips!.join("\n"))}
                >
                  COPY TOOLTIP TEXT
                </button>
              </div>
            </div>
          ) : null}

          {item.useInReports?.length ? (
            <div className="methodRefBlock">
              <div className="methodRefBlockHead">Report-ready phrasing</div>
              <div className="methodRefQuote">
                {item.useInReports.map((t) => (
                  <div key={t} className="methodRefQuoteLine">
                    {t}
                  </div>
                ))}
              </div>
              <div className="methodRefActions">
                <button
                  className="ghostBtn small"
                  type="button"
                  onClick={() => copyText(item.useInReports!.join("\n"))}
                >
                  COPY REPORT TEXT
                </button>
              </div>
            </div>
          ) : null}

          {item.href ? (
            <div className="methodRefActions">
              <a
                className="ghostBtn"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                OPEN SOURCE
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function MethodsReferencesPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>(METHODS[0].id);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<
    "all" | "standard" | "industry" | "peer-reviewed" | "thesis"
  >("all");

  const totalRefs = METHODS.reduce((sum, block) => sum + block.refs.length, 0);

  const filteredMethods = useMemo(() => {
    const q = search.trim().toLowerCase();

    return METHODS.map((block) => {
      const refs = block.refs.filter((item) => {
        const kindOk = kindFilter === "all" ? true : item.kind === kindFilter;
        const textOk =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.supports.some((s) => s.toLowerCase().includes(q));

        return kindOk && textOk;
      });

      return { ...block, refs };
    }).filter((block) => block.refs.length > 0 || !search);
  }, [search, kindFilter]);

  const visibleCount = filteredMethods.reduce((sum, block) => sum + block.refs.length, 0);

  const scrollToSection = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="methodsWrap">
      <div className="mockHero methodsHero">
        <div className="mockHeroTop">
          <button className="ghostBtn" onClick={() => navigate(-1)}>
            ← BACK
          </button>

          <div className="mockHeroActions">
            <button className="ghostBtn" onClick={() => window.print()}>
              PRINT / SAVE PDF
            </button>
          </div>
        </div>

        <div className="mockKicker">COVERCHECK</div>
        <div className="mockTitle">Methods & References</div>
        <div className="mockLead">
          The academic and practitioner support behind CoverCheck: why readability matters,
          why balance and complexity are valid composition axes, and why album covers communicate
          genre, mood, and release context.
        </div>

        <div className="methodsHeroStats">
          <div className="miniCard">
            <div className="miniLabel">Sections</div>
            <div className="miniValue">{METHODS.length}</div>
            <div className="miniSub">Evidence areas</div>
          </div>
          <div className="miniCard">
            <div className="miniLabel">References</div>
            <div className="miniValue">{totalRefs}</div>
            <div className="miniSub">Total sources</div>
          </div>
          <div className="miniCard">
            <div className="miniLabel">Visible</div>
            <div className="miniValue">{visibleCount}</div>
            <div className="miniSub">After filtering</div>
          </div>
        </div>

        <div className="methodsControls">
          <input
            className="methodsSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search by title, summary, support area..."
          />

          <div className="pillRow">
            {(["all", "standard", "industry", "peer-reviewed", "thesis"] as const).map((kind) => (
              <button
                key={kind}
                className={`pillBtn ${kindFilter === kind ? "on" : ""}`}
                onClick={() => setKindFilter(kind)}
              >
                {kind === "all" ? "ALL" : kind.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="methodsTabs">
          {METHODS.map((m) => (
            <button
              key={m.id}
              className={`methodsTab ${active === m.id ? "on" : ""}`}
              onClick={() => scrollToSection(m.id)}
            >
              {m.title}
            </button>
          ))}
        </div>

        <hr className="mockRule" />
      </div>

      <div className="methodsLayout">
        <main className="methodsMain">
          {filteredMethods.map((block) => (
            <section id={block.id} key={block.id} className="methodSection">
              <div className="panelDark">
                <div className="panelTop">
                  <div className="panelTitle">{block.title}</div>
                  <div className="panelNote">{block.intro}</div>
                </div>

                <div className="panelBody">
                  <div className="methodUseGrid">
                    <div className="methodUseCard">
                      <div className="methodUseLabel">For reports</div>
                      <div className="methodUseText">{block.reportUse}</div>
                    </div>

                    <div className="methodUseCard">
                      <div className="methodUseLabel">For tooltips</div>
                      <div className="methodUseText">{block.tooltipUse}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="methodRefsStack">
                {block.refs.length ? (
                  block.refs.map((item) => <MethodsReferenceCard key={item.id} item={item} />)
                ) : (
                  <div className="panelDark">
                    <div className="panelBody">
                      <div className="miniHint">No references match the current filter here.</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>

        <aside className="methodsAside">
          <div className="panelDark methodsAsideCard">
            <div className="panelTop">
              <div className="panelTitle">Quick navigation</div>
              <div className="panelNote">
                Jump by evidence area and use this page as a source bank for reports, tooltips, and evaluation writing.
              </div>
            </div>

            <div className="panelBody">
              <div className="methodsNavList">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`methodsNavBtn ${active === m.id ? "on" : ""}`}
                    onClick={() => scrollToSection(m.id)}
                  >
                    <div className="methodsNavBtnTitle">{m.title}</div>
                    <div className="methodsNavBtnText">{m.intro}</div>
                  </button>
                ))}
              </div>

              <div className="methodsEvidenceNote">
                <div className="methodsEvidenceLine">
                  <b>Standards</b> support threshold choices such as contrast ratios.
                </div>
                <div className="methodsEvidenceLine">
                  <b>Peer-reviewed research</b> supports perceptual, compositional, and music-context claims.
                </div>
                <div className="methodsEvidenceLine">
                  <b>Industry guidance</b> helps translate principles into practical UI/readability advice.
                </div>
                <div className="methodsEvidenceLine">
                  <b>Theses</b> help frame cover art as both aesthetic and market-facing communication.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}