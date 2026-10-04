import Icon from "./Icon";
import { getLogoUrl } from "../lib/logoUrl";
import { countryLabel, categoryLabel } from "../lib/catalog";

export default function LogoCard({
  channel,
  favorite,
  onFavorite,
  onOpen,
  onCopy,
  background,
}) {
  return (
    <article className="logo-card">
      <div className={`card-preview preview-${background}`}>
        <button
          className="preview-open"
          onClick={() => onOpen(channel)}
          aria-label={`Pregledaj ${channel.name}`}
        >
          <img
            src={getLogoUrl(channel.image)}
            alt={channel.name}
            loading="lazy"
            decoding="async"
          />
        </button>
        <button
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={() => onFavorite(channel.id)}
          aria-label={`${favorite ? "Ukloni iz favorita" : "Dodaj u favorite"}: ${channel.name}`}
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
          title={channel.name}
        >
          {channel.name}
        </button>
        <p
          className="card-meta"
          title={`${countryLabel(channel.country)} · ${categoryLabel(channel.category)}`}
        >
          {countryLabel(channel.country)} <span>·</span>{" "}
          {categoryLabel(channel.category)}
        </p>
        <button
          className="card-copy"
          onClick={() => onCopy(channel)}
          aria-label={`Kopiraj PNG link: ${channel.name}`}
        >
          <Icon name="copy" size={15} />
          Kopiraj PNG link
        </button>
      </div>
    </article>
  );
}
