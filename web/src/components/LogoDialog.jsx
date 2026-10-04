import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import Icon from "./Icon";
import PreviewControls from "./PreviewControls";
import { getLogoUrl } from "../lib/logoUrl";
import { countryLabel, categoryLabel } from "../lib/catalog";

export default function LogoDialog({
  channel,
  favorite,
  onFavorite,
  onCopy,
  onClose,
  notify,
  message,
}) {
  const dialog = useRef(null);
  const [background, setBackground] = useState("checker");
  const [dimensions, setDimensions] = useState(null);
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const imageUrl = channel.previewUrl || getLogoUrl(channel);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    const abort = new AbortController();
    fetch(imageUrl, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Slika nije dostupna");
        return response.blob();
      })
      .then(setBlob)
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => {
      abort.abort();
      element.close();
    };
  }, [imageUrl]);

  const copyImage = async () => {
    if (!blob) return;
    try {
      setBusy(true);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      notify("PNG slika kopirana.");
    } catch {
      notify("Kopiranje slike nije dostupno. Preuzmi PNG datoteku.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="logo-dialog"
      aria-labelledby="logo-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="dialog-close icon-button"
        onClick={onClose}
        aria-label="Zatvori pregled"
      >
        <Icon name="close" />
      </button>
      <div className="dialog-preview-panel">
        <div className={`dialog-preview preview-${background}`}>
          <img
            src={imageUrl}
            alt={channel.name}
            onLoad={(event) =>
              setDimensions([
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              ])
            }
            onError={() => setError(true)}
          />
        </div>
        <PreviewControls value={background} onChange={setBackground} />
      </div>
      <div className="dialog-details">
        <span className="eyebrow">LOGOTIP KANALA</span>
        <h2 id="logo-dialog-title">{channel.name}</h2>
        <p className="muted">
          {countryLabel(channel.country)} · {categoryLabel(channel.category)}
        </p>
        <div className="file-details">
          <div>
            <span>Format</span>
            <strong>PNG</strong>
          </div>
          <div>
            <span>Dimenzije</span>
            <strong>
              {dimensions ? `${dimensions[0]} × ${dimensions[1]}` : "Učitavam…"}
            </strong>
          </div>
          <div>
            <span>Veličina</span>
            <strong>
              {blob
                ? `${(blob.size / 1024).toLocaleString("hr", { maximumFractionDigits: 1 })} KB`
                : error
                  ? "Nedostupno"
                  : "Učitavam…"}
            </strong>
          </div>
        </div>
        <label className="field-label" htmlFor="public-logo-url">
          Javni PNG link
        </label>
        <input
          id="public-logo-url"
          className="url-input"
          value={getLogoUrl(channel)}
          readOnly
          onFocus={(event) => event.target.select()}
        />
        <p className="field-hint">
          {channel.pendingPublication ? "Logotip je vidljiv. Javni PNG link se objavljuje i bit će dostupan automatski." : "Kopiraj adresu i zalijepi je u svoj TV panel. Nakon zamjene logotipa ponovno kopiraj link i spremi ga u panelu."}
        </p>
        <button
          className="button primary full-width"
          onClick={() => onCopy(channel)}
          disabled={channel.pendingPublication}
        >
          <Icon name="copy" />
          Kopiraj PNG link
        </button>
        <div className="dialog-action-pair">
          <button
            className="button secondary"
            disabled={!blob}
            onClick={() => {
              saveAs(blob, `${channel.id}.png`);
              notify("PNG preuzimanje pokrenuto.");
            }}
          >
            <Icon name="download" />
            Preuzmi PNG
          </button>
          <button
            className="button secondary"
            disabled={!blob || busy}
            onClick={copyImage}
          >
            <Icon name="copy" />
            {busy ? "Kopiram…" : "Kopiraj sliku"}
          </button>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            Slika se nije učitala. Pokušaj ponovno otvoriti pregled.
          </p>
        )}
        {message && (
          <p
            className={`dialog-feedback ${message.tone}`}
            role={message.tone === "error" ? "alert" : "status"}
          >
            {message.message}
          </p>
        )}
        <div className="dialog-footer">
          <button
            className={`text-button ${favorite ? "favorite-text" : ""}`}
            aria-pressed={favorite}
            onClick={() => onFavorite(channel.id)}
          >
            <Icon name="heart" fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Ukloni iz favorita" : "Dodaj u favorite"}
          </button>
          <a
            className="text-button"
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
          >
            Otvori sliku
            <Icon name="external" size={15} />
          </a>
        </div>
      </div>
    </dialog>
  );
}
