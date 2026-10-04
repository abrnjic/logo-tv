import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import rawChannels from "./data/channels.json";
import metadata from "../catalogue-overrides.json";
import { prepareCatalogue } from "./lib/channelNames";
import Admin from "./components/Admin";
const channelsData = prepareCatalogue(rawChannels, metadata);
import { useFavorites } from "./hooks/useFavorites";
import Favorites from "./components/Favorites";
import M3UFixer from "./components/M3UFixer";
import Icon from "./components/Icon";
import LogoCard from "./components/LogoCard";
import LogoDialog from "./components/LogoDialog";
import PreviewControls from "./components/PreviewControls";
import { getLogoUrl } from "./lib/logoUrl";
import { countryLabel, categoryLabel, filterChannels } from "./lib/catalog";

const formatCount = (value) => value.toLocaleString("hr");
const quickFilters = [
  ["all", "Svi kanali"],
  ["hr", "Hrvatska"],
  ["exyu", "EX-YU"],
  ["sport", "Sport"],
  ["radio", "Radio"],
];

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("logo-tv-theme") || "dark",
  );
  const [gridSize, setGridSize] = useState(() =>
    Math.min(
      250,
      Math.max(140, Number(localStorage.getItem("logo-tv-grid-size")) || 180),
    ),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [country, setCountry] = useState("All");
  const [category, setCategory] = useState("All");
  const [quick, setQuick] = useState("all");
  const [background, setBackground] = useState("checker");
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [visibleCount, setVisibleCount] = useState(80);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const loaderRef = useRef(null);
  const {
    favorites,
    toggleFavorite: toggleStoredFavorite,
    setFavorites,
  } = useFavorites();

  const isFavorite = (id) => {
    const channel = channelsData.find((channel) => channel.id === id);
    return (channel?.aliases || [id]).some((alias) =>
      favorites.includes(alias),
    );
  };
  const toggleFavorite = (id) => {
    const channel = channelsData.find((channel) => channel.id === id);
    if (isFavorite(id))
      setFavorites((previous) =>
        previous.filter((alias) => !(channel?.aliases || [id]).includes(alias)),
      );
    else toggleStoredFavorite(id);
  };

  const notify = useCallback((message, tone = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("logo-tv-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("logo-tv-grid-size", String(gridSize));
  }, [gridSize]);
  useEffect(() => {
    setVisibleCount(80);
  }, [searchTerm, country, category, quick]);

  const countries = useMemo(
    () =>
      [...new Set(channelsData.map((ch) => countryLabel(ch.country)))].sort(
        (a, b) => a.localeCompare(b, "hr"),
      ),
    [],
  );
  const categories = useMemo(
    () =>
      [...new Set(channelsData.map((ch) => ch.category))].sort((a, b) =>
        categoryLabel(a).localeCompare(categoryLabel(b), "hr"),
      ),
    [],
  );
  const filtered = useMemo(
    () =>
      filterChannels(channelsData, {
        search: searchTerm,
        country,
        category,
        quick,
      }),
    [searchTerm, country, category, quick],
  );
  const hasFilters =
    searchTerm || country !== "All" || category !== "All" || quick !== "all";
  const resetFilters = () => {
    setSearchTerm("");
    setCountry("All");
    setCategory("All");
    setQuick("all");
  };

  useEffect(() => {
    if (activeTab !== "search" || !loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((count) => count + 80);
      },
      { rootMargin: "160px" },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [activeTab, filtered, visibleCount]);

  const copyLink = async (channel) => {
    try {
      await navigator.clipboard.writeText(getLogoUrl(channel.image));
      notify(`PNG link kopiran: ${channel.name}`);
    } catch {
      notify(
        "Kopiranje nije dostupno. Otvori pregled i kopiraj adresu iz polja.",
        "error",
      );
    }
  };

  const openLogo = (channel) => {
    setToast(null);
    setSelectedLogo(channel);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="text-button admin-entry"
          onClick={() => setActiveTab("admin")}
        >
          Upravljanje
        </button>
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Logo TV početna"
        >
          <span className="brand-symbol">
            <Icon name="tv" size={22} />
          </span>
          <span>
            Logo <strong>TV</strong>
          </span>
          <span className="brand-label">BIBLIOTEKA</span>
        </a>
        <div className="header-right">
          <span className="catalogue-count">
            {formatCount(channelsData.length)} logotipa
          </span>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark" ? "Uključi svijetlu temu" : "Uključi tamnu temu"
            }
            title={theme === "dark" ? "Svijetla tema" : "Tamna tema"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
        </div>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <span className="eyebrow">TVOJA KOLEKCIJA TV LOGOTIPA</span>
            <h1>Pravi logo za svaki kanal.</h1>
            <p>Pronađi kanal, kopiraj PNG link i dodaj ga u svoj panel.</p>
          </div>
          <div className="intro-note">
            <span className="availability-dot" />
            <span>
              Javni PNG linkovi
              <br />
              <strong>Spremni za tvoj panel</strong>
            </span>
          </div>
        </div>
        <nav className="tabs" aria-label="Glavna navigacija">
          <button
            className={activeTab === "search" ? "active" : ""}
            onClick={() => setActiveTab("search")}
            aria-current={activeTab === "search" ? "page" : undefined}
          >
            <Icon name="search" />
            Tražilica
          </button>
          <button
            className={activeTab === "favorites" ? "active" : ""}
            onClick={() => setActiveTab("favorites")}
            aria-current={activeTab === "favorites" ? "page" : undefined}
          >
            <Icon name="heart" />
            Favoriti<span className="count-badge">{favorites.length}</span>
          </button>
          <button
            className={activeTab === "fixer" ? "active" : ""}
            onClick={() => setActiveTab("fixer")}
            aria-current={activeTab === "fixer" ? "page" : undefined}
          >
            <Icon name="file" />
            M3U Fixer
          </button>
        </nav>
        <div style={{ display: activeTab === "admin" ? "block" : "none" }}>
          <Admin rawChannels={rawChannels} channels={channelsData} />
        </div>
        {activeTab === "search" && (
          <>
            <section className="search-panel" aria-label="Pretraga i filtri">
              <div className="search-row">
                <div className="search-field">
                  <Icon name="search" size={21} />
                  <input
                    type="search"
                    aria-label="Pretraži kanale"
                    placeholder="Pretraži kanale..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="icon-button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Obriši pretragu"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                </div>
                <label className="filter-field">
                  <span>Država</span>
                  <select
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setQuick("all");
                    }}
                  >
                    <option value="All">Sve države</option>
                    {countries.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="filter-field">
                  <span>Kategorija</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="All">Sve kategorije</option>
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {categoryLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="quick-filter-row">
                <div className="quick-filters" aria-label="Brzi filtri">
                  {quickFilters.map(([key, label]) => (
                    <button
                      key={key}
                      className={quick === key ? "active" : ""}
                      aria-pressed={quick === key}
                      onClick={() => {
                        setQuick(key);
                        setCountry("All");
                        setCategory("All");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {hasFilters && (
                  <button
                    className="text-button reset-filters"
                    onClick={resetFilters}
                  >
                    Poništi filtre
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            </section>
            <div className="results-toolbar">
              <p>
                <strong>{formatCount(filtered.length)}</strong>{" "}
                {hasFilters ? "rezultata" : "logotipa u biblioteci"}
                <span className="toolbar-hint">Klikni na logo za detalje</span>
              </p>
              <div className="view-options">
                <PreviewControls value={background} onChange={setBackground} />
                <label className="density-control">
                  <span>Veličina</span>
                  <input
                    aria-label="Veličina kartica"
                    type="range"
                    min="140"
                    max="250"
                    step="10"
                    value={gridSize}
                    onChange={(event) =>
                      setGridSize(Number(event.target.value))
                    }
                  />
                </label>
              </div>
            </div>
            {filtered.length ? (
              <>
                <div
                  className="logos-grid"
                  style={{ "--card-size": `${gridSize}px` }}
                >
                  {filtered.slice(0, visibleCount).map((channel) => (
                    <LogoCard
                      key={channel.id}
                      channel={channel}
                      favorite={isFavorite(channel.id)}
                      onFavorite={toggleFavorite}
                      onOpen={openLogo}
                      onCopy={copyLink}
                      background={background}
                    />
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <div className="load-more" ref={loaderRef}>
                    <button
                      className="button secondary"
                      onClick={() => setVisibleCount((count) => count + 80)}
                    >
                      Prikaži još logotipa
                      <Icon name="arrow" />
                    </button>
                    <span>
                      Prikazano{" "}
                      {formatCount(Math.min(visibleCount, filtered.length))} od{" "}
                      {formatCount(filtered.length)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Icon name="search" size={32} />
                <h2>Nismo pronašli taj kanal</h2>
                <p>Pokušaj kraći naziv ili promijeni odabrane filtre.</p>
                <button className="button secondary" onClick={resetFilters}>
                  Poništi pretragu i filtre
                </button>
                <a
                  className="text-button"
                  href={`mailto:abrnjic@gmail.com?subject=${encodeURIComponent(`Zahtjev za novi logo: ${searchTerm}`)}`}
                >
                  Zatraži novi logotip
                  <Icon name="external" size={15} />
                </a>
              </div>
            )}
          </>
        )}
        {activeTab === "favorites" && (
          <Favorites
            favorites={favorites}
            channelsData={channelsData}
            setSelectedLogo={openLogo}
            toggleFavorite={toggleFavorite}
            setFavorites={setFavorites}
            notify={notify}
            onCopy={copyLink}
            background={background}
            setBackground={setBackground}
            gridSize={gridSize}
          />
        )}
        {activeTab === "fixer" && <M3UFixer />}
      </main>
      <footer className="site-footer">
        <span>
          Logo TV<span className="footer-dot">·</span>
          {formatCount(channelsData.length)} logotipa na jednom mjestu
        </span>
        <a
          href="https://github.com/abrnjic/logo-tv"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <Icon name="external" size={14} />
        </a>
      </footer>
      {selectedLogo && (
        <LogoDialog
          key={selectedLogo.id}
          channel={selectedLogo}
          favorite={isFavorite(selectedLogo.id)}
          onFavorite={toggleFavorite}
          onCopy={copyLink}
          onClose={() => setSelectedLogo(null)}
          notify={notify}
          message={toast}
        />
      )}
      {toast && !selectedLogo && (
        <div
          className={`toast ${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          <span className="toast-icon">
            <Icon name={toast.tone === "error" ? "close" : "check"} size={17} />
          </span>
          <span>{toast.message}</span>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Zatvori obavijest"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
