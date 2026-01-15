// src/pages/PlayPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { makeCoverSvgDataUrl } from "../lib/art";
import { fileToDataUrl, readLocal, writeLocal } from "../lib/storage";

type Tile =
  | { id: string; kind: "generated"; seed: number }
  | { id: string; kind: "upload"; dataUrl: string | null };

const LS_KEY = "covercheck.play.v1";

function makeInitialTiles(): Tile[] {
  const seeds = [11, 22, 33, 44, 55, 66, 77, 88, 99, 111, 222];
  const tiles: Tile[] = [];
  let s = 0;

  for (let i = 0; i < 12; i++) {
    if (i === 6) {
      tiles.push({ id: "upload-slot", kind: "upload", dataUrl: null });
    } else {
      tiles.push({ id: `gen-${i}`, kind: "generated", seed: seeds[s % seeds.length] + i * 13 });
      s++;
    }
  }
  return tiles;
}

export default function PlayPage() {
  const navigate = useNavigate();
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const [tiles, setTiles] = React.useState<Tile[]>(() => {
    const saved = readLocal<{ tiles: Tile[] }>(LS_KEY, { tiles: makeInitialTiles() });
    if (!Array.isArray(saved.tiles) || saved.tiles.length === 0) return makeInitialTiles();
    return saved.tiles;
  });

  React.useEffect(() => {
    writeLocal(LS_KEY, { tiles });
  }, [tiles]);

  function shuffleGenerated() {
    setTiles((prev) =>
      prev.map((t) =>
        t.kind === "generated" ? { ...t, seed: t.seed + Math.floor(Math.random() * 10_000) } : t
      )
    );
  }

  async function handleUpload(file: File) {
    const dataUrl = await fileToDataUrl(file);
    setTiles((prev) => prev.map((t) => (t.kind === "upload" ? { ...t, dataUrl } : t)));
    navigate("/analyze", { state: { dataUrl } });
  }

  function onTileClick(t: Tile) {
    if (t.kind === "upload") {
      if (!t.dataUrl) fileRef.current?.click();
      else navigate("/analyze", { state: { dataUrl: t.dataUrl } });
      return;
    }

    setTiles((prev) =>
      prev.map((x) =>
        x.id === t.id && x.kind === "generated"
          ? { ...x, seed: x.seed + Math.floor(Math.random() * 10_000) }
          : x
      )
    );
  }

  return (
    <div className="playWrap">
      <div className="playHeader">
        <div>
          <div className="playTitle">ANALYZE</div>
          <div className="playSub">
            Click any tile to shuffle. Click the empty slot to upload your cover, then analyze.
          </div>
        </div>

        <div className="playActions">
          <button className="ghostBtn" onClick={shuffleGenerated}>
            SHUFFLE ALL
          </button>
          <input
            ref={fileRef}
            className="hiddenFile"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <div className="gallery">
        {tiles.map((t) => {
          if (t.kind === "generated") {
            const src = makeCoverSvgDataUrl(t.seed);
            return (
              <button key={t.id} className="tile" onClick={() => onTileClick(t)} title="Click to shuffle">
                <img src={src} alt="Generated album tile" />
              </button>
            );
          }

          return (
            <button
              key={t.id}
              className={`tile uploadTile ${t.dataUrl ? "hasImage" : ""}`}
              onClick={() => onTileClick(t)}
              title={t.dataUrl ? "Click to analyze" : "Click to upload"}
            >
              {t.dataUrl ? (
                <>
                  <img src={t.dataUrl} alt="Your uploaded cover" />
                  <div className="tileBadge">ANALYZE</div>
                </>
              ) : (
                <div className="uploadInner">
                  <div className="uploadPlus">+</div>
                  <div className="uploadLabel">UPLOAD YOUR COVER</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="playFooterHint">
        Tip: the grid is just the “gallery entry”. The real tool happens in <b>Analyze</b>.
      </div>
    </div>
  );
}