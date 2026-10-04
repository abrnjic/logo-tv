import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getLogoUrl } from "../lib/logoUrl";
import { countryLabel, EX_YU_COUNTRIES } from "../lib/catalog";
import LogoCard from "./LogoCard";
import PreviewControls from "./PreviewControls";
import Icon from "./Icon";

export default function Favorites({
  favorites,
  channelsData,
  setSelectedLogo,
  toggleFavorite,
  setFavorites,
  notify,
  onCopy,
  background,
  setBackground,
  gridSize,
}) {
  const [isZipping, setIsZipping] = useState(false);
  const [bgColor, setBgColor] = useState("transparent");
  const [addShadow, setAddShadow] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const favoriteChannels = channelsData.filter((channel) =>
    (channel.aliases || [channel.id]).some((id) => favorites.includes(id)),
  );

  const copy = async (format) => {
    const content =
      format === "M3U"
        ? "#EXTM3U\n" +
          favoriteChannels
            .map(
              (ch) =>
                `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${ch.name}" tvg-logo="${getLogoUrl(ch.image)}" group-title="${ch.category}", ${ch.name}\nhttp://stream.url\n`,
            )
            .join("")
        : JSON.stringify(
            favoriteChannels.map((ch) => ({
              name: ch.name,
              logo: getLogoUrl(ch.image),
            })),
            null,
            2,
          );
    try {
      await navigator.clipboard.writeText(content);
      notify(`${format} popis kopiran.`);
    } catch {
      notify("Kopiranje popisa nije dostupno u ovom pregledniku.", "error");
    }
  };

  const addCollection = (collection) => {
    const ids = channelsData
      .filter((ch) =>
        collection === "exyu"
          ? EX_YU_COUNTRIES.includes(countryLabel(ch.country))
          : collection === "sport"
            ? ch.category.startsWith("Sport")
            : ch.category === collection,
      )
      .map((ch) => ch.id);
    setFavorites((previous) => [...new Set([...previous, ...ids])]);
    notify("Kolekcija dodana u favorite.");
  };

  const processImage = (blob) => {
    if (bgColor === "transparent" && !addShadow) return Promise.resolve(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      image.onload = () => {
        try {
          const padding = addShadow ? 20 : 0;
          const canvas = document.createElement("canvas");
          canvas.width = image.width + padding * 2;
          canvas.height = image.height + padding * 2;
          const ctx = canvas.getContext("2d");
          if (bgColor !== "transparent") {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          if (addShadow) {
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
          }
          ctx.drawImage(image, padding, padding, image.width, image.height);
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(new Error("PNG obrada nije uspjela")),
            "image/png",
          );
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Slika se nije učitala"));
      };
      image.src = objectUrl;
    });
  };

  const downloadZIP = async () => {
    setIsZipping(true);
    let completed = 0;
    try {
      const zip = new JSZip();
      // Limit simultaneous image work for large collections and mobile browsers.
      let index = 0;
      const worker = async () => {
        while (index < favoriteChannels.length) {
          const channel = favoriteChannels[index++];
          try {
            const response = await fetch(getLogoUrl(channel.image));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await processImage(await response.blob());
            zip.file(`${channel.id}.png`, blob);
            completed++;
          } catch (err) {
            console.error("ZIP image failed:", channel.id, err);
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(4, favoriteChannels.length) }, worker),
      );
      if (!completed) throw new Error("Nijedna slika nije dostupna");
      saveAs(
        await zip.generateAsync({ type: "blob" }),
        "logo-tv-favorites.zip",
      );
      const missing = favoriteChannels.length - completed;
      notify(
        missing
          ? `ZIP sadrži ${completed} logotipa. ${missing} slika nije dostupno.`
          : `ZIP preuzimanje pokrenuto: ${completed} logotipa.`,
        missing ? "error" : "success",
      );
    } catch {
      notify("ZIP nije izrađen. Pokušaj ponovno.", "error");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <section className="favorites-container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TVOJ ODABIR</span>
          <h2>
            Moji favoriti{" "}
            <span className="count-badge">{favoriteChannels.length}</span>
          </h2>
          <p>Spremi kanale koje često koristiš i preuzmi ih zajedno.</p>
        </div>
        {favoriteChannels.length > 0 && (
          <button
            className="text-button muted"
            onClick={() => setConfirmClear(true)}
          >
            Isprazni favorite
          </button>
        )}
      </div>
      {confirmClear && (
        <div className="confirmation-bar" role="alert">
          <span>Ukloniti sve kanale iz favorita?</span>
          <div>
            <button
              className="button secondary"
              onClick={() => setConfirmClear(false)}
            >
              Odustani
            </button>
            <button
              className="button danger"
              onClick={() => {
                setFavorites([]);
                setConfirmClear(false);
                notify("Favoriti su ispražnjeni.");
              }}
            >
              Ukloni sve
            </button>
          </div>
        </div>
      )}
      <div className="collections-row">
        <span>Brzo dodaj kolekciju</span>
        <div>
          {[
            ["sport", "Sport"],
            ["Filmski", "Filmovi"],
            ["Dokumentarni", "Dokumentarni"],
            ["exyu", "EX-YU"],
          ].map(([key, label]) => (
            <button
              className="collection-button"
              key={key}
              onClick={() => addCollection(key)}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>
      {favoriteChannels.length === 0 ? (
        <div className="empty-state">
          <Icon name="heart" size={34} />
          <h3>Tvoja kolekcija počinje ovdje</h3>
          <p>Klikni na srce uz logotip da ga spremiš za kasnije.</p>
        </div>
      ) : (
        <>
          <div className="export-panel">
            <div className="export-panel-heading">
              <div>
                <h3>Preuzmi svoju kolekciju</h3>
                <p>PNG slike u ZIP arhivi ili popis javnih linkova.</p>
              </div>
              <div className="export-actions">
                <button
                  className="button secondary"
                  onClick={() => copy("M3U")}
                >
                  <Icon name="file" />
                  Kopiraj M3U
                </button>
                <button
                  className="button secondary"
                  onClick={() => copy("JSON")}
                >
                  <Icon name="copy" />
                  Kopiraj JSON
                </button>
              </div>
            </div>
            <div className="studio-options">
              <label className="filter-field">
                <span>Pozadina preuzetih slika</span>
                <select
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                >
                  <option value="transparent">Izvorna (bez promjene)</option>
                  <option value="#ffffff">Bijela</option>
                  <option value="#000000">Crna</option>
                  <option value="#222222">Tamnosiva</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addShadow}
                  onChange={(e) => setAddShadow(e.target.checked)}
                />
                Dodaj sjenu
              </label>
              <button
                className="button primary"
                onClick={downloadZIP}
                disabled={isZipping}
              >
                <Icon name="download" />
                {isZipping ? "Pripremam ZIP…" : "Preuzmi ZIP"}
              </button>
            </div>
          </div>
          <div className="results-toolbar">
            <p>
              <strong>{favoriteChannels.length.toLocaleString("hr")}</strong>{" "}
              spremljenih logotipa
            </p>
            <PreviewControls value={background} onChange={setBackground} />
          </div>
          <div
            className="logos-grid"
            style={{ "--card-size": `${gridSize}px` }}
          >
            {favoriteChannels.map((channel) => (
              <LogoCard
                key={channel.id}
                channel={channel}
                favorite
                onFavorite={toggleFavorite}
                onOpen={setSelectedLogo}
                onCopy={onCopy}
                background={background}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
