import React from "react";
import {
  GENRE_REFERENCE_MAP,
  type GenreReferenceKey,
  evaluateGenreAlignment,
} from "../lib/genrereferencemap";

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
    <div className="genreMapRoot">
      <div className="genreMapHeader">
        <div className="genreMapTitle">Genre reference map</div>
        <div className="genreMapNote">
          Use this as a reference for art direction and reflection, not as genre detection or a complete list of all music genres.
        </div>
      </div>

      <div
        className="genreMapIntroCard"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div className="genreMapSectionHead">Reference notice</div>
        <div className="genreMapText">
          This map is only a reference guide. It does not cover every genre, subgenre, or hybrid direction, and a good cover can still work by deliberately resisting these conventions.
        </div>
      </div>

      <div className="genreMapBody">
        <div className="genreMapTopbar">
          <div className="genreMapChooser">
            <div className="genreMapLabel">Genre direction</div>
            <select
              className="genreMapSelect"
              value={genre}
              onChange={(e) =>
                setGenre(e.currentTarget.value as GenreReferenceKey)
              }
            >
              {Object.keys(GENRE_REFERENCE_MAP).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="genreMapMeta">
            <span className="genreMapChip">{profile.title}</span>

            {profile.moodTags.map((tag) => (
              <span key={tag} className="genreMapChip">
                {tag}
              </span>
            ))}

            {alignment && (
              <span
                className={`genreMapStatus ${
                  alignment.score >= 55 ? "pass" : "fail"
                }`}
              >
                Alignment: {alignment.label} • {alignment.score}%
              </span>
            )}
          </div>
        </div>

        <div className="genreMapIntroCard">
          <div className="genreMapSectionHead">Overview</div>
          <div className="genreMapText">{profile.shortDescription}</div>
          <div className="genreMapText" style={{ marginTop: 10, opacity: 0.88 }}>
            Use this profile to compare your current visual direction against broad genre cues in colour, typography, composition, and mood.
          </div>
        </div>

        <div className="genreMapGrid">
          <div className="genreMapCard">
            <div className="genreMapCardLabel">Common traits</div>
            <ul className="genreMapList">
              {profile.commonTraits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="genreMapCard">
            <div className="genreMapCardLabel">Colour logic</div>
            <ul className="genreMapList">
              {profile.colorLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="genreMapCard">
            <div className="genreMapCardLabel">Typography logic</div>
            <ul className="genreMapList">
              {profile.typographyLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="genreMapCard">
            <div className="genreMapCardLabel">Composition logic</div>
            <ul className="genreMapList">
              {profile.compositionLogic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="genreMapLowerGrid">
          <div className="genreMapCard">
            <div className="genreMapCardLabel">Reference palette</div>
            <div className="genreMapPalette">
              {profile.referencePalette.map((color) => (
                <span
                  key={color}
                  className="genreMapSwatch"
                  style={{ background: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="genreMapCard">
            <div className="genreMapCardLabel">Caution notes</div>
            <ul className="genreMapList">
              {profile.cautionNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="genreMapCard">
            <div className="genreMapCardLabel">Practical use</div>
            <ul className="genreMapList">
              {profile.practicalUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {alignment && (
          <div className="genreMapAlignmentBlock">
            <div className="genreMapSectionHead">
              Alignment with current cover mood
            </div>

            <div className="genreMapText" style={{ marginBottom: 12 }}>
              {alignment.summary}
            </div>

            <div className="genreMapReportGrid" style={{ marginBottom: 14 }}>
              <div className="genreMapCard">
                <div className="genreMapCardLabel">What aligns</div>
                {alignment.strengths.length > 0 ? (
                  <ul className="genreMapList">
                    {alignment.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="genreMapHint">No strong matches detected.</div>
                )}
              </div>

              <div className="genreMapCard">
                <div className="genreMapCardLabel">What to watch</div>
                {alignment.cautions.length > 0 ? (
                  <ul className="genreMapList">
                    {alignment.cautions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="genreMapHint">No major cautions suggested.</div>
                )}
              </div>
            </div>

            <div className="genreMapCard" style={{ marginTop: 8 }}>
              <div className="genreMapCardLabel">How the alignment was judged</div>
              <div className="genreMapReportGrid" style={{ marginTop: 10 }}>
                {alignment.dimensions.map((item) => (
                  <div key={item.key} className="genreMapCard" style={{ padding: 14 }}>
                    <div className="genreMapCardLabel">{item.title}</div>
                    <div className="genreMapText" style={{ marginBottom: 6 }}>
                      Current: <strong>{item.inputValue}</strong>
                      {" "}• Expected range: <strong>{item.acceptedValues.join(" / ")}</strong>
                    </div>
                    <div className="genreMapText" style={{ marginBottom: 8, opacity: 0.88 }}>
                      {item.whyItMatters}
                    </div>
                    <div className="genreMapHint">
                      {item.matches ? "Fits the reference direction." : item.advice}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="genreMapText" style={{ marginTop: 12 }}>
              A strong score means your current mood is close to the chosen reference direction. A looser score does not automatically mean the cover is wrong; it may mean the design is more cross-genre, more experimental, or intentionally resisting convention.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
