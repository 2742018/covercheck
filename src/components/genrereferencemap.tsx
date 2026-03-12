import React from "react";
import {
  GENRE_REFERENCE_MAP,
  type GenreReferenceKey,
  evaluateGenreAlignment,
} from "../lib/genrereferencemap.ts";

type Props = {
  initialGenre?: GenreReferenceKey;
  coverMood?: {
    brightness: "dark" | "mid" | "light";
    saturation: "muted" | "balanced" | "vivid";
    temperature: "cool" | "neutral" | "warm";
    texture: "low" | "medium" | "high";
    symmetry: "low" | "medium" | "high";
  } | null;
};

export default function GenreReferenceMap({
  initialGenre = "Indie",
  coverMood = null,
}: Props) {
  const [genre, setGenre] = React.useState<GenreReferenceKey>(initialGenre);
  const profile = GENRE_REFERENCE_MAP[genre];
  const alignment = coverMood ? evaluateGenreAlignment(genre, coverMood) : null;

  return (
    <div className="panelDark genreMapPanel">
      <div className="panelTop">
        <div className="panelTitle">Genre reference map</div>
        <div className="panelNote">
          A curated genre-facing visual guide. This is guidance for art direction and
          reflection, not automatic genre detection.
        </div>
      </div>

      <div className="panelBody">
        <div className="genreMapTopbar">
          <div className="genreMapChooser">
            <div className="miniLabel">Genre direction</div>
            <select
              className="mockSelect"
              value={genre}
              onChange={(e) => setGenre(e.currentTarget.value as GenreReferenceKey)}
            >
              {Object.keys(GENRE_REFERENCE_MAP).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="genreMapMeta">
            <span className="tag">{profile.title}</span>
            {profile.moodTags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {alignment && (
              <span className={`statusTag ${alignment.score >= 55 ? "pass" : "fail"}`}>
                Alignment: {alignment.label} • {alignment.score}%
              </span>
            )}
          </div>
        </div>

        <div className="genreMapIntroCard">
          <div className="sectionHead">Overview</div>
          <div className="detailLine">{profile.shortDescription}</div>
        </div>

        <div className="genreMapGrid">
          <div className="miniCard">
            <div className="miniLabel">Common traits</div>
            <ul className="genreMapList">
              {profile.commonTraits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="miniCard">
            <div className="miniLabel">Colour logic</div>
            <ul className="genreMapList">
              {profile.colorLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="miniCard">
            <div className="miniLabel">Typography logic</div>
            <ul className="genreMapList">
              {profile.typographyLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="miniCard">
            <div className="miniLabel">Composition logic</div>
            <ul className="genreMapList">
              {profile.compositionLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="genreMapLowerGrid">
          <div className="miniCard">
            <div className="miniLabel">Reference palette</div>
            <div className="paletteStrip">
              {profile.referencePalette.map((c) => (
                <span
                  key={c}
                  className="chip small"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="miniCard">
            <div className="miniLabel">Caution notes</div>
            <ul className="genreMapList">
              {profile.cautionNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="miniCard">
            <div className="miniLabel">Practical use</div>
            <ul className="genreMapList">
              {profile.practicalUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {alignment && (
          <div className="genreMapAlignmentBlock">
            <div className="sectionHead">Alignment with current cover mood</div>

            <div className="reportGrid">
              <div className="miniCard">
                <div className="miniLabel">What aligns</div>
                {alignment.strengths.length ? (
                  <ul className="genreMapList">
                    {alignment.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="miniHint">No strong matches detected.</div>
                )}
              </div>

              <div className="miniCard">
                <div className="miniLabel">What to watch</div>
                {alignment.cautions.length ? (
                  <ul className="genreMapList">
                    {alignment.cautions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="miniHint">No major cautions suggested.</div>
                )}
              </div>
            </div>

            <div className="detailLine" style={{ marginTop: 12 }}>
              This is best used as reflective guidance: strong alignment suggests your
              visual direction fits the chosen genre conventions, while loose alignment
              may still be intentional if you are deliberately resisting those conventions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}