import Icon from "./Icon";
import { getLogoUrl } from "../lib/logoUrl";
import { countryLabel, categoryLabel } from "../lib/catalog";

export default function LogoCard({
  channel,
  favorite,
  onFavorite,
  onOpen,
  onCopy,
  onEdit,
  background,
}) {
  return (
    <article className="logo-card">
      <div className={`card-preview preview-${background}`}>
        <button
          className="preview-open"
          onClick={() => onOpen(channel)}
          aria-label={`Pregledaj ${(channel.displayName || channel.name)}`}
        >
          <img
            src={channel.previewUrl || getLogoUrl(channel)}
            alt={(channel.displayName || channel.name)}
            loading="lazy"
            decoding="async"
          />
        </button>
        <button
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={() => onFavorite(channel.id)}
          aria-label={`${favorite ? "Ukloni iz favorita" : "Dodaj u favorite"}: ${(channel.displayName || channel.name)}`}
          aria-pressed={favorite}
        >
          <Icon
            name="heart"
            fill={favorite ? "currentColor" : "none"}
            size={17}
          />
        </button>
        <span className="format-badge">PNG</span>
      </div>
      <div className="card-info">
        <button
          className="card-name"
          onClick={() => onOpen(channel)}
          title={(channel.displayName || channel.name)}
        >
          {(channel.displayName || channel.name)}
        </button>
        <p
          className="card-meta"
          title={`${countryLabel(channel.country)} · ${categoryLabel(channel.category)}`}
        >
          {countryLabel(channel.country)} <span>·</span>{" "}
          {categoryLabel(channel.category)}
        </p>
        {channel.editedAt && <p className="edit-date">Uređeno {new Date(channel.editedAt).toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "short" })}</p>}
        <div className="card-actions">
        <button
          className="card-copy"
          onClick={() => onCopy(channel)}
          disabled={channel.pendingPublication}
          aria-label={`Kopiraj PNG link: ${(channel.displayName || channel.name)}`}
        >
          <Icon name="copy" size={15} />
          {channel.pendingPublication ? "PNG link se objavljuje…" : "Kopiraj PNG link"}
        </button>
        {onEdit && <button className="card-edit" aria-label={`Uredi ${(channel.displayName || channel.name)}`} onClick={() => onEdit(channel)}><Icon name="edit" size={15} />Uredi</button>}
        </div>
      </div>
    </article>
  );
}
