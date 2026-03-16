import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fileToObjectUrl } from "../lib/storage";

type Tile =
  | { id: string; kind: "static"; src: string; label: string }
  | { id: string; kind: "upload"; dataUrl: string | null };

type PlayState = {
  uploadedDataUrl?: string | null;
};

const STATIC_COUNT = 21;
const VISIBLE_STATIC = 11;
const TOTAL_TILES = 12;
const UPLOAD_INDEX = 6;

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

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTiles(uploadDataUrl: string | null = null): Tile[] {
  const allImages = buildStaticImageUrls();
  const chosen = shuffleArray(allImages).slice(0, VISIBLE_STATIC);

  const tiles: Tile[] = [];
  let imgIndex = 0;

  for (let i = 0; i < TOTAL_TILES; i++) {
    if (i === UPLOAD_INDEX) {
      tiles.push({
        id: "upload-slot",
        kind: "upload",
        dataUrl: uploadDataUrl,
      });
    } else {
      const image = chosen[imgIndex++];
      tiles.push({
        id: `static-${image.src}`,
        kind: "static",
        src: image.src,
        label: image.label,
      });
    }
  }

  return tiles;
}

export default function PlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const uploadedFromState =
    ((location.state as PlayState | null)?.uploadedDataUrl ?? null);

  const [tiles, setTiles] = React.useState<Tile[]>(() => makeTiles(uploadedFromState));

  React.useEffect(() => {
    const images = buildStaticImageUrls();
    images.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  React.useEffect(() => {
    setTiles(makeTiles(uploadedFromState));
  }, [uploadedFromState]);

  function getCurrentUploadDataUrl() {
    const uploadTile = tiles.find(
      (t): t is Extract<Tile, { kind: "upload" }> => t.kind === "upload"
    );
    return uploadTile?.dataUrl ?? null;
  }

  function shuffleStatic() {
    setTiles(makeTiles(getCurrentUploadDataUrl()));
  }

  async function handleUpload(file: File) {
    const dataUrl = await fileToObjectUrl(file);
    setTiles(makeTiles(dataUrl));

    navigate("/analyze", {
      state: {
        dataUrl,
        uploadedDataUrl: dataUrl,
      },
    });
  }

  function onTileClick(t: Tile) {
    const uploadedDataUrl = getCurrentUploadDataUrl();

    if (t.kind === "upload") {
      if (!t.dataUrl) {
        fileRef.current?.click();
      } else {
        navigate("/analyze", {
          state: {
            dataUrl: t.dataUrl,
            uploadedDataUrl,
          },
        });
      }
      return;
    }

    navigate("/analyze", {
      state: {
        dataUrl: t.src,
        uploadedDataUrl,
      },
    });
  }

  return (
    <div className="playWrap">
      <div className="playHeader">
        <div>
          <div className="playTitle">PLAY / ANALYZE</div>
          <div className="playSub">
            Click a tile to analyze it. Use the empty slot to upload your own cover.
            Shuffle changes the gallery order.
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
              <button
                key={t.id}
                className="tile"
                onClick={() => onTileClick(t)}
                title="Click to analyze"
              >
                <img
                  src={t.src}
                  alt={t.label}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.opacity = "0.2";
                    img.alt = `Missing: ${t.src}`;
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

      <div className="playFooterHint">
        <div>Tip:</div>
        <div>1) Uploads stay local and clear when you reload/exit.</div>
        <div className="creditLine">
          2) All images used are sourced from{" "}
          <a
            href="https://www.pexels.com/collections/album-backgrounds-hqckgjr/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels
          </a>{" "}
          and{" "}
          <a
            href="https://unsplash.com/s/photos/album-cover?license=free"
            target="_blank"
            rel="noreferrer"
          >
            Unsplash
          </a>
          , used under their respective licenses.
        </div>
      </div>
    </div>
  );
}