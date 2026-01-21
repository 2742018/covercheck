import React from "react";
import { useNavigate } from "react-router-dom";
import { fileToDataUrl } from "../lib/storage";

type Tile =
  | { id: string; kind: "static"; src: string; label: string }
  | { id: string; kind: "upload"; dataUrl: string | null };

const STATIC_COUNT = 11; // number of static images available

function buildStaticImageUrls(): Array<{ src: string; label: string }> {
  const BASE = import.meta.env.BASE_URL;

  return Array.from({ length: STATIC_COUNT }, (_, i) => {
    const name = String(i + 1).padStart(2, "0");
    return {
      src: `${BASE}play/${name}.jpg`,
      label: `Sample cover ${name}`,
    };
  });
}

function makeInitialTiles(): Tile[] {
  const BASE = import.meta.env.BASE_URL; // "/covercheck/" on GitHub Pages
  const images = Array.from(
    { length: 11 },
    (_, i) => `${BASE}play/${String(i + 1).padStart(2, "0")}.jpg`
  );

  const tiles: Tile[] = [];
  let imgIndex = 0;

  for (let i = 0; i < 12; i++) {
    if (i === 6) {
      tiles.push({ id: "upload-slot", kind: "upload", dataUrl: null });
    } else {
      const name = String((imgIndex % images.length) + 1).padStart(2, "0");
      tiles.push({ id: `static-${i}`, kind: "static", src: images[imgIndex % images.length], label: `Sample cover ${name}` });
      imgIndex++;
    }
  }
  return tiles;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PlayPage() {
  const navigate = useNavigate();
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // No persistence: reload/exit clears uploads
  const [tiles, setTiles] = React.useState<Tile[]>(() => makeInitialTiles());

  // Optionally pre-load all static images
  React.useEffect(() => {
    const images = buildStaticImageUrls();
    images.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  function shuffleStatic() {
    setTiles((prev) => {
      const statics = prev.filter((t) => t.kind === "static") as Extract<Tile, { kind: "static" }>[];
      const shuffled = shuffleArray(statics);

      let si = 0;
      return prev.map((t) => (t.kind === "static" ? shuffled[si++] : t));
    });
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

    // Static image → analyze directly
    navigate("/analyze", { state: { dataUrl: t.src } });
  }

  return (
    <div className="playWrap">
      <div className="playHeader">
        <div>
          <div className="playTitle">PLAY / ANALYZE</div>
          <div className="playSub">
            Click a tile to analyze it. Use the empty slot to upload your own cover. Shuffle changes the gallery order.
          </div>
        </div>

        <div className="playActions">
          <button className="ghostBtn" onClick={shuffleStatic}>
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
          if (t.kind === "static") {
            return (
              <button key={t.id} className="tile" onClick={() => onTileClick(t)} title="Click to analyze">
                <img
                  src={t.src}
                  alt={t.label}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
                    (e.currentTarget as HTMLImageElement).alt = `Missing: ${t.src}`;
                  }}
                />
              </button>
            );
          }

          return (
            <button
              key={t.id}
              className={`tile uploadTile ${t.dataUrl ? "hasImage" : ""}`}
              onClick={() => onTileClick(t)}
              title={t.dataUrl ? "Click to analyze upload" : "Click to upload"}
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

      <div className="playFooterHint">Tip: uploads stay local and clear when you reload/exit.</div>
    </div>
  );
}
